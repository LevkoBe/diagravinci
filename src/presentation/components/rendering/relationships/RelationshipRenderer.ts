import Konva from "konva";
import type { ViewState } from "../../../../domain/models/ViewState";
import type { RelationshipType } from "../../../../infrastructure/parser/Token";
import {
  parseEndSpec,
  isDashed,
  createDecoration,
  computeRelPoints,
  decorationInset,
} from "./arrowUtils";
import type { Colors } from "../types";
import { VConfig } from "../../visualConfig";
import type { RelLineStyle } from "../../../../application/store/uiSlice";

const RC = VConfig.rendering;

type RelPoints = {
  points: number[];
  nx: number;
  ny: number;
  ex1: number;
  ey1: number;
  ex2: number;
  ey2: number;
};

export type ViewportRect = { x: number; y: number; w: number; h: number };
export type GeometryCache = Map<string, ReturnType<typeof computeRelPoints>>;

function isPositionOutsideViewport(
  px: number,
  py: number,
  size: number,
  vp: ViewportRect,
): boolean {
  const half = size / 2;
  return (
    px + half < vp.x ||
    px - half > vp.x + vp.w ||
    py + half < vp.y ||
    py - half > vp.y + vp.h
  );
}

export class RelationshipRenderer {
  private readonly viewState: ViewState;
  private readonly colors: Colors;
  private readonly hiddenSet: Set<string>;
  private readonly dimmedSet: Set<string>;
  private readonly relGroups = new Map<string, Konva.Group>();
  private readonly viewportRect: ViewportRect | null;
  private readonly geometryCache: GeometryCache | null;
  private readonly zoom: number;
  private readonly relLineStyle: RelLineStyle;

  constructor(
    viewState: ViewState,
    colors: Colors,
    hiddenSet: Set<string>,
    dimmedSet: Set<string>,
    viewportRect?: ViewportRect,
    geometryCache?: GeometryCache,
    zoom = 1,
    relLineStyle: RelLineStyle = "straight",
  ) {
    this.viewState = viewState;
    this.colors = colors;
    this.hiddenSet = hiddenSet;
    this.dimmedSet = dimmedSet;
    this.viewportRect = viewportRect ?? null;
    this.geometryCache = geometryCache ?? null;
    this.zoom = Math.max(zoom, 0.01);
    this.relLineStyle = relLineStyle;
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
    const zoom = this.zoom;
    const strokeWidth = RC.REL_STROKE_WIDTH / zoom;
    const decoStrokeWidth = RC.DECORATION_STROKE_WIDTH / zoom;
    const dashes = isDashed(relType)
      ? (RC.REL_DASH as number[]).map((d) => d / zoom)
      : undefined;

    const { ex1, ey1, ex2, ey2, nx, ny } = result;
    let srcNx: number, srcNy: number, tgtNx: number, tgtNy: number;
    let labelLinePoints: number[];

    if (this.relLineStyle === "curved") {
      const dx = ex2 - ex1,
        dy = ey2 - ey1;
      const midX = (ex1 + ex2) / 2,
        midY = (ey1 + ey2) / 2;
      let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

      const vm = this.viewState.viewMode;
      const forceHorizontal = vm === "timeline" || vm === "pipeline";
      const forceVertical = vm === "hierarchical";
      const useHorizontal =
        dx === 0
          ? false
          : dy === 0
            ? true
            : forceHorizontal ||
              (!forceVertical && Math.abs(dx) >= Math.abs(dy));

      if (useHorizontal) {
        const s = dx >= 0 ? 1 : -1;
        cp1x = midX;
        cp1y = ey1;
        cp2x = midX;
        cp2y = ey2;
        srcNx = -s;
        srcNy = 0;
        tgtNx = s;
        tgtNy = 0;
      } else {
        const s = dy >= 0 ? 1 : -1;
        cp1x = ex1;
        cp1y = midY;
        cp2x = ex2;
        cp2y = midY;
        srcNx = 0;
        srcNy = -s;
        tgtNx = 0;
        tgtNy = s;
      }

      const lx1 = ex1 - srcNx * decorationInset(spec.source, zoom);
      const ly1 = ey1 - srcNy * decorationInset(spec.source, zoom);
      const lx2 = ex2 - tgtNx * decorationInset(spec.target, zoom);
      const ly2 = ey2 - tgtNy * decorationInset(spec.target, zoom);

      group.add(
        new Konva.Path({
          data: `M ${lx1} ${ly1} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${lx2} ${ly2}`,
          stroke,
          strokeWidth,
          dash: dashes,
          lineCap: "round",
        }),
      );
      labelLinePoints = [ex1, ey1, ex2, ey2];
    } else if (this.relLineStyle === "orthogonal") {
      const dx = ex2 - ex1,
        dy = ey2 - ey1;
      const midX = (ex1 + ex2) / 2,
        midY = (ey1 + ey2) / 2;

      const vm = this.viewState.viewMode;
      const forceHorizontal = vm === "timeline" || vm === "pipeline";
      const forceVertical = vm === "hierarchical";

      const useHorizontal =
        dx === 0 ? false : dy === 0 ? true : forceHorizontal || !forceVertical;

      let orthoPoints: number[];

      if (useHorizontal) {
        const s = dx >= 0 ? 1 : -1;
        srcNx = -s;
        srcNy = 0;
        tgtNx = s;
        tgtNy = 0;

        const lx1 = ex1 + s * decorationInset(spec.source, zoom);
        const lx2 = ex2 - s * decorationInset(spec.target, zoom);

        orthoPoints = [lx1, ey1, midX, ey1, midX, ey2, lx2, ey2];
      } else {
        const s = dy >= 0 ? 1 : -1;
        srcNx = 0;
        srcNy = -s;
        tgtNx = 0;
        tgtNy = s;

        const ly1 = ey1 + s * decorationInset(spec.source, zoom);
        const ly2 = ey2 - s * decorationInset(spec.target, zoom);

        orthoPoints = [ex1, ly1, ex1, midY, ex2, midY, ex2, ly2];
      }

      group.add(
        new Konva.Line({
          points: orthoPoints,
          stroke,
          strokeWidth,
          dash: dashes,
          lineCap: "round",
        }),
      );
      labelLinePoints = [ex1, ey1, ex2, ey2];
    } else {
      group.add(
        new Konva.Line({
          points: result.points,
          stroke,
          strokeWidth,
          lineCap: "round",
          dash: dashes,
        }),
      );
      srcNx = -nx;
      srcNy = -ny;
      tgtNx = nx;
      tgtNy = ny;
      labelLinePoints = result.points;
    }

    if (spec.source !== "none") {
      const sourceDeco = createDecoration(
        spec.source,
        spec.sourceFilled,
        ex1,
        ey1,
        srcNx,
        srcNy,
        stroke,
        decoStrokeWidth,
        zoom,
      );
      if (sourceDeco) group.add(sourceDeco);
    }
    if (spec.target !== "none") {
      const targetDeco = createDecoration(
        spec.target,
        spec.targetFilled,
        ex2,
        ey2,
        tgtNx,
        tgtNy,
        stroke,
        decoStrokeWidth,
        zoom,
      );
      if (targetDeco) group.add(targetDeco);
    }

    if (label) {
      const [lx1, ly1, lx2, ly2] = labelLinePoints;
      const midX = (lx1 + lx2) / 2;
      const midY = (ly1 + ly2) / 2;
      group.add(
        adaptiveRelLabel(
          label,
          labelLinePoints,
          midX - ny * (RC.REL_LABEL_OFFSET / zoom),
          midY + nx * (RC.REL_LABEL_OFFSET / zoom),
          stroke,
          opacity,
          zoom,
        ),
      );
    }
  }

