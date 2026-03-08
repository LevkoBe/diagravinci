import Konva from "konva";
import type { ElementRenderResult } from "../types";
import { BaseElementRenderer } from "./BaseElementRenderer";

export class SimpleRectElementRenderer extends BaseElementRenderer {
  render(parentPos?: {
    x: number;
    y: number;
  }): ElementRenderResult | undefined {
    const pos = this.viewState.positions[this.path];
    if (!pos) return;

    const group = this.createElementGroup(parentPos);
    const rectNode = this.addElementShape(group, pos.size);
    this.addLabel(group, pos.size);
    this.addDecorationsIfNeeded(group, pos.size);

    const { onHoverIn, onHoverOut } = this.createHoverCallbacks(
      group,
      rectNode,
      rectNode.strokeWidth(),
    );

    return { group, onHoverIn, onHoverOut };
  }

  private addElementShape(group: Konva.Group, size: number): Konva.Rect {
    const strokeWidth = 2;
    let dash: number[] | undefined;

    switch (this.element.type) {
      case "object":
        dash = undefined;
        break;
      case "state":
        dash = [5, 5];
        break;
      case "function":
        dash = [2, 2];
        break;
      case "flow":
        dash = [10, 5];
        break;
      case "choice":
        dash = [2, 5, 10, 5];
        break;
      default:
        dash = undefined;
    }

    const rectNode = new Konva.Rect({
      width: size,
      height: size,
      stroke:
        this.selectedElementId === this.element.id
          ? this.colors.selected
          : this.colors.accent,
      strokeWidth,
      dash,
      cornerRadius: 5,
      x: -size / 2,
      y: -size / 2,
    });

    group.add(rectNode);
    return rectNode;
  }
}
