import Konva from "konva";
import type { ViewState } from "../../../../domain/models/ViewState";
import type { RelationshipType } from "../../../../infrastructure/parser/Token";
import {
  parseEndSpec,
  isDashed,
  createDecoration,
  computeRelPoints,
} from "./arrowUtils";
import type { Colors } from "../types";
import { VConfig } from "../../visualConfig";

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

  constructor(
    viewState: ViewState,
    colors: Colors,
    hiddenSet: Set<string>,
    dimmedSet: Set<string>,
    viewportRect?: ViewportRect,
    geometryCache?: GeometryCache,
    zoom = 1,
  ) {
    this.viewState = viewState;
    this.colors = colors;
    this.hiddenSet = hiddenSet;
    this.dimmedSet = dimmedSet;
    this.viewportRect = viewportRect ?? null;
    this.geometryCache = geometryCache ?? null;
    this.zoom = Math.max(zoom, 0.01);
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

    group.add(
      new Konva.Line({
        points: result.points,
        stroke,
        strokeWidth,
        lineCap: "round",
        dash: isDashed(relType)
          ? (RC.REL_DASH as number[]).map((d) => d / zoom)
          : undefined,
      }),
    );

    if (spec.source !== "none") {
      const sourceDeco = createDecoration(
        spec.source,
        spec.sourceFilled,
        result.ex1,
        result.ey1,
        -result.nx,
        -result.ny,
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
        result.ex2,
        result.ey2,
        result.nx,
        result.ny,
        stroke,
        decoStrokeWidth,
        zoom,
      );
      if (targetDeco) group.add(targetDeco);
    }

    if (label) {
      const midX = (result.points[0] + result.points[2]) / 2;
      const midY = (result.points[1] + result.points[3]) / 2;
      group.add(
        adaptiveRelLabel(
          label,
          result.points,
          midX - result.ny * (RC.REL_LABEL_OFFSET / zoom),
          midY + result.nx * (RC.REL_LABEL_OFFSET / zoom),
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
