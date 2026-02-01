import { configureStore } from "@reduxjs/toolkit";
import diagramReducer from "./diagramSlice";

export const store = configureStore({
  reducer: {
    diagram: diagramReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["diagram/setModel"],
        ignoredPaths: ["diagram.model.elements"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
