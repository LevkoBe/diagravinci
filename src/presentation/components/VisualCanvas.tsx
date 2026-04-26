import { useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { useC7One, detectIsDark } from "@levkobe/c7one";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  setCanvasSize,
  setViewState,
  updateElementPositionInView,
  pruneElements,
} from "../../application/store/diagramSlice";
import {
  setConnectingFromId,
  setSelectedElement,
  setSelectedElements,
  toggleSelectedElement,
} from "../../application/store/uiSlice";
import {
  setSelectionSelector,
  toggleElementFold,
} from "../../application/store/filterSlice";
import { acceptDiffId } from "../../application/store/diffSlice";
import { syncManager, store } from "../../application/store/store";
import { getCSSVariable } from "../../shared/utils";
import { useExecution } from "../hooks/useExecution";
import { getExecutionColorMap } from "../../application/ExecutionEngine";
import { DiagramLayerRenderer } from "./DiagramLayerRenderer";
import { computeElementSizes } from "./rendering/elementSizing";
import type { GeometryCache } from "./rendering/relationships/RelationshipRenderer";
import { FilterResolver } from "../../domain/sync/FilterResolver";
import {
  getSubtreeIds,
  type DiagramModel,
} from "../../domain/models/DiagramModel";
import type { Element, ElementType } from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";
import type { Position } from "../../domain/models/Element";
import { AppConfig } from "../../config/appConfig";
import { VConfig } from "./visualConfig";
import { lightStateTokens, darkStateTokens } from "../../themes";
import { stageRegistry } from "../../shared/stageRegistry";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function VisualCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const relationshipLayerRef = useRef<Konva.Layer | null>(null);
  const elementLayerRef = useRef<Konva.Layer | null>(null);
  const selectionLayerRef = useRef<Konva.Layer | null>(null);
  const prevPathsRef = useRef<Set<string>>(new Set());
  const prevElementPositionsRef = useRef<
    Record<string, { x: number; y: number }>
  >({});
  const prevClonePositionsRef = useRef<
    Record<string, { x: number; y: number }>
  >({});
  const justDraggedPathsRef = useRef<Set<string>>(new Set());
  const geometryCacheRef = useRef<GeometryCache>(new Map());
  const [zoom, setZoom] = useState(1);
  const [stagePan, setStagePan] = useState(0);
  const dragSelectRef = useRef<{
    startScreen: { x: number; y: number };
    stageX: number;
    stageY: number;
    stageScale: number;
    active: boolean;
  } | null>(null);
  const selectionRectRef = useRef<Konva.Rect | null>(null);
  const justDragSelectedRef = useRef(false);
  const dispatch = useAppDispatch();
  const model = useAppSelector((s) => s.diagram.model);
  const viewState = useAppSelector((s) => s.diagram.viewState);
  const filterState = useAppSelector((s) => s.filter);
  const diffState = useAppSelector((s) => s.diff);
  const spawnOriginsRef = useExecution();
  const execInstances = useAppSelector((s) => s.execution.instances);
  const execColor = useAppSelector((s) => s.execution.executionColor);
  const tickIntervalMs = useAppSelector((s) => s.execution.tickIntervalMs);
  const { colors } = useC7One();
  const isDark = detectIsDark(colors["--color-bg-base"]);

  const elementSizes = useMemo(
    () => computeElementSizes(model, viewState, zoom),
    [model, viewState, zoom],
  );

  const canvasColors = useMemo(() => {
    const stateTokens = detectIsDark(colors["--color-bg-base"])
      ? darkStateTokens
      : lightStateTokens;
    return {
      accent: colors["--color-accent"],
      fgPrimary: colors["--color-fg-primary"],
      selected: stateTokens["--color-state-selected"],
      bgSecondary: colors["--color-bg-elevated"],
      relationship: colors["--color-fg-muted"],
    };
  }, [colors]);

  const {
    interactionMode,
    activeElementType,
    activeRelationshipType,
    connectingFromId,
    selectedElementIds,
    renderStyle,
    relLineStyle,
    classDiagramMode,
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

  useEffect(() => {
    const color = getCSSVariable("--color-state-selected");
    dispatch(setSelectionSelector({ ids: selectedElementIds, color }));
  }, [selectedElementIds, isDark, dispatch]);

  const DIFF_ADDED_COLOR = AppConfig.canvas.DIFF_ADDED_COLOR;
  const DIFF_REMOVED_COLOR = AppConfig.canvas.DIFF_REMOVED_COLOR;

  useEffect(() => {
    const newLists = FilterResolver.resolve(
      filterState,
      viewState.positions,
      model,
    );
    if (diffState.active) {
      const addedSet = new Set(diffState.addedIds);
      const removedSet = new Set(diffState.removedIds);
      for (const path of Object.keys(viewState.positions)) {
        const elementId = path.split(".").at(-1)!;
        if (addedSet.has(elementId)) {
          newLists.coloredPaths[path] = DIFF_ADDED_COLOR;
        } else if (removedSet.has(elementId)) {
          newLists.coloredPaths[path] = DIFF_REMOVED_COLOR;
        }
      }
    }
    const unchanged = FilterResolver.equal(newLists, {
      hiddenPaths: viewState.hiddenPaths,
      dimmedPaths: viewState.dimmedPaths,
      foldedPaths: viewState.foldedPaths,
      coloredPaths: viewState.coloredPaths ?? {},
    });
    if (!unchanged) {
      dispatch(setViewState({ ...viewState, ...newLists }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState, viewState.positions, model, diffState]);

  useEffect(() => {
    if (!containerRef.current) return;
    const stage = new Konva.Stage({
      container: containerRef.current,
      width: containerRef.current.getBoundingClientRect().width,
      height: containerRef.current.getBoundingClientRect().height,
      draggable: true,
    });
    const relationshipLayer = new Konva.Layer();
    const elementLayer = new Konva.Layer();
    const selectionLayer = new Konva.Layer();

    stage.add(relationshipLayer);
    stage.add(elementLayer);
    stage.add(selectionLayer);

    stageRef.current = stage;
    stageRegistry.set(stage);
    relationshipLayerRef.current = relationshipLayer;
    elementLayerRef.current = elementLayer;
    selectionLayerRef.current = selectionLayer;

    stage.on("dragstart", () => {
      stage.container().style.cursor = "grabbing";
    });

    stage.on("dragend", () => {
      stage.container().style.cursor =
        modeRef.current === "select" ? "default" : "crosshair";
      setStagePan((n) => n + 1);
    });

    stage.on("wheel", (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      if (e.evt.ctrlKey || e.evt.metaKey) {
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };
        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP_FACTOR } = AppConfig.canvas;
        const newScale = Math.max(
          ZOOM_MIN,
          Math.min(
            ZOOM_MAX,
            oldScale *
              (direction > 0 ? ZOOM_STEP_FACTOR : 1 / ZOOM_STEP_FACTOR),
          ),
        );
        stage.scale({ x: newScale, y: newScale });
        stage.position({
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        });
        stage.batchDraw();
        setZoom(newScale);
      } else {
        stage.position({
          x: stage.x() - e.evt.deltaX,
          y: stage.y() - e.evt.deltaY,
        });
        stage.batchDraw();
        setStagePan((n) => n + 1);
      }
    });

    stage.on("click", (e) => {
      if (e.target !== stage) return;
      if (modeRef.current === "readonly") return;
      if (justDragSelectedRef.current) {
        justDragSelectedRef.current = false;
        return;
      }
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
      } else if (modeRef.current === "select") {
        dispatch(setSelectedElements([]));
      }
    });

    stage.on("mousedown", (e) => {
      if (e.evt.button !== 0) return;
      if (e.target !== stage) return;
      if (modeRef.current !== "select") return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      stage.draggable(false);
      dragSelectRef.current = {
        startScreen: { x: pointer.x, y: pointer.y },
        stageX: stage.x(),
        stageY: stage.y(),
        stageScale: stage.scaleX(),
        active: false,
      };
    });

    stage.on("mousemove", () => {
      if (!dragSelectRef.current) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const { startScreen, stageX, stageY, stageScale } = dragSelectRef.current;
      const toWorld = (sx: number, sy: number) => ({
        x: (sx - stageX) / stageScale,
        y: (sy - stageY) / stageScale,
      });
      const dx = pointer.x - startScreen.x;
      const dy = pointer.y - startScreen.y;
      if (
        !dragSelectRef.current.active &&
        Math.hypot(dx, dy) > AppConfig.canvas.DRAG_SELECT_THRESHOLD_PX
      ) {
        dragSelectRef.current.active = true;
        const ws = toWorld(startScreen.x, startScreen.y);
        const wc = toWorld(pointer.x, pointer.y);
        const selColor = getCSSVariable("--color-state-selected");
        const rect = new Konva.Rect({
          x: Math.min(ws.x, wc.x),
          y: Math.min(ws.y, wc.y),
          width: Math.abs(wc.x - ws.x),
          height: Math.abs(wc.y - ws.y),
          stroke: selColor,
          strokeWidth: 1 / stageScale,
          dash: AppConfig.canvas.SELECTION_RECT_DASH.map((v) => v / stageScale),
          fill: hexToRgba(
            selColor,
            AppConfig.canvas.SELECTION_RECT_FILL_OPACITY,
          ),
          listening: false,
        });
        selectionLayer.add(rect);
        selectionRectRef.current = rect;
      }
      if (dragSelectRef.current.active && selectionRectRef.current) {
        const ws = toWorld(startScreen.x, startScreen.y);
        const wc = toWorld(pointer.x, pointer.y);
        selectionRectRef.current.setAttrs({
          x: Math.min(ws.x, wc.x),
          y: Math.min(ws.y, wc.y),
          width: Math.abs(wc.x - ws.x),
          height: Math.abs(wc.y - ws.y),
        });
        selectionLayer.batchDraw();
      }
    });

    stage.on("mouseup", (e) => {
      if (e.evt.button !== 0) return;
      stage.draggable(true);
      if (!dragSelectRef.current?.active) {
        dragSelectRef.current = null;
        return;
      }
      justDragSelectedRef.current = true;
      const { startScreen, stageX, stageY, stageScale } = dragSelectRef.current;
      const pointer = stage.getPointerPosition()!;
      const toWorld = (sx: number, sy: number) => ({
        x: (sx - stageX) / stageScale,
        y: (sy - stageY) / stageScale,
      });
      const ws = toWorld(startScreen.x, startScreen.y);
      const we = toWorld(pointer.x, pointer.y);
      const x1 = Math.min(ws.x, we.x);
      const y1 = Math.min(ws.y, we.y);
      const x2 = Math.max(ws.x, we.x);
      const y2 = Math.max(ws.y, we.y);
      const positions = store.getState().diagram.viewState.positions;
      const idsInRect: string[] = [];
      for (const [path, pos] of Object.entries(positions)) {
        const { x, y } = pos.position;
        if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
          const id = path.split(".").at(-1)!;
          if (!idsInRect.includes(id)) idsInRect.push(id);
        }
      }
      const currentIds = store.getState().ui.selectedElementIds;
      const currentSet = new Set(currentIds);
      const result = [...currentIds];
      for (const id of idsInRect) {
        if (currentSet.has(id)) {
          const idx = result.indexOf(id);
          if (idx !== -1) result.splice(idx, 1);
        } else {
          result.push(id);
        }
      }
      dispatch(setSelectedElements(result));
      selectionRectRef.current?.destroy();
      selectionLayer.batchDraw();
      selectionRectRef.current = null;
      dragSelectRef.current = null;
    });

    const handleResize = (entries?: ResizeObserverEntry[]) => {
      if (!stageRef.current) return;
      const { width, height } = entries
        ? entries[0].contentRect
        : containerRef.current!.getBoundingClientRect();
      stageRef.current.width(width);
      stageRef.current.height(height);
      dispatch(
        setCanvasSize({ width: Math.round(width), height: Math.round(height) }),
      );
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      stage.destroy();
      stageRegistry.set(null);
    };
  }, [dispatch]);

  const zoomCommand = useAppSelector((s) => s.ui.zoomCommand);

  useEffect(() => {
    if (!zoomCommand || !stageRef.current) return;
    const stage = stageRef.current;
    const center = { x: stage.width() / 2, y: stage.height() / 2 };

    if (zoomCommand.type === "reset") {
      const positions = Object.values(
        store.getState().diagram.viewState.positions,
      );

      if (positions.length === 0) {
        new Konva.Tween({
          node: stage,
          scaleX: 1,
          scaleY: 1,
          x: 0,
          y: 0,
          duration: 0.4,
          easing: Konva.Easings.EaseInOut,
          onFinish: () => {
            setZoom(1);
            setStagePan((n) => n + 1);
          },
        }).play();
        return;
      }

      const cx = positions.map((p) => p.position.x);
      const cy = positions.map((p) => p.position.y);
      const radii = positions.map((p) => p.size / 2);

      const minWX = Math.min(...cx.map((x, i) => x - radii[i]));
      const minWY = Math.min(...cy.map((y, i) => y - radii[i]));
      const maxWX = Math.max(...cx.map((x, i) => x + radii[i]));
      const maxWY = Math.max(...cy.map((y, i) => y + radii[i]));

      const W = maxWX - minWX;
      const H = maxWY - minWY;

      const PAD = Math.min(stage.width(), stage.height()) * 0.1;

      const scaleX = stage.width() / (W + PAD * 2);
      const scaleY = stage.height() / (H + PAD * 2);

      let newScale = Math.min(scaleX, scaleY);

      const { ZOOM_MIN, ZOOM_MAX } = AppConfig.canvas;
      newScale = Math.max(ZOOM_MIN, Math.min(newScale, ZOOM_MAX, 1.2));

      const bboxCenterX = minWX + W / 2;
      const bboxCenterY = minWY + H / 2;

      const newX = center.x - bboxCenterX * newScale;
      const newY = center.y - bboxCenterY * newScale;

      new Konva.Tween({
        node: stage,
        scaleX: newScale,
        scaleY: newScale,
        x: newX,
        y: newY,
        duration: 0.4,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          setZoom(newScale);
          setStagePan((n) => n + 1);
        },
      }).play();

      return;
    }

    const oldScale = stage.scaleX();
    const factor = zoomCommand.type === "in" ? 1.2 : 1 / 1.2;
    const newScale = Math.max(0.1, Math.min(15, oldScale * factor));
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
    setZoom(newScale);
  }, [zoomCommand]);

  useEffect(() => {
    if (!stageRef.current) return;
    stageRef.current.container().style.cursor =
      interactionMode === "select" || interactionMode === "readonly"
        ? "default"
        : "crosshair";
  }, [interactionMode]);

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
      connectingFromId,
      {
        ...canvasColors,
      },
      {
        onPositionChange: (id, worldPos) => {
          if (worldPos) {
            justDraggedPathsRef.current.add(id);
            dispatch(updateElementPositionInView({ id, position: worldPos }));
          } else syncManager.syncFromVis(model);
        },
        onReparent: (elementId, oldParentPath, newParentPath) => {
          const rootId = model.root.id;
          const oldPrefix =
            oldParentPath === rootId
              ? elementId
              : `${oldParentPath}.${elementId}`;
          const newPrefix =
            newParentPath === rootId
              ? elementId
              : `${newParentPath}.${elementId}`;
          const updatedModel = applyReparent(
            model,
            elementId,
            oldParentPath,
            newParentPath,
          );
          syncManager.syncFromVis(updatedModel, true, { oldPrefix, newPrefix });
        },
        onClick: (elementId, shiftKey, ctrlKey) => {
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
            dispatch(setSelectedElements([]));
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
            }
          } else {
            if (shiftKey) {
              const subtreeIds = getSubtreeIds(
                elementId,
                modelRef.current.elements,
              );
              const currentIds = store.getState().ui.selectedElementIds;
              const currentSet = new Set(currentIds);
              const allSelected = subtreeIds.every((id) => currentSet.has(id));
              if (allSelected) {
                const subtreeSet = new Set(subtreeIds);
                dispatch(
                  setSelectedElements(
                    currentIds.filter((id) => !subtreeSet.has(id)),
                  ),
                );
              } else {
                const combined = [...currentIds];
                for (const id of subtreeIds) {
                  if (!currentSet.has(id)) combined.push(id);
                }
                dispatch(setSelectedElements(combined));
              }
            } else if (ctrlKey) {
              dispatch(toggleSelectedElement(elementId));
            } else {
              dispatch(setSelectedElement(elementId));
            }
          }
        },
        onContextMenu: (elementId, path) => {
          const { diff } = store.getState();
          if (diff.active) {
            if (diff.removedIds.includes(elementId)) {
              dispatch(acceptDiffId(elementId));
              dispatch(pruneElements([elementId]));
            } else if (diff.addedIds.includes(elementId)) {
              dispatch(acceptDiffId(elementId));
            }
            return;
          }
          const currentlyFolded = viewState.foldedPaths.includes(path);
          dispatch(toggleElementFold({ path, currentlyFolded }));
        },
      },
      prevPathsRef.current,
      zoom,
      renderStyle,
      relLineStyle,
      interactionMode === "readonly",
      getExecutionColorMap(execInstances, execColor),
      classDiagramMode,
      elementSizes,
      geometryCacheRef.current,
    );

    const cloneIds = new Set(execInstances.flatMap((i) => i.clonedElementIds));
    renderer.render(relationshipLayerRef.current, elementLayerRef.current);
    const groupMap = renderer.getGroupMap();

    if (cloneIds.size > 0) {
      const prevClonePositions = prevClonePositionsRef.current;
      const animDuration = Math.min(
        (tickIntervalMs / 1000) * VConfig.rendering.ANIM_TICK_RATIO,
        VConfig.rendering.ANIM_MAX_DURATION,
      );
      for (const [path, posEntry] of Object.entries(viewState.positions)) {
        const elementId = path.split(".").at(-1)!;
        if (!cloneIds.has(elementId)) continue;
        if (justDraggedPathsRef.current.has(path)) continue;
        const oldPos = prevClonePositions[elementId];
        if (!oldPos) {
          const spawnPos = spawnOriginsRef.current.get(elementId);
          if (spawnPos) {
            const group = groupMap.get(path);
            if (group) {
              const newPos = posEntry.position;
              group.x(spawnPos.x);
              group.y(spawnPos.y);
              new Konva.Tween({
                node: group,
                x: newPos.x,
                y: newPos.y,
                duration: animDuration,
                easing: Konva.Easings.EaseInOut,
              }).play();
            }
          }
          continue;
        }
        const newPos = posEntry.position;
        if (oldPos.x === newPos.x && oldPos.y === newPos.y) continue;
        const group = groupMap.get(path);
        if (!group) continue;
        group.x(oldPos.x);
        group.y(oldPos.y);
        new Konva.Tween({
          node: group,
          x: newPos.x,
          y: newPos.y,
          duration: animDuration,
          easing: Konva.Easings.EaseInOut,
        }).play();
      }
    }

    justDraggedPathsRef.current.clear();
    const newClonePositions: Record<string, { x: number; y: number }> = {};
    for (const [path, posEntry] of Object.entries(viewState.positions)) {
      const elementId = path.split(".").at(-1)!;
      if (cloneIds.has(elementId)) {
        newClonePositions[elementId] = posEntry.position;
      }
    }
    prevClonePositionsRef.current = newClonePositions;
    prevElementPositionsRef.current = Object.fromEntries(
      Object.entries(viewState.positions).map(([k, v]) => [k, v.position]),
    );
    prevPathsRef.current = new Set(Object.keys(viewState.positions));
  }, [
    model,
    viewState,
    connectingFromId,
    canvasColors,
    zoom,
    stagePan,
    renderStyle,
    relLineStyle,
    classDiagramMode,
    interactionMode,
    dispatch,
    execInstances,
    execColor,
    tickIntervalMs,
    spawnOriginsRef,
    elementSizes,
  ]);

  useEffect(() => {
    stageRegistry.setExportFn(async () => {
      const stage = stageRef.current;
      if (!stage) return null;
      const positions = Object.values(viewState.positions);
      if (!positions.length) return null;
      const PAD = 80;
      const cx = positions.map((p) => p.position.x);
      const cy = positions.map((p) => p.position.y);
      const radii = positions.map((p) => p.size / 2);
      const minWX = Math.min(...cx.map((x, i) => x - radii[i])) - PAD;
      const minWY = Math.min(...cy.map((y, i) => y - radii[i])) - PAD;
      const maxWX = Math.max(...cx.map((x, i) => x + radii[i])) + PAD;
      const maxWY = Math.max(...cy.map((y, i) => y + radii[i])) + PAD;
      const W = maxWX - minWX;
      const H = maxWY - minWY;
      const container = document.createElement("div");
      container.style.cssText =
        "position:absolute;top:-9999px;left:-9999px;visibility:hidden;";
      document.body.appendChild(container);
      const exportStage = new Konva.Stage({
        container,
        width: W * zoom,
        height: H * zoom,
      });
      exportStage.position({ x: -minWX * zoom, y: -minWY * zoom });
      exportStage.scale({ x: zoom, y: zoom });
      const relLayer = new Konva.Layer();
      const elemLayer = new Konva.Layer();
      exportStage.add(relLayer);
      exportStage.add(elemLayer);
      const { DiagramLayerRenderer } = await import("./DiagramLayerRenderer");
      const renderer = new DiagramLayerRenderer(
        exportStage,
        model,
        viewState,
        null,
        canvasColors,
        { onPositionChange: () => {}, onReparent: () => {}, onClick: () => {} },
        new Set(),
        zoom,
        renderStyle,
        relLineStyle,
        true,
        {},
        classDiagramMode,
        elementSizes,
        geometryCacheRef.current,
      );
      renderer.render(relLayer, elemLayer);
      const exportCanvas = await exportStage.toCanvas({ pixelRatio: 2 });
      const bgColor = isDark ? "#0b0d10" : "#f5e8c0";
      const out = document.createElement("canvas");
      out.width = Math.round(W * zoom * 2);
      out.height = Math.round(H * zoom * 2);
      const ctx = out.getContext("2d")!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(exportCanvas as HTMLCanvasElement, 0, 0);
      exportStage.destroy();
      document.body.removeChild(container);
      return out.toDataURL("image/png");
    });
  }, [
    model,
    viewState,
    canvasColors,
    zoom,
    renderStyle,
    relLineStyle,
    classDiagramMode,
    elementSizes,
    isDark,
  ]);

  const dotSpacing = 24;
  const scaledSpacing = dotSpacing * zoom;
  const stageX = stageRef.current?.x() ?? 0;
  const stageY = stageRef.current?.y() ?? 0;
  const dotColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.12)";

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-bg-overlay overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle, ${dotColor} 1.5px, transparent 1.5px)`,
        backgroundSize: `${scaledSpacing}px ${scaledSpacing}px`,
        backgroundPosition: `${((stageX % scaledSpacing) + scaledSpacing) % scaledSpacing}px ${((stageY % scaledSpacing) + scaledSpacing) % scaledSpacing}px`,
      }}
    />
  );
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
  const prefix = `${elementType}_`;
  const maxIndex = Object.keys(model.elements)
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);
  const newId = `${prefix}${maxIndex + 1}`;
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
  syncManager.syncFromVis(
    { ...model, root: newRoot, elements: newElements },
    true,
  );
  if (worldPos)
    dispatch(updateElementPositionInView({ id: newId, position: worldPos }));
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
