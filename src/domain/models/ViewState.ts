import type { Position } from "./Element";

export interface PositionedElement {
  id: string;
  position: Position;
}

export interface ViewState {
  positions: Record<string, PositionedElement>;
  viewMode: "basic" | "hierarchical" | "timeline" | "pipeline";
  zoom: number;
  pan: Position;
}

export function createEmptyViewState(): ViewState {
  return {
    positions: {},
    viewMode: "basic",
    zoom: 1,
    pan: { x: 0, y: 0 },
  };
}

export function updateElementPosition(
  viewState: ViewState,
  elementId: string,
  position: Position,
): ViewState {
  return {
    ...viewState,
    positions: {
      ...viewState.positions,
      [elementId]: {
        ...viewState.positions[elementId],
        id: elementId,
        position,
      },
    },
  };
}
