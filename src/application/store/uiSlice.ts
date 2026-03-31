import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ElementType } from "../../domain/models/Element";
import type { RelationshipType } from "../../infrastructure/parser/Token";

export type InteractionMode =
  | "select"
  | "create"
  | "connect"
  | "delete"
  | "disconnect"
  | "readonly";
export type ZoomCommand = { type: "in" | "out" | "reset"; ts: number };
export type RenderStyle = "svg" | "rect" | "polygon";

export interface UIState {
  interactionMode: InteractionMode;
  activeElementType: ElementType;
  activeRelationshipType: RelationshipType;
  connectingFromId: string | null;
  selectedElementIds: string[];
  zoomCommand: ZoomCommand | null;
  renderStyle: RenderStyle;
}

const initialState: UIState = {
  interactionMode: "select",
  activeElementType: "object",
  activeRelationshipType: "-->",
  connectingFromId: null,
  selectedElementIds: [],
  zoomCommand: null,
  renderStyle: "svg",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setInteractionMode(state, action: PayloadAction<InteractionMode>) {
      state.interactionMode = action.payload;
      state.connectingFromId = null;
    },
    setActiveElementType(state, action: PayloadAction<ElementType>) {
      state.activeElementType = action.payload;
      state.interactionMode = "create";
    },
    setActiveRelationshipType(state, action: PayloadAction<RelationshipType>) {
      state.activeRelationshipType = action.payload;
      state.interactionMode = "connect";
      state.connectingFromId = null;
    },
    setConnectingFromId(state, action: PayloadAction<string | null>) {
      state.connectingFromId = action.payload;
    },

    setSelectedElement(state, action: PayloadAction<string | null>) {
      state.selectedElementIds = action.payload ? [action.payload] : [];
    },

    setSelectedElements(state, action: PayloadAction<string[]>) {
      state.selectedElementIds = action.payload;
    },

    toggleSelectedElement(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.selectedElementIds.indexOf(id);
      if (idx === -1) {
        state.selectedElementIds = [...state.selectedElementIds, id];
      } else {
        state.selectedElementIds = state.selectedElementIds.filter(
          (x) => x !== id,
        );
      }
    },
    clearSelection(state) {
      state.selectedElementIds = [];
    },
    sendZoomCommand(state, action: PayloadAction<"in" | "out" | "reset">) {
      state.zoomCommand = { type: action.payload, ts: Date.now() };
    },
    setRenderStyle(state, action: PayloadAction<RenderStyle>) {
      state.renderStyle = action.payload;
    },
  },
});

export const {
  setInteractionMode,
  setActiveElementType,
  setActiveRelationshipType,
  setConnectingFromId,
  setSelectedElement,
  setSelectedElements,
  toggleSelectedElement,
  clearSelection,
  sendZoomCommand,
  setRenderStyle,
} = uiSlice.actions;

export default uiSlice.reducer;
