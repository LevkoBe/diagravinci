import Konva from "konva";
import type { Colors, ElementRenderResult } from "../types";
import type { ViewState } from "../../../../domain/models/ViewState";
import type { Element } from "../../../../domain/models/Element";
import { VConfig } from "../../visualConfig";
import { getLucideIcon, renderLucideIconOnGroup } from "./lucideIconMap";
import { AppConfig } from "../../../../config/appConfig";
import type { ClassDiagramContent } from "./classDiagramUtils";

const ec = VConfig.elements;
const dc = VConfig.decorations;

const ANONYMOUS_PREFIX = AppConfig.parser.ANONYMOUS_ID_PREFIX + "_";

export interface IElementRenderer {
  render(): ElementRenderResult | undefined;
  setClassDiagramContent(content: ClassDiagramContent | null): void;
}

export abstract class BaseElementRenderer implements IElementRenderer {
  protected readonly element: Element;
  protected readonly path: string;
  protected readonly viewState: ViewState;
  protected readonly connectingFromId: string | null;
  protected readonly colors: Colors;
  protected readonly isNew: boolean;
  protected readonly isDimmed: boolean;

  protected readonly size: number;

  protected readonly zoom: number;

  protected readonly colorOverride: string | null;

  constructor(
    element: Element,
    path: string,
    viewState: ViewState,
    connectingFromId: string | null,
    colors: Colors,
    isNew: boolean,
    isDimmed: boolean,
    size: number,
    zoom: number,
    colorOverride: string | null = null,
  ) {
    this.element = element;
    this.path = path;
    this.viewState = viewState;
    this.connectingFromId = connectingFromId;
    this.colors = colors;
    this.isNew = isNew;
    this.isDimmed = isDimmed;
    this.size = size;
    this.zoom = zoom;
    this.colorOverride = colorOverride;
  }

  protected classDiagramContent: ClassDiagramContent | null = null;

  setClassDiagramContent(content: ClassDiagramContent | null): void {
    this.classDiagramContent = content;
  }

  protected abstract addElementShape(group: Konva.Group): Konva.Shape;

  render(): ElementRenderResult | undefined {
    const pos = this.viewState.positions[this.path];
    if (!pos) return;

    const group = this.createElementGroup();
    const shapeNode = this.addElementShape(group);
    this.addLabel(group);
    this.addDecorationsIfNeeded(group);

    const { onHoverIn, onHoverOut } = this.createHoverCallbacks(
      group,
      shapeNode,
      shapeNode.strokeWidth(),
    );

    return { group, onHoverIn, onHoverOut };
  }

  protected resolveStroke(): string {
    return this.colorOverride || this.colors.accent;
  }

  protected createElementGroup(): Konva.Group {
    const pos = this.viewState.positions[this.path];
    if (!pos) throw new Error("Position not found");

    const group = new Konva.Group({
      x: pos.position.x,
      y: pos.position.y,
      draggable: true,
    });

    return group;
  }

