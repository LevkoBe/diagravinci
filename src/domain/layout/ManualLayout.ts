import type { LayoutAlgorithm } from "./LayoutAlgorithm";
import type { DiagramModel } from "../models/DiagramModel";
import type { ViewState } from "../models/ViewState";
import { ExecuteLayout } from "./ExecuteLayout";

// Preserves all user-placed positions and slots new nodes in circularly.
// Delegates the full logic to ExecuteLayout and stamps the viewMode.
export class ManualLayout implements LayoutAlgorithm {
  name = "manual";
  private readonly inner = new ExecuteLayout();

  apply(
    model: DiagramModel,
    canvasSize: { width: number; height: number },
    previousViewState?: ViewState,
  ): ViewState {
    const result = this.inner.apply(model, canvasSize, previousViewState);
    return { ...result, viewMode: "manual" };
  }
}
