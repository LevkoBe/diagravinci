import Konva from "konva";
import type { EndKind, EndSpec } from "../types";
import type { RelationshipType } from "../../../../infrastructure/parser/Token";
import { VConfig } from "../../visualConfig";

const S = VConfig.shapes;

export function screenToWorld(
  pos: { x: number; y: number },
  stage: Konva.Stage,
): { x: number; y: number } {
  return {
    x: (pos.x - stage.x()) / stage.scaleX(),
    y: (pos.y - stage.y()) / stage.scaleY(),
  };
}

type Source = EndKind;
type Target = EndKind;
type Filled = boolean;
const REL_SPECS: Record<RelationshipType, [Source, Filled, Target, Filled]> = {
  "-->": ["none", false, "arrow", false],
  "..>": ["none", false, "arrow", false],
  "--|>": ["none", false, "triangle", false],
  "..|>": ["none", false, "triangle", false],
  "o--": ["circle", false, "none", false],
  "*--": ["diamond", true, "none", false],
  "--o": ["none", false, "circle", false],
  "--*": ["none", false, "diamond", true],
  "<--": ["arrow", false, "none", false],
  "<..": ["arrow", false, "none", false],
  "<|--": ["triangle", false, "none", false],
  "<|..": ["triangle", false, "none", false],
  "--": ["none", false, "none", false],
  "..": ["none", false, "none", false],
};

export function parseEndSpec(type: RelationshipType): EndSpec {
  const [source, sourceFilled, target, targetFilled] = REL_SPECS[type];
  return { source, sourceFilled, target, targetFilled };
}

export function isDashed(type: RelationshipType): boolean {
  return type.includes("..");
}

export function decorationInset(kind: EndKind): number {
  const insets: Partial<Record<EndKind, number>> = {
    arrow: S.ARROW_INSET,
    triangle: S.TRIANGLE_INSET,
    diamond: S.DIAMOND_INSET,
    circle: S.CIRCLE_INSET,
  };
  return insets[kind] ?? 0;
}

const decorationDrawers: Partial<
  Record<
    EndKind,
    (
      px: number,
      py: number,
      nx: number,
      ny: number,
      tx: number,
      ty: number,
      stroke: string,
      filled: boolean,
    ) => Konva.Shape | null
  >
> = {
  arrow: (px, py, nx, ny, tx, ty, stroke) => {
    const s = S.ARROW_SIZE;
    return new Konva.Line({
      points: [
        px - nx * s + tx * (s * 0.45),
        py - ny * s + ty * (s * 0.45),
        px,
        py,
        px - nx * s - tx * (s * 0.45),
        py - ny * s - ty * (s * 0.45),
      ],
      stroke,
      strokeWidth: VConfig.rendering.DECORATION_STROKE_WIDTH,
      lineCap: "round",
      lineJoin: "round",
    });
  },

  triangle: (px, py, nx, ny, tx, ty, stroke, filled) => {
    const h = S.TRIANGLE_H,
      w = S.TRIANGLE_W;
    const bx = px - nx * h,
      by = py - ny * h;
    return new Konva.Line({
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
      strokeWidth: VConfig.rendering.DECORATION_STROKE_WIDTH,
      fill: filled ? stroke : "transparent",
    });
  },

  diamond: (px, py, nx, ny, tx, ty, stroke, filled) => {
    const h = S.DIAMOND_H,
      w = S.DIAMOND_W;
    const mx = px - nx * h,
      my = py - ny * h;
    const bx = px - nx * h * 2,
      by = py - ny * h * 2;
    return new Konva.Line({
      points: [
        px,
        py,
        mx + tx * w,
        my + ty * w,
        bx,
        by,
        mx - tx * w,
        my - ty * w,
        px,
        py,
      ],
      closed: true,
      stroke,
      strokeWidth: VConfig.rendering.DECORATION_STROKE_WIDTH,
      fill: filled ? stroke : "transparent",
    });
  },

  circle: (px, py, nx, ny, _tx, _ty, stroke) => {
    const r = S.CIRCLE_R;
    return new Konva.Circle({
      x: px - nx * r,
      y: py - ny * r,
      radius: r,
      stroke,
      strokeWidth: VConfig.rendering.DECORATION_STROKE_WIDTH,
      fill: "transparent",
    });
  },
};

export function createDecoration(
  kind: EndKind,
  filled: boolean,
  px: number,
  py: number,
  nx: number,
  ny: number,
  stroke: string,
): Konva.Shape | null {
  const drawer = decorationDrawers[kind];
  if (!drawer) return null;
  return drawer(px, py, nx, ny, -ny, nx, stroke, filled);
}
