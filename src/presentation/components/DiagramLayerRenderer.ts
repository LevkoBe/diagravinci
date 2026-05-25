import Konva from "konva";
import { screenToWorld } from "./rendering/relationships/arrowUtils";
import type { Element } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";
import type { Colors, RenderCallbacks } from "./rendering/types";
import type { Selector } from "../../domain/models/Selector";
import { matchesSelector } from "../../domain/sync/FilterResolver";
import { ElementEventHandler } from "./rendering/elements/ElementEventHandler";
import {
  RelationshipRenderer,
  type GeometryCache,
} from "./rendering/relationships/RelationshipRenderer";
import { SvgPathElementRenderer } from "./rendering/elements/SvgPathElementRenderer";
import { SimpleRectElementRenderer } from "./rendering/elements/SimpleRectElementRenderer";
import { PolygonElementRenderer } from "./rendering/elements/PolygonElementRenderer";
import type { IElementRenderer } from "./rendering/elements/BaseElementRenderer";
import type {
  RenderStyle,
  RelLineStyle,
} from "../../application/store/uiSlice";

import {
  computeElementSizes,
  MAX_SCREEN_RATIO,
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
  maxScreenPx: number,
  opaqueElementBg: boolean,
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
    maxScreenPx,
    opaqueElementBg,
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
  private static readonly DRAG_TARGET_PX = 60;

  private readonly _dragState: {
    path: string | null;
    scales: Map<string, number>;
  };
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
  private readonly maxScreenPx: number;
  private readonly renderStyle: RenderStyle;

  private readonly isReadonly: boolean;
  private readonly isPresentation: boolean;
  private readonly executionColorMap: Record<string, string>;
  private readonly classDiagramMode: boolean;
  private readonly opaqueElementBg: boolean;
  private readonly getGroupMoveInfo?: () => {
    selectorId: string | null;
    filterSelectors: Selector[];
  };

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
    isPresentation = false,
    executionColorMap: Record<string, string> = {},
    classDiagramMode = true,
    elementSizes?: ElementSizes,
    geometryCache?: GeometryCache,
    getGroupMoveInfo?: () => {
      selectorId: string | null;
      filterSelectors: Selector[];
    },
    opaqueElementBg = true,
    dragState?: { path: string | null; scales: Map<string, number> },
  ) {
    this.stage = stage;
    this.model = model;
    this.viewState = viewState;
    this.connectingFromId = connectingFromId;
    this.colors = colors;
    this.callbacks = callbacks;
    this.prevPaths = prevPaths;
    this.zoom = zoom;
    this.maxScreenPx =
      Math.min(stage.width(), stage.height()) * MAX_SCREEN_RATIO;
    this.renderStyle = renderStyle;
    this.isReadonly = isReadonly;
    this.isPresentation = isPresentation;
    this.executionColorMap = executionColorMap;
    this.classDiagramMode = classDiagramMode;
    this.opaqueElementBg = opaqueElementBg;
    this.getGroupMoveInfo = getGroupMoveInfo;
    this._dragState = dragState ?? { path: null, scales: new Map() };

    const { pixelSizes, zoomHidden, zoomDimmed } =
      elementSizes ??
      computeElementSizes(model, this.viewState, zoom, {
        width: stage.width(),
        height: stage.height(),
      });
    this.pixelSizes = pixelSizes;

    this.hiddenSet = new Set([...viewState.hiddenPaths, ...zoomHidden]);
    for (const foldedPath of viewState.foldedPaths) {
      const prefix = foldedPath + ".";
      for (const p of Object.keys(viewState.positions)) {
        if (p.startsWith(prefix)) this.hiddenSet.add(p);
      }
    }
    this.filterHiddenSet = new Set(this.hiddenSet);
    this.dimmedSet = new Set([...viewState.dimmedPaths, ...zoomDimmed]);

    this.relationshipRenderer = new RelationshipRenderer(
      viewState,
      colors,
      this.hiddenSet,
      this.dimmedSet,
      undefined,
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
    elementLayer.destroyChildren();
    if (relationshipLayer !== elementLayer) relationshipLayer.destroyChildren();

    this.groupMap.clear();
    this.hoverIn.clear();
    this.hoverOut.clear();
    this.hoveredPath = null;

    const elementsByDepth = new Map<number, Konva.Group[]>();
    const visited = new Set<string>();
    this.model.root.childIds.forEach((id) => {
      const element = this.model.elements[id];
      if (element)
        this.collectElementsByDepth(element, id, visited, 1, elementsByDepth);
    });

    const posDepthMap = new Map<string, number>();
    for (const path of Object.keys(this.viewState.positions)) {
      posDepthMap.set(path, path.split(".").length);
    }
    const relsByDepth =
      this.relationshipRenderer.buildGroupsByDepth(posDepthMap);

    const allDepths = new Set([
      ...elementsByDepth.keys(),
      ...relsByDepth.keys(),
    ]);
    const maxDepth = allDepths.size > 0 ? Math.max(...allDepths) : 0;
    for (let depth = 1; depth <= maxDepth; depth++) {
      for (const group of elementsByDepth.get(depth) ?? [])
        elementLayer.add(group);
      for (const group of relsByDepth.get(depth) ?? [])
        relationshipLayer.add(group);
    }

    if (this._dragState.scales.size > 0) {
      for (const [p, s] of this._dragState.scales) {
        const grp = this.groupMap.get(p);
        if (grp) {
          grp.scale({ x: s, y: s });
          grp.moveToTop();
        }
      }

      if (this._dragState.path) {
        const parentGroup = this.groupMap.get(this._dragState.path);
        if (parentGroup) {
          this.forEachChildPath(this._dragState.path, (childPath) => {
            const childGroup = this.groupMap.get(childPath);
            if (childGroup) {
              childGroup.x(parentGroup.x());
              childGroup.y(parentGroup.y());
            }
          });
        }
      }
    }

    elementLayer.batchDraw();
    if (relationshipLayer !== elementLayer) relationshipLayer.batchDraw();
  }

  private collectElementsByDepth(
    element: Element,
    path: string,
    visited: Set<string>,
    depth: number,
    byDepth: Map<number, Konva.Group[]>,
  ): void {
    if (this.hiddenSet.has(path)) return;

    const isDimmed = this.dimmedSet.has(path);
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
      const arr = byDepth.get(depth) ?? [];
      arr.push(elementGroup);
      byDepth.set(depth, arr);
    }

    if (
      this.classDiagramMode &&
      !isDimmed &&
      shouldUseClassDiagramMode(
        element,
        path,
        this.viewState,
        this.filterHiddenSet,
        this.model,
      )
    )
      return;

    if (visited.has(element.id)) return;
    if (this.viewState.foldedPaths.includes(path)) return;

    visited.add(element.id);
    element.childIds.forEach((childId) => {
      const child = this.model.elements[childId];
      if (child)
        this.collectElementsByDepth(
          child,
          `${path}.${childId}`,
          visited,
          depth + 1,
          byDepth,
        );
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
      this.maxScreenPx,
      this.opaqueElementBg,
    );

    if (
      this.classDiagramMode &&
      !isDimmed &&
      shouldUseClassDiagramMode(
        element,
        path,
        this.viewState,
        this.filterHiddenSet,
        this.model,
      )
    ) {
      elementRenderer.setClassDiagramContent(
        computeClassDiagramContent(
          element,
          path,
          this.model,
          this.filterHiddenSet,
        ),
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

    if (this.isPresentation) {
      group.draggable(false);
      group.on("mouseenter", () => {
        this.stage.container().style.cursor = "pointer";
        this.setHovered(path);
      });
      group.on("mouseleave", () => {
        this.stage.container().style.cursor = "default";
        this.setHovered(null);
      });
      group.on("click tap", (e: Konva.KonvaEventObject<MouseEvent>) => {
        this.callbacks.onClick?.(
          path,
          e.evt.shiftKey,
          e.evt.ctrlKey || e.evt.metaKey,
        );
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
        moveGroupPeers: (path, worldPos) =>
          this.moveGroupPeersForDrag(path, worldPos),
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
      const target =
        this.stage.getPointerPosition() ?? group.getAbsolutePosition();
      const cur = group.getAbsolutePosition();
      return {
        x: cur.x + (target.x - cur.x) * 0.2,
        y: cur.y + (target.y - cur.y) * 0.2,
      };
    });

    let dragScale: number | null = null;
    const childDragScales = new Map<string, number>();
    const peerDragScales = new Map<string, number>();

    const handlers = eventHandler.createHandlers();
    group.on("click tap", handlers.onClick);
    group.on("mouseenter", handlers.onMouseEnter);
    group.on("mouseleave", handlers.onMouseLeave);
    group.on("dragstart", () => {
      group.moveToTop();
      this._dragState.path = path;
      const rect = group.getClientRect();
      const longest = Math.max(rect.width, rect.height, 1);
      dragScale = Math.min(DiagramLayerRenderer.DRAG_TARGET_PX / longest, 1);
      group.scale({ x: dragScale, y: dragScale });
      this._dragState.scales.set(path, dragScale);
      childDragScales.clear();
      this.forEachChildPath(path, (childPath) => {
        const childGroup = this.groupMap.get(childPath);
        if (!childGroup) return;
        const childRect = childGroup.getClientRect();
        const childLongest = Math.max(childRect.width, childRect.height, 1);
        const cs = Math.min(
          DiagramLayerRenderer.DRAG_TARGET_PX / childLongest,
          1,
        );
        childDragScales.set(childPath, cs);
        this._dragState.scales.set(childPath, cs);
        childGroup.scale({ x: cs, y: cs });
        childGroup.x(group.x());
        childGroup.y(group.y());
        childGroup.moveToTop();
      });

      peerDragScales.clear();
      if (this.getGroupMoveInfo) {
        const { selectorId, filterSelectors } = this.getGroupMoveInfo();
        if (selectorId) {
          const sel = filterSelectors.find((s) => s.id === selectorId);
          const rules = this.model.rules ?? [];
          if (sel && matchesSelector(path, sel, this.model, rules)) {
            for (const gp of Object.keys(this.viewState.positions)) {
              if (gp === path || childDragScales.has(gp)) continue;
              if (!matchesSelector(gp, sel, this.model, rules)) continue;
              const peerGroup = this.groupMap.get(gp);
              if (!peerGroup) continue;
              const peerRect = peerGroup.getClientRect();
              const peerLongest = Math.max(peerRect.width, peerRect.height, 1);
              const ps = Math.min(
                DiagramLayerRenderer.DRAG_TARGET_PX / peerLongest,
                1,
              );
              peerDragScales.set(gp, ps);
              this._dragState.scales.set(gp, ps);
              peerGroup.scale({ x: ps, y: ps });
              peerGroup.moveToTop();
            }
          }
        }
      }
    });
    group.on("dragmove", (e: Konva.KonvaEventObject<DragEvent>) => {
      if (dragScale !== null) {
        group.scale({ x: dragScale, y: dragScale });
      }

      for (const [gp, ps] of peerDragScales) {
        const peerGroup = this.groupMap.get(gp);
        if (peerGroup) peerGroup.scale({ x: ps, y: ps });
      }
      handlers.onDragMove(e);

      for (const [childPath, cs] of childDragScales) {
        const childGroup = this.groupMap.get(childPath);
        if (childGroup) childGroup.scale({ x: cs, y: cs });
      }
    });
    group.on("dragend", (e: Konva.KonvaEventObject<DragEvent>) => {
      const had = dragScale !== null && this._dragState.path === path;
      dragScale = null;
      if (had) {
        this._dragState.path = null;
        group.scale({ x: 1, y: 1 });
        const storedParentPos = this.viewState.positions[path]?.position;
        if (storedParentPos) {
          const newParentPos = screenToWorld(
            group.getAbsolutePosition(),
            this.stage,
          );
          const delta = {
            x: newParentPos.x - storedParentPos.x,
            y: newParentPos.y - storedParentPos.y,
          };
          this.forEachChildPath(path, (childPath) => {
            const childGroup = this.groupMap.get(childPath);
            const storedChildPos =
              this.viewState.positions[childPath]?.position;
            if (childGroup && storedChildPos) {
              childGroup.x(storedChildPos.x + delta.x);
              childGroup.y(storedChildPos.y + delta.y);
              childGroup.scale({ x: 1, y: 1 });
            }
          });
        }
        for (const gp of peerDragScales.keys()) {
          this.groupMap.get(gp)?.scale({ x: 1, y: 1 });
        }
      }
      childDragScales.clear();
      peerDragScales.clear();
      this._dragState.scales.clear();
      handlers.onDragEnd(e);
    });
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
    const sizeOverride =
      this._dragState.scales.size > 0
        ? (path: string) => {
            const s = this._dragState.scales.get(path);
            if (s === undefined) return null;
            return (this.viewState.positions[path]?.size ?? 0) * s;
          }
        : undefined;
    this.relationshipRenderer.updateLinePosition(
      changedPath,
      (path: string) => this.getLiveWorldPos(path),
      sizeOverride,
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

    if (this._dragState.path === parentPath) {
      this.forEachChildPath(parentPath, (p) => {
        const childGroup = this.groupMap.get(p);
        if (childGroup) {
          childGroup.x(parentGroup.x());
          childGroup.y(parentGroup.y());
        }
      });
      return;
    }

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

  private moveGroupPeersForDrag(
    path: string,
    worldPos: { x: number; y: number },
  ): void {
    if (!this.getGroupMoveInfo) return;
    const { selectorId, filterSelectors } = this.getGroupMoveInfo();
    if (!selectorId) return;
    const sel = filterSelectors.find((s) => s.id === selectorId);
    if (!sel) return;

    const rules = this.model.rules ?? [];
    if (!matchesSelector(path, sel, this.model, rules)) return;

    const startPos = this.viewState.positions[path]?.position;
    if (!startPos) return;

    const delta = { x: worldPos.x - startPos.x, y: worldPos.y - startPos.y };

    for (const [gp, posEntry] of Object.entries(this.viewState.positions)) {
      if (gp === path) continue;
      if (!matchesSelector(gp, sel, this.model, rules)) continue;
      const group = this.groupMap.get(gp);
      if (group) {
        group.x(posEntry.position.x + delta.x);
        group.y(posEntry.position.y + delta.y);
        this.updateRelationshipLines(gp);
      }
    }
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
