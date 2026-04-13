import Konva from "konva";
import type { ViewState } from "../../../../domain/models/ViewState";
import type { RelationshipType } from "../../../../infrastructure/parser/Token";
import {
  parseEndSpec,
  isDashed,
  createDecoration,
  decorationInset,
} from "./arrowUtils";
import type { Colors } from "../types";
import { VConfig } from "../../visualConfig";

const RC = VConfig.rendering;

type RelPoints = { points: number[]; nx: number; ny: number; ex1: number; ey1: number; ex2: number; ey2: number };

export class RelationshipRenderer {
  private readonly viewState: ViewState;
  private readonly colors: Colors;
  private readonly hiddenSet: Set<string>;
  private readonly dimmedSet: Set<string>;
  private readonly relGroups = new Map<string, Konva.Group>();

  constructor(
    viewState: ViewState,
    colors: Colors,
    hiddenSet: Set<string>,
    dimmedSet: Set<string>,
  ) {
    this.viewState = viewState;
    this.colors = colors;
    this.hiddenSet = hiddenSet;
    this.dimmedSet = dimmedSet;
  }

  private populateRelGroup(
    group: Konva.Group,
    result: RelPoints,
    relType: RelationshipType,
    label: string | undefined,
    opacity: number,
  ): void {
    const stroke = this.colors.relationship;
    const spec = parseEndSpec(relType);

    group.add(new Konva.Line({
      points: result.points,
      stroke,
      strokeWidth: RC.REL_STROKE_WIDTH,
      lineCap: "round",
      dash: isDashed(relType) ? RC.REL_DASH as number[] : undefined,
    }));

    if (spec.source !== "none") {
      const sourceDeco = createDecoration(spec.source, spec.sourceFilled, result.ex1, result.ey1, -result.nx, -result.ny, stroke);
      if (sourceDeco) group.add(sourceDeco);
    }
    if (spec.target !== "none") {
      const targetDeco = createDecoration(spec.target, spec.targetFilled, result.ex2, result.ey2, result.nx, result.ny, stroke);
      if (targetDeco) group.add(targetDeco);
    }

    if (label) {
      const midX = (result.points[0] + result.points[2]) / 2;
      const midY = (result.points[1] + result.points[3]) / 2;
      group.add(adaptiveRelLabel(
        label,
        result.points,
        midX - result.ny * RC.REL_LABEL_OFFSET,
        midY + result.nx * RC.REL_LABEL_OFFSET,
        stroke,
        opacity,
      ));
    }
  }

  render(layer: Konva.Layer): void {
    this.relGroups.clear();

    this.viewState.relationships.forEach((rel) => {
      const { sourcePath, targetPath } = rel;
      if (this.hiddenSet.has(sourcePath) || this.hiddenSet.has(targetPath)) return;

      const isDimmed = this.dimmedSet.has(sourcePath) || this.dimmedSet.has(targetPath);
      const opacity = isDimmed ? RC.REL_DIM_OPACITY : RC.REL_NORMAL_OPACITY;

      const sourcePos = this.viewState.positions[sourcePath];
      const targetPos = this.viewState.positions[targetPath];
      if (!sourcePos || !targetPos) return;

      const result = computeRelPoints(
        sourcePos.position.x, sourcePos.position.y, sourcePos.size,
        targetPos.position.x, targetPos.position.y, targetPos.size,
        rel.type,
      );
      if (!result.points) return;

      const group = new Konva.Group({ opacity });
      layer.add(group);
      this.relGroups.set(rel.id, group);
      this.populateRelGroup(group, result as RelPoints, rel.type, rel.label, opacity);
    });
  }

  updateLinePosition(
    changedPath: string,
    getWorldPos: (path: string) => { x: number; y: number } | null,
  ): void {
    this.viewState.relationships.forEach((rel) => {
      if (rel.sourcePath !== changedPath && rel.targetPath !== changedPath) return;

      const group = this.relGroups.get(rel.id);
      if (!group) return;

      group.destroyChildren();

      const sp = getWorldPos(rel.sourcePath);
      const tp = getWorldPos(rel.targetPath);
      if (!sp || !tp) return;

      const sourceSize = this.viewState.positions[rel.sourcePath]?.size ?? 0;
      const targetSize = this.viewState.positions[rel.targetPath]?.size ?? 0;

      const result = computeRelPoints(sp.x, sp.y, sourceSize, tp.x, tp.y, targetSize, rel.type);
      if (!result.points) return;

      const isDimmed = this.dimmedSet.has(rel.sourcePath) || this.dimmedSet.has(rel.targetPath);
      const opacity = isDimmed ? RC.REL_DIM_OPACITY : RC.REL_NORMAL_OPACITY;

      this.populateRelGroup(group, result as RelPoints, rel.type, rel.label, opacity);
      group.getLayer()?.batchDraw();
    });
  }

  clear(): void {
    this.relGroups.clear();
  }
}

function adaptiveRelLabel(
  text: string,
  points: number[],
  x: number,
  y: number,
  fill: string,
  opacity: number,
): Konva.Text {
  const lineLen = Math.sqrt(
    (points[2] - points[0]) ** 2 + (points[3] - points[1]) ** 2,
  );
  const maxWidth = Math.max(lineLen * 0.7, 40);

  const heuristicFont = (maxWidth * VConfig.elements.LABEL_TARGET_WIDTH_RATIO) / (text.length * VConfig.elements.CHAR_WIDTH_RATIO);
  const fontSize = Math.max(RC.REL_LABEL_MIN_FONT, Math.min(RC.REL_LABEL_MAX_FONT_THRESHOLD, heuristicFont));
  const useEllipsis = heuristicFont < RC.REL_LABEL_MIN_FONT;

  const label = new Konva.Text({
    x,
    y,
    text,
    fontSize,
    fontFamily: "system-ui, sans-serif",
    fill,
    opacity,
    offsetY: fontSize / 2,
    align: "center",
    width: maxWidth,
    ellipsis: useEllipsis,
    wrap: "none",
    padding: 2,
  });
  label.offsetX(label.width() / 2);
  return label;
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
