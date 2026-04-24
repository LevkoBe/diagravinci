import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import {
  BaseLayout,
  RADIO,
  CHILD_FILL,
  ELEMENT_FILL,
  calculateSize,
} from "./BaseLayout";
import { layoutWeight, sortByRelationshipAffinity } from "./LayoutUtils";

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
    const weightMemo = new Map<string, number>();
    const weights = children.map((c) => layoutWeight(c, model, new Set(), weightMemo));
    const size = Math.min(
      calculateSize(Math.max(...weights)),
      containerSize * ELEMENT_FILL,
    );

    if (children.length === 1) {
      return [{ x: 0, y: 0, size: Math.max(size, containerSize * ELEMENT_FILL) }];
    }

    const n = children.length;
    const radius = containerSize / (RADIO * CHILD_FILL);
    const maxSizeFromSpacing = 2 * radius * Math.sin(Math.PI / n) * CHILD_FILL;
    const sizeFloor = containerSize / n;
    const sizeConstrained = Math.max(Math.min(size, maxSizeFromSpacing), sizeFloor);
    const angleStep = (2 * Math.PI) / n;

    const sorted = sortByRelationshipAffinity(children, model);
    const posById = new Map(
      sorted.map((c, i) => [
        c.id,
        {
          x: radius * Math.cos(i * angleStep),
          y: radius * Math.sin(i * angleStep),
          size: sizeConstrained,
        },
      ]),
    );
    return children.map((c) => posById.get(c.id)!);
  }
}
