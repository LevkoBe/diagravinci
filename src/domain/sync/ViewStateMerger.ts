import type { ViewState } from "../models/ViewState";
import type { DiagramModel } from "../models/DiagramModel";
import CircularLayout from "../layout/CircularLayout";
import { resolveRelationships } from "../layout/CircularLayout";

export class ViewStateMerger {
  static merge(
    current: ViewState,
    newModel: DiagramModel,
    canvasSize: { width: number; height: number },
  ): ViewState {
    const viewState = new CircularLayout().apply(newModel, canvasSize, current);
    viewState.relationships = resolveRelationships(
      newModel,
      viewState.positions,
    );
    return {
      ...viewState,
      zoom: current.zoom,
      pan: current.pan,
      viewMode: current.viewMode,
    };
  }
}
