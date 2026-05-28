import type { DiagramModel } from "../domain/models/DiagramModel";
import { DEFAULT_SESSION_ID, DEFAULT_SESSION_LABEL } from "../domain/models/DiagramModel";
import type { ViewState } from "../domain/models/ViewState";
import { ModelDiffer } from "../domain/sync/ModelDiffer";
import { ViewStateMerger } from "../domain/sync/ViewStateMerger";
import { setCode, setModel, setViewState } from "./store/diagramSlice";
import { syncSelectorsFromCode } from "./store/filterSlice";
import type { AppStore } from "./store/store";
import { ForceSimulationService } from "./ForceSimulationService";
import { upsertSessionModeInCode } from "../presentation/utils/selectorCodeUtils";

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
  readonly forceSimulation: ForceSimulationService;

  constructor(store: AppStore, parser: ICodeParser, codeGenerator: ICodeGenerator) {
    this.store = store;
    this.parser = parser;
    this.codeGenerator = codeGenerator;
    this.forceSimulation = new ForceSimulationService();
  }

  subscribe(callback: (event: SyncEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  syncFromCode(code: string, preservePositions = false): void {
    try {
      const parsedModel = this.parser.parse(code);
      const {
        model: currentModel,
        viewState: currentViewState,
        canvasSize,
      } = this.store.getState().diagram;

      const { model: newModel, code: normalizedCode } =
        this.normalizeSessionsAndAutoColor(parsedModel, currentModel, code);
      code = normalizedCode;

      const diff = ModelDiffer.diff(currentModel, newModel);
      const selectorsChanged =
        JSON.stringify(currentModel.selectors ?? []) !==
        JSON.stringify(newModel.selectors ?? []);
      const rulesChanged =
        JSON.stringify(currentModel.rules ?? []) !==
        JSON.stringify(newModel.rules ?? []);
      const sessionsChanged =
        JSON.stringify(currentModel.sessions ?? []) !==
        JSON.stringify(newModel.sessions ?? []);
      if (ModelDiffer.isEmpty(diff) && !selectorsChanged && !rulesChanged && !sessionsChanged) {
        this.store.dispatch(setCode(code));
        return;
      }

      const newViewState = ViewStateMerger.merge(
        currentViewState,
        newModel,
        canvasSize,
        preservePositions,
      );

      if (selectorsChanged) {
        this.store.dispatch(
          syncSelectorsFromCode({
            modelSelectors: newModel.selectors ?? [],
            prevModelSelectorIds: (currentModel.selectors ?? []).map((s) => s.id),
          }),
        );
      }

      this.store.dispatch(setModel(newModel));
      this.store.dispatch(setViewState(newViewState));
      this.store.dispatch(setCode(code));
      this.restartForceIfNeeded(newViewState);
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

  private normalizeSessionsAndAutoColor(
    newModel: DiagramModel,
    currentModel: DiagramModel,
    code: string,
  ): { model: DiagramModel; code: string } {
    let model = newModel;
    let normalizedCode = code;

    if ((model.sessions ?? []).length === 0) {
      model = {
        ...model,
        sessions: [{ id: DEFAULT_SESSION_ID, label: DEFAULT_SESSION_LABEL, selectorModes: {} }],
      };
      const sep = normalizedCode.length > 0 && !normalizedCode.endsWith("\n") ? "\n" : "";
      normalizedCode = normalizedCode + sep + `!session  id=${DEFAULT_SESSION_ID}  label=${DEFAULT_SESSION_LABEL}\n`;
    }

    const prevIds = new Set((currentModel.selectors ?? []).map((s) => s.id));
    const newSelectorIds = (model.selectors ?? [])
      .filter((s) => !prevIds.has(s.id))
      .map((s) => s.id);

    if (newSelectorIds.length > 0) {
      const updatedSessions = (model.sessions ?? []).map((session) => {
        const updatedModes = { ...session.selectorModes };
        for (const id of newSelectorIds) {
          if (!updatedModes[id]) {
            updatedModes[id] = "color";
            normalizedCode = upsertSessionModeInCode(session.id, id, "color", normalizedCode);
          }
        }
        return { ...session, selectorModes: updatedModes };
      });
      model = { ...model, sessions: updatedSessions };
    }

    return { model, code: normalizedCode };
  }

  syncFromVis(
    updatedModel: DiagramModel,
    preservePositions = false,
    pathRemapping?: { oldPrefix: string; newPrefix: string },
    cloneIds?: Set<string>,
    correctClonePaths?: Map<string, string>,
  ): void {
    const {
      model: currentModel,
      viewState: currentViewState,
      canvasSize,
    } = this.store.getState().diagram;

    const diff = ModelDiffer.diff(currentModel, updatedModel);
    const selectorsChanged =
      JSON.stringify(currentModel.selectors ?? []) !==
      JSON.stringify(updatedModel.selectors ?? []);
    const sessionsChanged =
      JSON.stringify(currentModel.sessions ?? []) !==
      JSON.stringify(updatedModel.sessions ?? []);
    if (ModelDiffer.isEmpty(diff) && !selectorsChanged && !sessionsChanged) return;

    let mergeViewState = currentViewState;
    if (preservePositions && pathRemapping) {
      const { oldPrefix, newPrefix } = pathRemapping;
      const remappedPositions = { ...currentViewState.positions };
      for (const [path, pe] of Object.entries(currentViewState.positions)) {
        if (path === oldPrefix || path.startsWith(oldPrefix + ".")) {
          remappedPositions[newPrefix + path.slice(oldPrefix.length)] = pe;
          delete remappedPositions[path];
        }
      }
      mergeViewState = { ...currentViewState, positions: remappedPositions };
    }

    let newViewState = ViewStateMerger.merge(
      mergeViewState,
      updatedModel,
      canvasSize,
      preservePositions,
    );

    if (cloneIds && cloneIds.size > 0) {
      const positions = { ...newViewState.positions };
      for (const cloneId of cloneIds) {
        const matching = Object.keys(positions).filter(
          (p) => p === cloneId || p.endsWith(`.${cloneId}`),
        );
        if (matching.length <= 1) continue;
        const toKeep = correctClonePaths?.get(cloneId) ??
          matching.reduce((a, b) =>
            a.split(".").length >= b.split(".").length ? a : b,
          );
        for (const wrongPath of matching) {
          if (wrongPath === toKeep) continue;
          for (const p of Object.keys(positions)) {
            if (p === wrongPath || p.startsWith(wrongPath + ".")) delete positions[p];
          }
        }
      }
      newViewState = { ...newViewState, positions };
    }

    this.store.dispatch(setViewState(newViewState));
    this.restartForceIfNeeded(newViewState);

    if (selectorsChanged) {
      this.store.dispatch(
        syncSelectorsFromCode({
          modelSelectors: updatedModel.selectors ?? [],
          prevModelSelectorIds: (currentModel.selectors ?? []).map((s) => s.id),
        }),
      );
    }

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
    this.forceSimulation.stop();
    const newViewState = ViewStateMerger.merge(viewState, model, canvasSize);
    this.store.dispatch(setViewState(newViewState));
    this.restartForceIfNeeded(newViewState);
  }

  private restartForceIfNeeded(viewState: ViewState): void {
    this.forceSimulation.stop();
    if (viewState.viewMode === "force") {
      this.forceSimulation.start(this.store);
    }
  }

  private notify(event: SyncEvent): void {
    this.listeners.forEach((cb) => cb(event));
  }
}
