import {
  resolveRelationships,
  CHILD_FILL,
  ELEMENT_FILL,
  RADIO,
  calculateSize,
} from "./BaseLayout";
import type { LayoutAlgorithm } from "./LayoutAlgorithm";
import type { DiagramModel } from "../models/DiagramModel";
import type { Element } from "../models/Element";
import type { ViewState, PositionedElement } from "../models/ViewState";
import { layoutWeight } from "./LayoutUtils";
import CircularLayout from "./CircularLayout";

function circularChildPositions(
  children: Element[],
  model: DiagramModel,
  containerSize: number,
): Array<{ x: number; y: number; size: number }> {
  const n = children.length;
  if (n === 0) return [];

  const weights = children.map((c) => layoutWeight(c, model));
  const elementSize = Math.min(
    calculateSize(Math.max(...weights, 1)),
    containerSize * ELEMENT_FILL,
  );

  if (n === 1) {
    return [
      {
        x: 0,
        y: 0,
        size: Math.max(elementSize, containerSize * ELEMENT_FILL),
      },
    ];
  }

  const radius = containerSize / (RADIO * CHILD_FILL);
  const maxSizeFromSpacing = 2 * radius * Math.sin(Math.PI / n) * CHILD_FILL;
  const sizeFloor = containerSize / n;
  const sizeConstrained = Math.max(
    Math.min(elementSize, maxSizeFromSpacing),
    sizeFloor,
  );
  const angleStep = (2 * Math.PI) / n;

  return children.map((_, i) => ({
    x: radius * Math.cos(i * angleStep),
    y: radius * Math.sin(i * angleStep),
    size: sizeConstrained,
  }));
}

export class ExecuteLayout implements LayoutAlgorithm {
  name = "execute";

  apply(
    model: DiagramModel,
    canvasSize: { width: number; height: number },
    previousViewState?: ViewState,
  ): ViewState {
    if (
      !previousViewState ||
      Object.keys(previousViewState.positions).length === 0
    ) {
      return new CircularLayout().apply(model, canvasSize, previousViewState);
    }

    const positions: Record<string, PositionedElement> = {
      ...previousViewState.positions,
    };

    const childIdSets: Record<string, Set<string>> = {
      [model.root.id]: new Set(model.root.childIds),
    };
    for (const [id, el] of Object.entries(model.elements)) {
      childIdSets[id] = new Set(el.childIds);
    }

    for (const path of Object.keys(positions)) {
      const segments = path.split(".");
      let valid = true;
      let parentId = model.root.id;
      for (const segment of segments) {
        if (!childIdSets[parentId]?.has(segment)) {
          valid = false;
          break;
        }
        parentId = segment;
      }
      if (!valid) delete positions[path];
    }

    const addMissing = (elementId: string, parentPath: string | null): void => {
      const el = model.elements[elementId];
      if (!el || el.childIds.length === 0) return;

      const myPath = parentPath ? `${parentPath}.${elementId}` : elementId;
      const myEntry = positions[myPath];
      if (!myEntry) return; // parent itself not yet placed — skip

      const containerSize = myEntry.size * CHILD_FILL;
      const children = el.childIds
        .map((id) => model.elements[id])
        .filter((c): c is Element => !!c);

      const newChildren = children.filter((c) => {
        const p = `${myPath}.${c.id}`;
        return !positions[p];
      });

      if (newChildren.length === 0) {
        for (const child of children) {
          addMissing(child.id, myPath);
        }
        return;
      }

      const offsets = circularChildPositions(children, model, containerSize);
      children.forEach((child, i) => {
        const childPath = `${myPath}.${child.id}`;
        positions[childPath] = {
          id: child.id,
          position: {
            x: myEntry.position.x + offsets[i].x,
            y: myEntry.position.y + offsets[i].y,
          },
          size: offsets[i].size,
          value: 1,
        };
        addMissing(child.id, myPath);
      });
    };

    for (const id of model.root.childIds) {
      addMissing(id, null);
    }

    const unpositioned = model.root.childIds.filter(
      (id) => model.elements[id] && !positions[id],
    );
    if (unpositioned.length > 0) {
      const maxX =
        Object.values(positions).reduce(
          (m, e) => Math.max(m, e.position.x + e.size),
          canvasSize.width * 0.1,
        );
      const DEFAULT_SIZE = 80;
      let x = maxX + 100;
      for (const id of unpositioned) {
        positions[id] = {
          id,
          position: { x, y: canvasSize.height / 2 },
          size: DEFAULT_SIZE,
          value: 1,
        };
        x += DEFAULT_SIZE + 40;
        addMissing(id, null);
      }
    }

    return {
      ...previousViewState,
      positions,
      relationships: resolveRelationships(model, positions),
    };
  }
}
