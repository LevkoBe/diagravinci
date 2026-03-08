import Konva from "konva";
import {
  parseEndSpec,
  isDashed,
  decorationInset,
  addDecoration,
} from "./arrowUtils";
import type { ViewState } from "../../../domain/models/ViewState";
import type { Colors } from "./types";
import type { RelationshipType } from "../../../infrastructure/parser/Token";

export class RelationshipRenderer {
  private readonly viewState: ViewState;
  private readonly colors: Colors;
  private readonly relLineNodes = new Map<string, Konva.Line>();

  constructor(viewState: ViewState, colors: Colors) {
    this.viewState = viewState;
    this.colors = colors;
  }

  render(layer: Konva.Layer): void {
    this.relLineNodes.clear();
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

  updateLinePosition(
    changedPath: string,
    getWorldPos: (path: string) => { x: number; y: number } | null,
  ): void {
    this.viewState.relationships.forEach((rel) => {
      if (rel.sourcePath !== changedPath && rel.targetPath !== changedPath)
        return;

      const line = this.relLineNodes.get(rel.id);
      if (!line) return;

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

      line.points(result.points);
      line.getLayer()?.batchDraw();
    });
  }

  clear(): void {
    this.relLineNodes.clear();
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
