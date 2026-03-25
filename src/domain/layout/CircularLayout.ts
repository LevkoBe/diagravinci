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

  private circlePosition(
    index: number,
    total: number,
    cx: number,
    cy: number,
    radius: number,
  ): { x: number; y: number } {
    if (total === 1) return { x: cx, y: cy };
    const angle = index * ((2 * Math.PI) / total);
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
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

    if (forceReposition) {
      this.positionInCircle(children, x, y, childRadius, newTracker, key, true);
      return;
    }

    const oldParent = this.oldPositions[key]?.position ?? { x, y };
    const dx = x - oldParent.x;
    const dy = y - oldParent.y;

    const needsForceReposition = children.some((child) => {
      const childKey = `${key}.${child.id}`;
      const isNew = !this.oldPositions[childKey];
      const valueChanged =
        this.oldPositions[childKey]?.value !== this.positions[childKey]?.value;

      if (isNew || valueChanged) {
        return true;
      }

      const oldChild = this.oldPositions[childKey]?.position ?? { x, y };
      const childX = oldChild.x + dx;
      const childY = oldChild.y + dy;
      const dist = Math.hypot(childX - x, childY - y);
      return dist > childRadius;
    });

    if (needsForceReposition) {
      this.positionInCircle(children, x, y, childRadius, newTracker, key, true);
      return;
    }

    children.forEach((child) => {
      const childKey = `${key}.${child.id}`;
      const oldChild = this.oldPositions[childKey]?.position ?? { x, y };
      const childX = oldChild.x + dx;
      const childY = oldChild.y + dy;
      this.positionElement(child, childX, childY, newTracker, key, false);
    });
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
    const newRadius = calculateSize(virtualValue) / RADIO;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    rootChildren.forEach((child, index) => {
      const key = child.id;
      const isNew = !this.oldPositions[key];

      if (isNew) {
        const pos = this.circlePosition(
          index,
          rootChildren.length,
          centerX,
          centerY,
          newRadius,
        );
        this.positionElement(
          child,
          pos.x,
          pos.y,
          new AncestryTracker(),
          "",
          true,
        );
      } else {
        const oldPos = this.oldPositions[key]!.position;
        this.positionElement(
          child,
          oldPos.x,
          oldPos.y,
          new AncestryTracker(),
          "",
          false,
        );
      }
    });

    return {
      positions: this.positions,
      relationships: resolveRelationships(this.model, this.positions),
      viewMode: "circular",
      zoom: previousViewState?.zoom ?? 1,
      pan: previousViewState?.pan ?? { x: 0, y: 0 },
      hiddenPaths: previousViewState?.hiddenPaths ?? [],
      dimmedPaths: previousViewState?.dimmedPaths ?? [],
      foldedPaths: previousViewState?.foldedPaths ?? [],
    };
  }
}
