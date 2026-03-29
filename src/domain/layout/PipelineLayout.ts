import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import { BaseLayout, ELEMENT_FILL } from "./BaseLayout";

export class PipelineLayout extends BaseLayout {
  name = "pipeline";
  protected viewMode = "pipeline" as const;

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

    const ids = new Set(children.map((e) => e.id));
    const hasIncoming = new Set<string>();
    const hasOutgoing = new Set<string>();
    for (const rel of Object.values(model.relationships)) {
      if (ids.has(rel.source) && ids.has(rel.target)) {
        hasOutgoing.add(rel.source);
        hasIncoming.add(rel.target);
      }
    }

    const laneOf = (id: string): number => {
      const inc = hasIncoming.has(id);
      const out = hasOutgoing.has(id);
      if (!inc && out) return 0;
      if (inc && !out) return 2;
      return 1;
    };

    const lanes: string[][] = [[], [], []];
    for (const c of children) lanes[laneOf(c.id)].push(c.id);

    const maxInLane = Math.max(...lanes.map((l) => l.length), 1);

    const cellW = containerWidth / 3;
    const cellH = containerHeight / maxInLane;
    const size = Math.min(cellW, cellH) * ELEMENT_FILL;

    const rawById = new Map<string, { x: number; y: number; size: number }>();
    lanes.forEach((laneIds, laneIdx) => {
      laneIds.forEach((id, i) => {
        rawById.set(id, {
          x: (laneIdx - 1) * cellW,
          y: (i - (laneIds.length - 1) / 2) * cellH,
          size,
        });
      });
    });

    return children.map((c) => rawById.get(c.id)!);
  }
}
