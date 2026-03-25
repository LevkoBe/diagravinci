import { useEffect, useRef } from "react";
import Konva from "konva";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  setCanvasSize,
  setViewState,
  updateElementPositionInView,
} from "../../application/store/diagramSlice";
import {
  setConnectingFromId,
  setInteractionMode,
  setSelectedElement,
} from "../../application/store/uiSlice";
import { toggleElementFold } from "../../application/store/filterSlice";
import { syncManager } from "../../application/store/store";
import { getCSSVariable } from "../../shared/utils";
import { DiagramLayerRenderer } from "./DiagramLayerRenderer";
import { FilterResolver } from "../../domain/sync/FilterResolver";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { Element, ElementType } from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";
import type { Position } from "../../domain/models/Element";

export function VisualCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const relationshipLayerRef = useRef<Konva.Layer | null>(null);
  const elementLayerRef = useRef<Konva.Layer | null>(null);
  const prevPathsRef = useRef<Set<string>>(new Set());

  const dispatch = useAppDispatch();
  const model = useAppSelector((s) => s.diagram.model);
  const viewState = useAppSelector((s) => s.diagram.viewState);
  const filterState = useAppSelector((s) => s.filter);
  const isDark = useAppSelector((s) => s.theme.isDark);
  const {
    interactionMode,
    activeElementType,
    activeRelationshipType,
    connectingFromId,
    selectedElementId,
  } = useAppSelector((s) => s.ui);

  const modeRef = useRef(interactionMode);
  const elementTypeRef = useRef(activeElementType);
  const relTypeRef = useRef(activeRelationshipType);
  const connectingFromRef = useRef(connectingFromId);
  const modelRef = useRef(model);

  useEffect(() => {
    modeRef.current = interactionMode;
  }, [interactionMode]);
  useEffect(() => {
    elementTypeRef.current = activeElementType;
  }, [activeElementType]);
  useEffect(() => {
    relTypeRef.current = activeRelationshipType;
  }, [activeRelationshipType]);
  useEffect(() => {
    connectingFromRef.current = connectingFromId;
  }, [connectingFromId]);
  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  // Filter list recomputation
  useEffect(() => {
    const newLists = FilterResolver.resolve(
      filterState,
      viewState.positions,
      model,
    );

    const unchanged = FilterResolver.equal(newLists, {
      hiddenPaths: viewState.hiddenPaths,
      dimmedPaths: viewState.dimmedPaths,
      foldedPaths: viewState.foldedPaths,
    });

    if (!unchanged) {
      console.log(
        "[VisualCanvas] Filter lists changed, updating viewState:",
        newLists,
      );
      dispatch(
        setViewState({
          ...viewState,
          hiddenPaths: newLists.hiddenPaths,
          dimmedPaths: newLists.dimmedPaths,
          foldedPaths: newLists.foldedPaths,
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState, viewState.positions, model]);

  // Stage setup: runs once
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
      stage.container().style.cursor =
        modeRef.current === "select" ? "default" : "crosshair";
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

    stage.on("click", (e) => {
      if (e.target !== stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const scale = stage.scaleX();
      const worldPos: Position = {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale,
      };

      if (modeRef.current === "create") {
        createNewElement(
          modelRef.current,
          elementTypeRef.current,
          null,
          worldPos,
          dispatch,
        );
      } else if (modeRef.current === "connect") {
        dispatch(setConnectingFromId(null));
      }
    });

    const handleResize = () => {
      if (!containerRef.current || !stageRef.current) return;
      const { offsetWidth: width, offsetHeight: height } = containerRef.current;
      stageRef.current.width(width);
      stageRef.current.height(height);
      dispatch(setCanvasSize({ width, height }));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      stage.destroy();
    };
  }, [dispatch]);

  const zoomCommand = useAppSelector((s) => s.ui.zoomCommand);

  useEffect(() => {
    if (!zoomCommand || !stageRef.current) return;
    const stage = stageRef.current;
    const center = { x: stage.width() / 2, y: stage.height() / 2 };

    if (zoomCommand.type === "reset") {
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });
      stage.batchDraw();
      return;
    }

    const oldScale = stage.scaleX();
    const factor = zoomCommand.type === "in" ? 1.2 : 1 / 1.2;
    const newScale = Math.max(0.1, Math.min(5, oldScale * factor));
    const mousePointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    });
    stage.batchDraw();
  }, [zoomCommand]);

  useEffect(() => {
    if (!stageRef.current) return;
    stageRef.current.container().style.cursor =
      interactionMode === "select" ? "default" : "crosshair";
  }, [interactionMode]);

  // Re-render layers
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
      connectingFromId,
      {
        accent: getCSSVariable("--color-accent"),
        fgPrimary: getCSSVariable("--color-fg-primary"),
        selected: getCSSVariable("--color-state-selected"),
        bgSecondary: getCSSVariable("--color-bg-secondary"),
        relationship: getCSSVariable("--color-fg-secondary"),
      },
      {
        onPositionChange: (id, worldPos) => {
          dispatch(updateElementPositionInView({ id, position: worldPos }));
        },
        onReparent: (elementId, oldParentPath, newParentPath) => {
          const updatedModel = applyReparent(
            model,
            elementId,
            oldParentPath,
            newParentPath,
          );
          syncManager.syncFromVis(updatedModel);
        },
        onClick: (elementId) => {
          const mode = modeRef.current;

          if (mode === "create") {
            createNewElement(
              modelRef.current,
              elementTypeRef.current,
              elementId,
              null,
              dispatch,
            );
          } else if (mode === "delete") {
            const m = modelRef.current;
            const newElements = { ...m.elements };
            delete newElements[elementId];
            const newRoot = {
              ...m.root,
              childIds: m.root.childIds.filter((id) => id !== elementId),
            };
            Object.values(newElements).forEach((el) => {
              if (el.childIds.includes(elementId)) {
                newElements[el.id] = {
                  ...el,
                  childIds: el.childIds.filter((id) => id !== elementId),
                };
              }
            });
            const newRelationships = Object.fromEntries(
              Object.entries(m.relationships).filter(
                ([, r]) => r.source !== elementId && r.target !== elementId,
              ),
            );
            syncManager.syncFromVis({
              ...m,
              root: newRoot,
              elements: newElements,
              relationships: newRelationships,
            });
            if (connectingFromRef.current === elementId)
              dispatch(setConnectingFromId(null));
            dispatch(setSelectedElement(null));
          } else if (mode === "connect") {
            const sourceId = connectingFromRef.current;
            if (!sourceId) {
              dispatch(setConnectingFromId(elementId));
            } else if (sourceId !== elementId) {
              const rel: Relationship = {
                id: `rel_${sourceId}_${elementId}_${Date.now()}`,
                source: sourceId,
                target: elementId,
                type: relTypeRef.current as Relationship["type"],
              };
              syncManager.syncFromVis({
                ...modelRef.current,
                relationships: {
                  ...modelRef.current.relationships,
                  [rel.id]: rel,
                },
              });
              dispatch(setConnectingFromId(null));
              dispatch(setInteractionMode("select"));
            }
          } else if (mode === "disconnect") {
            const sourceId = connectingFromRef.current;
            if (!sourceId) {
              dispatch(setConnectingFromId(elementId));
            } else if (sourceId !== elementId) {
              const m = modelRef.current;
              const newRelationships = Object.fromEntries(
                Object.entries(m.relationships).filter(
                  ([, r]) =>
                    !(
                      (r.source === sourceId && r.target === elementId) ||
                      (r.source === elementId && r.target === sourceId)
                    ),
                ),
              );
              syncManager.syncFromVis({
                ...m,
                relationships: newRelationships,
              });
              dispatch(setConnectingFromId(null));
              dispatch(setInteractionMode("select"));
            }
          } else {
            dispatch(setSelectedElement(elementId));
          }
        },
        onContextMenu: (elementId, path) => {
          const currentlyFolded = viewState.foldedPaths.includes(path);
          console.log(
            "[VisualCanvas] RMC on element:",
            elementId,
            "path:",
            path,
            "currentlyFolded:",
            currentlyFolded,
          );
          dispatch(toggleElementFold({ path, currentlyFolded }));
        },
      },
      prevPathsRef.current,
    );

    renderer.render(relationshipLayerRef.current, elementLayerRef.current);
    prevPathsRef.current = new Set(Object.keys(viewState.positions));
  }, [model, viewState, selectedElementId, connectingFromId, isDark, dispatch]);

  return <div ref={containerRef} className="w-full h-full bg-bg-primary" />;
}

