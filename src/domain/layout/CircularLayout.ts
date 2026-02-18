import type { DiagramModel } from "../models/DiagramModel";
import type {
  PositionedElement,
  PositionedRelationship,
  ViewState,
} from "../models/ViewState";
import type { Element } from "../models/Element";
import type { LayoutAlgorithm } from "./LayoutAlgorithm";

const RADIO = 3.3;

class AncestryTracker {
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

export default class CircularLayout implements LayoutAlgorithm {
  name = "circular";
  private model!: DiagramModel;
  private positions: Record<string, PositionedElement> = {};
  private canvas!: { width: number; height: number };

  private calculateSize(value: number): number {
    return Math.pow(value, 0.9) * 30;
  }

  private assignValuesAndSizes(
    element: Element,
    ancestry: AncestryTracker,
    currentPath: string,
  ): number {
    const newTracker = ancestry.tryAdd(element.id);
    if (!newTracker) return 1;
    const currentTracker = newTracker;
    const key = currentPath ? `${currentPath}.${element.id}` : element.id;
    const childrenValue = element.childIds.reduce((sum, childId) => {
      const childNewTracker = currentTracker.tryAdd(childId);
      if (!childNewTracker) return sum + 1;
      const child = this.model.elements[childId];
      return child
        ? sum + this.assignValuesAndSizes(child, currentTracker, key)
        : sum;
    }, 0);
    const value = childrenValue + element.childIds.length + 1;
    const size = this.calculateSize(value);
    this.positions[key] = { id: key, position: { x: 0, y: 0 }, size, value };
    return value;
  }

  private _positionWithChildren = (
    element: Element,
    x: number,
    y: number,
    ancestry: AncestryTracker,
    currentPath: string,
  ) => {
    const key = currentPath ? `${currentPath}.${element.id}` : element.id;
    this.positions[key].position = { x, y };
    const newTracker = ancestry.tryAdd(element.id);
    const currentTracker = newTracker ?? ancestry;
    const children = element.childIds
      .map((id) => this.model.elements[id])
      .filter((child): child is Element => {
        if (!child) return false;
        return !!currentTracker.tryAdd(child.id);
      });
    if (children.length === 0) return;
    this.positionInCircle(
      children,
      x,
      y,
      this.positions[key].size / RADIO,
      currentTracker,
      key,
    );
  };

  private positionInCircle(
    elements: Element[],
    centerX: number = this.canvas.width / 2,
    centerY: number = this.canvas.height / 2,
    radius: number = Math.min(this.canvas.width, this.canvas.height) / RADIO,
    ancestry: AncestryTracker,
    parentPath: string,
  ): void {
    if (elements.length === 0) return;
    if (elements.length === 1) {
      const element = elements[0];
      this._positionWithChildren(
        element,
        centerX,
        centerY,
        ancestry,
        parentPath,
      );
      return;
    }
    const angleStep = (2 * Math.PI) / elements.length;
    elements.forEach((element, index) => {
      const angle = index * angleStep;
      this._positionWithChildren(
        element,
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle),
        ancestry,
        parentPath,
      );
    });
  }

  private resolveRelationships(): PositionedRelationship[] {
    const shallowPath = (elementId: string): string | null => {
      let best: string | null = null;
      for (const path of Object.keys(this.positions)) {
        if (path.split(".").at(-1) !== elementId) continue;
        if (best === null || path.split(".").length < best.split(".").length) {
          best = path;
        }
      }
      return best;
    };

    return Object.values(this.model.relationships).flatMap((rel) => {
      const sourcePath = shallowPath(rel.source);
      const targetPath = shallowPath(rel.target);
      if (!sourcePath || !targetPath) return [];
      return [
        {
          id: rel.id,
          sourcePath,
          targetPath,
          type: rel.type,
          label: rel.label,
        },
      ];
    });
  }

  apply(
    model: DiagramModel,
    canvasSize: { width: number; height: number },
  ): ViewState {
    this.model = model;
    this.canvas = canvasSize;
    this.positions = {};

    this.assignValuesAndSizes(this.model.root, new AncestryTracker(), "");

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const rootKey = this.model.root.id;
    this.positions[rootKey].position = { x: centerX, y: centerY };

    const rootTracker =
      new AncestryTracker().tryAdd(this.model.root.id) ?? new AncestryTracker();
    const rootChildren = this.model.root.childIds
      .map((id) => this.model.elements[id])
      .filter(
        (child): child is Element => !!child && !!rootTracker.tryAdd(child.id),
      );

    this.positionInCircle(
      rootChildren,
      centerX,
      centerY,
      this.positions[rootKey].size / RADIO,
      rootTracker,
      rootKey,
    );

    return {
      positions: this.positions,
      relationships: this.resolveRelationships(),
      viewMode: "circular",
      zoom: 1,
      pan: { x: 0, y: 0 },
    };
  }
}
