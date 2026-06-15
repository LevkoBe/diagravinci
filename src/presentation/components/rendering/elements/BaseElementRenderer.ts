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

  protected readonly maxScreenPx: number;

  protected readonly opaqueElementBg: boolean;

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
    maxScreenPx = 320,
    opaqueElementBg = true,
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
    this.maxScreenPx = maxScreenPx;
    this.opaqueElementBg = opaqueElementBg;
  }

  protected classDiagramContent: ClassDiagramContent | null = null;
  private iconTooltipLabel: string | null = null;

  setClassDiagramContent(content: ClassDiagramContent | null): void {
    this.classDiagramContent = content;
  }

  protected abstract addElementShape(group: Konva.Group): Konva.Shape;

  protected addBackground(group: Konva.Group): void {
    if (this.opaqueElementBg) {
      group.add(
        new Konva.Circle({
          radius: this.size / 2,
          fill: this.colors.bgSecondary,
          listening: false,
        }),
      );
    }
    group.add(
      new Konva.Circle({
        radius: this.size / 2,
        fill: this.resolveStroke(),
        opacity: 0.15,
        listening: false,
      }),
    );
  }

  render(): ElementRenderResult | undefined {
    const pos = this.viewState.positions[this.path];
    if (!pos) return;

    const group = this.createElementGroup();
    this.addBackground(group);
    const shapeNode = this.addElementShape(group);
    this.addLabel(group);
    this.addDecorationsIfNeeded(group);

    const { onHoverIn, onHoverOut } = this.createHoverCallbacks(
      group,
      shapeNode,
      shapeNode.strokeWidth(),
    );

    return {
      group,
      onHoverIn,
      onHoverOut,
      ...(this.iconTooltipLabel ? { tooltipLabel: this.iconTooltipLabel } : {}),
    };
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

  private get labelOpacity(): number {
    const isZoomDimmed = this.isDimmed && this.size * this.zoom > this.maxScreenPx;
    return this.isDimmed && !isZoomDimmed ? ec.DIM_OPACITY : 1;
  }

  private computeFontSize(
    maxWidth: number,
    longestText: string,
  ): { fontSize: number; useEllipsis: boolean } {
    const zoomFactor = Math.max(this.zoom, 0.01);
    const heuristicFont =
      (maxWidth * ec.LABEL_TARGET_WIDTH_RATIO) /
      (longestText.length * ec.CHAR_WIDTH_RATIO);
    const minFont = ec.LABEL_MIN_FONT / zoomFactor;
    const maxFont = ec.LABEL_MAX_FONT_THRESHOLD / zoomFactor;
    return {
      fontSize: Math.max(minFont, Math.min(maxFont, heuristicFont)),
      useEllipsis: heuristicFont < minFont,
    };
  }

  protected addClassDiagramLabel(group: Konva.Group): void {
    const { fields, methods } = this.classDiagramContent!;
    const { size } = this;
    const FONT = ec.LABEL_FONT_FAMILY;
    const opacity = this.labelOpacity;
    const fill = this.colors.fgPrimary;
    const zoomFactor = Math.max(this.zoom, 0.01);
    const maxW = size * ec.CLASS_LABEL_WIDTH_RATIO;
    const xStart = -maxW / 2;

    const displayName = this.element.id.replace(/(\{\}|\[\]|\(\)|\|\||<>|>>)(_\d+)*$/, "");
    const allLines = [displayName, ...fields, ...methods];
    const longestLine = allLines.reduce(
      (a, b) => (a.length > b.length ? a : b),
      displayName,
    );
    const { fontSize, useEllipsis } = this.computeFontSize(maxW, longestLine);

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

    const clip = new Konva.Group({
      clip: { x: xStart, y: -size / 2, width: maxW, height: size },
      listening: false,
    });

    clip.add(
      new Konva.Text({
        text: displayName,
        fontSize,
        fontFamily: FONT,
        fontStyle: "bold",
        fill,
        align: "center",
        width: maxW,
        x: xStart,
        y,
        opacity,
        listening: false,
        ellipsis: useEllipsis,
        wrap: "none",
      }),
    );
    y += NAME_H;

    if (hasContent) {
      clip.add(
        new Konva.Line({
          points: [xStart, y, xStart + maxW, y],
          stroke: fill,
          strokeWidth: 0.5 / zoomFactor,
          opacity: opacity * 0.5,
          listening: false,
        }),
      );
      y += SEP_H;
    }

    for (const field of fields) {
      clip.add(
        new Konva.Text({
          text: field,
          fontSize,
          fontFamily: FONT,
          fill,
          align: "left",
          width: maxW,
          x: xStart,
          y,
          opacity,
          listening: false,
          ellipsis: useEllipsis,
          wrap: "none",
        }),
      );
      y += LINE_H;
    }

    if (hasFields && hasMethods) {
      clip.add(
        new Konva.Line({
          points: [xStart, y, xStart + maxW, y],
          stroke: fill,
          strokeWidth: 0.5 / zoomFactor,
          opacity: opacity * 0.5,
          listening: false,
        }),
      );
      y += SEP_H;
    }

    for (const method of methods) {
      clip.add(
        new Konva.Text({
          text: method,
          fontSize,
          fontFamily: FONT,
          fill,
          align: "left",
          width: maxW,
          x: xStart,
          y,
          opacity,
          listening: false,
          ellipsis: useEllipsis,
          wrap: "none",
        }),
      );
      y += LINE_H;
    }

    group.add(clip);
  }

  protected addLabel(group: Konva.Group): void {
    const rawId = this.element.id;

    if (rawId?.startsWith(ANONYMOUS_PREFIX)) return;

    if (this.classDiagramContent) {
      this.addClassDiagramLabel(group);
      return;
    }

    // Strip type-wrapper suffix to get the display name (e.g. "player{}" → "player")
    const name = rawId?.replace(/(\{\}|\[\]|\(\)|\|\||<>|>>)(_\d+)*$/, "");

    const iconMatch = name?.match(/^_(.+)_$/);
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
        this.iconTooltipLabel = iconMatch[1];
        return;
      }
    }

    const labelText = iconMatch
      ? iconMatch[1]
      : (name ?? this.element.type.toUpperCase());
    const maxWidth = this.size * ec.LABEL_WIDTH_RATIO;
    const { fontSize, useEllipsis } = this.computeFontSize(maxWidth, labelText);
    const opacity = this.labelOpacity;
    const zoomFactor = Math.max(this.zoom, 0.01);

    const pathDepth = this.path.split(".").length;
    const hasVisibleChildren =
      Object.keys(this.viewState.positions).some((p) => {
        if (!p.startsWith(this.path + ".")) return false;
        if (p.split(".").length !== pathDepth + 1) return false;
        const childScreenSize =
          (this.viewState.positions[p]?.size ?? 0) * this.zoom;
        return childScreenSize >= VConfig.sizing.MIN_SCREEN_PX;
      });

    const textPadding = 2 / zoomFactor;
    const labelY = hasVisibleChildren
      ? this.size / 2 + ec.LABEL_BELOW_OFFSET / zoomFactor - textPadding
      : -fontSize / 2 - textPadding;

    group.add(
      new Konva.Text({
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
        padding: textPadding,
        opacity,
        listening: false,
      }),
    );
  }

  protected addDecorationsIfNeeded(group: Konva.Group): void {
    const { size } = this;
    const zoomFactor = Math.max(this.zoom, 0.01);
    const pos = this.viewState.positions[this.path];
    if (!pos) return;

    this.addContainerBackground(group);

    if (pos.isRecursive) {
      const ringOffset = dc.RECURSIVE_RING_OFFSET / zoomFactor;
      group.add(
        new Konva.Circle({
          radius: size / 2 + ringOffset,
          stroke: dc.RECURSIVE_COLOR,
          strokeWidth: dc.RECURSIVE_RING_WIDTH / zoomFactor,
          dash: (dc.RECURSIVE_RING_DASH as number[]).map((d) => d / zoomFactor),
          listening: false,
        }),
      );
      group.add(
        new Konva.Text({
          text: "↺",
          fontSize: Math.min(
            ec.LABEL_MAX_FONT_THRESHOLD / zoomFactor,
            Math.max(ec.LABEL_MIN_FONT / zoomFactor, size * dc.RECURSIVE_TEXT_SIZE_RATIO),
          ),
          fill: dc.RECURSIVE_COLOR,
          x: size * dc.RECURSIVE_TEXT_X_RATIO,
          y: -(size / 2 + ringOffset + dc.RECURSIVE_TEXT_OFFSET / zoomFactor),
          listening: false,
        }),
      );
    }

    if (this.connectingFromId === this.path) {
      group.add(
        new Konva.Circle({
          radius:
            size / 2 +
            (pos.isRecursive
              ? dc.CONNECTING_RING_OFFSET_RECURSIVE
              : dc.CONNECTING_RING_OFFSET) / zoomFactor,
          stroke: dc.CONNECTING_COLOR,
          strokeWidth: dc.CONNECTING_RING_WIDTH / zoomFactor,
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
