import Konva from "konva";
import { BaseElementRenderer } from "./BaseElementRenderer";
import { VConfig } from "../../visualConfig";

const { DIM_OPACITY } = VConfig.elements;
const es = VConfig.elementShapes;

export class SimpleRectElementRenderer extends BaseElementRenderer {
  private get w(): number {
    return this.viewState.positions[this.path]?.width ?? this.size;
  }
  private get h(): number {
    return this.viewState.positions[this.path]?.height ?? this.size;
  }

  protected override addBackground(group: Konva.Group): void {
    const w = this.w;
    const h = this.h;
    if (this.opaqueElementBg) {
      group.add(
        new Konva.Rect({
          width: w,
          height: h,
          x: -w / 2,
          y: -h / 2,
          fill: this.colors.bgSecondary,
          cornerRadius: es.CORNER_RADIUS,
          listening: false,
        }),
      );
    }
    group.add(
      new Konva.Rect({
        width: w,
        height: h,
        x: -w / 2,
        y: -h / 2,
        fill: this.resolveStroke(),
        opacity: 0.15,
        cornerRadius: es.CORNER_RADIUS,
        listening: false,
      }),
    );
  }

  protected addElementShape(group: Konva.Group): Konva.Rect {
    const w = this.w;
    const h = this.h;

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
      width: w,
      height: h,
      stroke: this.resolveStroke(),
      strokeWidth,
      dash,
      cornerRadius: es.CORNER_RADIUS,
      x: -w / 2,
      y: -h / 2,
      opacity: this.isDimmed ? DIM_OPACITY : 1,
    });

    group.add(rectNode);
    return rectNode;
  }
}