  protected addClassDiagramLabel(group: Konva.Group): void {
    const { fields, methods } = this.classDiagramContent!;
    const { size } = this;
    const FONT = ec.LABEL_FONT_FAMILY;
    const OPACITY = this.isDimmed ? ec.DIM_OPACITY : 1;
    const fill = this.colors.fgPrimary;
    const maxW = size * 0.6;
    const xStart = -maxW / 2;

    const allLines = [this.element.id, ...fields, ...methods];
    const longestLine = allLines.reduce(
      (a, b) => (a.length > b.length ? a : b),
      this.element.id,
    );
    const zoomFactor = Math.max(this.zoom, 0.01);
    const heuristicFont =
      (maxW * ec.LABEL_TARGET_WIDTH_RATIO) /
      (longestLine.length * ec.CHAR_WIDTH_RATIO);
    const minFont = ec.LABEL_MIN_FONT / zoomFactor;
    const maxFont = ec.LABEL_MAX_FONT_THRESHOLD / zoomFactor;
    const fontSize = Math.max(minFont, Math.min(maxFont, heuristicFont));
    const useEllipsis = heuristicFont < minFont;

    const LINE_H = fontSize * 1.3;
    const NAME_H = fontSize * 1.5;
    const SEP_H = fontSize * 0.5;

    const hasFields = fields.length > 0;
    const hasMethods = methods.length > 0;
    const hasContent = hasFields || hasMethods;
    const numSeps = hasFields && hasMethods ? 2 : hasContent ? 1 : 0;
    const totalH =
      NAME_H + numSeps * SEP_H + (fields.length + methods.length) * LINE_H;
    let y = -totalH / 2;

    group.add(
      new Konva.Text({
        text: this.element.id,
        fontSize,
        fontFamily: FONT,
        fontStyle: "bold",
        fill,
        align: "center",
        width: maxW,
        x: xStart,
        y,
        opacity: OPACITY,
        listening: false,
        ellipsis: useEllipsis,
        wrap: "none",
      }),
    );
    y += NAME_H;

    if (hasContent) {
      group.add(
        new Konva.Line({
          points: [xStart, y, xStart + maxW, y],
          stroke: fill,
          strokeWidth: 0.5,
          opacity: OPACITY * 0.5,
          listening: false,
        }),
      );
      y += SEP_H;
    }

    for (const field of fields) {
      group.add(
        new Konva.Text({
          text: field,
          fontSize,
          fontFamily: FONT,
          fill,
          align: "left",
          width: maxW,
          x: xStart,
          y,
          opacity: OPACITY,
          listening: false,
          ellipsis: useEllipsis,
          wrap: "none",
        }),
      );
      y += LINE_H;
    }

    if (hasFields && hasMethods) {
      group.add(
        new Konva.Line({
          points: [xStart, y, xStart + maxW, y],
          stroke: fill,
          strokeWidth: 0.5,
          opacity: OPACITY * 0.5,
          listening: false,
        }),
      );
      y += SEP_H;
    }

    for (const method of methods) {
      group.add(
        new Konva.Text({
          text: method,
          fontSize,
          fontFamily: FONT,
          fill,
          align: "left",
          width: maxW,
          x: xStart,
          y,
          opacity: OPACITY,
          listening: false,
          ellipsis: useEllipsis,
          wrap: "none",
        }),
      );
      y += LINE_H;
    }
  }

  protected addLabel(group: Konva.Group): void {
    const rawId = this.element.id;

    if (rawId?.startsWith(ANONYMOUS_PREFIX)) return;

    if (this.classDiagramContent) {
      this.addClassDiagramLabel(group);
      return;
    }

    const iconMatch = rawId?.match(/^_(.+)_$/);
    if (iconMatch) {
      const iconName = iconMatch[1].toLowerCase();
      const iconNodes = getLucideIcon(iconName);
      if (iconNodes) {
        renderLucideIconOnGroup(
          group,
          iconNodes,
          this.size,
          this.colors.fgPrimary,
          this.isDimmed ? ec.DIM_OPACITY : 1,
        );
        return;
      }
    }

    const labelText = iconMatch
      ? iconMatch[1]
      : (rawId ?? this.element.type.toUpperCase());
    const maxWidth = this.size * ec.LABEL_WIDTH_RATIO;
    const zoomFactor = Math.max(this.zoom, 0.01);
    const heuristicFont =
      (maxWidth * ec.LABEL_TARGET_WIDTH_RATIO) /
      (labelText.length * ec.CHAR_WIDTH_RATIO);
    const minFont = ec.LABEL_MIN_FONT / zoomFactor;
    const maxFont = ec.LABEL_MAX_FONT_THRESHOLD / zoomFactor;
    const fontSize = Math.max(minFont, Math.min(maxFont, heuristicFont));
    const useEllipsis = heuristicFont < minFont;

    const hasVisibleChildren = Object.keys(this.viewState.positions).some(
      (p) =>
        p.startsWith(this.path + ".") &&
        p.split(".").length === this.path.split(".").length + 1,
    );
    const labelY = hasVisibleChildren
      ? this.size / 2 + ec.LABEL_BELOW_OFFSET
      : -fontSize / 2;

    const textNode = new Konva.Text({
      text: labelText,
      fontSize,
      fontFamily: ec.LABEL_FONT_FAMILY,
      fill: this.colors.fgPrimary,
      align: "center",
      width: maxWidth,
      x: -maxWidth / 2,
      y: labelY,
      ellipsis: useEllipsis,
      wrap: "none",
      padding: 2,
      opacity: this.isDimmed ? ec.DIM_OPACITY : 1,
    });

    group.add(textNode);
  }

