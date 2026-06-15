import { useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { useC7One, detectIsDark, usePrimaryBounds } from "@levkobe/c7one";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  setCanvasSize,
  setViewState,
  updateElementPositionInView,
} from "../../application/store/diagramSlice";
import {
  setConnectingFromId,
  setSelectedElement,
  setSelectedElements,
  toggleSelectedElement,
} from "../../application/store/uiSlice";
import { toggleElementFold } from "../../application/store/filterSlice";
import { syncManager, store } from "../../application/store/store";
import { getCSSVariable } from "../../shared/utils";
import { toSelectorId, type Group } from "../../domain/models/Selector";
import { matchesGroup } from "../../domain/selector/GroupEvaluator";
import { useExecution } from "../hooks/useExecution";
import { getExecutionColorMap, computeCloneDuplicateHiddenPaths } from "../../application/ExecutionEngine";
import { DiagramLayerRenderer } from "./DiagramLayerRenderer";
import { computeElementSizes } from "./rendering/elementSizing";
import type { GeometryCache } from "./rendering/relationships/RelationshipRenderer";
import { FilterResolver } from "../../domain/sync/FilterResolver";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { Element, ElementType } from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";
import type { Position } from "../../domain/models/Element";
import { AppConfig } from "../../config/appConfig";
import { VConfig } from "./visualConfig";
import { lightStateTokens, darkStateTokens } from "../../themes";
import { stageRegistry } from "../../shared/stageRegistry";
import { applyReparent } from "../../application/reparent";

