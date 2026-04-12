import Konva from "konva";
import type { Colors } from "../types";
import type { ViewState } from "../../../../domain/models/ViewState";
import type { Element } from "../../../../domain/models/Element";
import { ELEMENT_SVGS } from "../../../ElementConfigs";
import { BaseElementRenderer } from "./BaseElementRenderer";
import { VConfig } from "../../visualConfig";

const { STROKE_EXP, DIM_OPACITY } = VConfig.elements;

export class SvgPathElementRenderer extends BaseElementRenderer {
  private readonly elementSvgs: Record<
    string,
    { data: string; viewBoxWidth: number; viewBoxHeight: number }
  >;

  constructor(
    element: Element,
    path: string,
    viewState: ViewState,
    connectingFromId: string | null,
    colors: Colors,
    isNew: boolean,
    isDimmed: boolean,
    size: number,
    zoom: number,
    colorOverride: string | null = null,
    elementSvgs: Record<
      string,
      { data: string; viewBoxWidth: number; viewBoxHeight: number }
    > = ELEMENT_SVGS,
  ) {
    super(
      element,
      path,
      viewState,
      connectingFromId,
      colors,
      isNew,
      isDimmed,
      size,
      zoom,
      colorOverride,
    );
    this.elementSvgs = elementSvgs;
  }

  protected override addContainerBackground(group: Konva.Group): void {
    group.add(
      new Konva.Circle({
        radius: (this.size * 4) / 9,
        fill: "rgba(0,0,0,0.001)",
        listening: true,
      }),
    );
  }

  protected addElementShape(group: Konva.Group): Konva.Path {
    const { size } = this;
    const config = this.elementSvgs[this.element.type];
    const scale = size / Math.max(config.viewBoxWidth, config.viewBoxHeight);

    const strokeWidth =
      Math.pow(size, STROKE_EXP) /
      (scale * Math.max(Math.pow(this.zoom, 0.5), 0.01));

    const pathNode = new Konva.Path({
      data: config.data,
      stroke: this.resolveStroke(),
      strokeWidth,
      scale: { x: scale, y: scale },
      x: -(config.viewBoxWidth * scale) / 2,
      y: -(config.viewBoxHeight * scale) / 2,
      opacity: this.isDimmed ? DIM_OPACITY : 1,
    });

    group.add(pathNode);
    return pathNode;
  }
}
