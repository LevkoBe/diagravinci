import type { DiagramModel } from "../models/DiagramModel";
import type { ViewState } from "../models/ViewState";
import type { Position } from "../models/Element";
import type { LayoutAlgorithm } from "./LayoutAlgorithm";

export class CircularLayout implements LayoutAlgorithm {
  name = "circular";

  private readonly MARGIN = 40;

  apply(
    model: DiagramModel,
    canvasSize: { width: number; height: number },
  ): ViewState {
    const positions: Record<string, { id: string; position: Position }> = {};
    const elements = Object.values(model.elements);

    const availableWidth = canvasSize.width - 2 * this.MARGIN;
    const availableHeight = canvasSize.height - 2 * this.MARGIN;

    elements.forEach((element, index) => {
      const angle = (index / elements.length) * 2 * Math.PI;
      const radius = Math.min(availableWidth, availableHeight) / 3;

      const x = canvasSize.width / 2 + Math.cos(angle) * radius;
      const y = canvasSize.height / 2 + Math.sin(angle) * radius;

      positions[element.id] = {
        id: element.id,
        position: { x, y },
      };
    });

    return {
      positions,
      viewMode: "basic",
      zoom: 1,
      pan: { x: 0, y: 0 },
    };
  }
}
