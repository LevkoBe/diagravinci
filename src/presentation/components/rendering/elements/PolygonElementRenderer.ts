import Konva from "konva";
import { BaseElementRenderer } from "./BaseElementRenderer";
import { VConfig } from "../../visualConfig";

const { DIM_OPACITY } = VConfig.elements;

export class PolygonElementRenderer extends BaseElementRenderer {
  private makeBackgroundShape(fill: string, opacity?: number): Konva.Shape {
    const { size } = this;
    const r = size / 2;
    const base = { fill, listening: false as const, ...(opacity !== undefined ? { opacity } : {}) };
    switch (this.element.type) {
      case "collection":
        return new Konva.Rect({ width: size, height: size, x: -r, y: -r, ...base });
      case "function":
        return new Konva.Circle({ radius: r, ...base });
      case "object":
        return new Konva.RegularPolygon({ sides: 6, radius: r, rotation: 90, ...base });
      case "state":
        return new Konva.RegularPolygon({ sides: 8, radius: r, rotation: 22.5, ...base });
      case "flow":
        return new Konva.RegularPolygon({ sides: 3, radius: r, rotation: 90, ...base });
      case "choice":
        return new Konva.Line({ points: [0, -r, r, 0, 0, r, -r, 0], closed: true, ...base });
      default:
        return new Konva.RegularPolygon({ sides: 5, radius: r, rotation: 180, ...base });
    }
  }

  protected override addBackground(group: Konva.Group): void {
    if (this.opaqueElementBg) {
      group.add(this.makeBackgroundShape(this.colors.bgSecondary));
    }
    group.add(this.makeBackgroundShape(this.resolveStroke(), 0.15));
  }

  protected addElementShape(group: Konva.Group): Konva.Shape {
    const { size } = this;
    const r = size / 2;
    const strokeWidth = 2 / Math.max(this.zoom, 0.1);
    const stroke = this.resolveStroke();
    const opacity = this.isDimmed ? DIM_OPACITY : 1;

    let shape: Konva.Shape;

    switch (this.element.type) {
      case "object": {
        shape = new Konva.RegularPolygon({
          sides: 6,
          radius: r,
          stroke,
          strokeWidth,
          opacity,
          rotation: 90,
        });
        break;
      }
      case "collection": {
        shape = new Konva.Rect({
          width: size,
          height: size,
          x: -r,
          y: -r,
          stroke,
          strokeWidth,
          opacity,
        });
        break;
      }
      case "state": {
        shape = new Konva.RegularPolygon({
          sides: 8,
          radius: r,
          stroke,
          strokeWidth,
          opacity,
          rotation: 22.5,
        });
        break;
      }
      case "function": {
        shape = new Konva.Circle({
          radius: r,
          stroke,
          strokeWidth,
          opacity,
        });
        break;
      }
      case "flow": {
        shape = new Konva.RegularPolygon({
          sides: 3,
          radius: r,
          stroke,
          strokeWidth,
          opacity,
          rotation: 90,
        });
        break;
      }
      case "choice": {
        shape = new Konva.Line({
          points: [0, -r, r, 0, 0, r, -r, 0],
          closed: true,
          stroke,
          strokeWidth,
          opacity,
        });
        break;
      }
      default: {
        shape = new Konva.RegularPolygon({
          sides: 5,
          radius: r,
          stroke,
          strokeWidth,
          opacity,
          rotation: 180,
        });
      }
    }

    group.add(shape);
    return shape;
  }
}
