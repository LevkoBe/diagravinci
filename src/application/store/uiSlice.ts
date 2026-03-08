import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ElementType } from "../../domain/models/Element";
import type { RelationshipType } from "../../infrastructure/parser/Token";

export type InteractionMode =
  | "select"
  | "create"
  | "connect"
  | "delete"
  | "disconnect";
export type ZoomCommand = { type: "in" | "out" | "reset"; ts: number };

export interface UIState {
  interactionMode: InteractionMode;
  activeElementType: ElementType;
  activeRelationshipType: RelationshipType;
  connectingFromId: string | null;
  selectedElementId: string | null;
  zoomCommand: ZoomCommand | null;
}

const initialState: UIState = {
  interactionMode: "select",
  activeElementType: "object",
  activeRelationshipType: "-->",
  connectingFromId: null,
  selectedElementId: null,
  zoomCommand: null,
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
      state.selectedElementId = action.payload;
    },
    sendZoomCommand(state, action: PayloadAction<"in" | "out" | "reset">) {
      state.zoomCommand = { type: action.payload, ts: Date.now() };
    },
  },
});

export const {
  setInteractionMode,
  setActiveElementType,
  setActiveRelationshipType,
  setConnectingFromId,
  setSelectedElement,
  sendZoomCommand,
} = uiSlice.actions;

export default uiSlice.reducer;
