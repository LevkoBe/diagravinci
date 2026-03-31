import Konva from "konva";
import { screenToWorld } from "./rendering/relationships/arrowUtils";
import type { Element } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";
import type { Colors, RenderCallbacks } from "./rendering/types";
import { ElementEventHandler } from "./rendering/elements/ElementEventHandler";
import { RelationshipRenderer } from "./rendering/relationships/RelationshipRenderer";
import { SvgPathElementRenderer } from "./rendering/elements/SvgPathElementRenderer";
import { SimpleRectElementRenderer } from "./rendering/elements/SimpleRectElementRenderer";
import { PolygonElementRenderer } from "./rendering/elements/PolygonElementRenderer";
import type { RenderStyle } from "../../application/store/uiSlice";

import { computeElementSizes } from "./rendering/elementSizing";

export class DiagramLayerRenderer {
  private readonly stage: Konva.Stage;
  private readonly model: DiagramModel;
  private readonly viewState: ViewState;
  private readonly connectingFromId: string | null;
  private readonly colors: Colors;
  private readonly callbacks: RenderCallbacks;
  private readonly prevPaths: Set<string>;
  private readonly groupMap = new Map<string, Konva.Group>();
  private readonly relationshipRenderer: RelationshipRenderer;
  private hoveredPath: string | null = null;
  private readonly hoverIn = new Map<string, () => void>();
  private readonly hoverOut = new Map<string, () => void>();

  private readonly hiddenSet: Set<string>;
  private readonly dimmedSet: Set<string>;

  private readonly pixelSizes: Map<string, number>;

  private readonly zoom: number;
  private readonly renderStyle: RenderStyle;

  private readonly isReadonly: boolean;

  constructor(
    stage: Konva.Stage,
    model: DiagramModel,
    viewState: ViewState,
    connectingFromId: string | null,
    colors: Colors,
    callbacks: RenderCallbacks,
    prevPaths: Set<string>,
    zoom: number,
    renderStyle: RenderStyle = "polygon",
    isReadonly = false,
  ) {
    this.stage = stage;
    this.model = model;
    this.viewState = viewState;
    this.connectingFromId = connectingFromId;
    this.colors = colors;
    this.callbacks = callbacks;
    this.prevPaths = prevPaths;
    this.zoom = zoom;
    this.renderStyle = renderStyle;
    this.isReadonly = isReadonly;

    const { pixelSizes, zoomHidden, zoomDimmed } = computeElementSizes(
      model,
      zoom,
    );
    this.pixelSizes = pixelSizes;

    this.hiddenSet = new Set([...viewState.hiddenPaths, ...zoomHidden]);
    this.dimmedSet = new Set([...viewState.dimmedPaths, ...zoomDimmed]);

    console.log("[DiagramLayerRenderer] Filter sets:", {
      hidden: this.hiddenSet.size,
      dimmed: this.dimmedSet.size,
      folded: viewState.foldedPaths.length,
    });

    this.relationshipRenderer = new RelationshipRenderer(
      viewState,
      colors,
      this.hiddenSet,
      this.dimmedSet,
    );
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
    if (this.hiddenSet.has(path)) {
      console.log("[DiagramLayerRenderer] Skipping hidden element:", path);
      return;
    }

    const isDimmed = this.dimmedSet.has(path);
    if (isDimmed) {
      console.log("[DiagramLayerRenderer] Rendering dimmed element:", path);
    }

    const colorOverride = this.viewState.coloredPaths?.[path] ?? null;

    const elementGroup = this.renderElement(
      element,
      path,
      parentPos,
      isDimmed,
      colorOverride,
    );
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

    if (this.viewState.foldedPaths.includes(path)) {
      console.log(
        "[DiagramLayerRenderer] Element folded, skipping children:",
        path,
      );
      return;
    }

    const pos = this.viewState.positions[path];
    if (!pos) return;

    element.childIds.forEach((childId) => {
      const child = this.model.elements[childId];
      if (child) {
        this.renderRecursive(
          child,
          elementGroup,
          `${path}.${childId}`,
          pos.position,
        );
      }
    });
  }

  private getSize(path: string): number {
    const layoutSize = this.viewState.positions[path]?.size ?? 0;
    return layoutSize > 0 ? layoutSize : (this.pixelSizes.get(path) ?? 30);
  }