const FIT_PADDING_FACTOR = 0.2;

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
  const diagramLayerRef = useRef<Konva.Layer | null>(null);
  const selectionLayerRef = useRef<Konva.Layer | null>(null);
  const prevPathsRef = useRef<Set<string>>(new Set());
  const prevElementPositionsRef = useRef<
    Record<string, { x: number; y: number }>
  >({});
  const prevClonePositionsRef = useRef<
    Record<string, { x: number; y: number }>
  >({});
  const justDraggedPathsRef = useRef<Set<string>>(new Set());
  const dragStateRef = useRef<{ path: string | null; scales: Map<string, number> }>({ path: null, scales: new Map() });
  const geometryCacheRef = useRef<GeometryCache>(new Map());
  const currentAnimRef = useRef<Konva.Animation | null>(null);
  const [zoom, setZoom] = useState(1);
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
  const spawnOriginsRef = useExecution();
  const execInstances = useAppSelector((s) => s.execution.instances);
  const execColor = useAppSelector((s) => s.execution.executionColor);
  const tickIntervalMs = useAppSelector((s) => s.execution.tickIntervalMs);
  const { colors } = useC7One();
  const isDark = detectIsDark(colors["--color-bg-base"]);
  const primaryBounds = usePrimaryBounds();
  const primaryBoundsRef = useRef(primaryBounds);
  primaryBoundsRef.current = primaryBounds;

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
    groupMoveSelectorId,
    renderStyle,
    relLineStyle,
    classDiagramMode,
    opaqueElementBg,
    activeSessionId,
  } = useAppSelector((s) => s.ui);

  const modeRef = useRef(interactionMode);
  const elementTypeRef = useRef(activeElementType);
  const relTypeRef = useRef(activeRelationshipType);
  const connectingFromRef = useRef(connectingFromId);
  const modelRef = useRef(model);
  const groupMoveSelIdRef = useRef(groupMoveSelectorId);

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
    groupMoveSelIdRef.current = groupMoveSelectorId;
  }, [groupMoveSelectorId]);

  useEffect(() => {
    if (!activeSessionId) return;
    const { model: currentModel } = store.getState().diagram;
    const selLabel = `Selection_${activeSessionId}`;
    const selId = toSelectorId(selLabel);
    const selColor = getCSSVariable("--color-state-selected");

    const codeGroups = (currentModel.groups ?? []).filter((g) => g.id !== selId);
    const existingSel = (currentModel.groups ?? []).find((g) => g.id === selId);

    const rule = selectedElementIds
      .map((p) => p.split(".").at(-1)! + "?")
      .join("/");
    const prevRule = existingSel?.rule ?? "";

    if (rule === prevRule) return;

    let updatedGroups: Group[];
    if (rule === "") {
      // keep group with empty rule — existingSel is non-null (prevRule !== "" passed early-return)
      updatedGroups = [...codeGroups, { ...existingSel!, rule: "" }];
    } else {
      const base = existingSel ?? { id: selId, label: selLabel, color: selColor };
      updatedGroups = [...codeGroups, { ...base, rule }];
    }

    const updatedSessions = (currentModel.sessions ?? []).map((session) => {
      if (session.id !== activeSessionId) return session;
      if (rule === "") return session;
      const already = session.groupModes?.[selId];
      if (already && already !== "off") return session;
      return { ...session, groupModes: { ...session.groupModes, [selId]: "color" as const } };
    });

    syncManager.syncFromVis(
      { ...currentModel, groups: updatedGroups, sessions: updatedSessions },
      true,
    );
  }, [selectedElementIds, activeSessionId]);

  useEffect(() => {
    if (interactionMode !== "presentation") return;
    if (selectedElementIds.length === 0) return;
    const stage = stageRef.current;
    if (!stage) return;

    const positions = store.getState().diagram.viewState.positions;
    const selectedSet = new Set(selectedElementIds);
    const selectedPaths = Object.entries(positions)
      .filter(([path]) => selectedSet.has(path))
      .map(([, v]) => v);

    if (selectedPaths.length === 0) return;

    const pb = primaryBoundsRef.current;
    const visibleW = pb.ready ? pb.width : stage.width();
    const visibleH = pb.ready ? pb.height : stage.height();
    const visibleX = pb.ready ? pb.x : 0;
    const visibleY = pb.ready ? pb.y : 0;
    const center = { x: visibleX + visibleW / 2, y: visibleY + visibleH / 2 };

    const cx = selectedPaths.map((p) => p.position.x);
    const cy = selectedPaths.map((p) => p.position.y);
    const radii = selectedPaths.map((p) => p.size / 2);

    const minWX = Math.min(...cx.map((x, i) => x - radii[i]));
    const minWY = Math.min(...cy.map((y, i) => y - radii[i]));
    const maxWX = Math.max(...cx.map((x, i) => x + radii[i]));
    const maxWY = Math.max(...cy.map((y, i) => y + radii[i]));

    const W = maxWX - minWX;
    const H = maxWY - minWY;

    const scaleX = (visibleW * (1 - 2 * FIT_PADDING_FACTOR)) / W;
    const scaleY = (visibleH * (1 - 2 * FIT_PADDING_FACTOR)) / H;

    const { ZOOM_MIN, ZOOM_MAX } = AppConfig.canvas;
    const newScale = Math.max(ZOOM_MIN, Math.min(scaleX, scaleY, ZOOM_MAX));

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
      },
    }).play();
  }, [selectedElementIds, interactionMode]);

  useEffect(() => {
    const newLists = FilterResolver.resolve(
      filterState,
      viewState.positions,
      model,
      activeSessionId,
    );
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
  }, [filterState, viewState.positions, model, activeSessionId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const stage = new Konva.Stage({
      container: containerRef.current,
      width: containerRef.current.getBoundingClientRect().width,
      height: containerRef.current.getBoundingClientRect().height,
      draggable: true,
    });
    const diagramLayer = new Konva.Layer();
    const selectionLayer = new Konva.Layer();

    stage.add(diagramLayer);
    stage.add(selectionLayer);

    stageRef.current = stage;
    stageRegistry.set(stage);
    diagramLayerRef.current = diagramLayer;
    selectionLayerRef.current = selectionLayer;

    stage.on("dragstart", () => {
      stage.container().style.cursor = "grabbing";
    });

    stage.on("dragend", () => {
      stage.container().style.cursor =
        modeRef.current === "select" ? "default" : "crosshair";
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
      }
    });

    stage.on("click tap", (e) => {
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
      } else if (
        modeRef.current === "select" ||
        modeRef.current === "presentation"
      ) {
        dispatch(setSelectedElements([]));
      }
    });

    stage.on("mousedown", (e) => {
      if (e.evt.button !== 0) return;
      if (e.target !== stage) return;
      if (modeRef.current !== "select" && modeRef.current !== "presentation")
        return;
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
      const pathsInRect: string[] = [];
      for (const [path, pos] of Object.entries(positions)) {
        const { x, y } = pos.position;
        if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
          pathsInRect.push(path);
        }
      }
      const currentPaths = store.getState().ui.selectedElementIds;
      const currentSet = new Set(currentPaths);
      const result = [...currentPaths];
      for (const path of pathsInRect) {
        if (currentSet.has(path)) {
          const idx = result.indexOf(path);
          if (idx !== -1) result.splice(idx, 1);
        } else {
          result.push(path);
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
    const pb = primaryBoundsRef.current;
    const visibleW = pb.ready ? pb.width : stage.width();
    const visibleH = pb.ready ? pb.height : stage.height();
    const visibleX = pb.ready ? pb.x : 0;
    const visibleY = pb.ready ? pb.y : 0;
    const center = { x: visibleX + visibleW / 2, y: visibleY + visibleH / 2 };

    if (zoomCommand.type === "reset") {
      const positions = Object.values(
        store.getState().diagram.viewState.positions,
      );

      if (positions.length === 0) {
        new Konva.Tween({
          node: stage,
          scaleX: 1,
          scaleY: 1,
          x: center.x,
          y: center.y,
          duration: 0.4,
          easing: Konva.Easings.EaseInOut,
          onFinish: () => {
            setZoom(1);
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

      const PAD = Math.min(visibleW, visibleH) * FIT_PADDING_FACTOR;

      const scaleX = visibleW / (W + PAD * 2);
      const scaleY = visibleH / (H + PAD * 2);

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
      interactionMode === "select" ||
      interactionMode === "readonly" ||
      interactionMode === "presentation"
        ? "default"
        : "crosshair";
  }, [interactionMode]);

  useEffect(() => {
    if (
      !diagramLayerRef.current ||
      !stageRef.current
    )
      return;
    currentAnimRef.current?.stop();
    currentAnimRef.current = null;
    const wrongClonePaths = computeCloneDuplicateHiddenPaths(execInstances, model);
    const renderViewState =
      wrongClonePaths.length > 0
        ? { ...viewState, hiddenPaths: [...viewState.hiddenPaths, ...wrongClonePaths] }
        : viewState;
    const renderer = new DiagramLayerRenderer(
      stageRef.current,
      model,
      renderViewState,
      connectingFromId,
      {
        ...canvasColors,
      },
      {
        onPositionChange: (path, worldPos) => {
          if (worldPos) {
            const groupSelId = groupMoveSelIdRef.current;
            if (groupSelId) {
              const state = store.getState();
              const positions = state.diagram.viewState.positions;
              const m = state.diagram.model;
              const allGroups = m.groups ?? [];
              const grp = state.filter.groups.find((g) => g.id === groupSelId);
              const elOf = (p: string) => m.elements[p.split(".").at(-1)!];
              const matches = (p: string) => {
                const el = elOf(p);
                return el ? matchesGroup(grp!, p, el.type, m.elements, allGroups) : false;
              };
              if (grp && matches(path)) {
                const startPos = positions[path]?.position;
                if (startPos) {
                  const delta = {
                    x: worldPos.x - startPos.x,
                    y: worldPos.y - startPos.y,
                  };
                  for (const [gp, posEntry] of Object.entries(positions)) {
                    if (gp === path) continue;
                    if (!matches(gp)) continue;
                    dispatch(
                      updateElementPositionInView({
                        id: gp,
                        position: {
                          x: posEntry.position.x + delta.x,
                          y: posEntry.position.y + delta.y,
                        },
                      }),
                    );
                  }
                }
              }
            }
            justDraggedPathsRef.current.add(path);
            dispatch(
              updateElementPositionInView({ id: path, position: worldPos }),
            );
          } else {
            syncManager.syncFromVis(model);
          }
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
        onClick: (elementPath, shiftKey, ctrlKey) => {
          const leafId = elementPath.split(".").at(-1)!;
          const mode = modeRef.current;
          if (mode === "create") {
            createNewElement(
              modelRef.current,
              elementTypeRef.current,
              leafId,
              null,
              dispatch,
            );
          } else if (mode === "delete") {
            const m = modelRef.current;
            const newElements = { ...m.elements };
            delete newElements[leafId];
            const newRoot = {
              ...m.root,
              childIds: m.root.childIds.filter((id) => id !== leafId),
            };
            Object.values(newElements).forEach((el) => {
              if (el.childIds.includes(leafId)) {
                newElements[el.id] = {
                  ...el,
                  childIds: el.childIds.filter((id) => id !== leafId),
                };
              }
            });
            const newRelationships = Object.fromEntries(
              Object.entries(m.relationships).filter(
                ([, r]) => r.source !== leafId && r.target !== leafId,
              ),
            );
            syncManager.syncFromVis({
              ...m,
              root: newRoot,
              elements: newElements,
              relationships: newRelationships,
            });
            if (connectingFromRef.current === elementPath)
              dispatch(setConnectingFromId(null));
            dispatch(setSelectedElements([]));
          } else if (mode === "connect") {
            const sourceId = connectingFromRef.current;
            if (!sourceId) {
              dispatch(setConnectingFromId(elementPath));
            } else if (sourceId !== elementPath) {
              const rel: Relationship = {
                id: `rel_${sourceId}_${elementPath}_${Date.now()}`,
                source: sourceId,
                target: elementPath,
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
              dispatch(setConnectingFromId(elementPath));
            } else if (sourceId !== elementPath) {
              const m = modelRef.current;
              const newRelationships = Object.fromEntries(
                Object.entries(m.relationships).filter(
                  ([, r]) =>
                    !(
                      (r.source === sourceId && r.target === elementPath) ||
                      (r.source === elementPath && r.target === sourceId)
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
              const positions = store.getState().diagram.viewState.positions;
              const subtreePaths = Object.keys(positions).filter(
                (p) => p === elementPath || p.startsWith(elementPath + "."),
              );
              const currentPaths = store.getState().ui.selectedElementIds;
              const currentSet = new Set(currentPaths);
              const allSelected = subtreePaths.every((p) => currentSet.has(p));
              if (allSelected) {
                const subtreeSet = new Set(subtreePaths);
                dispatch(
                  setSelectedElements(
                    currentPaths.filter((p) => !subtreeSet.has(p)),
                  ),
                );
              } else {
                const combined = [...currentPaths];
                for (const p of subtreePaths) {
                  if (!currentSet.has(p)) combined.push(p);
                }
                dispatch(setSelectedElements(combined));
              }
            } else if (ctrlKey) {
              dispatch(toggleSelectedElement(elementPath));
            } else {
              dispatch(setSelectedElement(elementPath));
            }
          }
        },
        onContextMenu: (_elementId, path) => {
          const currentlyFolded = viewState.foldedPaths.includes(path);
          dispatch(toggleElementFold({ path, currentlyFolded }));
        },
      },
      prevPathsRef.current,
      zoom,
      renderStyle,
      relLineStyle,
      interactionMode === "readonly",
      interactionMode === "presentation",
      getExecutionColorMap(execInstances, model, execColor),
      classDiagramMode,
      elementSizes,
      geometryCacheRef.current,
      () => ({
        selectorId: groupMoveSelIdRef.current,
        filterSelectors: store.getState().filter.groups,
      }),
      opaqueElementBg,
      dragStateRef.current,
    );

    const cloneIds = new Set<string>();
    for (const inst of execInstances) {
      const bfsQ = [...inst.clonedElementIds];
      let bfsQi = 0;
      while (bfsQi < bfsQ.length) {
        const id = bfsQ[bfsQi++];
        cloneIds.add(id);
        model.elements[id]?.childIds.forEach((c) => bfsQ.push(c));
      }
    }
    const cloneRelIds = new Set(
      execInstances.flatMap((i) => i.clonedRelationshipIds),
    );
    renderer.render(diagramLayerRef.current, diagramLayerRef.current);
    const groupMap = renderer.getGroupMap();
    const relRenderer = renderer.getRelationshipRenderer();

    if (cloneIds.size > 0) {
      const prevClonePositions = prevClonePositionsRef.current;
      const animDurationMs =
        Math.min(
          (tickIntervalMs / 1000) * VConfig.rendering.ANIM_TICK_RATIO,
          VConfig.rendering.ANIM_MAX_DURATION,
        ) * 1000;

      const elemAnims: Array<{
        group: Konva.Group;
        oldX: number;
        oldY: number;
        newX: number;
        newY: number;
      }> = [];

      for (const [path, posEntry] of Object.entries(viewState.positions)) {
        const elementId = path.split(".").at(-1)!;
        if (!cloneIds.has(elementId)) continue;
        if (justDraggedPathsRef.current.has(path)) continue;
        const group = groupMap.get(path);
        if (!group) continue;
        const newPos = posEntry.position;
        const oldPos =
          prevClonePositions[elementId] ??
          spawnOriginsRef.current.get(elementId);
        if (!oldPos || (oldPos.x === newPos.x && oldPos.y === newPos.y))
          continue;
        group.x(oldPos.x);
        group.y(oldPos.y);
        elemAnims.push({
          group,
          oldX: oldPos.x,
          oldY: oldPos.y,
          newX: newPos.x,
          newY: newPos.y,
        });
      }

      const relAnims: Array<{
        relId: string;
        relType: (typeof viewState.relationships)[number]["type"];
        label: string | undefined;
        oldSrcX: number;
        oldSrcY: number;
        oldTgtX: number;
        oldTgtY: number;
        newSrcX: number;
        newSrcY: number;
        newSrcSize: number;
        newTgtX: number;
        newTgtY: number;
        newTgtSize: number;
      }> = [];

      for (const rel of viewState.relationships) {
        if (!cloneRelIds.has(rel.id)) continue;
        const srcId = rel.sourcePath.split(".").at(-1)!;
        const tgtId = rel.targetPath.split(".").at(-1)!;
        const oldSrc =
          prevClonePositions[srcId] ?? spawnOriginsRef.current.get(srcId);
        const oldTgt =
          prevClonePositions[tgtId] ?? spawnOriginsRef.current.get(tgtId);
        if (!oldSrc || !oldTgt) continue;
        const newSrcPos = viewState.positions[rel.sourcePath];
        const newTgtPos = viewState.positions[rel.targetPath];
        if (!newSrcPos || !newTgtPos) continue;
        relAnims.push({
          relId: rel.id,
          relType: rel.type,
          label: rel.label,
          oldSrcX: oldSrc.x,
          oldSrcY: oldSrc.y,
          oldTgtX: oldTgt.x,
          oldTgtY: oldTgt.y,
          newSrcX: newSrcPos.position.x,
          newSrcY: newSrcPos.position.y,
          newSrcSize: newSrcPos.size,
          newTgtX: newTgtPos.position.x,
          newTgtY: newTgtPos.position.y,
          newTgtSize: newTgtPos.size,
        });
      }

      if (elemAnims.length > 0 || relAnims.length > 0) {
        const layers = [diagramLayerRef.current].filter((l): l is Konva.Layer => l !== null);
        const anim = new Konva.Animation((frame) => {
          const t = Math.min((frame?.time ?? 0) / animDurationMs, 1);
          const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

          for (const { group, oldX, oldY, newX, newY } of elemAnims) {
            group.x(oldX + (newX - oldX) * eased);
            group.y(oldY + (newY - oldY) * eased);
          }

          for (const {
            relId,
            relType,
            label,
            oldSrcX,
            oldSrcY,
            oldTgtX,
            oldTgtY,
            newSrcX,
            newSrcY,
            newSrcSize,
            newTgtX,
            newTgtY,
            newTgtSize,
          } of relAnims) {
            relRenderer.updateRelGroup(
              relId,
              oldSrcX + (newSrcX - oldSrcX) * eased,
              oldSrcY + (newSrcY - oldSrcY) * eased,
              newSrcSize,
              oldTgtX + (newTgtX - oldTgtX) * eased,
              oldTgtY + (newTgtY - oldTgtY) * eased,
              newTgtSize,
              relType,
              label,
            );
          }

          if (t >= 1) {
            anim.stop();
            currentAnimRef.current = null;
          }
        }, layers);
        currentAnimRef.current = anim;
        anim.start();
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
    renderStyle,
    relLineStyle,
    classDiagramMode,
    opaqueElementBg,
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
      const diagramLayer = new Konva.Layer();
      exportStage.add(diagramLayer);
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
        false,
        {},
        classDiagramMode,
        elementSizes,
        geometryCacheRef.current,
        undefined,
        opaqueElementBg,
      );
      renderer.render(diagramLayer, diagramLayer);
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
    opaqueElementBg,
    elementSizes,
    isDark,
  ]);

  const dotColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.12)";

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-bg-overlay overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle, ${dotColor} 1.5px, transparent 1.5px)`,
        backgroundSize: `24px 24px`,
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
