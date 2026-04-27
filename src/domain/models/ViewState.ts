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
  viewMode: "basic" | "hierarchical" | "timeline" | "pipeline" | "circular" | "radial" | "execute";
  zoom: number;
  pan: Position;
  hiddenPaths: string[];
  dimmedPaths: string[];
  foldedPaths: string[];
  coloredPaths: Record<string, string>;
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
    coloredPaths: {},
  };
}

export function updateElementPosition(
  viewState: ViewState,
  elementId: string,
  position: Position,
): ViewState {
  const existing = viewState.positions[elementId];
  if (existing && existing.position.x === position.x && existing.position.y === position.y) {
    return viewState;
  }
  return {
    ...viewState,
    positions: {
      ...viewState.positions,
      [elementId]: existing
        ? { ...existing, position }
        : { id: elementId, position, size: 0, value: 0 },
    },
  };
}
