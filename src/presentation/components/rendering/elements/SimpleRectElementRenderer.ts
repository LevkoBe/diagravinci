import Konva from "konva";
import type { ElementRenderResult } from "../types";
import type { ViewState } from "../../../../domain/models/ViewState";
import type { Element } from "../../../../domain/models/Element";
import type { Colors } from "../types";
import { BaseElementRenderer } from "./BaseElementRenderer";
import { VConfig } from "../../visualConfig";

const { DIM_OPACITY } = VConfig.elements;
const es = VConfig.elementShapes;

export class SimpleRectElementRenderer extends BaseElementRenderer {
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
    super(
      element,
      path,
      viewState,
      connectingFromId,
      colors,
      isNew,
      isDimmed,
      size,
      zoom,
      colorOverride,
    );
  }

  render(parentPos?: {
    x: number;
    y: number;
  }): ElementRenderResult | undefined {
    const pos = this.viewState.positions[this.path];
    if (!pos) return;

    const group = this.createElementGroup(parentPos);
    const rectNode = this.addElementShape(group);
    this.addLabel(group);
    this.addDecorationsIfNeeded(group);

    const { onHoverIn, onHoverOut } = this.createHoverCallbacks(
      group,
      rectNode,
      rectNode.strokeWidth(),
    );

    return { group, onHoverIn, onHoverOut };
  }

  private addElementShape(group: Konva.Group): Konva.Rect {
    const { size } = this;

    const strokeWidth = 2 / Math.max(this.zoom, 0.1);
    let dash: number[] | undefined;

    switch (this.element.type) {
      case "object":
        dash = undefined;
        break;
      case "state":
        dash = es.DASH_STATE as number[];
        break;
      case "function":
        dash = es.DASH_FUNCTION as number[];
        break;
      case "flow":
        dash = es.DASH_FLOW as number[];
        break;
      case "choice":
        dash = es.DASH_CHOICE as number[];
        break;
      default:
        dash = undefined;
    }

    const rectNode = new Konva.Rect({
      width: size,
      height: size,
      stroke: this.resolveStroke(),
      strokeWidth,
      dash,
      cornerRadius: es.CORNER_RADIUS,
      x: -size / 2,
      y: -size / 2,
      opacity: this.isDimmed ? DIM_OPACITY : 1,
    });

    group.add(rectNode);
    return rectNode;
  }
}
