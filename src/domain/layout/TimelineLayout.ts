import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import { ELEMENT_FILL } from "./BaseLayout";
import { TopologicalLayout } from "./TopologicalLayout";
import { sortByRelationshipAffinity } from "./LayoutUtils";

export class TimelineLayout extends TopologicalLayout {
  name = "timeline";
  protected viewMode = "timeline" as const;

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

    const column = this.topoSort(children, model);

    const byColumn = new Map<number, string[]>();
    for (const c of children) {
      const c_ = column.get(c.id)!;
      byColumn.set(c_, [...(byColumn.get(c_) ?? []), c.id]);
    }

    const numCols = Math.max(...byColumn.keys()) + 1;
    const maxInCol = Math.max(...[...byColumn.values()].map((v) => v.length));

    const cellW = containerWidth / numCols;
    const cellH = containerHeight / maxInCol;
    const size = Math.min(cellW, cellH) * ELEMENT_FILL;

    const rawById = new Map<string, { x: number; y: number; size: number }>();
    byColumn.forEach((colIds, c_) => {
      const colElements = colIds
        .map((id) => model.elements[id])
        .filter((e): e is NonNullable<typeof e> => !!e);
      const sorted = sortByRelationshipAffinity(colElements, model);
      sorted.forEach((el, i) => {
        rawById.set(el.id, {
          x: (c_ - (numCols - 1) / 2) * cellW,
          y: (i - (sorted.length - 1) / 2) * cellH,
          size,
        });
      });
    });

    return children.map((c) => rawById.get(c.id)!);
  }
}
