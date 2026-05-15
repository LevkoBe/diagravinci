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

    const edges: [string, string][] = [];
    for (const rel of Object.values(model.relationships)) {
      if (
        ids.has(rel.source) &&
        ids.has(rel.target) &&
        rel.source !== rel.target
      ) {
        edges.push([rel.source, rel.target]);
      }
    }

    const adj = new Map<string, string[]>();
    for (const c of children) adj.set(c.id, []);
    for (const [s, t] of edges) adj.get(s)!.push(t);

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const backEdges = new Set<string>();

    const dfs = (id: string): void => {
      visiting.add(id);
      for (const next of adj.get(id) ?? []) {
        if (visiting.has(next)) {
          backEdges.add(`${id}\0${next}`);
        } else if (!visited.has(next)) {
          dfs(next);
        }
      }
      visiting.delete(id);
      visited.add(id);
    };
    for (const c of children) {
      if (!visited.has(c.id)) dfs(c.id);
    }

    const dagAdj = new Map<string, string[]>();
    const dagIn = new Map<string, number>();
    for (const c of children) {
      dagAdj.set(c.id, []);
      dagIn.set(c.id, 0);
    }
    for (const [s, t] of edges) {
      if (!backEdges.has(`${s}\0${t}`)) {
        dagAdj.get(s)!.push(t);
        dagIn.set(t, dagIn.get(t)! + 1);
      }
    }

    const rank = new Map<string, number>();
    for (const c of children) rank.set(c.id, 0);

    const pending = new Map(dagIn);
    const queue = children.map((c) => c.id).filter((id) => dagIn.get(id) === 0);

    while (queue.length > 0) {
      const id = queue.shift()!;
      const myRank = rank.get(id)!;
      for (const next of dagAdj.get(id)!) {
        if (myRank + 1 > rank.get(next)!) rank.set(next, myRank + 1);
        pending.set(next, pending.get(next)! - 1);
        if (pending.get(next) === 0) queue.push(next);
      }
    }

    const columns = new Map<number, string[]>();
    for (const c of children) {
      const r = rank.get(c.id)!;
      if (!columns.has(r)) columns.set(r, []);
      columns.get(r)!.push(c.id);
    }

    const numCols = Math.max(...columns.keys()) + 1;
    const maxInCol = Math.max(...[...columns.values()].map((l) => l.length));

    const cellW = containerWidth / numCols;
    const cellH = containerHeight / maxInCol;
    const size = Math.min(cellW, cellH) * ELEMENT_FILL;

    const posById = new Map<string, { x: number; y: number; size: number }>();
    for (const [col, colIds] of columns) {
      const x = (col - (numCols - 1) / 2) * cellW;
      colIds.forEach((id, row) => {
        const y = (row - (colIds.length - 1) / 2) * cellH;
        posById.set(id, { x, y, size });
      });
    }

    return children.map((c) => posById.get(c.id)!);
  }
}
