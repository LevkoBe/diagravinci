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

  render(layer: Konva.Layer): void {
    this.relGroups.clear();

    this.viewState.relationships.forEach((rel) => {
      const sourcePath = rel.sourcePath;
      const targetPath = rel.targetPath;

      if (this.hiddenSet.has(sourcePath) || this.hiddenSet.has(targetPath)) {
        return;
      }

      const isDimmed =
        this.dimmedSet.has(sourcePath) || this.dimmedSet.has(targetPath);
      const opacity = isDimmed ? RC.REL_DIM_OPACITY : RC.REL_NORMAL_OPACITY;

      const sourcePos = this.viewState.positions[sourcePath];
      const targetPos = this.viewState.positions[targetPath];
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

      const group = new Konva.Group({ opacity });
      layer.add(group);
      this.relGroups.set(rel.id, group);

      const line = new Konva.Line({
        points,
        stroke,
        strokeWidth: RC.REL_STROKE_WIDTH,
        lineCap: "round",
        dash: isDashed(rel.type) ? RC.REL_DASH as number[] : undefined,
      });
      group.add(line);

      if (spec.source !== "none") {
        const sourceDeco = createDecoration(
          spec.source,
          spec.sourceFilled,
          ex1,
          ey1,
          -nx,
          -ny,
          stroke,
        );
        if (sourceDeco) group.add(sourceDeco);
      }
      if (spec.target !== "none") {
        const targetDeco = createDecoration(
          spec.target,
          spec.targetFilled,
          ex2,
          ey2,
          nx,
          ny,
          stroke,
        );
        if (targetDeco) group.add(targetDeco);
      }

      if (rel.label) {
        const midX = (points[0] + points[2]) / 2;
        const midY = (points[1] + points[3]) / 2;
        const label = new Konva.Text({
          x: midX - ny * RC.REL_LABEL_OFFSET,
          y: midY + nx * RC.REL_LABEL_OFFSET,
          text: rel.label,
          fontSize: RC.REL_LABEL_FONT_SIZE,
          fill: stroke,
          opacity: opacity,
          offsetY: 6,
          align: "center",
        });
        label.offsetX(label.width() / 2);
        group.add(label);
      }
    });
  }

  updateLinePosition(
    changedPath: string,
    getWorldPos: (path: string) => { x: number; y: number } | null,
  ): void {
    this.viewState.relationships.forEach((rel) => {
      if (rel.sourcePath !== changedPath && rel.targetPath !== changedPath)
        return;

      const group = this.relGroups.get(rel.id);
      if (!group) return;

      group.destroyChildren();

      const sp = getWorldPos(rel.sourcePath);
      const tp = getWorldPos(rel.targetPath);
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

      const stroke = this.colors.relationship;
      const spec = parseEndSpec(rel.type);

      const line = new Konva.Line({
        points: result.points,
        stroke,
        strokeWidth: RC.REL_STROKE_WIDTH,
        lineCap: "round",
        dash: isDashed(rel.type) ? RC.REL_DASH as number[] : undefined,
      });
      group.add(line);

      if (spec.source !== "none") {
        const sourceDeco = createDecoration(
          spec.source,
          spec.sourceFilled,
          result.ex1,
          result.ey1,
          -result.nx,
          -result.ny,
          stroke,
        );
        if (sourceDeco) group.add(sourceDeco);
      }
      if (spec.target !== "none") {
        const targetDeco = createDecoration(
          spec.target,
          spec.targetFilled,
          result.ex2,
          result.ey2,
          result.nx,
          result.ny,
          stroke,
        );
        if (targetDeco) group.add(targetDeco);
      }

      if (rel.label) {
        const midX = (result.points[0] + result.points[2]) / 2;
        const midY = (result.points[1] + result.points[3]) / 2;
        const label = new Konva.Text({
          x: midX - result.ny * RC.REL_LABEL_OFFSET,
          y: midY + result.nx * RC.REL_LABEL_OFFSET,
          text: rel.label,
          fontSize: RC.REL_LABEL_FONT_SIZE,
          fill: stroke,
          opacity: 0.9,
          offsetY: 6,
          align: "center",
        });
        label.offsetX(label.width() / 2);
        group.add(label);
      }

      group.getLayer()?.batchDraw();
    });
  }

  clear(): void {
    this.relGroups.clear();
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
