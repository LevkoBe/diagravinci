import Konva from "konva";
import { screenToWorld } from "./arrowUtils";

export class ElementEventHandler {
  private readonly element: { id: string; path: string };
  private readonly path: string;
  private readonly stage: Konva.Stage;
  private callbacks: ElementEventCallbacks;

  constructor(
    element: { id: string; path: string },
    path: string,
    stage: Konva.Stage,
    callbacks: ElementEventCallbacks,
  ) {
    this.element = element;
    this.path = path;
    this.stage = stage;
    this.callbacks = callbacks;
  }

  createHandlers(): ElementEventHandlers {
    return {
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        this.callbacks.onClick(this.element.id);
      },

      onMouseEnter: () => {
        this.stage.container().style.cursor = "pointer";
        this.callbacks.setHovered(this.path);
      },

      onMouseLeave: () => {
        this.stage.container().style.cursor = "default";
        this.callbacks.setHovered(null);
      },

      onDragMove: () => {
        const pointer = this.stage.getPointerPosition();
        if (pointer) {
          const worldPos = screenToWorld(pointer, this.stage);
          const hoveredPath = this.callbacks.findHoveredPath(
            this.element.id,
            worldPos,
          );
          this.callbacks.setHovered(hoveredPath);
        }

        this.callbacks.updateRelationshipLines(this.path);
        this.callbacks.updateChildRelationshipLines(this.path);
      },

      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        e.cancelBubble = true;
        this.callbacks.setHovered(null);

        const group = e.target as Konva.Group;
        const worldPos = screenToWorld(group.getAbsolutePosition(), this.stage);

        this.callbacks.onPositionChange(this.path, worldPos);
        this.callbacks.updateChildPositions(this.path);

        const segments = this.path.split(".");
        const oldParentPath =
          segments.length === 1
            ? this.callbacks.getRootId()
            : segments.slice(0, -1).join(".");

        const newParentPath = this.callbacks.findNewParentPath(
          this.element.path,
          worldPos,
        );

        if (oldParentPath !== newParentPath) {
          this.callbacks.onReparent(
            this.element.id,
            oldParentPath,
            newParentPath,
          );
        }
      },
    };
  }
}

export interface ElementEventCallbacks {
  onClick: (elementId: string) => void;
  onPositionChange: (path: string, worldPos: { x: number; y: number }) => void;
  onReparent: (
    elementId: string,
    oldParentPath: string,
    newParentPath: string,
  ) => void;
  setHovered: (path: string | null) => void;
  findHoveredPath: (
    draggedElementId: string,
    worldCenter: { x: number; y: number },
  ) => string | null;
  findNewParentPath: (
    draggedElementPath: string,
    worldCenter: { x: number; y: number },
  ) => string;
  updateRelationshipLines: (changedPath: string) => void;
  updateChildRelationshipLines: (parentPath: string) => void;
  updateChildPositions: (parentPath: string) => void;
  getRootId: () => string;
}

export interface ElementEventHandlers {
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseEnter: (e?: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseLeave: (e?: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}
