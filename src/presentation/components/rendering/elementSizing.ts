import type { DiagramModel } from "../../../domain/models/DiagramModel";
import type { Element } from "../../../domain/models/Element";
import { VConfig } from "../visualConfig";

const { BASE_PX, MIN_SCREEN_PX, MAX_SCREEN_PX, WORLD_SIBLING_EXP } =
  VConfig.sizing;

export { BASE_PX, MIN_SCREEN_PX, MAX_SCREEN_PX };

export interface ElementSizes {
  pixelSizes: Map<string, number>;

  zoomHidden: Set<string>;

  zoomDimmed: Set<string>;
}

export function computeElementSizes(
  model: DiagramModel,
  zoom: number,
): ElementSizes {
  const pixelSizes = new Map<string, number>();
  const zoomHidden = new Set<string>();
  const zoomDimmed = new Set<string>();

  function walk(
    element: Element,
    path: string,
    worldSize: number,
    visited: Set<string>,
  ): void {
    if (visited.has(element.id)) return;

    pixelSizes.set(path, worldSize);

    const screenSize = worldSize * zoom;
    if (screenSize < MIN_SCREEN_PX) {
      zoomHidden.add(path);
      return;
    }
    if (screenSize > MAX_SCREEN_PX) {
      zoomDimmed.add(path);
    }

    const children = element.childIds
      .map((id) => model.elements[id])
      .filter((c): c is Element => !!c);
    if (!children.length) return;

    const n = children.length;
    const childWorld = worldSize / Math.pow(n, WORLD_SIBLING_EXP);

    const next = new Set([...visited, element.id]);
    for (const child of children) {
      walk(child, `${path}.${child.id}`, childWorld, next);
    }
  }

  for (const id of model.root.childIds) {
    const child = model.elements[id];
    if (child) walk(child, id, BASE_PX, new Set());
  }

  return { pixelSizes, zoomHidden, zoomDimmed };
}
