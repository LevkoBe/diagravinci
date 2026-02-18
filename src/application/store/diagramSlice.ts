import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  type DiagramModel,
  createEmptyDiagram,
} from "../../domain/models/DiagramModel";
import type { Element, Position } from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";
import type { ViewState } from "../../domain/models/ViewState";
import { createEmptyViewState } from "../../domain/models/ViewState";
import { CodeGenerator } from "../../infrastructure/codegen/CodeGenerator";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";

interface DiagramState {
  model: DiagramModel;
  viewState: ViewState;
  code: string;
  selectedElementId: string | null;
}

const initialState: DiagramState = {
  model: createEmptyDiagram(),
  viewState: createEmptyViewState(),
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
    setViewState: (state, action: PayloadAction<ViewState>) => {
      state.viewState = action.payload;
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
    moveElementToParent: (
      state,
      action: PayloadAction<{ elementId: string; newParentId: string }>,
    ) => {
      const { elementId, newParentId } = action.payload;

      Object.values(state.model.elements).forEach((element) => {
        element.childIds = element.childIds.filter((id) => id !== elementId);
      });
      state.model.root.childIds = state.model.root.childIds.filter(
        (id) => id !== elementId,
      );

      const newParent = state.model.elements[newParentId] || state.model.root;
      if (!newParent.childIds.includes(elementId))
        newParent.childIds.push(elementId);
    },
    upsertElement: (state, action: PayloadAction<Element>) => {
      state.model.elements[action.payload.id] = action.payload;
    },
    removeElement: (state, action: PayloadAction<Element>) => {
      delete state.model.elements[action.payload.id];
    },
    upsertRelationship: (state, action: PayloadAction<Relationship>) => {
      state.model.relationships[action.payload.id] = action.payload;
    },
    removeRelationship: (state, action: PayloadAction<Relationship>) => {
      delete state.model.relationships[action.payload.id];
    },
    setSelectedElement: (state, action: PayloadAction<string | null>) => {
      state.selectedElementId = action.payload;
    },
    parseCode: (state, action: PayloadAction<string>) => {
      try {
        const tokens = new Lexer(action.payload).tokenize();
        const parsedModel = new Parser(tokens).parse();

        state.model = parsedModel;
        state.code = action.payload;
        state.viewState = createEmptyViewState();
      } catch (error) {
        console.error("Parse error:", error);
      }
    },
    generateCode: (state) => {
      const generator = new CodeGenerator(state.model);
      state.code = generator.generate();
    },
  },
});

export const {
  setModel,
  setViewState,
  updateElementPositionInView,
  moveElementToParent,
  upsertElement,
  removeElement,
  upsertRelationship,
  removeRelationship,
  parseCode,
  generateCode,
  setSelectedElement,
} = diagramSlice.actions;

export default diagramSlice.reducer;
