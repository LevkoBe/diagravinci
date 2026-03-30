import { configureStore } from "@reduxjs/toolkit";
import diagramReducer from "./diagramSlice";
import themeReducer from "./themeSlice";
import uiReducer from "./uiSlice";
import filterReducer from "./filterSlice";
import historyReducer from "./historySlice";
import { SyncManager } from "../SyncManager";
import { loadState, saveState } from "./persistence";

const preloadedState = loadState();

export const store = configureStore({
  reducer: {
    filter: filterReducer,
    diagram: diagramReducer,
    theme: themeReducer,
    ui: uiReducer,
    history: historyReducer,
  },
  preloadedState,
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;
store.subscribe(() => {
  if (saveTimer !== null) return;
  saveTimer = setTimeout(() => {
    saveState(store.getState());
    saveTimer = null;
  }, 1000);
});

export const syncManager = new SyncManager(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
