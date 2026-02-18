import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  setSelectedElement,
  setViewState,
  updateElementPositionInView,
  moveElementToParent,
} from "../../application/store/diagramSlice";
import { getCSSVariable } from "../../shared/utils";
import CircularLayout from "../../domain/layout/CircularLayout";
import { DiagramLayerRenderer } from "./DiagramLayerRenderer";

export function VisualCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const relationshipLayerRef = useRef<Konva.Layer | null>(null);
  const elementLayerRef = useRef<Konva.Layer | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const dispatch = useAppDispatch();
  const model = useAppSelector((state) => state.diagram.model);
  const viewState = useAppSelector((state) => state.diagram.viewState);
  const selectedElementId = useAppSelector(
    (state) => state.diagram.selectedElementId,
  );
  const isDark = useAppSelector((state) => state.theme.isDark);

  // stages setup: pan, zoom, resize
  useEffect(() => {
    if (!containerRef.current) return;
    const stage = new Konva.Stage({
      container: containerRef.current,
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
      draggable: true,
    });

    const relationshipLayer = new Konva.Layer();
    const elementLayer = new Konva.Layer();
    stage.add(relationshipLayer);
    stage.add(elementLayer);

    stageRef.current = stage;
    relationshipLayerRef.current = relationshipLayer;
    elementLayerRef.current = elementLayer;

    stage.on("dragstart", () => {
      stage.container().style.cursor = "grabbing";
    });
    stage.on("dragend", () => {
      stage.container().style.cursor = "default";
    });

    stage.on("wheel", (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.max(
        0.1,
        Math.min(5, oldScale * (direction > 0 ? 1.05 : 1 / 1.05)),
      );
      stage.scale({ x: newScale, y: newScale });
      stage.position({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
      stage.batchDraw();
    });

    const handleResize = () => {
      if (!containerRef.current || !stageRef.current) return;
      const width = containerRef.current.offsetWidth;
      const height = containerRef.current.offsetHeight;
      stageRef.current.width(width);
      stageRef.current.height(height);
      setCanvasSize({ width, height });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      stage.destroy();
    };
  }, []);

  // recalculate layout
  useEffect(() => {
    if (Object.keys(model.elements).length > 0) {
      dispatch(setViewState(new CircularLayout().apply(model, canvasSize)));
    }
  }, [model, canvasSize, dispatch]);

  // re-render Konva layers
  useEffect(() => {
    if (
      !relationshipLayerRef.current ||
      !elementLayerRef.current ||
      !stageRef.current
    )
      return;

    const renderer = new DiagramLayerRenderer(
      stageRef.current,
      model,
      viewState,
      selectedElementId,
      {
        accent: getCSSVariable("--color-accent"),
        fgPrimary: getCSSVariable("--color-fg-primary"),
        selected: getCSSVariable("--color-state-selected"),
        bgSecondary: getCSSVariable("--color-bg-secondary"),
        relationship: getCSSVariable("--color-fg-secondary"),
      },
      {
        onPositionChange: (path, worldPos) => {
          dispatch(
            updateElementPositionInView({ id: path, position: worldPos }),
          );
        },
        onReparent: (elementId, newParentId) => {
          dispatch(moveElementToParent({ elementId, newParentId }));
        },
        onClick: (elementId) => {
          dispatch(setSelectedElement(elementId));
        },
      },
    );

    renderer.render(relationshipLayerRef.current, elementLayerRef.current);
  }, [model, viewState, selectedElementId, isDark, dispatch]);

  return <div ref={containerRef} className="w-full h-full bg-bg-primary" />;
}
