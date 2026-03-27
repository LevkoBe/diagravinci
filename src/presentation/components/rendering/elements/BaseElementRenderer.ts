import Konva from "konva";
import type { Colors, ElementRenderResult } from "../types";
import type { ViewState } from "../../../../domain/models/ViewState";
import type { Element } from "../../../../domain/models/Element";

const RECURSIVE_COLOR = "#f97316";
const CONNECTING_FROM_COLOR = "#3b82f6";

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

  constructor(
    element: Element,
    path: string,
    viewState: ViewState,
    selectedElementId: string | null,
    connectingFromId: string | null,
    colors: Colors,
    isNew: boolean,
    isDimmed: boolean,
  ) {
    this.element = element;
    this.path = path;
    this.viewState = viewState;
    this.selectedElementId = selectedElementId;
    this.connectingFromId = connectingFromId;
    this.colors = colors;
    this.isNew = isNew;
    this.isDimmed = isDimmed;
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

  protected addLabel(group: Konva.Group, size: number): void {
    const hasVisibleChildren = Object.keys(this.viewState.positions).some(
      (p) =>
        p.startsWith(this.path + ".") &&
        p.split(".").length === this.path.split(".").length + 1,
    );

    const fontSize = 12;
    group.add(
      new Konva.Text({
        text: this.element.id,
        fontSize,
        fill: this.colors.fgPrimary,
        x: -size / 2,
        y: hasVisibleChildren ? size / 2 + 4 : -fontSize / 2,
        width: size,
        align: "center",
      }),
    );
  }

  protected addDecorationsIfNeeded(group: Konva.Group, size: number): void {
    const pos = this.viewState.positions[this.path];
    if (!pos) return;

    const hasVisibleChildren = Object.keys(this.viewState.positions).some(
      (p) =>
        p.startsWith(this.path + ".") &&
        p.split(".").length === this.path.split(".").length + 1,
    );

    if (hasVisibleChildren) {
      group.add(
        new Konva.Circle({
          radius: size / 2,
          fill: this.colors.bgSecondary,
          opacity: 0.3,
        }),
      );
    }

    if (pos.isRecursive) {
      group.add(
        new Konva.Circle({
          radius: size / 2 + 5,
          stroke: RECURSIVE_COLOR,
          strokeWidth: 2,
          dash: [5, 4],
          listening: false,
        }),
      );
      group.add(
        new Konva.Text({
          text: "↺",
          fontSize: Math.max(10, size * 0.28),
          fill: RECURSIVE_COLOR,
          x: size * 0.18,
          y: -(size / 2 + 16),
          listening: false,
        }),
      );
    }

    if (this.connectingFromId === this.element.id) {
      group.add(
        new Konva.Circle({
          radius: size / 2 + (pos.isRecursive ? 14 : 8),
          stroke: CONNECTING_FROM_COLOR,
          strokeWidth: 2.5,
          listening: false,
        }),
      );
    }
  }

  protected createHoverCallbacks(
    group: Konva.Group,
    shapeNode: Konva.Shape,
    initialStrokeWidth: number,
  ): { onHoverIn: () => void; onHoverOut: () => void } {
    const hoverScale = 1.15;
    const hoverStrokeWidth = initialStrokeWidth * 0.8;
    const isDimmed = this.isDimmed === true;

    const onHoverIn = () => {
      if (isDimmed) return;
      new Konva.Tween({
        node: group,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        scaleX: hoverScale,
        scaleY: hoverScale,
      }).play();

      new Konva.Tween({
        node: shapeNode,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        strokeWidth: hoverStrokeWidth,
      }).play();
    };

    const onHoverOut = () => {
      if (isDimmed) return;
      new Konva.Tween({
        node: group,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        scaleX: 1,
        scaleY: 1,
      }).play();

      new Konva.Tween({
        node: shapeNode,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        strokeWidth: initialStrokeWidth,
      }).play();
    };

    return { onHoverIn, onHoverOut };
  }
}
