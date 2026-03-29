import type { ViewState } from "../models/ViewState";
import type { DiagramModel } from "../models/DiagramModel";
import { getLayout } from "../layout/LayoutRegistry";

export class ViewStateMerger {
  static merge(
    current: ViewState,
    newModel: DiagramModel,
    canvasSize: { width: number; height: number },
  ): ViewState {
    const layout = getLayout(current.viewMode);
    const viewState = layout.apply(newModel, canvasSize, current);

    return {
      ...viewState,
      zoom: current.zoom,
      pan: current.pan,
      viewMode: current.viewMode,
      hiddenPaths: current.hiddenPaths ?? [],
      dimmedPaths: current.dimmedPaths ?? [],
      foldedPaths: current.foldedPaths ?? [],
    };
  }
}
