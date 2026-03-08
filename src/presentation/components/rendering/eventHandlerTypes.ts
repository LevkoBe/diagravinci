import Konva from "konva";
import type { RenderCallbacks } from "./types";

export interface ElementEventHandlerDependencies {
  stage: Konva.Stage;
  callbacks: RenderCallbacks;
  getLiveWorldPos: (path: string) => { x: number; y: number } | null;
  findHoveredPath: (
    draggedElementId: string,
    worldCenter: { x: number; y: number },
  ) => string | null;
  findNewParentPath: (
    draggedElementId: string,
    worldCenter: { x: number; y: number },
  ) => string;
  updateRelationshipLines: (changedPath: string) => void;
  setHovered: (path: string | null) => void;
}
