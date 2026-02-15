import type { DiagramModel } from "../domain/models/DiagramModel";
import type { ViewState } from "../domain/models/ViewState";
import { CircularLayout } from "../domain/layout/CircularLayout";
import type { LayoutAlgorithm } from "../domain/layout/LayoutAlgorithm";

export class ViewTransformer {
  private layouts: Map<string, LayoutAlgorithm>;

  constructor() {
    this.layouts = new Map();
    this.layouts.set("circular", new CircularLayout());
  }

  applyLayout(
    model: DiagramModel,
    layoutName: string,
    canvasSize: { width: number; height: number },
  ): ViewState {
    const layout = this.layouts.get(layoutName);

    if (!layout) throw new Error(`Layout "${layoutName}" not found`);

    return layout.apply(model, canvasSize);
  }

  getAvailableLayouts(): string[] {
    return Array.from(this.layouts.keys());
  }
}
