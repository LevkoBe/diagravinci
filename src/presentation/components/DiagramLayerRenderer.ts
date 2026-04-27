import Konva from "konva";
import { screenToWorld } from "./rendering/relationships/arrowUtils";
import type { Element } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";
import type { Colors, RenderCallbacks } from "./rendering/types";
import { ElementEventHandler } from "./rendering/elements/ElementEventHandler";
import {
  RelationshipRenderer,
  type ViewportRect,
  type GeometryCache,
} from "./rendering/relationships/RelationshipRenderer";
import { SvgPathElementRenderer } from "./rendering/elements/SvgPathElementRenderer";
import { SimpleRectElementRenderer } from "./rendering/elements/SimpleRectElementRenderer";
import { PolygonElementRenderer } from "./rendering/elements/PolygonElementRenderer";
import type { IElementRenderer } from "./rendering/elements/BaseElementRenderer";
import type { RenderStyle, RelLineStyle } from "../../application/store/uiSlice";

import {
  computeElementSizes,
  type ElementSizes,
} from "./rendering/elementSizing";
import {
  computeClassDiagramContent,
  computeTextModeSuppressedPaths,
  shouldUseClassDiagramMode,
} from "./rendering/elements/classDiagramUtils";

function createElementRenderer(
  renderStyle: RenderStyle,
  element: Element,
  path: string,
  viewState: ViewState,
  connectingFromId: string | null,
  colors: Colors,
  isNew: boolean,
  isDimmed: boolean,
  size: number,
  zoom: number,
  colorOverride: string | null,
): IElementRenderer {
  const args = [
    element,
    path,
    viewState,
    connectingFromId,
    colors,
    isNew,
    isDimmed,
    size,
    zoom,
    colorOverride,
  ] as const;
  switch (renderStyle) {
    case "rect":
      return new SimpleRectElementRenderer(...args);
    case "polygon":
      return new PolygonElementRenderer(...args);
    default:
      return new SvgPathElementRenderer(...args);
  }
}

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
  private readonly tooltipLabels = new Map<string, string>();

  private static _tooltipEl: HTMLDivElement | null = null;

  private static getTooltipEl(): HTMLDivElement {
    if (!DiagramLayerRenderer._tooltipEl) {
      const el = document.createElement("div");
      el.style.cssText =
        "position:fixed;background:rgba(0,0,0,0.72);color:#fff;padding:3px 8px;" +
        "border-radius:4px;font-size:12px;font-family:sans-serif;pointer-events:none;" +
        "display:none;z-index:9999;white-space:nowrap;";
      document.body.appendChild(el);
      DiagramLayerRenderer._tooltipEl = el;
    }
    return DiagramLayerRenderer._tooltipEl;
  }

  private readonly hiddenSet: Set<string>;
  private readonly filterHiddenSet: Set<string>;
  private readonly dimmedSet: Set<string>;

  private readonly pixelSizes: Map<string, number>;

  private readonly zoom: number;
  private readonly renderStyle: RenderStyle;
  private readonly viewportRect: ViewportRect;

  private readonly isReadonly: boolean;
  private readonly executionColorMap: Record<string, string>;
  private readonly classDiagramMode: boolean;

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
    relLineStyle: RelLineStyle = "straight",
    isReadonly = false,
    executionColorMap: Record<string, string> = {},
    classDiagramMode = true,
    elementSizes?: ElementSizes,
    geometryCache?: GeometryCache,
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
    this.executionColorMap = executionColorMap;
    this.classDiagramMode = classDiagramMode;

    const { pixelSizes, zoomHidden, zoomDimmed } =
      elementSizes ?? computeElementSizes(model, this.viewState, zoom);
    this.pixelSizes = pixelSizes;

    this.hiddenSet = new Set([...viewState.hiddenPaths, ...zoomHidden]);
    this.filterHiddenSet = new Set(this.hiddenSet);
    this.dimmedSet = new Set([...viewState.dimmedPaths, ...zoomDimmed]);

    const stagePos = stage.position();
    this.viewportRect = {
      x: -stagePos.x / zoom,
      y: -stagePos.y / zoom,
      w: stage.width() / zoom,
      h: stage.height() / zoom,
    };

    this.relationshipRenderer = new RelationshipRenderer(
      viewState,
      colors,
      this.hiddenSet,
      this.dimmedSet,
      this.viewportRect,
      geometryCache,
      zoom,
      relLineStyle,
    );

    if (classDiagramMode) {
      const suppressed = computeTextModeSuppressedPaths(
        model,
        viewState,
        this.filterHiddenSet,
        this.dimmedSet,
      );
      for (const p of suppressed) this.hiddenSet.add(p);
    }
  }

  render(relationshipLayer: Konva.Layer, elementLayer: Konva.Layer): void {
    relationshipLayer.destroyChildren();
    elementLayer.destroyChildren();

    this.groupMap.clear();
    this.hoverIn.clear();
    this.hoverOut.clear();
    this.hoveredPath = null;

    this.relationshipRenderer.render(relationshipLayer);

    const visited = new Set<string>();
    this.model.root.childIds.forEach((id) => {
      const element = this.model.elements[id];
      if (element) this.renderRecursive(element, elementLayer, id, visited);
    });

    relationshipLayer.batchDraw();
    elementLayer.batchDraw();
  }

  private isOffScreen(path: string): boolean {
    const pos = this.viewState.positions[path];
    if (!pos) return false;
    const { x, y } = pos.position;
    const half = pos.size / 2;
    const vp = this.viewportRect;
    return (
      x + half < vp.x ||
      x - half > vp.x + vp.w ||
      y + half < vp.y ||
      y - half > vp.y + vp.h
    );
  }

  private renderRecursive(
    element: Element,
    elementLayer: Konva.Layer,
    path: string,
    visited: Set<string>,
  ): void {
    if (this.hiddenSet.has(path)) return;

    const skipRender = this.isOffScreen(path);
    const isDimmed = this.dimmedSet.has(path);

    if (!skipRender) {
      const colorOverride =
        this.executionColorMap[element.id] ??
        this.viewState.coloredPaths?.[path] ??
        null;

      const elementGroup = this.renderElement(
        element,
        path,
        isDimmed,
        colorOverride,
      );
      if (elementGroup) {
        elementLayer.add(elementGroup);
      }
    }

    if (
      this.classDiagramMode &&
      !isDimmed &&
      shouldUseClassDiagramMode(element, path, this.viewState, this.filterHiddenSet, this.model)
    ) return;

    if (visited.has(element.id)) return;
    if (this.viewState.foldedPaths.includes(path)) return;

    visited.add(element.id);
    element.childIds.forEach((childId) => {
      const child = this.model.elements[childId];
      if (child) {
        this.renderRecursive(
          child,
          elementLayer,
          `${path}.${childId}`,
          visited,
        );
      }
    });
    visited.delete(element.id);
  }

  private getSize(path: string): number {
    const layoutSize = this.viewState.positions[path]?.size ?? 0;
    return layoutSize > 0 ? layoutSize : (this.pixelSizes.get(path) ?? 30);
  }

  private renderElement(
    element: Element,
    path: string,
    isDimmed = false,
    colorOverride: string | null = null,
  ): Konva.Group | undefined {
    const isNew = !this.prevPaths.has(path);
    const size = this.getSize(path);

    const elementRenderer = createElementRenderer(
      this.renderStyle,
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
    );

    if (
      this.classDiagramMode &&
      !isDimmed &&
      shouldUseClassDiagramMode(element, path, this.viewState, this.filterHiddenSet, this.model)
    ) {
      elementRenderer.setClassDiagramContent(
        computeClassDiagramContent(element, path, this.model, this.filterHiddenSet),
      );
    }

    const renderResult = elementRenderer.render();
    if (!renderResult) return;

    const { group, onHoverIn, onHoverOut, tooltipLabel } = renderResult;
    this.groupMap.set(path, group);
    this.hoverIn.set(path, onHoverIn);
    this.hoverOut.set(path, onHoverOut);
    if (tooltipLabel) {
      this.tooltipLabels.set(path, tooltipLabel);
      group.on("mousemove", () => {
        const tooltip = DiagramLayerRenderer.getTooltipEl();
        const containerRect = this.stage.container().getBoundingClientRect();
        const pointerPos = this.stage.getPointerPosition();
        if (pointerPos) {
          tooltip.style.left = `${containerRect.left + pointerPos.x + 14}px`;
          tooltip.style.top = `${containerRect.top + pointerPos.y - 32}px`;
        }
      });
    }

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
        findHoveredPath: (id, pos) => this.findBestPath(id, pos, null),
        findNewParentPath: (p, pos) =>
          this.findBestPath(p, pos, null) ?? this.model.root.id,
        updateRelationshipLines: (p) => this.updateRelationshipLines(p),
        updateChildRelationshipLines: (p) =>
          this.updateChildRelationshipLines(p),
        moveChildGroups: (p) => this.moveChildGroupsForDrag(p),
        updateChildPositions: (p) => this.updateChildPositions(p),
        getRootId: () => this.model.root.id,
      },
    );

    group.dragBoundFunc(() => {
      const target = this.stage.getPointerPosition() ?? group.getAbsolutePosition();
      const cur = group.getAbsolutePosition();
      return {
        x: cur.x + (target.x - cur.x) * 0.2,
        y: cur.y + (target.y - cur.y) * 0.2,
      };
    });

    const handlers = eventHandler.createHandlers();
    group.on("click", handlers.onClick);
    group.on("mouseenter", handlers.onMouseEnter);
    group.on("mouseleave", handlers.onMouseLeave);
    group.on("dragmove", handlers.onDragMove);
    group.on("dragend", handlers.onDragEnd);
    group.on("contextmenu", (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.evt.preventDefault();
      this.callbacks.onContextMenu?.(element.id, path);
    });

    return group;
  }

  getGroupMap(): Map<string, Konva.Group> {
    return this.groupMap;
  }

  getRelationshipRenderer(): RelationshipRenderer {
    return this.relationshipRenderer;
  }

  private setHovered(path: string | null): void {
    if (path === this.hoveredPath) return;
    if (this.hoveredPath) this.hoverOut.get(this.hoveredPath)?.();
    this.hoveredPath = path;
    if (this.hoveredPath) this.hoverIn.get(this.hoveredPath)?.();

    const label = path ? this.tooltipLabels.get(path) : null;
    const tooltip = DiagramLayerRenderer.getTooltipEl();
    if (label) {
      tooltip.textContent = label;
      const containerRect = this.stage.container().getBoundingClientRect();
      const pointerPos = this.stage.getPointerPosition();
      if (pointerPos) {
        tooltip.style.left = `${containerRect.left + pointerPos.x + 14}px`;
        tooltip.style.top = `${containerRect.top + pointerPos.y - 32}px`;
      }
      tooltip.style.display = "block";
    } else {
      tooltip.style.display = "none";
    }
  }

  private updateRelationshipLines(changedPath: string): void {
    this.relationshipRenderer.updateLinePosition(changedPath, (path: string) =>
      this.getLiveWorldPos(path),
    );
  }

  private forEachChildPath(
    parentPath: string,
    fn: (path: string) => void,
  ): void {
    const prefix = parentPath + ".";
    for (const p of Object.keys(this.viewState.positions)) {
      if (p.startsWith(prefix)) fn(p);
    }
  }

  private updateChildRelationshipLines(parentPath: string): void {
    this.forEachChildPath(parentPath, (p) => this.updateRelationshipLines(p));
  }

  private moveChildGroupsForDrag(parentPath: string): void {
    const parentGroup = this.groupMap.get(parentPath);
    const storedParentPos = this.viewState.positions[parentPath]?.position;
    if (!parentGroup || !storedParentPos) return;

    const newParentPos = screenToWorld(
      parentGroup.getAbsolutePosition(),
      this.stage,
    );
    const delta = {
      x: newParentPos.x - storedParentPos.x,
      y: newParentPos.y - storedParentPos.y,
    };

    this.forEachChildPath(parentPath, (p) => {
      const childGroup = this.groupMap.get(p);
      const storedChildPos = this.viewState.positions[p]?.position;
      if (childGroup && storedChildPos) {
        childGroup.x(storedChildPos.x + delta.x);
        childGroup.y(storedChildPos.y + delta.y);
      }
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

    this.forEachChildPath(parentPath, (p) => {
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

  private findBestPath(
    draggedKey: string,
    worldCenter: { x: number; y: number },
    fallback: string | null,
  ): string | null {
    let bestPath: string | null = null;
    let bestSize = Infinity;

    for (const [path, pos] of Object.entries(this.viewState.positions)) {
      if (path.startsWith(draggedKey)) continue;
      if (this.hiddenSet.has(path)) continue;

      const size = this.getSize(path);
      const dx = worldCenter.x - pos.position.x;
      const dy = worldCenter.y - pos.position.y;

      if (Math.hypot(dx, dy) <= size / 2 && size < bestSize) {
        bestSize = size;
        bestPath = path;
      }
    }

    return bestPath ?? fallback;
  }
}
