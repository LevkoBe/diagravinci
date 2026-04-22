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

export function decorationInset(kind: EndKind, zoom: number): number {
  const insets: Partial<Record<EndKind, number>> = {
    arrow: S.ARROW_INSET,
    triangle: S.TRIANGLE_INSET,
    diamond: S.DIAMOND_INSET,
    circle: S.CIRCLE_INSET,
  };
  return (insets[kind] ?? 0) / zoom;
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
      strokeWidth: number,
      zoom: number,
    ) => Konva.Shape | null
  >
> = {
  arrow: (px, py, nx, ny, tx, ty, stroke, _filled, strokeWidth, zoom) => {
    const s = S.ARROW_SIZE / zoom;
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
      strokeWidth,
      lineCap: "round",
      lineJoin: "round",
    });
  },

  triangle: (px, py, nx, ny, tx, ty, stroke, filled, strokeWidth, zoom) => {
    const h = S.TRIANGLE_H / zoom,
      w = S.TRIANGLE_W / zoom;
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
      strokeWidth,
      fill: filled ? stroke : "transparent",
    });
  },

  diamond: (px, py, nx, ny, tx, ty, stroke, filled, strokeWidth, zoom) => {
    const h = S.DIAMOND_H / zoom,
      w = S.DIAMOND_W / zoom;
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
      strokeWidth,
      fill: filled ? stroke : "transparent",
    });
  },

  circle: (px, py, nx, ny, _tx, _ty, stroke, _filled, strokeWidth, zoom) => {
    const r = S.CIRCLE_R / zoom;
    return new Konva.Circle({
      x: px - nx * r,
      y: py - ny * r,
      radius: r,
      stroke,
      strokeWidth,
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
  strokeWidth: number,
  zoom: number,
): Konva.Shape | null {
  const drawer = decorationDrawers[kind];
  if (!drawer) return null;
  return drawer(px, py, nx, ny, -ny, nx, stroke, filled, strokeWidth, zoom);
}

export function computeRelPoints(
  sx: number,
  sy: number,
  sSize: number,
  tx: number,
  ty: number,
  tSize: number,
  relType: RelationshipType,
  zoom: number,
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

  const lx1 = ex1 + nx * decorationInset(spec.source, zoom),
    ly1 = ey1 + ny * decorationInset(spec.source, zoom);
  const lx2 = ex2 - nx * decorationInset(spec.target, zoom),
    ly2 = ey2 - ny * decorationInset(spec.target, zoom);

  return { points: [lx1, ly1, lx2, ly2], nx, ny, ex1, ey1, ex2, ey2 };
}
