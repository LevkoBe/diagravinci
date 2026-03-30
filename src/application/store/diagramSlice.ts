import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  type DiagramModel,
  createEmptyDiagram,
} from "../../domain/models/DiagramModel";
import type { Element, Position } from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";
import type {
  ViewState,
  PositionedElement,
  PositionedRelationship,
} from "../../domain/models/ViewState";
import { createEmptyViewState } from "../../domain/models/ViewState";

interface DiagramState {
  model: DiagramModel;
  viewState: ViewState;
  code: string;
  canvasSize: { width: number; height: number };
}

const initialState: DiagramState = {
  model: createEmptyDiagram(),
  viewState: createEmptyViewState(),
  code: "",
  canvasSize: { width: 800, height: 600 },
};

const diagramSlice = createSlice({
  name: "diagram",
  initialState,
  reducers: {
    setModel: (state, action: PayloadAction<DiagramModel>) => {
      state.model = action.payload;
    },
    setViewState: (state, action: PayloadAction<ViewState>) => {
      state.viewState = action.payload;
    },
    setCode: (state, action: PayloadAction<string>) => {
      state.code = action.payload;
    },
    setCanvasSize: (
      state,
      action: PayloadAction<{ width: number; height: number }>,
    ) => {
      state.canvasSize = action.payload;
    },
    updateElementPositionInView: (
      state,
      action: PayloadAction<{ id: string; position: Position }>,
    ) => {
      const { id, position } = action.payload;
      if (state.viewState.positions[id]) {
        state.viewState.positions[id].position = position;
      }
    },
    upsertElement: (state, action: PayloadAction<Element>) => {
      state.model.elements[action.payload.id] = action.payload;
    },
    removeElement: (state, action: PayloadAction<string>) => {
      delete state.model.elements[action.payload];
    },
    upsertRelationship: (state, action: PayloadAction<Relationship>) => {
      state.model.relationships[action.payload.id] = action.payload;
    },
    removeRelationship: (state, action: PayloadAction<string>) => {
      delete state.model.relationships[action.payload];
    },
    setViewMode: (state, action: PayloadAction<ViewState["viewMode"]>) => {
      state.viewState.viewMode = action.payload;
    },
    pruneElements: (state, { payload: ids }: PayloadAction<string[]>) => {
      for (const id of ids) {
        delete state.model.elements[id];
      }
      state.model.root.childIds = state.model.root.childIds.filter(
        (id) => !ids.includes(id),
      );
    },
    restoreHistory: (
      state,
      action: PayloadAction<{
        code: string;
        model: DiagramModel;
        positions: Record<string, PositionedElement>;
        relationships: PositionedRelationship[];
        viewMode: ViewState["viewMode"];
      }>,
    ) => {
      const { code, model, positions, relationships, viewMode } =
        action.payload;
      state.code = code;
      state.model = model;
      state.viewState = {
        ...state.viewState,
        positions,
        relationships,
        viewMode,
      };
    },
  },
});

export const {
  setModel,
  setViewState,
  setCode,
  setCanvasSize,
  updateElementPositionInView,
  upsertElement,
  removeElement,
  upsertRelationship,
  removeRelationship,
  setViewMode,
  pruneElements,
  restoreHistory,
} = diagramSlice.actions;

export default diagramSlice.reducer;
export type { DiagramState };
