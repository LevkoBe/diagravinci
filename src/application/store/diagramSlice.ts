import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  type DiagramModel,
  createEmptyDiagram,
} from "../../domain/models/DiagramModel";
import type { Element } from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";

interface DiagramState {
  model: DiagramModel;
  code: string;
  selectedElementId: string | null;
}

const initialState: DiagramState = {
  model: createEmptyDiagram(),
  code: "",
  selectedElementId: null,
};

const diagramSlice = createSlice({
  name: "diagram",
  initialState,
  reducers: {
    setModel: (state, action: PayloadAction<DiagramModel>) => {
      state.model = action.payload;
    },
    setCode: (state, action: PayloadAction<string>) => {
      state.code = action.payload;
    },
    upsertElement: (state, action: PayloadAction<Element>) => {
      state.model.elements.set(action.payload.id, action.payload);
    },
    removeElement: (state, action: PayloadAction<Element>) => {
      state.model.elements.delete(action.payload.id);
    },
    upsertRelationship: (state, action: PayloadAction<Relationship>) => {
      state.model.relationships.set(action.payload.id, action.payload);
    },
    removeRelationship: (state, action: PayloadAction<Relationship>) => {
      state.model.relationships.delete(action.payload.id);
    },
  },
});

export const {
  setModel,
  setCode,
  upsertElement,
  removeElement,
  upsertRelationship,
  removeRelationship,
} = diagramSlice.actions;

export default diagramSlice.reducer;