  protected addDecorationsIfNeeded(group: Konva.Group): void {
    const { size } = this;
    const pos = this.viewState.positions[this.path];
    if (!pos) return;

    this.addContainerBackground(group);

    if (pos.isRecursive) {
      group.add(
        new Konva.Circle({
          radius: size / 2 + dc.RECURSIVE_RING_OFFSET,
          stroke: dc.RECURSIVE_COLOR,
          strokeWidth: dc.RECURSIVE_RING_WIDTH,
          dash: dc.RECURSIVE_RING_DASH as number[],
          listening: false,
        }),
      );
      group.add(
        new Konva.Text({
          text: "↺",
          fontSize: Math.max(
            ec.LABEL_MIN_FONT,
            size * dc.RECURSIVE_TEXT_SIZE_RATIO,
          ),
          fill: dc.RECURSIVE_COLOR,
          x: size * dc.RECURSIVE_TEXT_X_RATIO,
          y: -(size / 2 + dc.RECURSIVE_TEXT_OFFSET),
          listening: false,
        }),
      );
    }

    if (this.connectingFromId === this.element.id) {
      group.add(
        new Konva.Circle({
          radius:
            size / 2 +
            (pos.isRecursive
              ? dc.CONNECTING_RING_OFFSET_RECURSIVE
              : dc.CONNECTING_RING_OFFSET),
          stroke: dc.CONNECTING_COLOR,
          strokeWidth: dc.CONNECTING_RING_WIDTH,
          listening: false,
        }),
      );
    }
  }

  protected addContainerBackground(_group: Konva.Group): void {}

  protected createHoverCallbacks(
    group: Konva.Group,
    shapeNode: Konva.Shape,
    initialStrokeWidth: number,
  ): { onHoverIn: () => void; onHoverOut: () => void } {
    const isDimmed = this.isDimmed;
    const hoverStrokeWidth = initialStrokeWidth * 0.8;

    const onHoverIn = () => {
      if (isDimmed) return;
      new Konva.Tween({
        node: group,
        duration: ec.HOVER_DURATION,
        easing: Konva.Easings.EaseOut,
        scaleX: ec.HOVER_SCALE_FACTOR,
        scaleY: ec.HOVER_SCALE_FACTOR,
      }).play();
      new Konva.Tween({
        node: shapeNode,
        duration: ec.HOVER_DURATION,
        easing: Konva.Easings.EaseOut,
        strokeWidth: hoverStrokeWidth,
      }).play();
    };

    const onHoverOut = () => {
      if (isDimmed) return;
      new Konva.Tween({
        node: group,
        duration: ec.HOVER_DURATION,
        easing: Konva.Easings.EaseOut,
        scaleX: 1,
        scaleY: 1,
      }).play();
      new Konva.Tween({
        node: shapeNode,
        duration: ec.HOVER_DURATION,
        easing: Konva.Easings.EaseOut,
        strokeWidth: initialStrokeWidth,
      }).play();
    };

    return { onHoverIn, onHoverOut };
  }
}
