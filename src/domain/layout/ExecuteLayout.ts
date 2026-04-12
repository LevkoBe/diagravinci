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

/**
 * Computes circular child positions relative to (0, 0), identical to
 * CircularLayout.computePositions but accessible as a plain function.
 */
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

/**
 * Layout used in execute mode.
 *
 * Preserves positions for all elements that already have them so manually
 * placed elements are never repositioned during execution. For new elements
 * (execution-generated clones) it computes their positions using the same
 * circular algorithm as the normal layout, spreading them around their parent.
 * Stale positions (for elements no longer in the model) are removed.
 *
 * Falls back to a full CircularLayout when there are no prior positions.
 */
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

    // Remove positions for paths that are no longer structurally valid.
    // A path "A.B.C" is valid iff A is in root.childIds, B is in A.childIds,
    // and C is in B.childIds. This also removes stale paths left when clones
    // are re-parented during execution (e.g. "oldParent.clone_1" after the
    // clone moves to "newParent.clone_1").
    for (const path of Object.keys(positions)) {
      const segments = path.split(".");
      let valid = true;
      let parentChildIds: string[] = model.root.childIds;
      for (const segment of segments) {
        if (!parentChildIds.includes(segment)) {
          valid = false;
          break;
        }
        parentChildIds = model.elements[segment]?.childIds ?? [];
      }
      if (!valid) delete positions[path];
    }

    // Add positions for elements that are in the model but not yet placed.
    // Uses the same circular math as the normal layout so clones spread out
    // properly around their parent rather than all stacking at the same point.
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
        // All children already have positions — recurse into them.
        for (const child of children) {
          addMissing(child.id, myPath);
        }
        return;
      }

      // When any child is new (execution clone arrived or element was reparented
      // here), recompute circular positions for ALL children so that siblings
      // spread out evenly instead of piling on top of each other.
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

    // Walk root-level children first so their positions are established before
    // we recurse into their children.
    for (const id of model.root.childIds) {
      addMissing(id, null);
    }

    // Fallback: root-level elements that still have no position (e.g. newly typed
    // while in execute mode). Place them to the right of everything already placed.
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
        // Now that this element has a position, also place its children.
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
