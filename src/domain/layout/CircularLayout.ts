import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import { BaseLayout, RADIO, CHILD_FILL, ELEMENT_FILL, calculateSize } from "./BaseLayout";
import { layoutWeight } from "./LayoutUtils";

export default class CircularLayout extends BaseLayout {
  name = "circular";
  protected viewMode = "circular" as const;

  protected computeValue(element: Element, model: DiagramModel): number {
    return layoutWeight(element, model);
  }

  protected override recursiveElementSize(): number {
    return calculateSize(1);
  }

  protected computePositions(
    children: Element[],
    model: DiagramModel,
    containerWidth: number,
    containerHeight: number,
  ): { x: number; y: number; size: number }[] {
    const containerSize = Math.min(containerWidth, containerHeight);
    const weights = children.map((c) => layoutWeight(c, model));
    const size = Math.min(
      calculateSize(Math.max(...weights)),
      containerSize * ELEMENT_FILL,
    );

    if (children.length === 1) {
      return [{ x: 0, y: 0, size }];
    }

    const radius = containerSize / (RADIO * CHILD_FILL);
    const angleStep = (2 * Math.PI) / children.length;

    return children.map((_, i) => ({
      x: radius * Math.cos(i * angleStep),
      y: radius * Math.sin(i * angleStep),
      size,
    }));
  }
}
