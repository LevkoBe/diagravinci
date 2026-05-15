import type { DiagramModel } from "../../../domain/models/DiagramModel";
import type { Element } from "../../../domain/models/Element";
import type { ViewState } from "../../../domain/models/ViewState";
import { VConfig } from "../visualConfig";

const { BASE_PX, MIN_SCREEN_PX, MAX_SCREEN_RATIO, WORLD_SIBLING_EXP } =
  VConfig.sizing;

export { BASE_PX, MIN_SCREEN_PX, MAX_SCREEN_RATIO };

export interface ElementSizes {
  pixelSizes: Map<string, number>;

  zoomHidden: Set<string>;

  zoomDimmed: Set<string>;
}

export function computeElementSizes(
  model: DiagramModel,
  viewState: ViewState,
  zoom: number,
  viewportSize: { width: number; height: number } = { width: 800, height: 600 },
): ElementSizes {
  const maxScreenPx =
    Math.min(viewportSize.width, viewportSize.height) * MAX_SCREEN_RATIO;
  const pixelSizes = new Map<string, number>();
  const zoomHidden = new Set<string>();
  const zoomDimmed = new Set<string>();

  function walk(
    element: Element,
    path: string,
    syntheticWorldSize: number,
    visited: Set<string>,
  ): void {
    if (visited.has(element.id)) return;

    pixelSizes.set(path, syntheticWorldSize);

    const actualVisibleSize =
      viewState.positions[path]?.size ?? syntheticWorldSize;
    const screenSize = actualVisibleSize * zoom;

    if (screenSize < MIN_SCREEN_PX && path.includes(".")) {
      zoomHidden.add(path);
      return;
    }
    if (screenSize > maxScreenPx) {
      zoomDimmed.add(path);
    }

    const children = element.childIds
      .map((id) => model.elements[id])
      .filter((c): c is Element => !!c);

    if (!children.length) return;

    const n = children.length;
    const childSyntheticWorldSize =
      syntheticWorldSize / Math.pow(n, WORLD_SIBLING_EXP);
    const next = new Set([...visited, element.id]);

    for (const child of children) {
      walk(child, `${path}.${child.id}`, childSyntheticWorldSize, next);
    }
  }

  for (const id of model.root.childIds) {
    const child = model.elements[id];
    if (child) walk(child, id, BASE_PX, new Set());
  }

  return { pixelSizes, zoomHidden, zoomDimmed };
}
