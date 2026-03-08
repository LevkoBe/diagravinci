import type { DiagramModel } from "../domain/models/DiagramModel";
import type { ViewState } from "../domain/models/ViewState";
import { ModelDiffer } from "../domain/sync/ModelDiffer";
import { ViewStateMerger } from "../domain/sync/ViewStateMerger";
import { CodeGenerator } from "../infrastructure/codegen/CodeGenerator";
import { Lexer } from "../infrastructure/parser/Lexer";
import { Parser } from "../infrastructure/parser/Parser";
import { setCode, setModel, setViewState } from "./store/diagramSlice";
import type { AppStore } from "./store/store";

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

  constructor(store: AppStore) {
    this.store = store;
  }

  subscribe(callback: (event: SyncEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  syncFromCode(code: string): void {
    try {
      const tokens = new Lexer(code).tokenize();
      const newModel = new Parser(tokens).parse();
      const {
        model: currentModel,
        viewState: currentViewState,
        canvasSize,
      } = this.store.getState().diagram;

      const diff = ModelDiffer.diff(currentModel, newModel);
      if (ModelDiffer.isEmpty(diff)) {
        this.store.dispatch(setCode(code));
        return;
      }

      console.log(diff);
      console.log(currentViewState);
      const newViewState = ViewStateMerger.merge(
        currentViewState,
        newModel,
        canvasSize,
      );
      console.log(newViewState);

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

  syncFromVis(updatedModel: DiagramModel): void {
    const {
      model: currentModel,
      viewState: currentViewState,
      canvasSize,
    } = this.store.getState().diagram;

    const newViewState = ViewStateMerger.merge(
      currentViewState,
      updatedModel,
      canvasSize,
    );
    this.store.dispatch(setViewState(newViewState));

    const diff = ModelDiffer.diff(currentModel, updatedModel);
    if (ModelDiffer.isEmpty(diff)) return;

    const code = new CodeGenerator(updatedModel).generate();

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

  private notify(event: SyncEvent): void {
    this.listeners.forEach((cb) => cb(event));
  }
}
