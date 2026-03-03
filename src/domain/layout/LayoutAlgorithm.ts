import type { DiagramModel } from "../models/DiagramModel";
import type { ViewState } from "../models/ViewState";

export interface LayoutAlgorithm {
  name: string;
  apply(
    model: DiagramModel,
    canvasSize: { width: number; height: number },
    previousViewState?: ViewState,
  ): ViewState;
}
