import type { DiagramModel } from "../domain/models/DiagramModel";
import type { ViewState } from "../domain/models/ViewState";
import { ModelDiffer } from "../domain/sync/ModelDiffer";
import { ViewStateMerger } from "../domain/sync/ViewStateMerger";
import { setCode, setModel, setViewState } from "./store/diagramSlice";
import { syncPresetsFromCode } from "./store/filterSlice";
import type { AppStore } from "./store/store";

export interface ICodeParser {
  parse(code: string): DiagramModel;
}

export interface ICodeGenerator {
  generate(model: DiagramModel): string;
}

export type SyncSource = "code" | "vis" | "ai";
export interface SyncEvent {
  source: SyncSource;
  model: DiagramModel;
  viewState: ViewState;
  code: string;
  timestamp: number;
}

export class SyncManager {
  private listeners: Array<(event: SyncEvent) => void> = [];
  private store: AppStore;
  private parser: ICodeParser;
  private codeGenerator: ICodeGenerator;

  constructor(store: AppStore, parser: ICodeParser, codeGenerator: ICodeGenerator) {
    this.store = store;
    this.parser = parser;
    this.codeGenerator = codeGenerator;
  }

  subscribe(callback: (event: SyncEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  syncFromCode(code: string): void {
    try {
      const newModel = this.parser.parse(code);
      const {
        model: currentModel,
        viewState: currentViewState,
        canvasSize,
      } = this.store.getState().diagram;

      const diff = ModelDiffer.diff(currentModel, newModel);
      const presetsChanged =
        JSON.stringify(currentModel.filterPresets ?? []) !==
        JSON.stringify(newModel.filterPresets ?? []);
      const atomsChanged =
        JSON.stringify(currentModel.atoms ?? []) !==
        JSON.stringify(newModel.atoms ?? []);
      if (ModelDiffer.isEmpty(diff) && !presetsChanged && !atomsChanged) {
        this.store.dispatch(setCode(code));
        return;
      }

      const newViewState = ViewStateMerger.merge(
        currentViewState,
        newModel,
        canvasSize,
      );

      if (presetsChanged) {
        this.store.dispatch(
          syncPresetsFromCode({
            modelPresets: newModel.filterPresets ?? [],
            prevModelPresetIds: (currentModel.filterPresets ?? []).map((p) => p.id),
          }),
        );
      }

      this.store.dispatch(setModel(newModel));
      this.store.dispatch(setViewState(newViewState));
      this.store.dispatch(setCode(code));
      this.notify({
        source: "code",
        model: newModel,
        viewState: newViewState,
        code,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("[SyncManager] syncFromCode error:", error);
    }
  }

  syncFromVis(
    updatedModel: DiagramModel,
    preservePositions = false,
    pathRemapping?: { oldPrefix: string; newPrefix: string },
  ): void {
    const {
      model: currentModel,
      viewState: currentViewState,
      canvasSize,
    } = this.store.getState().diagram;

    const diff = ModelDiffer.diff(currentModel, updatedModel);
    if (ModelDiffer.isEmpty(diff)) return;

    let mergeViewState = currentViewState;
    if (preservePositions && pathRemapping) {
      const { oldPrefix, newPrefix } = pathRemapping;
      const remappedPositions = { ...currentViewState.positions };
      for (const [path, pe] of Object.entries(currentViewState.positions)) {
        if (path === oldPrefix || path.startsWith(oldPrefix + ".")) {
          remappedPositions[newPrefix + path.slice(oldPrefix.length)] = pe;
        }
      }
      mergeViewState = { ...currentViewState, positions: remappedPositions };
    }

    const newViewState = ViewStateMerger.merge(
      mergeViewState,
      updatedModel,
      canvasSize,
      preservePositions,
    );
    this.store.dispatch(setViewState(newViewState));

    const code = this.codeGenerator.generate(updatedModel);
    this.store.dispatch(setModel(updatedModel));
    this.store.dispatch(setCode(code));
    this.notify({
      source: "vis",
      model: updatedModel,
      viewState: newViewState,
      code,
      timestamp: Date.now(),
    });
  }

  syncFromAI(code: string): void {
    this.syncFromCode(code);
  }

  reLayout(): void {
    const { model, viewState, canvasSize } = this.store.getState().diagram;
    if (viewState.viewMode === "execute") return;
    const newViewState = ViewStateMerger.merge(viewState, model, canvasSize);
    this.store.dispatch(setViewState(newViewState));
  }

  private notify(event: SyncEvent): void {
    this.listeners.forEach((cb) => cb(event));
  }
}
