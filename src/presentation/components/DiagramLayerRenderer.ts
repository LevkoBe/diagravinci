import Konva from "konva";
import { ElementRenderer } from "./rendering/ElementRenderer";
import { RelationshipRenderer } from "./rendering/RelationshipRenderer";
import { screenToWorld } from "./rendering/arrowUtils";
import type { Element } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";
import type { Colors, RenderCallbacks } from "./rendering/types";
import { ElementEventHandler } from "./rendering/ElementEventHandler";

export class DiagramLayerRenderer {
  private readonly stage: Konva.Stage;
  private readonly model: DiagramModel;
  private readonly viewState: ViewState;
  private readonly selectedElementId: string | null;
  private readonly connectingFromId: string | null;
  private readonly colors: Colors;
  private readonly callbacks: RenderCallbacks;
  private readonly prevPaths: Set<string>;
  private readonly groupMap = new Map<string, Konva.Group>();
  private readonly relationshipRenderer: RelationshipRenderer;
  private hoveredPath: string | null = null;
  private readonly hoverIn = new Map<string, () => void>();
  private readonly hoverOut = new Map<string, () => void>();

  constructor(
    stage: Konva.Stage,
    model: DiagramModel,
    viewState: ViewState,
    selectedElementId: string | null,
    connectingFromId: string | null,
    colors: Colors,
    callbacks: RenderCallbacks,
    prevPaths: Set<string>,
  ) {
    this.stage = stage;
    this.model = model;
    this.viewState = viewState;
    this.selectedElementId = selectedElementId;
    this.connectingFromId = connectingFromId;
    this.colors = colors;
    this.callbacks = callbacks;
    this.prevPaths = prevPaths;

    this.relationshipRenderer = new RelationshipRenderer(viewState, colors);
  }

  render(relationshipLayer: Konva.Layer, elementLayer: Konva.Layer): void {
    relationshipLayer.destroyChildren();
    elementLayer.destroyChildren();

    this.groupMap.clear();
    this.hoverIn.clear();
    this.hoverOut.clear();
    this.hoveredPath = null;

    this.relationshipRenderer.render(relationshipLayer);

    this.model.root.childIds.forEach((id) => {
      const element = this.model.elements[id];
      if (element) this.renderRecursive(element, elementLayer, id);
    });

    relationshipLayer.batchDraw();
    elementLayer.batchDraw();
  }

  private renderRecursive(
    element: Element,
    parentGroup: Konva.Group | Konva.Layer,
    path: string,
    parentPos?: { x: number; y: number },
  ): void {
    const elementGroup = this.renderElement(element, path, parentPos);
    if (!elementGroup) return;

    parentGroup.add(elementGroup);

    if (!this.prevPaths.has(path)) {
      new Konva.Tween({
        node: elementGroup,
        duration: 0.25,
        easing: Konva.Easings.EaseOut,
        scaleX: 1,
        scaleY: 1,
      }).play();
    }

    const pos = this.viewState.positions[path];
    if (!pos) return;

    element.childIds.forEach((childId) => {
      const child = this.model.elements[childId];
      if (child)
        this.renderRecursive(
          child,
          elementGroup,
          `${path}.${childId}`,
          pos.position,
        );
    });
  }

  private renderElement(
    element: Element,
    path: string,
    parentPos?: { x: number; y: number },
  ): Konva.Group | undefined {
    const isNew = !this.prevPaths.has(path);

    const elementRenderer = new ElementRenderer(
      element,
      path,
      this.viewState,
      this.selectedElementId,
      this.connectingFromId,
      this.colors,
      isNew,
    );

    const renderResult = elementRenderer.render(parentPos);
    if (!renderResult) return;

    const { group, onHoverIn, onHoverOut } = renderResult;
    this.groupMap.set(path, group);
    this.hoverIn.set(path, onHoverIn);
    this.hoverOut.set(path, onHoverOut);

    const eventHandler = new ElementEventHandler(element, path, this.stage, {
      onClick: this.callbacks.onClick,
      onPositionChange: this.callbacks.onPositionChange,
      onReparent: this.callbacks.onReparent,
      setHovered: (p) => this.setHovered(p),
      findHoveredPath: (id, pos) => this.findHoveredPath(id, pos),
      findNewParentPath: (id, pos) => this.findNewParentPath(id, pos),
      updateRelationshipLines: (p) => this.updateRelationshipLines(p),
      updateChildRelationshipLines: (p) => this.updateChildRelationshipLines(p),
      updateChildPositions: (p) => this.updateChildPositions(p),
      getRootId: () => this.model.root.id,
    });

    const handlers = eventHandler.createHandlers();

    group.on("click", handlers.onClick);
    group.on("mouseenter", handlers.onMouseEnter);
    group.on("mouseleave", handlers.onMouseLeave);
    group.on("dragmove", handlers.onDragMove);
    group.on("dragend", handlers.onDragEnd);

    return group;
  }

  private setHovered(path: string | null): void {
    if (path === this.hoveredPath) return;
    if (this.hoveredPath) this.hoverOut.get(this.hoveredPath)?.();
    this.hoveredPath = path;
    if (this.hoveredPath) this.hoverIn.get(this.hoveredPath)?.();
  }

  private updateRelationshipLines(changedPath: string): void {
    this.relationshipRenderer.updateLinePosition(changedPath, (path: string) =>
      this.getLiveWorldPos(path),
    );
  }

  private updateChildRelationshipLines(parentPath: string): void {
    Object.keys(this.viewState.positions).forEach((p) => {
      if (p.startsWith(parentPath + ".")) {
        this.updateRelationshipLines(p);
      }
    });
  }

  private updateChildPositions(parentPath: string): void {
    Object.keys(this.viewState.positions).forEach((p) => {
      if (!p.startsWith(parentPath + ".")) return;
      const childGroup = this.groupMap.get(p);
      if (childGroup) {
        this.callbacks.onPositionChange(
          p,
          screenToWorld(childGroup.getAbsolutePosition(), this.stage),
        );
      }
    });
  }

  private getLiveWorldPos(path: string): { x: number; y: number } | null {
    const group = this.groupMap.get(path);
    if (group) {
      return screenToWorld(group.getAbsolutePosition(), this.stage);
    }
    return this.viewState.positions[path]?.position ?? null;
  }

  private findHoveredPath(
    draggedElementId: string,
    worldCenter: { x: number; y: number },
  ): string | null {
    let bestPath: string | null = null;
    let bestSize = Infinity;

    Object.entries(this.viewState.positions).forEach(([path, pos]) => {
      if (path.startsWith(draggedElementId)) return;

      const dx = worldCenter.x - pos.position.x,
        dy = worldCenter.y - pos.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= pos.size / 2 && pos.size < bestSize) {
        bestSize = pos.size;
        bestPath = path;
      }
    });

    return bestPath;
  }

  private findNewParentPath(
    draggedElementId: string,
    worldCenter: { x: number; y: number },
  ): string {
    let bestPath: string | null = null;
    let bestSize = Infinity;

    Object.entries(this.viewState.positions).forEach(([path, pos]) => {
      if (path.startsWith(draggedElementId)) return;

      const dx = worldCenter.x - pos.position.x,
        dy = worldCenter.y - pos.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= pos.size / 2 && pos.size < bestSize) {
        bestSize = pos.size;
        bestPath = path;
      }
    });

    return bestPath ?? this.model.root.id;
  }
}
