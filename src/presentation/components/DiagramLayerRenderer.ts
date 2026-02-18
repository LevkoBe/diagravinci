import Konva from "konva";
import { ELEMENT_SVGS } from "../ElementConfigs";
import type { Element } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";
import type { RelationshipType } from "../../infrastructure/parser/Token";

export type Colors = {
  accent: string;
  fgPrimary: string;
  selected: string;
  bgSecondary: string;
  relationship: string;
};

export type RenderCallbacks = {
  onPositionChange: (path: string, worldPos: { x: number; y: number }) => void;
  onReparent: (elementId: string, newParentId: string) => void;
  onClick: (elementId: string) => void;
};

export function screenToWorld(
  pos: { x: number; y: number },
  stage: Konva.Stage,
): { x: number; y: number } {
  return {
    x: (pos.x - stage.x()) / stage.scaleX(),
    y: (pos.y - stage.y()) / stage.scaleY(),
  };
}

function isDashed(type: RelationshipType): boolean {
  return type.startsWith("..");
}

interface EndSpec {
  source: "none" | "arrow" | "triangle" | "diamond" | "circle";
  target: "none" | "arrow" | "triangle" | "diamond" | "circle";
  sourceFilled: boolean;
  targetFilled: boolean;
}

function parseEndSpec(type: RelationshipType): EndSpec {
  switch (type) {
    case "-->":
      return {
        source: "none",
        target: "arrow",
        sourceFilled: false,
        targetFilled: false,
      };
    case "..>":
      return {
        source: "none",
        target: "arrow",
        sourceFilled: false,
        targetFilled: false,
      };
    case "--|>":
      return {
        source: "none",
        target: "triangle",
        sourceFilled: false,
        targetFilled: false,
      };
    case "..|>":
      return {
        source: "none",
        target: "triangle",
        sourceFilled: false,
        targetFilled: false,
      };
    case "o--":
      return {
        source: "circle",
        target: "none",
        sourceFilled: false,
        targetFilled: false,
      };
    case "*--":
      return {
        source: "diamond",
        target: "none",
        sourceFilled: true,
        targetFilled: false,
      };
    case "--o":
      return {
        source: "none",
        target: "circle",
        sourceFilled: false,
        targetFilled: false,
      };
    case "--*":
      return {
        source: "none",
        target: "diamond",
        sourceFilled: false,
        targetFilled: true,
      };
    case "<--":
      return {
        source: "arrow",
        target: "none",
        sourceFilled: false,
        targetFilled: false,
      };
    case "<..":
      return {
        source: "arrow",
        target: "none",
        sourceFilled: false,
        targetFilled: false,
      };
    case "<|--":
      return {
        source: "triangle",
        target: "none",
        sourceFilled: false,
        targetFilled: false,
      };
    case "<|..":
      return {
        source: "triangle",
        target: "none",
        sourceFilled: false,
        targetFilled: false,
      };
  }
}

function addDecoration(
  layer: Konva.Layer,
  kind: EndSpec["source"],
  filled: boolean,
  px: number,
  py: number,
  nx: number,
  ny: number,
  stroke: string,
): void {
  if (kind === "none") return;

  const tx = -ny;
  const ty = nx;

  if (kind === "arrow") {
    const size = 8;
    layer.add(
      new Konva.Line({
        points: [
          px - nx * size + tx * (size * 0.45),
          py - ny * size + ty * (size * 0.45),
          px,
          py,
          px - nx * size - tx * (size * 0.45),
          py - ny * size - ty * (size * 0.45),
        ],
        stroke,
        strokeWidth: 1.5,
        lineCap: "round",
        lineJoin: "round",
        opacity: 0.7,
      }),
    );
    return;
  }

  if (kind === "triangle") {
    const h = 12;
    const w = 7;
    const bx = px - nx * h;
    const by = py - ny * h;
    layer.add(
      new Konva.Line({
        points: [
          px,
          py,
          bx + tx * w,
          by + ty * w,
          bx - tx * w,
          by - ty * w,
          px,
          py,
        ],
        closed: true,
        stroke,
        strokeWidth: 1.5,
        fill: filled ? stroke : "transparent",
        opacity: 0.7,
      }),
    );
    return;
  }

  if (kind === "diamond") {
    const h = 10;
    const w = 5;
    const midX = px - nx * h;
    const midY = py - ny * h;
    const backX = px - nx * h * 2;
    const backY = py - ny * h * 2;
    layer.add(
      new Konva.Line({
        points: [
          px,
          py,
          midX + tx * w,
          midY + ty * w,
          backX,
          backY,
          midX - tx * w,
          midY - ty * w,
          px,
          py,
        ],
        closed: true,
        stroke,
        strokeWidth: 1.5,
        fill: filled ? stroke : "transparent",
        opacity: 0.7,
      }),
    );
    return;
  }

  if (kind === "circle") {
    const r = 5;
    layer.add(
      new Konva.Circle({
        x: px - nx * r,
        y: py - ny * r,
        radius: r,
        stroke,
        strokeWidth: 1.5,
        fill: "transparent",
        opacity: 0.7,
      }),
    );
  }
}

function decorationInset(kind: EndSpec["source"]): number {
  switch (kind) {
    case "arrow":
      return 8;
    case "triangle":
      return 12;
    case "diamond":
      return 20;
    case "circle":
      return 10;
    default:
      return 0;
  }
}

export class DiagramLayerRenderer {
  private readonly stage: Konva.Stage;
  private readonly model: DiagramModel;
  private readonly viewState: ViewState;
  private readonly selectedElementId: string | null;
  private readonly colors: Colors;
  private readonly callbacks: RenderCallbacks;

