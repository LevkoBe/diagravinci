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
