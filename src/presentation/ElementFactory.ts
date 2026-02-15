import Konva from "konva";
import {
  BASE_SIZE,
  SELECTED_STROKE_WIDTH,
  STROKE_WIDTH,
  ELEMENT_SVGS,
} from "./ElementConfigs";
import {
  updateElementPositionInView,
  setSelectedElement,
} from "../application/store/diagramSlice";
import type { AppDispatch } from "../application/store/store";
import type { Element } from "../domain/models/Element";

export function createElementGroup(
  element: Element,
  positionedElement: { position: { x: number; y: number } },
  selectedElementId: string | null,
  accentColor: string,
  fgPrimaryColor: string,
  stateSelectedColor: string,
  dispatch: AppDispatch,
  stage: Konva.Stage,
  setIsDraggingElement: (isDragging: boolean) => void,
  isDraggingElement: boolean,
): Konva.Group | null {
  if (!positionedElement) return null;

  const config = ELEMENT_SVGS[element.type];
  const scaleFactor =
    BASE_SIZE / Math.max(config.viewBoxWidth, config.viewBoxHeight);

  const isSelected = selectedElementId === element.id;

  const group = new Konva.Group({
    x: positionedElement.position.x,
    y: positionedElement.position.y,
    draggable: true,
    name: element.id,
  });

  const shape = new Konva.Path({
    data: config.data,
    stroke: isSelected ? stateSelectedColor : accentColor,
    strokeWidth: isSelected ? SELECTED_STROKE_WIDTH : STROKE_WIDTH,
    scale: { x: scaleFactor, y: scaleFactor },
    x: -(config.viewBoxWidth * scaleFactor) / 2,
    y: -(config.viewBoxHeight * scaleFactor) / 2,
  });

  const text = new Konva.Text({
    x: -BASE_SIZE / 2,
    y: -10,
    width: BASE_SIZE,
    text: element.id,
    fontSize: 14,
    fontFamily: "Aleo, serif",
    fill: fgPrimaryColor,
    align: "center",
  });

  group.add(shape);
  group.add(text);

  group.on("mouseenter", () => {
    stage.container().style.cursor = "grab";
  });

  group.on("mouseleave", () => {
    if (!isDraggingElement) {
      stage.container().style.cursor = "default";
    }
  });

  group.on("dragstart", () => {
    setIsDraggingElement(true);
    stage.container().style.cursor = "grabbing";
  });

  group.on("dragend", () => {
    setIsDraggingElement(false);
    stage.container().style.cursor = "grab";
    const position = group.position();
    dispatch(
      updateElementPositionInView({
        id: element.id,
        position,
      }),
    );
  });

  group.on("click tap", () => {
    dispatch(setSelectedElement(element.id));
  });

  return group;
}
