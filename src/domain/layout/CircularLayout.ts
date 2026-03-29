import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import { BaseLayout, RADIO, CHILD_FILL, calculateSize } from "./BaseLayout";
import { layoutWeight } from "./LayoutUtils";

export default class CircularLayout extends BaseLayout {
  name = "circular";
  protected viewMode = "circular" as const;

  protected computeValue(element: Element, model: DiagramModel): number {
    return layoutWeight(element, model);
  }

  protected computePositions(
    children: Element[],
    model: DiagramModel,
    containerWidth: number,
    containerHeight: number,
  ): { x: number; y: number; size: number }[] {
    const containerSize = Math.min(containerWidth, containerHeight);

    if (children.length === 1) {
      return [{ x: 0, y: 0, size: calculateSize(layoutWeight(children[0], model)) }];
    }

    const radius = containerSize / (RADIO * CHILD_FILL);
    const angleStep = (2 * Math.PI) / children.length;

    return children.map((child, i) => ({
      x: radius * Math.cos(i * angleStep),
      y: radius * Math.sin(i * angleStep),
      size: calculateSize(layoutWeight(child, model)),
    }));
  }
}
