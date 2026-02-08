import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  type DiagramModel,
  createEmptyDiagram,
} from "../../domain/models/DiagramModel";
import type { Element } from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import { CodeGenerator } from "../../infrastructure/codegen/CodeGenerator";

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
    parseCode: (state, action: PayloadAction<string>) => {
      try {
        const tokens = new Lexer(action.payload).tokenize();
        const parsedModel = new Parser(tokens).parse();

        state.model = parsedModel;
        state.code = action.payload;
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
  upsertElement,
  removeElement,
  upsertRelationship,
  removeRelationship,
  parseCode,
  generateCode,
} = diagramSlice.actions;

export default diagramSlice.reducer;
