import Konva from "konva";
import type { Colors, ElementRenderResult } from "../types";
import type { ViewState } from "../../../../domain/models/ViewState";
import type { Element } from "../../../../domain/models/Element";
import { VConfig } from "../../visualConfig";
import { getLucideIcon, renderLucideIconOnGroup } from "./lucideIconMap";

const ec = VConfig.elements;
const dc = VConfig.decorations;

const ANONYMOUS_PREFIX = "anon_";

export interface IElementRenderer {
  render(parentPos?: { x: number; y: number }): ElementRenderResult | undefined;
}

export abstract class BaseElementRenderer implements IElementRenderer {
  protected readonly element: Element;
  protected readonly path: string;
  protected readonly viewState: ViewState;
  protected readonly selectedElementId: string | null;
  protected readonly connectingFromId: string | null;
  protected readonly colors: Colors;
  protected readonly isNew: boolean;
  protected readonly isDimmed: boolean;

  protected readonly size: number;

  protected readonly zoom: number;

  constructor(
    element: Element,
    path: string,
    viewState: ViewState,
    selectedElementId: string | null,
    connectingFromId: string | null,
    colors: Colors,
    isNew: boolean,
    isDimmed: boolean,
    size: number,
    zoom: number,
  ) {
    this.element = element;
    this.path = path;
    this.viewState = viewState;
    this.selectedElementId = selectedElementId;
    this.connectingFromId = connectingFromId;
    this.colors = colors;
    this.isNew = isNew;
    this.isDimmed = isDimmed;
    this.size = size;
    this.zoom = zoom;
  }

  abstract render(parentPos?: {
    x: number;
    y: number;
  }): ElementRenderResult | undefined;

  protected createElementGroup(parentPos?: {
    x: number;
    y: number;
  }): Konva.Group {
    const pos = this.viewState.positions[this.path];
    if (!pos) throw new Error("Position not found");

    const localX = parentPos ? pos.position.x - parentPos.x : pos.position.x;
    const localY = parentPos ? pos.position.y - parentPos.y : pos.position.y;

    const group = new Konva.Group({
      x: localX,
      y: localY,
      draggable: true,
      scaleX: this.isNew ? 0 : 1,
      scaleY: this.isNew ? 0 : 1,
    });

    return group;
  }

  protected addLabel(group: Konva.Group): void {
    const rawId = this.element.id;

    if (rawId?.startsWith(ANONYMOUS_PREFIX)) return;

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

    const targetScreenFont = Math.max(
      ec.LABEL_MIN_FONT,
      Math.min(ec.LABEL_MAX_FONT, this.size * ec.LABEL_SIZE_RATIO),
    );
    const fontSize = targetScreenFont / Math.max(this.zoom, 0.01);

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
      ellipsis: true,
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
          fontSize: Math.max(10, size * 0.28),
          fill: dc.RECURSIVE_COLOR,
          x: size * 0.18,
          y: -(size / 2 + 16),
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected addContainerBackground(_group: Konva.Group): void {
    // Non-SVG renderers omit the container background circle entirely
  }

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
