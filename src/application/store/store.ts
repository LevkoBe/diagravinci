import { configureStore } from "@reduxjs/toolkit";
import diagramReducer from "./diagramSlice";
import themeReducer from "./themeSlice";
import uiReducer from "./uiSlice";
import { SyncManager } from "../SyncManager";

export const store = configureStore({
  reducer: {
    diagram: diagramReducer,
    theme: themeReducer,
    ui: uiReducer,
  },
});

export const syncManager = new SyncManager(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
