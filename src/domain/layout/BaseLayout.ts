import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import type {
  PositionedElement,
  PositionedRelationship,
  ViewState,
} from "../models/ViewState";
import type { LayoutAlgorithm } from "./LayoutAlgorithm";
import { AppConfig } from "../../config/appConfig";

export const CHILD_FILL = AppConfig.layout.CHILD_FILL;
export const ELEMENT_FILL = AppConfig.layout.ELEMENT_FILL;
export const RADIO = AppConfig.layout.RADIO;

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

export function getChildren(parent: Element, model: DiagramModel): Element[] {
  return parent.childIds
    .map((id) => model.elements[id])
    .filter((c): c is Element => !!c);
}

export function calculateSize(value: number): number {
  return (
    Math.pow(value, AppConfig.layout.SIZE_EXP) * AppConfig.layout.SIZE_MULT
  );
}

export function resolveRelationships(
  model: DiagramModel,
  positions: Record<string, PositionedElement>,
): PositionedRelationship[] {
  const shallowPathByElementId = new Map<string, string>();
  const depthOf = new Map<string, number>();
  for (const path of Object.keys(positions)) {
    const lastDot = path.lastIndexOf(".");
    const id = lastDot === -1 ? path : path.slice(lastDot + 1);
    const depth = (path.match(/\./g) ?? []).length + 1;
    const existingDepth = depthOf.get(id) ?? Infinity;
    if (depth < existingDepth) {
      shallowPathByElementId.set(id, path);
      depthOf.set(id, depth);
    }
  }

  const resolve = (ref: string): string | null =>
    positions[ref] ? ref : (shallowPathByElementId.get(ref) ?? null);

  return Object.values(model.relationships).flatMap((rel) => {
    const sourcePath = resolve(rel.source);
    const targetPath = resolve(rel.target);
    if (!sourcePath || !targetPath) return [];
    return [
      { id: rel.id, sourcePath, targetPath, type: rel.type, label: rel.label },
    ];
  });
}

export abstract class BaseLayout implements LayoutAlgorithm {
  abstract name: string;
  protected abstract viewMode: ViewState["viewMode"];

  protected abstract computePositions(
    children: Element[],
    model: DiagramModel,
    containerWidth: number,
    containerHeight: number,
  ): { x: number; y: number; size: number }[];

  protected computeValue(_element: Element, _model: DiagramModel): number {
    return 0;
  }

  protected recursiveElementSize(_allocatedSize: number): number {
    return _allocatedSize;
  }

  private positionRecursive(
    element: Element,
    path: string,
    cx: number,
    cy: number,
    allocatedSize: number,
    model: DiagramModel,
    positions: ViewState["positions"],
    ancestry: AncestryTracker,
  ): void {
    positions[path] = {
      id: element.id,
      position: { x: cx, y: cy },
      size: allocatedSize,
      value: this.computeValue(element, model),
    };

    const tracker = ancestry.tryAdd(element.id);
    if (!tracker) {
      positions[path].isRecursive = true;
      positions[path].size = this.recursiveElementSize(allocatedSize);
      return;
    }

    const children = getChildren(element, model);
    if (!children.length) return;

    const childContainer = allocatedSize * CHILD_FILL;
    const childPositions = this.computePositions(
      children,
      model,
      childContainer,
      childContainer,
    );

    children.forEach((child, i) =>
      this.positionRecursive(
        child,
        `${path}.${child.id}`,
        cx + childPositions[i].x,
        cy + childPositions[i].y,
        childPositions[i].size,
        model,
        positions,
        tracker,
      ),
    );
  }

  apply(
    model: DiagramModel,
    canvasSize: { width: number; height: number },
    previousViewState?: ViewState,
    preservePositions = false,
  ): ViewState {
    const positions: ViewState["positions"] = {};
    const baseState = {
      viewMode: this.viewMode,
      zoom: previousViewState?.zoom ?? 1,
      pan: previousViewState?.pan ?? { x: 0, y: 0 },
      hiddenPaths: previousViewState?.hiddenPaths ?? [],
      dimmedPaths: previousViewState?.dimmedPaths ?? [],
      foldedPaths: previousViewState?.foldedPaths ?? [],
      coloredPaths: previousViewState?.coloredPaths ?? {},
    } as const;

    const rootChildren = getChildren(model.root, model);

    if (!rootChildren.length) {
      return { positions, relationships: [], ...baseState };
    }

    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const rootW = canvasSize.width * CHILD_FILL;
    const rootH = canvasSize.height * CHILD_FILL;

    const rootPositions = this.computePositions(
      rootChildren,
      model,
      rootW,
      rootH,
    );

    rootChildren.forEach((child, i) =>
      this.positionRecursive(
        child,
        child.id,
        cx + rootPositions[i].x,
        cy + rootPositions[i].y,
        rootPositions[i].size,
        model,
        positions,
        new AncestryTracker(),
      ),
    );

    if (preservePositions && previousViewState) {
      const newSizes = new Map<string, number>();
      const newLayoutPos = new Map<string, { x: number; y: number }>();
      for (const path of Object.keys(positions)) {
        newSizes.set(path, positions[path].size);
        newLayoutPos.set(path, { ...positions[path].position });
      }

      for (const path of Object.keys(positions)) {
        const prev = previousViewState.positions[path];
        if (prev) positions[path].position = prev.position;
      }

      const sortedPaths = Object.keys(positions).sort(
        (a, b) => (a.match(/\./g) ?? []).length - (b.match(/\./g) ?? []).length,
      );

      for (const path of sortedPaths) {
        const dotIdx = path.lastIndexOf(".");
        if (dotIdx === -1) continue;

        const parentPath = path.slice(0, dotIdx);
        const parentCurrent = positions[parentPath];
        const oldParentPe = previousViewState.positions[parentPath];
        if (!parentCurrent || !oldParentPe) continue;

        const oldChildPe = previousViewState.positions[path];

        if (!oldChildPe) {
          const parentLayoutPos = newLayoutPos.get(parentPath);
          const childLayoutPos = newLayoutPos.get(path);
          if (parentLayoutPos && childLayoutPos) {
            positions[path].position = {
              x:
                parentCurrent.position.x +
                (childLayoutPos.x - parentLayoutPos.x),
              y:
                parentCurrent.position.y +
                (childLayoutPos.y - parentLayoutPos.y),
            };
          }
          continue;
        }

        const oldParentSize = oldParentPe.size;
        const newParentSize = newSizes.get(parentPath) ?? oldParentSize;
        const scale = newParentSize / oldParentSize;

        const parentShiftX = parentCurrent.position.x - oldParentPe.position.x;
        const parentShiftY = parentCurrent.position.y - oldParentPe.position.y;
        if (
          Math.abs(parentShiftX) < 0.001 &&
          Math.abs(parentShiftY) < 0.001 &&
          Math.abs(scale - 1) < 0.001
        )
          continue;

        const relX = oldChildPe.position.x - oldParentPe.position.x;
        const relY = oldChildPe.position.y - oldParentPe.position.y;

        positions[path].position = {
          x: parentCurrent.position.x + relX * scale,
          y: parentCurrent.position.y + relY * scale,
        };
      }
    }

    return {
      positions,
      relationships: resolveRelationships(model, positions),
      ...baseState,
    };
  }
}