  private renderElement(
    element: Element,
    path: string,
    parentPos?: { x: number; y: number },
    isDimmed = false,
    colorOverride: string | null = null,
  ): Konva.Group | undefined {
    const isNew = !this.prevPaths.has(path);
    const size = this.getSize(path);

    const args = [
      element,
      path,
      this.viewState,
      this.connectingFromId,
      this.colors,
      isNew,
      isDimmed,
      size,
      this.zoom,
      colorOverride,
    ] as const;

    const elementRenderer =
      this.renderStyle === "rect"
        ? new SimpleRectElementRenderer(...args)
        : this.renderStyle === "polygon"
          ? new PolygonElementRenderer(...args)
          : new SvgPathElementRenderer(...args);

    const renderResult = elementRenderer.render(parentPos);
    if (!renderResult) return;

    const { group, onHoverIn, onHoverOut } = renderResult;
    this.groupMap.set(path, group);
    this.hoverIn.set(path, onHoverIn);
    this.hoverOut.set(path, onHoverOut);

    if (this.isReadonly) {
      group.draggable(false);
      group.on("mouseenter", () => {
        this.stage.container().style.cursor = "default";
        this.setHovered(path);
      });
      group.on("mouseleave", () => {
        this.stage.container().style.cursor = "default";
        this.setHovered(null);
      });
      return group;
    }

    const eventHandler = new ElementEventHandler(
      { id: element.id, path },
      path,
      this.stage,
      {
        onClick: this.callbacks.onClick,
        onPositionChange: this.callbacks.onPositionChange,
        onReparent: this.callbacks.onReparent,
        setHovered: (p) => this.setHovered(p),
        findHoveredPath: (id, pos) => this.findHoveredPath(id, pos),
        findNewParentPath: (p, pos) => this.findNewParentPath(p, pos),
        updateRelationshipLines: (p) => this.updateRelationshipLines(p),
        updateChildRelationshipLines: (p) =>
          this.updateChildRelationshipLines(p),
        updateChildPositions: (p) => this.updateChildPositions(p),
        getRootId: () => this.model.root.id,
      },
    );

    const handlers = eventHandler.createHandlers();
    group.on("click", handlers.onClick);
    group.on("mouseenter", handlers.onMouseEnter);
    group.on("mouseleave", handlers.onMouseLeave);
    group.on("dragmove", handlers.onDragMove);
    group.on("dragend", handlers.onDragEnd);
    group.on("contextmenu", (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.evt.preventDefault();
      console.log("[DiagramLayerRenderer] RMC contextmenu on path:", path);
      this.callbacks.onContextMenu?.(element.id, path);
    });

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
      if (p.startsWith(parentPath + ".")) this.updateRelationshipLines(p);
    });
  }

  private updateChildPositions(parentPath: string): void {
    const parentGroup = this.groupMap.get(parentPath);
    const oldParentPos = this.viewState.positions[parentPath]?.position;
    let delta: { x: number; y: number } | null = null;
    if (parentGroup && oldParentPos) {
      const newParentPos = screenToWorld(
        parentGroup.getAbsolutePosition(),
        this.stage,
      );
      delta = {
        x: newParentPos.x - oldParentPos.x,
        y: newParentPos.y - oldParentPos.y,
      };
    }

    Object.keys(this.viewState.positions).forEach((p) => {
      if (!p.startsWith(parentPath + ".")) return;
      const childGroup = this.groupMap.get(p);
      if (childGroup) {
        this.callbacks.onPositionChange(
          p,
          screenToWorld(childGroup.getAbsolutePosition(), this.stage),
        );
      } else if (delta) {
        const oldPos = this.viewState.positions[p]?.position;
        if (oldPos) {
          this.callbacks.onPositionChange(p, {
            x: oldPos.x + delta.x,
            y: oldPos.y + delta.y,
          });
        }
      }
    });
  }

  private getLiveWorldPos(path: string): { x: number; y: number } | null {
    const group = this.groupMap.get(path);
    if (group) return screenToWorld(group.getAbsolutePosition(), this.stage);
    return this.viewState.positions[path]?.position ?? null;
  }

  private findHoveredPath(
    draggedElementId: string,
    worldCenter: { x: number; y: number },
  ): string | null {
    let bestPath: string | null = null;
    let bestSize = Infinity;

    for (const [path, pos] of Object.entries(this.viewState.positions)) {
      if (path.startsWith(draggedElementId)) continue;
      if (this.hiddenSet.has(path)) continue;

      const size = this.getSize(path);
      const dx = worldCenter.x - pos.position.x;
      const dy = worldCenter.y - pos.position.y;

      if (Math.hypot(dx, dy) <= size / 2 && size < bestSize) {
        bestSize = size;
        bestPath = path;
      }
    }

    return bestPath;
  }

  private findNewParentPath(
    draggedElementPath: string,
    worldCenter: { x: number; y: number },
  ): string {
    let bestPath: string | null = null;
    let bestSize = Infinity;

    for (const [path, pos] of Object.entries(this.viewState.positions)) {
      if (path.startsWith(draggedElementPath)) continue;
      if (this.hiddenSet.has(path)) continue;

      const size = this.getSize(path);
      const dx = worldCenter.x - pos.position.x;
      const dy = worldCenter.y - pos.position.y;

      if (Math.hypot(dx, dy) <= size / 2 && size < bestSize) {
        bestSize = size;
        bestPath = path;
      }
    }

    return bestPath ?? this.model.root.id;
  }
}