  render(layer: Konva.Layer): void {
    this.relGroups.clear();

    this.viewState.relationships.forEach((rel) => {
      const { sourcePath, targetPath } = rel;
      if (this.hiddenSet.has(sourcePath) || this.hiddenSet.has(targetPath))
        return;

      const sourcePos = this.viewState.positions[sourcePath];
      const targetPos = this.viewState.positions[targetPath];
      if (!sourcePos || !targetPos) return;

      if (
        this.viewportRect &&
        isPositionOutsideViewport(
          sourcePos.position.x,
          sourcePos.position.y,
          sourcePos.size,
          this.viewportRect,
        ) &&
        isPositionOutsideViewport(
          targetPos.position.x,
          targetPos.position.y,
          targetPos.size,
          this.viewportRect,
        )
      )
        return;

      const isDimmed =
        this.dimmedSet.has(sourcePath) || this.dimmedSet.has(targetPath);
      const opacity = isDimmed ? RC.REL_DIM_OPACITY : RC.REL_NORMAL_OPACITY;

      const cacheKey = this.geometryCache
        ? `${rel.id}|${sourcePos.position.x},${sourcePos.position.y},${sourcePos.size}|${targetPos.position.x},${targetPos.position.y},${targetPos.size}|z${this.zoom}`
        : null;

      let result = cacheKey ? this.geometryCache!.get(cacheKey) : undefined;
      if (!result) {
        result = computeRelPoints(
          sourcePos.position.x,
          sourcePos.position.y,
          sourcePos.size,
          targetPos.position.x,
          targetPos.position.y,
          targetPos.size,
          rel.type,
          this.zoom,
        );
        if (cacheKey) this.geometryCache!.set(cacheKey, result);
      }
      if (!result.points) return;

      const group = new Konva.Group({ opacity });
      layer.add(group);
      this.relGroups.set(rel.id, group);
      this.populateRelGroup(
        group,
        result as RelPoints,
        rel.type,
        rel.label,
        opacity,
      );
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
        this.zoom,
      );
      if (!result.points) return;

      const isDimmed =
        this.dimmedSet.has(rel.sourcePath) ||
        this.dimmedSet.has(rel.targetPath);
      const opacity = isDimmed ? RC.REL_DIM_OPACITY : RC.REL_NORMAL_OPACITY;

      this.populateRelGroup(
        group,
        result as RelPoints,
        rel.type,
        rel.label,
        opacity,
      );
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
  zoom: number,
): Konva.Text {
  const lineLen = Math.sqrt(
    (points[2] - points[0]) ** 2 + (points[3] - points[1]) ** 2,
  );
  const maxWidth = Math.max(lineLen * 0.7, 40);

  const heuristicFont =
    (maxWidth * VConfig.elements.LABEL_TARGET_WIDTH_RATIO) /
    (text.length * VConfig.elements.CHAR_WIDTH_RATIO);
  const minFont = RC.REL_LABEL_MIN_FONT / zoom;
  const maxFont = RC.REL_LABEL_MAX_FONT_THRESHOLD / zoom;
  const fontSize = Math.max(minFont, Math.min(maxFont, heuristicFont));
  const useEllipsis = heuristicFont < minFont;

  const textPadding = 2 / zoom;

  const label = new Konva.Text({
    x,
    y,
    text,
    fontSize,
    fontFamily: "system-ui, sans-serif",
    fill,
    opacity,
    offsetY: fontSize / 2 + textPadding,
    align: "center",
    width: maxWidth,
    ellipsis: useEllipsis,
    wrap: "none",
    padding: textPadding,
  });
  label.offsetX(label.width() / 2);
  return label;
}
