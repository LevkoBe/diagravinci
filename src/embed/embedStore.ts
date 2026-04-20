import { configureStore } from "@reduxjs/toolkit";
import { Lexer } from "../infrastructure/parser/Lexer";
import { Parser } from "../infrastructure/parser/Parser";
import { ViewStateMerger } from "../domain/sync/ViewStateMerger";
import { AppConfig } from "../config/appConfig";
import { createEmptyViewState } from "../domain/models/ViewState";
import type { ViewState } from "../domain/models/ViewState";
import diagramReducer, { setCode, setModel, setViewState } from "../application/store/diagramSlice";
import uiReducer, { setInteractionMode } from "../application/store/uiSlice";
import filterReducer from "../application/store/filterSlice";
import historyReducer from "../application/store/historySlice";
import diffReducer from "../application/store/diffSlice";
import executionReducer from "../application/store/executionSlice";

export function createEmbedStore(
  diagramCode: string,
  viewMode: ViewState["viewMode"],
) {
  const store = configureStore({
    reducer: {
      filter: filterReducer,
      diagram: diagramReducer,
      ui: uiReducer,
      history: historyReducer,
      diff: diffReducer,
      execution: executionReducer,
    },
  });

  store.dispatch(setInteractionMode("readonly"));

  const canvasSize = {
    width: AppConfig.canvas.DEFAULT_WIDTH,
    height: AppConfig.canvas.DEFAULT_HEIGHT,
  };

  if (diagramCode) {
    try {
      const model = new Parser(new Lexer(diagramCode).tokenize()).parse();
      const viewState = {
        ...ViewStateMerger.merge(createEmptyViewState(), model, canvasSize),
        viewMode,
      };
      store.dispatch(setModel(model));
      store.dispatch(setViewState(viewState));
      store.dispatch(setCode(diagramCode));
    } catch {
      store.dispatch(setViewState({ ...createEmptyViewState(), viewMode }));
    }
  } else {
    store.dispatch(setViewState({ ...createEmptyViewState(), viewMode }));
  }

  return store;
}

export type EmbedStore = ReturnType<typeof createEmbedStore>;
export type EmbedDispatch = EmbedStore["dispatch"];
