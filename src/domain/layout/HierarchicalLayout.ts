import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import { ELEMENT_FILL } from "./BaseLayout";
import { TopologicalLayout } from "./TopologicalLayout";
import { sortByRelationshipAffinity } from "./LayoutUtils";

export class HierarchicalLayout extends TopologicalLayout {
  name = "hierarchical";
  protected viewMode = "hierarchical" as const;

  protected computePositions(
    children: Element[],
    model: DiagramModel,
    containerWidth: number,
    containerHeight: number,
  ): { x: number; y: number; size: number }[] {
    if (children.length === 1) {
      return [
        {
          x: 0,
          y: 0,
          size: Math.min(containerWidth, containerHeight) * ELEMENT_FILL,
        },
      ];
    }

    const depth = this.topoSort(children, model);

    const byLevel = new Map<number, string[]>();
    for (const c of children) {
      const d = depth.get(c.id)!;
      byLevel.set(d, [...(byLevel.get(d) ?? []), c.id]);
    }

    const numLevels = Math.max(...byLevel.keys()) + 1;
    const maxInLevel = Math.max(...[...byLevel.values()].map((v) => v.length));

    const cellW = containerWidth / maxInLevel;
    const cellH = containerHeight / numLevels;
    const size = Math.min(cellW, cellH) * ELEMENT_FILL;

    const rawById = new Map<string, { x: number; y: number; size: number }>();
    byLevel.forEach((levelIds, d) => {
      const levelElements = levelIds
        .map((id) => model.elements[id])
        .filter((e): e is NonNullable<typeof e> => !!e);
      const sorted = sortByRelationshipAffinity(levelElements, model);
      sorted.forEach((el, i) => {
        rawById.set(el.id, {
          x: (i - (sorted.length - 1) / 2) * cellW,
          y: (d - (numLevels - 1) / 2) * cellH,
          size,
        });
      });
    });

    return children.map((c) => rawById.get(c.id)!);
  }
}
