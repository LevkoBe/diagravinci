import Konva from "konva";
import type { EndKind, EndSpec } from "../types";
import type { RelationshipType } from "../../../../infrastructure/parser/Token";

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
    arrow: 8,
    triangle: 12,
    diamond: 20,
    circle: 10,
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
    const s = 8;
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
      strokeWidth: 1.5,
      lineCap: "round",
      lineJoin: "round",
    });
  },

  triangle: (px, py, nx, ny, tx, ty, stroke, filled) => {
    const h = 12,
      w = 7;
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
      strokeWidth: 1.5,
      fill: filled ? stroke : "transparent",
    });
  },

  diamond: (px, py, nx, ny, tx, ty, stroke, filled) => {
    const h = 10,
      w = 5;
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
      strokeWidth: 1.5,
      fill: filled ? stroke : "transparent",
    });
  },

  circle: (px, py, nx, ny, _tx, _ty, stroke) => {
    const r = 5;
    return new Konva.Circle({
      x: px - nx * r,
      y: py - ny * r,
      radius: r,
      stroke,
      strokeWidth: 1.5,
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
