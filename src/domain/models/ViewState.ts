import type { Position } from "./Element";
import type { RelationshipType } from "../../infrastructure/parser/Token";

export interface PositionedElement {
  id: string;
  position: Position;
  size: number;
  value: number;
  isRecursive?: boolean;
}

export interface PositionedRelationship {
  id: string;
  sourcePath: string;
  targetPath: string;
  type: RelationshipType;
  label?: string;
}

export interface ViewState {
  positions: Record<string, PositionedElement>;
  relationships: PositionedRelationship[];
  viewMode: "basic" | "hierarchical" | "timeline" | "pipeline" | "circular";
  zoom: number;
  pan: Position;
  hiddenPaths: string[];
  dimmedPaths: string[];
  foldedPaths: string[];
}

export function createEmptyViewState(): ViewState {
  return {
    positions: {},
    relationships: [],
    viewMode: "basic",
    zoom: 1,
    pan: { x: 0, y: 0 },
    hiddenPaths: [],
    dimmedPaths: [],
    foldedPaths: [],
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
