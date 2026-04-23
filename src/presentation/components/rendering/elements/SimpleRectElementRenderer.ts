import Konva from "konva";
import { BaseElementRenderer } from "./BaseElementRenderer";
import { VConfig } from "../../visualConfig";

const { DIM_OPACITY } = VConfig.elements;
const es = VConfig.elementShapes;

export class SimpleRectElementRenderer extends BaseElementRenderer {
  protected override addBackground(group: Konva.Group): void {
    const { size } = this;
    group.add(
      new Konva.Rect({
        width: size,
        height: size,
        x: -size / 2,
        y: -size / 2,
        fill: this.resolveStroke(),
        opacity: 0.15,
        cornerRadius: es.CORNER_RADIUS,
        listening: false,
      }),
    );
  }

  protected addElementShape(group: Konva.Group): Konva.Rect {
    const { size } = this;

    const strokeWidth = 2 / Math.max(this.zoom, 0.1);
    let dash: number[] | undefined;

    switch (this.element.type) {
      case "object":
        dash = undefined;
        break;
      case "collection":
        dash = es.DASH_STATE as number[];
        break;
      case "state":
        dash = [8, 4, 2, 4] as number[];
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
