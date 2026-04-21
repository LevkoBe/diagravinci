import Konva from "konva";
import type { ElementRenderResult } from "../types";
import type { ViewState } from "../../../../domain/models/ViewState";
import type { Element } from "../../../../domain/models/Element";
import type { Colors } from "../types";
import { BaseElementRenderer } from "./BaseElementRenderer";
import { VConfig } from "../../visualConfig";

const { DIM_OPACITY } = VConfig.elements;

export class PolygonElementRenderer extends BaseElementRenderer {
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
    colorOverride: string | null = null,
  ) {
    super(
      element,
      path,
      viewState,
      selectedElementId,
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

  private addElementShape(group: Konva.Group): Konva.Shape {
    const { size } = this;
    const r = size / 2;
    const strokeWidth = 2 / Math.max(this.zoom, 0.1);
    const stroke = this.resolveStroke();
    const opacity = this.isDimmed ? DIM_OPACITY : 1;

    let shape: Konva.Shape;

    switch (this.element.type) {
      case "object": {
        // Hexagon
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
      case "state": {
        // Rectangle
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
      case "function": {
        // Fallback: circle
        shape = new Konva.Circle({
          radius: r,
          stroke,
          strokeWidth,
          opacity,
        });
        break;
      }
      case "flow": {
        // Triangle (pointing up)
        shape = new Konva.RegularPolygon({
          sides: 3,
          radius: r,
          stroke,
          strokeWidth,
          opacity,
          rotation: 180,
        });
        break;
      }
      case "choice": {
        // Rhombus / diamond
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
        // Pentagon
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
