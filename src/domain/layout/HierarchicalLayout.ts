import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import { BaseLayout } from "./BaseLayout";

const ELEMENT_FILL = 0.7;

export class HierarchicalLayout extends BaseLayout {
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

    const ids = new Set(children.map((e) => e.id));
    const outgoing = new Map<string, string[]>();
    const incomingCount = new Map<string, number>();
    for (const c of children) {
      outgoing.set(c.id, []);
      incomingCount.set(c.id, 0);
    }
    for (const rel of Object.values(model.relationships)) {
      if (ids.has(rel.source) && ids.has(rel.target)) {
        outgoing.get(rel.source)!.push(rel.target);
        incomingCount.set(rel.target, (incomingCount.get(rel.target) ?? 0) + 1);
      }
    }

    const depth = new Map<string, number>();
    const queue = children
      .map((e) => e.id)
      .filter((id) => incomingCount.get(id) === 0);
    const processed = new Set<string>();
    let level = 0;
    while (queue.length) {
      const batch = [...queue];
      queue.length = 0;
      for (const id of batch) {
        if (processed.has(id)) continue;
        processed.add(id);
        depth.set(id, level);
        for (const next of outgoing.get(id) ?? []) {
          incomingCount.set(next, (incomingCount.get(next) ?? 1) - 1);
          if (incomingCount.get(next) === 0) queue.push(next);
        }
      }
      level++;
    }
    for (const c of children) if (!depth.has(c.id)) depth.set(c.id, level);

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
      levelIds.forEach((id, i) => {
        rawById.set(id, {
          x: (i - (levelIds.length - 1) / 2) * cellW,
          y: (d - (numLevels - 1) / 2) * cellH,
          size,
        });
      });
    });

    return children.map((c) => rawById.get(c.id)!);
  }
}
