import type { DiagramModel } from "../domain/models/DiagramModel";
import type { PositionedElement, ViewState } from "../domain/models/ViewState";
import type { FilterConfig } from "../domain/models/FilterRule";
import CircularLayout from "../domain/layout/CircularLayout";
import type { LayoutAlgorithm } from "../domain/layout/LayoutAlgorithm";
import { evaluateCombiner } from "../domain/filter/FilterEvaluator";

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

  applyFilter(
    viewState: ViewState,
    model: DiagramModel,
    config: FilterConfig,
  ): ViewState {
    const positions = Object.fromEntries(
      Object.entries(viewState.positions).map(([path, pos]) => {
        const next = {
          ...pos,
          isDimmed: undefined,
          isHidden: undefined,
        } as PositionedElement;

        if (config.isActive && config.rules.length > 0) {
          const elementId = path.split(".").at(-1)!;
          const element = model.elements[elementId];
          const type = (element as unknown as { type: string })?.type ?? "";
          const shown = evaluateCombiner(
            config.combiner,
            config.rules,
            path,
            type,
          );

          if (!shown) {
            if (config.mode === "hide") next.isHidden = true;
            else next.isDimmed = true;
          }
        }

        return [path, next];
      }),
    );

    return { ...viewState, positions };
  }

  getAvailableLayouts(): string[] {
    return Array.from(this.layouts.keys());
  }
}
