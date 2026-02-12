import { configureStore } from "@reduxjs/toolkit";
import diagramReducer from "./diagramSlice";
import themeReducer from "./themeSlice";

export const store = configureStore({
  reducer: {
    diagram: diagramReducer,
    theme: themeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
