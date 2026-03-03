import type { DiagramModel } from "../models/DiagramModel";
import type {
  PositionedElement,
  PositionedRelationship,
  ViewState,
} from "../models/ViewState";
import type { Element } from "../models/Element";
import type { LayoutAlgorithm } from "./LayoutAlgorithm";

export const RADIO = 3.3;

export class AncestryTracker {
  private readonly _set: Set<string>;
  constructor(_set: Set<string> = new Set()) {
    this._set = _set;
  }
  tryAdd(id: string): AncestryTracker | null {
    if (this._set.has(id)) return null;
    const newSet = new Set(this._set);
    newSet.add(id);
    return new AncestryTracker(newSet);
  }
}

export function calculateSize(value: number): number {
  return Math.pow(value, 0.9) * 30;
}

export function resolveRelationships(
  model: DiagramModel,
  positions: Record<string, PositionedElement>,
): PositionedRelationship[] {
  const shallowPath = (elementId: string): string | null => {
    let best: string | null = null;
    for (const path of Object.keys(positions)) {
      if (path.split(".").at(-1) !== elementId) continue;
      if (best === null || path.split(".").length < best.split(".").length) {
        best = path;
      }
    }
    return best;
  };
  return Object.values(model.relationships).flatMap((rel) => {
    const sourcePath = shallowPath(rel.source);
    const targetPath = shallowPath(rel.target);
    if (!sourcePath || !targetPath) return [];
    return [
      { id: rel.id, sourcePath, targetPath, type: rel.type, label: rel.label },
    ];
  });
}

export default class CircularLayout implements LayoutAlgorithm {
  name = "circular";
  private model!: DiagramModel;
  private positions: Record<string, PositionedElement> = {};
  private oldPositions: Record<string, PositionedElement> = {};
  private canvas!: { width: number; height: number };

  private assignValuesAndSizes(
    element: Element,
    ancestry: AncestryTracker,
    currentPath: string,
  ): number {
    const key = currentPath ? `${currentPath}.${element.id}` : element.id;
    const newTracker = ancestry.tryAdd(element.id);
    let value: number;
    let isRecursive = false;
    if (!newTracker) {
      isRecursive = true;
      value = 1;
    } else {
      const childrenValue = element.childIds.reduce((sum, childId) => {
        const child = this.model.elements[childId];
        return child
          ? sum + this.assignValuesAndSizes(child, newTracker, key)
          : sum;
      }, 0);
      value = childrenValue + element.childIds.length + 1;
    }
    const size = calculateSize(value);
    this.positions[key] = {
      id: key,
      position: { x: 0, y: 0 },
      size,
      value,
      isRecursive: isRecursive ? true : undefined,
    };
    return value;
  }

  private positionElement(
    element: Element,
    x: number,
    y: number,
    ancestry: AncestryTracker,
    currentPath: string,
    forceReposition: boolean,
  ): void {
    const key = currentPath ? `${currentPath}.${element.id}` : element.id;
    this.positions[key].position = { x, y };

    const newTracker = ancestry.tryAdd(element.id);
    if (!newTracker) {
      this.positions[key].isRecursive = true;
      return;
    }

    const children = element.childIds
      .map((id) => this.model.elements[id])
      .filter((child): child is Element => !!child);
    if (children.length === 0) return;

    const childRadius = this.positions[key].size / RADIO;

    if (!forceReposition) {
      const oldChildPaths = Object.keys(this.oldPositions).filter(
        (p) =>
          p.startsWith(key + ".") && !p.slice(key.length + 1).includes("."),
      );
      const newChildPaths = children.map((c) => `${key}.${c.id}`);
      const oldSet = new Set(oldChildPaths);
      const newSet = new Set(newChildPaths);
      const childrenChanged =
        oldSet.size !== newSet.size || [...oldSet].some((p) => !newSet.has(p));
      const radiusChanged =
        this.oldPositions[key]?.size !== this.positions[key].size;
      const childValuesChanged = newChildPaths.some(
        (p) => this.oldPositions[p]?.value !== this.positions[p].value,
      );
      forceReposition = childrenChanged || radiusChanged || childValuesChanged;
    }

    if (forceReposition) {
      this.positionInCircle(children, x, y, childRadius, newTracker, key, true);
    } else {
      const oldParent = this.oldPositions[key]?.position ?? { x, y };
      const dx = x - oldParent.x;
      const dy = y - oldParent.y;
      children.forEach((child) => {
        const childKey = `${key}.${child.id}`;
        const oldChild = this.oldPositions[childKey]?.position ?? { x, y };
        this.positionElement(
          child,
          oldChild.x + dx,
          oldChild.y + dy,
          newTracker,
          key,
          false,
        );
      });
    }
  }