function createNewElement(
  model: DiagramModel,
  elementType: ElementType,
  parentElementId: string | null,
  worldPos: Position | null,
  dispatch: ReturnType<
    typeof import("../../application/store/hooks").useAppDispatch
  >,
) {
  const newId = `${elementType}_${Date.now()}`;
  const newElement: Element = {
    id: newId,
    type: elementType,
    foldState: "expanded",
    childIds: [],
  };

  let newRoot = { ...model.root };
  const newElements = { ...model.elements, [newId]: newElement };

  if (parentElementId) {
    const parent = newElements[parentElementId];
    if (parent) {
      newElements[parentElementId] = {
        ...parent,
        childIds: [...parent.childIds, newId],
      };
    }
  } else {
    newRoot = { ...newRoot, childIds: [...newRoot.childIds, newId] };
  }

  syncManager.syncFromVis({ ...model, root: newRoot, elements: newElements });

  if (worldPos) {
    dispatch(updateElementPositionInView({ id: newId, position: worldPos }));
  }

  dispatch(setSelectedElement(newId));
}

function applyReparent(
  model: DiagramModel,
  elementId: string,
  oldParentPath: string,
  newParentPath: string,
): DiagramModel {
  const movingElement = model.elements[elementId];
  if (!movingElement) return model;
  const elements = { ...model.elements };
  let root = { ...model.root };

  if (oldParentPath === model.root.id) {
    root = { ...root, childIds: root.childIds.filter((n) => n !== elementId) };
  } else {
    const oldParentId = oldParentPath.split(".").at(-1)!;
    const oldParent = elements[oldParentId];
    if (oldParent) {
      elements[oldParent.id] = {
        ...oldParent,
        childIds: oldParent.childIds.filter((n) => n !== elementId),
      };
    }
  }

  if (newParentPath === model.root.id) {
    root = { ...root, childIds: [...root.childIds, elementId] };
  } else {
    const newParentId = newParentPath.split(".").at(-1)!;
    const newParent = elements[newParentId];
    if (newParent && !newParent.childIds.includes(elementId)) {
      elements[newParentId] = {
        ...newParent,
        childIds: [...newParent.childIds, elementId],
      };
    }
  }

  return { ...model, root, elements };
}
