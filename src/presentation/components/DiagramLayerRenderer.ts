import Konva from "konva";
import { ELEMENT_SVGS } from "../ElementConfigs";
import type { Element } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";
import {
  parseEndSpec,
  isDashed,
  decorationInset,
  addDecoration,
  screenToWorld,
} from "./rendering/arrowUtils";
import type { Colors, RenderCallbacks } from "./rendering/types";
import type { RelationshipType } from "../../infrastructure/parser/Token";

const RECURSIVE_COLOR = "#f97316";
const CONNECTING_FROM_COLOR = "#3b82f6";

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
  private readonly relLineNodes = new Map<string, Konva.Line>();
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
  }

  render(relationshipLayer: Konva.Layer, elementLayer: Konva.Layer): void {
    relationshipLayer.destroyChildren();
    elementLayer.destroyChildren();
    this.groupMap.clear();
    this.relLineNodes.clear();
    this.hoverIn.clear();
    this.hoverOut.clear();
    this.hoveredPath = null;

    this.renderRelationships(relationshipLayer);
    this.model.root.childIds.forEach((id) => {
      const element = this.model.elements[id];
      if (element) this.renderRecursive(element, elementLayer, id);
    });
    relationshipLayer.batchDraw();
    elementLayer.batchDraw();
  }

  private renderRelationships(layer: Konva.Layer): void {
    this.viewState.relationships.forEach((rel) => {
      const sourcePos = this.viewState.positions[rel.sourcePath];
      const targetPos = this.viewState.positions[rel.targetPath];
      if (!sourcePos || !targetPos) return;

      const { points, nx, ny, ex1, ey1, ex2, ey2 } = computeRelPoints(
        sourcePos.position.x,
        sourcePos.position.y,
        sourcePos.size,
        targetPos.position.x,
        targetPos.position.y,
        targetPos.size,
        rel.type,
      );
      if (!points) return;

      const stroke = this.colors.relationship;
      const spec = parseEndSpec(rel.type);

      const line = new Konva.Line({
        points,
        stroke,
        strokeWidth: 1.5,
        lineCap: "round",
        dash: isDashed(rel.type) ? [8, 6] : undefined,
        opacity: 0.7,
      });
      layer.add(line);
      this.relLineNodes.set(rel.id, line);

      addDecoration(
        layer,
        spec.source,
        spec.sourceFilled,
        ex1,
        ey1,
        -nx,
        -ny,
        stroke,
      );
      addDecoration(
        layer,
        spec.target,
        spec.targetFilled,
        ex2,
        ey2,
        nx,
        ny,
        stroke,
      );

      if (rel.label) {
        const midX = (points[0] + points[2]) / 2;
        const midY = (points[1] + points[3]) / 2;
        const label = new Konva.Text({
          x: midX + -ny * 12,
          y: midY + nx * 12,
          text: rel.label,
          fontSize: 10,
          fill: stroke,
          opacity: 0.85,
          offsetY: 6,
          align: "center",
        });
        label.offsetX(label.width() / 2);
        layer.add(label);
      }
    });
  }

  private getLiveWorldPos(path: string): { x: number; y: number } | null {
    const group = this.groupMap.get(path);
    if (group) return screenToWorld(group.getAbsolutePosition(), this.stage);
    return this.viewState.positions[path]?.position ?? null;
  }

  private updateRelationshipLines(changedPath: string): void {
    this.viewState.relationships.forEach((rel) => {
      if (rel.sourcePath !== changedPath && rel.targetPath !== changedPath)
        return;
      const line = this.relLineNodes.get(rel.id);
      if (!line) return;
      const sp = this.getLiveWorldPos(rel.sourcePath);
      const tp = this.getLiveWorldPos(rel.targetPath);
      if (!sp || !tp) return;
      const sourceSize = this.viewState.positions[rel.sourcePath]?.size ?? 0;
      const targetSize = this.viewState.positions[rel.targetPath]?.size ?? 0;
      const result = computeRelPoints(
        sp.x,
        sp.y,
        sourceSize,
        tp.x,
        tp.y,
        targetSize,
        rel.type,
      );
      if (!result.points) return;
      line.points(result.points);
      line.getLayer()?.batchDraw();
    });
  }

  private setHovered(path: string | null): void {
    if (path === this.hoveredPath) return;
    if (this.hoveredPath) this.hoverOut.get(this.hoveredPath)?.();
    this.hoveredPath = path;
    if (this.hoveredPath) this.hoverIn.get(this.hoveredPath)?.();
  }

  private findHoveredPath(
    draggedElementId: string,
    worldCenter: { x: number; y: number },
  ): string | null {
    let bestPath: string | null = null;
    let bestSize = Infinity;
    Object.entries(this.viewState.positions).forEach(([path, pos]) => {
      if (path.split(".").at(-1) === draggedElementId) return;
      const dx = worldCenter.x - pos.position.x,
        dy = worldCenter.y - pos.position.y;
      if (Math.sqrt(dx * dx + dy * dy) <= pos.size / 2 && pos.size < bestSize) {
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
      if (path.split(".").at(-1) === draggedElementId) return;
      const dx = worldCenter.x - pos.position.x,
        dy = worldCenter.y - pos.position.y;
      if (Math.sqrt(dx * dx + dy * dy) <= pos.size / 2 && pos.size < bestSize) {
        bestSize = pos.size;
        bestPath = path;
      }
    });
    return bestPath ?? this.model.root.id;
  }

  private renderElement(
    element: Element,
    path: string,
    parentPos?: { x: number; y: number },
  ): Konva.Group | undefined {
    const pos = this.viewState.positions[path];
    if (!pos) return;

    const config = ELEMENT_SVGS[element.type];
    const size = pos.size;
    const scale = size / Math.max(config.viewBoxWidth, config.viewBoxHeight);
    const strokeWidth = Math.pow(size, 0.4) / scale;
    const localX = parentPos ? pos.position.x - parentPos.x : pos.position.x;
    const localY = parentPos ? pos.position.y - parentPos.y : pos.position.y;
    const isNew = !this.prevPaths.has(path);

    const group = new Konva.Group({
      x: localX,
      y: localY,
      draggable: true,
      scaleX: isNew ? 0 : 1,
      scaleY: isNew ? 0 : 1,
    });
    this.groupMap.set(path, group);

    const hasVisibleChildren = Object.keys(this.viewState.positions).some(
      (p) =>
        p.startsWith(path + ".") &&
        p.split(".").length === path.split(".").length + 1,
    );

    if (hasVisibleChildren) {
      group.add(
        new Konva.Circle({
          radius: size / 2,
          fill: this.colors.bgSecondary,
          opacity: 0.3,
        }),
      );
    }

    if (pos.isRecursive) {
      group.add(
        new Konva.Circle({
          radius: size / 2 + 5,
          stroke: RECURSIVE_COLOR,
          strokeWidth: 2,
          dash: [5, 4],
          listening: false,
        }),
      );
      group.add(
        new Konva.Text({
          text: "↺",
          fontSize: Math.max(10, size * 0.28),
          fill: RECURSIVE_COLOR,
          x: size * 0.18,
          y: -(size / 2 + 16),
          listening: false,
        }),
      );
    }

    if (this.connectingFromId === element.id) {
      group.add(
        new Konva.Circle({
          radius: size / 2 + (pos.isRecursive ? 14 : 8),
          stroke: CONNECTING_FROM_COLOR,
          strokeWidth: 2.5,
          listening: false,
        }),
      );
    }

    const pathNode = new Konva.Path({
      data: config.data,
      stroke:
        this.selectedElementId === element.id
          ? this.colors.selected
          : this.colors.accent,
      strokeWidth,
      scale: { x: scale, y: scale },
      x: -(config.viewBoxWidth * scale) / 2,
      y: -(config.viewBoxHeight * scale) / 2,
    });
    group.add(pathNode);

    const fontSize = 12;
    group.add(
      new Konva.Text({
        text: element.id,
        fontSize,
        fill: this.colors.fgPrimary,
        x: -size / 2,
        y: hasVisibleChildren ? size / 2 + 4 : -fontSize / 2,
        width: size,
        align: "center",
      }),
    );

    const hoverScale = 1.15;
    const hoverStrokeWidth = strokeWidth * 0.8;
    this.hoverIn.set(path, () => {
      new Konva.Tween({
        node: group,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        scaleX: hoverScale,
        scaleY: hoverScale,
      }).play();
      new Konva.Tween({
        node: pathNode,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        strokeWidth: hoverStrokeWidth,
      }).play();
    });
    this.hoverOut.set(path, () => {
      new Konva.Tween({
        node: group,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        scaleX: 1,
        scaleY: 1,
      }).play();
      new Konva.Tween({
        node: pathNode,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        strokeWidth,
      }).play();
    });

    group.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      this.setHovered(path);
    });
    group.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      this.setHovered(null);
    });

    group.on("dragmove", () => {
      const pointer = this.stage.getPointerPosition();
      if (pointer)
        this.setHovered(
          this.findHoveredPath(element.id, screenToWorld(pointer, this.stage)),
        );
      this.updateRelationshipLines(path);
      Object.keys(this.viewState.positions).forEach((p) => {
        if (p.startsWith(path + ".")) this.updateRelationshipLines(p);
      });
    });

    group.on("dragend", (e) => {
      e.cancelBubble = true;
      this.setHovered(null);
      const worldPos = screenToWorld(group.getAbsolutePosition(), this.stage);
      this.callbacks.onPositionChange(path, worldPos);
      Object.keys(this.viewState.positions).forEach((p) => {
        if (!p.startsWith(path + ".")) return;
        const childGroup = this.groupMap.get(p);
        if (childGroup)
          this.callbacks.onPositionChange(
            p,
            screenToWorld(childGroup.getAbsolutePosition(), this.stage),
          );
      });
      const segments = path.split(".");
      const oldParentPath =
        segments.length === 1
          ? this.model.root.id
          : segments.slice(0, -1).join(".");
      this.callbacks.onReparent(
        element.id,
        oldParentPath,
        this.findNewParentPath(element.id, worldPos),
      );
    });

    group.on("click", (e) => {
      e.cancelBubble = true;
      this.callbacks.onClick(element.id);
    });

    return group;
  }

  private renderRecursive(
    element: Element,
    parentGroup: Konva.Group | Konva.Layer,
    path: string,
    parentPos?: { x: number; y: number },
  ): void {
    const group = this.renderElement(element, path, parentPos);
    if (!group) return;
    parentGroup.add(group);

    if (!this.prevPaths.has(path)) {
      new Konva.Tween({
        node: group,
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
        this.renderRecursive(child, group, `${path}.${childId}`, pos.position);
    });
  }
}

function computeRelPoints(
  sx: number,
  sy: number,
  sSize: number,
  tx: number,
  ty: number,
  tSize: number,
  relType: RelationshipType,
): {
  points: number[] | null;
  nx: number;
  ny: number;
  ex1: number;
  ey1: number;
  ex2: number;
  ey2: number;
} {
  const dx = tx - sx,
    dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0)
    return { points: null, nx: 0, ny: 0, ex1: sx, ey1: sy, ex2: tx, ey2: ty };
  const nx = dx / len,
    ny = dy / len;
  const spec = parseEndSpec(relType);
  const ex1 = sx + nx * (sSize / 2),
    ey1 = sy + ny * (sSize / 2);
  const ex2 = tx - nx * (tSize / 2),
    ey2 = ty - ny * (tSize / 2);
  const lx1 = ex1 + nx * decorationInset(spec.source),
    ly1 = ey1 + ny * decorationInset(spec.source);
  const lx2 = ex2 - nx * decorationInset(spec.target),
    ly2 = ey2 - ny * decorationInset(spec.target);
  return { points: [lx1, ly1, lx2, ly2], nx, ny, ex1, ey1, ex2, ey2 };
}
