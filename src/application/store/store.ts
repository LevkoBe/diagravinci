import { configureStore } from "@reduxjs/toolkit";
import diagramReducer from "./diagramSlice";
import uiReducer from "./uiSlice";
import filterReducer from "./filterSlice";
import historyReducer from "./historySlice";
import diffReducer from "./diffSlice";
import executionReducer from "./executionSlice";
import { SyncManager } from "../SyncManager";
import { TabSyncManager } from "../TabSyncManager";
import { loadState, loadStateAsync, saveState } from "./persistence";
import {
  setRenderStyle,
  setInteractionMode,
  setActiveElementType,
  setActiveRelationshipType,
} from "./uiSlice";
import { restoreFilterState } from "./filterSlice";
import { setModel, setViewState, setCode } from "./diagramSlice";

const preloadedState = loadState();

export const store = configureStore({
  reducer: {
    filter: filterReducer,
    diagram: diagramReducer,
    ui: uiReducer,
    history: historyReducer,
    diff: diffReducer,
    execution: executionReducer,
  },
  preloadedState,
});

if (!preloadedState) {
  loadStateAsync().then((idbState) => {
    if (!idbState) return;
    store.dispatch(setRenderStyle(idbState.ui.renderStyle));
    store.dispatch(setActiveElementType(idbState.ui.activeElementType));
    store.dispatch(
      setActiveRelationshipType(idbState.ui.activeRelationshipType),
    );
    store.dispatch(setInteractionMode(idbState.ui.interactionMode));
    store.dispatch(restoreFilterState(idbState.filter));
    store.dispatch(setModel(idbState.diagram.model));
    store.dispatch(setViewState(idbState.diagram.viewState));
    store.dispatch(setCode(idbState.diagram.code));
  });
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
store.subscribe(() => {
  if (saveTimer !== null) return;
  saveTimer = setTimeout(() => {
    saveState(store.getState());
    saveTimer = null;
  }, 1000);
});

export const syncManager = new SyncManager(store);
export const tabSyncManager = new TabSyncManager(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
