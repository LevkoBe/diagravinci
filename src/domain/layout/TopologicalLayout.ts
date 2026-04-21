import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import { BaseLayout } from "./BaseLayout";

export abstract class TopologicalLayout extends BaseLayout {
  protected topoSort(
    children: Element[],
    model: DiagramModel,
  ): Map<string, number> {
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

    const rank = new Map<string, number>();
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
        rank.set(id, level);
        for (const next of outgoing.get(id) ?? []) {
          incomingCount.set(next, (incomingCount.get(next) ?? 1) - 1);
          if (incomingCount.get(next) === 0) queue.push(next);
        }
      }
      level++;
    }
    for (const c of children) if (!rank.has(c.id)) rank.set(c.id, level);
    return rank;
  }
}