  private positionInCircle(
    elements: Element[],
    centerX: number,
    centerY: number,
    radius: number,
    ancestry: AncestryTracker,
    parentPath: string,
    forceReposition: boolean,
  ): void {
    if (elements.length === 0) return;
    if (elements.length === 1) {
      this.positionElement(
        elements[0],
        centerX,
        centerY,
        ancestry,
        parentPath,
        forceReposition,
      );
      return;
    }
    const angleStep = (2 * Math.PI) / elements.length;
    elements.forEach((element, index) => {
      const angle = index * angleStep;
      this.positionElement(
        element,
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle),
        ancestry,
        parentPath,
        forceReposition,
      );
    });
  }

  apply(
    model: DiagramModel,
    canvasSize: { width: number; height: number },
    previousViewState?: ViewState,
  ): ViewState {
    this.model = model;
    this.canvas = canvasSize;
    this.positions = {};
    this.oldPositions = previousViewState
      ? { ...previousViewState.positions }
      : {};

    let totalValue = 0;
    const rootChildren: Element[] = [];
    this.model.root.childIds.forEach((childId) => {
      const child = this.model.elements[childId];
      if (child) {
        totalValue += this.assignValuesAndSizes(
          child,
          new AncestryTracker(),
          "",
        );
        rootChildren.push(child);
      }
    });

    const virtualValue = totalValue + this.model.root.childIds.length + 1;
    const virtualSize = calculateSize(virtualValue);
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const newRadius = virtualSize / RADIO;

    const oldRootChildPaths = Object.keys(this.oldPositions).filter(
      (p) => !p.includes("."),
    );
    const oldVirtualValue =
      oldRootChildPaths.reduce(
        (sum, p) => sum + this.oldPositions[p].value,
        0,
      ) +
      oldRootChildPaths.length +
      1;
    const oldRadius = calculateSize(oldVirtualValue) / RADIO;

    const oldSet = new Set(oldRootChildPaths);
    const newSet = new Set(rootChildren.map((c) => c.id));
    const childrenChanged =
      oldSet.size !== newSet.size || [...oldSet].some((p) => !newSet.has(p));
    const valuesChanged = [...newSet].some(
      (id) => this.positions[id]?.value !== this.oldPositions[id]?.value,
    );
    const radiusChanged = oldRadius !== newRadius;
    const needsReposition = childrenChanged || valuesChanged || radiusChanged;

    this.positionInCircle(
      rootChildren,
      centerX,
      centerY,
      newRadius,
      new AncestryTracker(),
      "",
      needsReposition,
    );
    if (!needsReposition) {
      rootChildren.forEach((child) => {
        const key = child.id;
        const old = this.oldPositions[key]?.position;
        if (old) {
          this.positionElement(
            child,
            old.x,
            old.y,
            new AncestryTracker(),
            "",
            false,
          );
        }
      });
    }

    return {
      positions: this.positions,
      relationships: resolveRelationships(this.model, this.positions),
      viewMode: "circular",
      zoom: previousViewState?.zoom ?? 1,
      pan: previousViewState?.pan ?? { x: 0, y: 0 },
    };
  }
}
