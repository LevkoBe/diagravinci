import Konva from "konva";
import type { Colors, ElementRenderResult } from "../types";
import type { ViewState } from "../../../../domain/models/ViewState";
import type { Element } from "../../../../domain/models/Element";
import { ELEMENT_SVGS } from "../../../ElementConfigs";
import { BaseElementRenderer } from "./BaseElementRenderer";

const DIM_OPACITY = 0.2;

export interface IElementRenderer {
  render(parentPos?: { x: number; y: number }): ElementRenderResult | undefined;
}

export class SvgPathElementRenderer extends BaseElementRenderer {
  private readonly elementSvgs: Record<
    string,
    { data: string; viewBoxWidth: number; viewBoxHeight: number }
  >;

  constructor(
    element: Element,
    path: string,
    viewState: ViewState,
    selectedElementId: string | null,
    connectingFromId: string | null,
    colors: Colors,
    isNew: boolean,
    elementSvgs: Record<
      string,
      { data: string; viewBoxWidth: number; viewBoxHeight: number }
    > = ELEMENT_SVGS,
  ) {
    super(
      element,
      path,
      viewState,
      selectedElementId,
      connectingFromId,
      colors,
      isNew,
    );
    this.elementSvgs = elementSvgs;
  }

  render(parentPos?: {
    x: number;
    y: number;
  }): ElementRenderResult | undefined {
    const pos = this.viewState.positions[this.path];
    if (!pos) return;

    const group = this.createElementGroup(parentPos);
    const pathNode = this.addElementShape(group, pos.size);
    this.addLabel(group, pos.size);
    this.addDecorationsIfNeeded(group, pos.size);

    const { onHoverIn, onHoverOut } = this.createHoverCallbacks(
      group,
      pathNode,
      pathNode.strokeWidth(),
    );

    return { group, onHoverIn, onHoverOut };
  }

  private addElementShape(group: Konva.Group, size: number): Konva.Path {
    const config = this.elementSvgs[this.element.type];
    const scale = size / Math.max(config.viewBoxWidth, config.viewBoxHeight);
    const strokeWidth = Math.pow(size, 0.4) / scale;

    const pathNode = new Konva.Path({
      data: config.data,
      stroke:
        this.selectedElementId === this.element.id
          ? this.colors.selected
          : this.colors.accent,
      strokeWidth,
      scale: { x: scale, y: scale },
      x: -(config.viewBoxWidth * scale) / 2,
      y: -(config.viewBoxHeight * scale) / 2,
      opacity: this.viewState.positions[this.path]?.isDimmed ? DIM_OPACITY : 1,
    });

    group.add(pathNode);
    return pathNode;
  }
}