  private readonly groupMap = new Map<string, Konva.Group>();
  private hoveredPath: string | null = null;
  private readonly hoverIn = new Map<string, () => void>();
  private readonly hoverOut = new Map<string, () => void>();

  constructor(
    stage: Konva.Stage,
    model: DiagramModel,
    viewState: ViewState,
    selectedElementId: string | null,
    colors: Colors,
    callbacks: RenderCallbacks,
  ) {
    this.stage = stage;
    this.model = model;
    this.viewState = viewState;
    this.selectedElementId = selectedElementId;
    this.colors = colors;
    this.callbacks = callbacks;
  }

  render(relationshipLayer: Konva.Layer, elementLayer: Konva.Layer): void {
    relationshipLayer.destroyChildren();
    elementLayer.destroyChildren();
    this.groupMap.clear();
    this.hoverIn.clear();
    this.hoverOut.clear();
    this.hoveredPath = null;

    this.renderRelationships(relationshipLayer);

    this.model.root.childIds.forEach((id) => {
      const element = this.model.elements[id];
      if (element) {
        this.renderRecursive(
          element,
          elementLayer,
          `${this.model.root.id}.${id}`,
        );
      }
    });

    relationshipLayer.batchDraw();
    elementLayer.batchDraw();
  }

  private renderRelationships(layer: Konva.Layer): void {
    this.viewState.relationships.forEach((rel) => {
      const sourcePos = this.viewState.positions[rel.sourcePath];
      const targetPos = this.viewState.positions[rel.targetPath];
      if (!sourcePos || !targetPos) return;

      const sx = sourcePos.position.x;
      const sy = sourcePos.position.y;
      const tx = targetPos.position.x;
      const ty = targetPos.position.y;

      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;
      const nx = dx / len;
      const ny = dy / len;

      const stroke = this.colors.relationship;
      const spec = parseEndSpec(rel.type);
      const dashed = isDashed(rel.type);

      const ex1 = sx + nx * (sourcePos.size / 2);
      const ey1 = sy + ny * (sourcePos.size / 2);
      const ex2 = tx - nx * (targetPos.size / 2);
      const ey2 = ty - ny * (targetPos.size / 2);

      const sourceInset = decorationInset(spec.source);
      const targetInset = decorationInset(spec.target);
      const lx1 = ex1 + nx * sourceInset;
      const ly1 = ey1 + ny * sourceInset;
      const lx2 = ex2 - nx * targetInset;
      const ly2 = ey2 - ny * targetInset;

      const line = new Konva.Line({
        points: [lx1, ly1, lx2, ly2],
        stroke,
        strokeWidth: 1.5,
        lineCap: "round",
        dash: dashed ? [8, 6] : undefined,
        opacity: 0,
      });
      layer.add(line);
      new Konva.Tween({
        node: line,
        duration: 0.3,
        easing: Konva.Easings.EaseOut,
        opacity: 0.7,
      }).play();

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
        const midX = (lx1 + lx2) / 2;
        const midY = (ly1 + ly2) / 2;
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
      const dx = worldCenter.x - pos.position.x;
      const dy = worldCenter.y - pos.position.y;
      if (Math.sqrt(dx * dx + dy * dy) <= pos.size / 2 && pos.size < bestSize) {
        bestSize = pos.size;
        bestPath = path;
      }
    });
    return bestPath;
  }

  private findNewParentId(
    draggedElementId: string,
    worldCenter: { x: number; y: number },
  ): string {
    let bestElementId = "root";
    let bestSize = Infinity;
    Object.entries(this.viewState.positions).forEach(([path, pos]) => {
      if (path.split(".").at(-1) === draggedElementId) return;
      const dx = worldCenter.x - pos.position.x;
      const dy = worldCenter.y - pos.position.y;
      if (Math.sqrt(dx * dx + dy * dy) <= pos.size / 2 && pos.size < bestSize) {
        bestSize = pos.size;
        bestElementId = path.split(".").at(-1)!;
      }
    });
    return bestElementId;
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

    const group = new Konva.Group({
      x: localX,
      y: localY,
      draggable: true,
      scaleX: 0,
      scaleY: 0,
    });
    this.groupMap.set(path, group);

    new Konva.Tween({
      node: group,
      duration: 0.25,
      easing: Konva.Easings.EaseOut,
      scaleX: 1,
      scaleY: 1,
    }).play();

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
      if (!pointer) return;
      this.setHovered(
        this.findHoveredPath(element.id, screenToWorld(pointer, this.stage)),
      );
    });

    group.on("dragend", (e) => {
      e.cancelBubble = true;
      this.setHovered(null);
      const worldPos = screenToWorld(group.getAbsolutePosition(), this.stage);
      this.callbacks.onPositionChange(path, worldPos);
      Object.keys(this.viewState.positions).forEach((p) => {
        if (!p.startsWith(path + ".")) return;
        const childGroup = this.groupMap.get(p);
        if (!childGroup) return;
        this.callbacks.onPositionChange(
          p,
          screenToWorld(childGroup.getAbsolutePosition(), this.stage),
        );
      });
      this.callbacks.onReparent(
        element.id,
        this.findNewParentId(element.id, worldPos),
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

    const pos = this.viewState.positions[path];
    if (!pos) return;

    element.childIds.forEach((childId) => {
      const child = this.model.elements[childId];
      if (child) {
        this.renderRecursive(child, group, `${path}.${childId}`, pos.position);
      }
    });
  }
}
