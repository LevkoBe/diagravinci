import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import type { ViewState } from "../models/ViewState";
import type { LayoutAlgorithm } from "./LayoutAlgorithm";
import { AncestryTracker, resolveRelationships } from "./CircularLayout";

const CHILD_FILL = 0.85;

export abstract class BaseLayout implements LayoutAlgorithm {
  abstract name: string;
  protected abstract viewMode: ViewState["viewMode"];

  protected abstract computePositions(
    children: Element[],
    model: DiagramModel,
    containerWidth: number,
    containerHeight: number,
  ): { x: number; y: number; size: number }[];

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
      value: 0,
    };

    const tracker = ancestry.tryAdd(element.id);
    if (!tracker) {
      positions[path].isRecursive = true;
      return;
    }

    const children = element.childIds
      .map((id) => model.elements[id])
      .filter((c): c is Element => !!c);
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
  ): ViewState {
    const positions: ViewState["positions"] = {};
    const baseState = {
      viewMode: this.viewMode,
      zoom: previousViewState?.zoom ?? 1,
      pan: previousViewState?.pan ?? { x: 0, y: 0 },
      hiddenPaths: previousViewState?.hiddenPaths ?? [],
      dimmedPaths: previousViewState?.dimmedPaths ?? [],
      foldedPaths: previousViewState?.foldedPaths ?? [],
    } as const;

    const rootChildren = model.root.childIds
      .map((id) => model.elements[id])
      .filter((e): e is Element => !!e);

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

    return {
      positions,
      relationships: resolveRelationships(model, positions),
      ...baseState,
    };
  }
}
