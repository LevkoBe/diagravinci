import type { DiagramModel } from "../models/DiagramModel";
import type { Element } from "../models/Element";
import type { PositionedElement } from "../models/ViewState";

export interface FlatElement {
  element: Element;
  path: string;
  depth: number;
  parentPath: string | null;
}

export function flattenElements(model: DiagramModel): FlatElement[] {
  const result: FlatElement[] = [];
  function traverse(
    element: Element,
    path: string,
    depth: number,
    parentPath: string | null,
  ) {
    result.push({ element, path, depth, parentPath });
    element.childIds.forEach((childId) => {
      const child = model.elements[childId];
      if (child) traverse(child, `${path}.${childId}`, depth + 1, path);
    });
  }
  model.root.childIds.forEach((childId) => {
    const child = model.elements[childId];
    if (child) traverse(child, childId, 0, null);
  });
  return result;
}

export function layoutWeight(
  element: Element,
  model: DiagramModel,
  visited: Set<string> = new Set(),
  memo: Map<string, number> = new Map(),
): number {
  if (visited.has(element.id)) return 1;
  if (memo.has(element.id)) return memo.get(element.id)!;
  visited.add(element.id);
  const weight =
    element.childIds.reduce((sum, id) => {
      const child = model.elements[id];
      return sum + (child ? layoutWeight(child, model, visited, memo) : 0);
    }, 0) + 1;
  visited.delete(element.id);
  memo.set(element.id, weight);
  return weight;
}

export function sortByRelationshipAffinity(
  children: Element[],
  model: DiagramModel,
): Element[] {
  if (children.length <= 2) return children;

  const ids = children.map((c) => c.id);
  const idSet = new Set(ids);

  const pairKey = (a: string, b: string) =>
    a < b ? `${a}\0${b}` : `${b}\0${a}`;
  const pairWeight = new Map<string, number>();
  for (const rel of Object.values(model.relationships)) {
    if (idSet.has(rel.source) && idSet.has(rel.target) && rel.source !== rel.target) {
      const k = pairKey(rel.source, rel.target);
      pairWeight.set(k, (pairWeight.get(k) ?? 0) + 1);
    }
  }

  const edgeWeight = (a: string, b: string) =>
    pairWeight.get(pairKey(a, b)) ?? 0;

  const totalDegree = new Map(
    ids.map((id) => [id, ids.reduce((s, other) => s + edgeWeight(id, other), 0)]),
  );
  const start = ids.reduce((best, id) =>
    (totalDegree.get(id) ?? 0) < (totalDegree.get(best) ?? 0) ? id : best,
  );

  const ordered: string[] = [start];
  const remaining = new Set(ids.filter((id) => id !== start));
  while (remaining.size) {
    const last = ordered[ordered.length - 1];
    let bestId = "";
    let bestW = -1;
    for (const id of remaining) {
      const w = edgeWeight(last, id);
      if (w > bestW) {
        bestW = w;
        bestId = id;
      }
    }
    ordered.push(bestId);
    remaining.delete(bestId);
  }

  const order = new Map(ordered.map((id, i) => [id, i]));
  return children.slice().sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export function makePositioned(
  id: string,
  x: number,
  y: number,
): PositionedElement {
  return { id, position: { x, y }, size: 0, value: 0 };
}

export function scaleToRadius(
  rawPositions: { x: number; y: number }[],
  cx: number,
  cy: number,
  r: number,
): { x: number; y: number }[] {
  if (rawPositions.length === 0) return [];
  if (rawPositions.length === 1) return [{ x: cx, y: cy }];

  let maxDist = 0;
  for (const p of rawPositions)
    maxDist = Math.max(maxDist, Math.hypot(p.x, p.y));

  if (maxDist < 1) {
    return rawPositions.map((_, i) => {
      const angle = (2 * Math.PI * i) / rawPositions.length;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  }

  const scale = r / maxDist;
  return rawPositions.map((p) => ({
    x: cx + p.x * scale,
    y: cy + p.y * scale,
  }));
}
