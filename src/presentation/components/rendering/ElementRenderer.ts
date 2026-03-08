import Konva from "konva";
import type { Colors, ElementRenderResult } from "./types";
import type { ViewState } from "../../../domain/models/ViewState";
import { ELEMENT_SVGS } from "../../ElementConfigs";
import type { Element } from "../../../domain/models/Element";

const RECURSIVE_COLOR = "#f97316";
const CONNECTING_FROM_COLOR = "#3b82f6";

export class ElementRenderer {
  private readonly element: Element;
  private readonly path: string;
  private readonly viewState: ViewState;
  private readonly selectedElementId: string | null;
  private readonly connectingFromId: string | null;
  private readonly colors: Colors;
  private readonly isNew: boolean;

  constructor(
    element: Element,
    path: string,
    viewState: ViewState,
    selectedElementId: string | null,
    connectingFromId: string | null,
    colors: Colors,
    isNew: boolean,
  ) {
    this.element = element;
    this.path = path;
    this.viewState = viewState;
    this.selectedElementId = selectedElementId;
    this.connectingFromId = connectingFromId;
    this.colors = colors;
    this.isNew = isNew;
  }

  render(parentPos?: {
    x: number;
    y: number;
  }): ElementRenderResult | undefined {
    const pos = this.viewState.positions[this.path];
    if (!pos) return;

    const group = this.createElementGroup(parentPos);
    const pathNode = this.addElementShape(group, pos.size);
    this.addLabel(group, pos.size);
    this.addDecorationsIfNeeded(group, pos.size);

    const { onHoverIn, onHoverOut } = this.createHoverCallbacks(
      group,
      pathNode,
      pos.size,
    );

    return { group, onHoverIn, onHoverOut };
  }

  private createElementGroup(parentPos?: {
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

  private addElementShape(group: Konva.Group, size: number): Konva.Path {
    const config = ELEMENT_SVGS[this.element.type];
    const scale = size / Math.max(config.viewBoxWidth, config.viewBoxHeight);
    const strokeWidth = Math.pow(size, 0.4) / scale;

    const pathNode = new Konva.Path({
      data: config.data,
      stroke:
        this.selectedElementId === this.element.id
          ? this.colors.selected
          : this.colors.accent,
      strokeWidth,
      scale: { x: scale, y: scale },
      x: -(config.viewBoxWidth * scale) / 2,
      y: -(config.viewBoxHeight * scale) / 2,
    });

    group.add(pathNode);
    return pathNode;
  }

  private addLabel(group: Konva.Group, size: number): void {
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

  private addDecorationsIfNeeded(group: Konva.Group, size: number): void {
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

  private createHoverCallbacks(
    group: Konva.Group,
    pathNode: Konva.Path,
    size: number,
  ): { onHoverIn: () => void; onHoverOut: () => void } {
    const config = ELEMENT_SVGS[this.element.type];
    const scale = size / Math.max(config.viewBoxWidth, config.viewBoxHeight);
    const strokeWidth = Math.pow(size, 0.4) / scale;

    const hoverScale = 1.15;
    const hoverStrokeWidth = strokeWidth * 0.8;

    const onHoverIn = () => {
      new Konva.Tween({
        node: group,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        scaleX: hoverScale,
        scaleY: hoverScale,
      }).play();

      new Konva.Tween({
        node: pathNode,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        strokeWidth: hoverStrokeWidth,
      }).play();
    };

    const onHoverOut = () => {
      new Konva.Tween({
        node: group,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        scaleX: 1,
        scaleY: 1,
      }).play();

      new Konva.Tween({
        node: pathNode,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
        strokeWidth,
      }).play();
    };

    return { onHoverIn, onHoverOut };
  }
}
