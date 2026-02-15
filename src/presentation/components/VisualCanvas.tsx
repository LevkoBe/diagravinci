import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  setSelectedElement,
  setViewState,
} from "../../application/store/diagramSlice";
import { ViewTransformer } from "../../application/ViewTransformer";
import { getCSSVariable } from "../../shared/utils";
import { createElementGroup } from "../ElementFactory";

export function VisualCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<ViewTransformer>(new ViewTransformer());

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isDraggingElement, setIsDraggingElement] = useState(false);

  const dispatch = useAppDispatch();
  const model = useAppSelector((state) => state.diagram.model);
  const viewState = useAppSelector((state) => state.diagram.viewState);
  const selectedElementId = useAppSelector(
    (state) => state.diagram.selectedElementId,
  );
  const isDark = useAppSelector((state) => state.theme.isDark);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
      draggable: true,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    stageRef.current = stage;
    layerRef.current = layer;

    stage.on("dragstart", () => {
      stage.container().style.cursor = "grabbing";
    });

    stage.on("dragend", () => {
      stage.container().style.cursor = "default";
    });

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const scaleBy = 1.05;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      const clampedScale = Math.max(0.1, Math.min(5, newScale));

      stage.scale({ x: clampedScale, y: clampedScale });

      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };
      stage.position(newPos);
      stage.batchDraw();
    };

    stage.on("wheel", handleWheel);

    const handleResize = () => {
      if (containerRef.current && stageRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        stageRef.current.width(width);
        stageRef.current.height(height);
        setCanvasSize({ width, height });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      stage.destroy();
    };
  }, []);

  useEffect(() => {
    const elements = Object.values(model.elements);
    if (elements.length === 0 || Object.keys(viewState.positions).length > 0)
      return;

    const newViewState = transformerRef.current.applyLayout(
      model,
      "circular",
      canvasSize,
    );
    dispatch(setViewState(newViewState));
  }, [model, viewState.positions, canvasSize, dispatch]);

  useEffect(() => {
    if (isDraggingElement || !layerRef.current || !stageRef.current) return;

    layerRef.current.destroyChildren();

    const accentColor = getCSSVariable("--color-accent");
    const fgPrimaryColor = getCSSVariable("--color-fg-primary");
    const stateSelectedColor = getCSSVariable("--color-state-selected");
    const stage = stageRef.current;

    Object.values(model.elements).forEach((element) => {
      const positionedElement = viewState.positions[element.id];
      if (!positionedElement) return;

      const group = createElementGroup(
        element,
        positionedElement,
        selectedElementId,
        accentColor,
        fgPrimaryColor,
        stateSelectedColor,
        dispatch,
        stage,
        setIsDraggingElement,
        isDraggingElement,
      );

      if (group) {
        layerRef.current!.add(group);
      }
    });

    layerRef.current.batchDraw();
  }, [
    model.elements,
    viewState.positions,
    selectedElementId,
    dispatch,
    isDraggingElement,
    isDark,
  ]);

  useEffect(() => {
    const handleClickStage = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === stageRef.current) {
        dispatch(setSelectedElement(null));
      }
    };

    stageRef.current?.on("click tap", handleClickStage);

    return () => {
      stageRef.current?.off("click tap", handleClickStage);
    };
  }, [dispatch]);

  return <div ref={containerRef} className="w-full h-full bg-bg-primary" />;
}
