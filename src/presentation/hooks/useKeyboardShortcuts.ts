import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  setInteractionMode,
  setActiveElementType,
  setActiveRelationshipType,
  setSelectedElements,
  clearSelection,
  setNavigationParentId,
  sendZoomCommand,
  toggleClassDiagramMode,
  type InteractionMode,
} from "../../application/store/uiSlice";
import {
  startExecution,
  pauseExecution,
} from "../../application/store/executionSlice";
import { setViewMode } from "../../application/store/diagramSlice";
import { store, syncManager } from "../../application/store/store";
import {
  navigateSelection,
  navigateAlternative,
  type NavDirection,
} from "../../application/navigate";
import type { Element, ElementType } from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { RelationshipType } from "../../infrastructure/parser/Token";
import type { ViewState } from "../../domain/models/ViewState";

interface ClipboardData {
  topLevelIds: string[];
  elements: Record<string, Element>;
  relationships: Record<string, Relationship>;
}

let clipboard: ClipboardData | null = null;

function collectSubtree(
  id: string,
  elements: Record<string, Element>,
  out: Record<string, Element>,
): void {
  const el = elements[id];
  if (!el || out[id]) return;
  out[id] = el;
  for (const childId of el.childIds) collectSubtree(childId, elements, out);
}

function freshId(originalId: string, taken: Set<string>): string {
  if (!taken.has(originalId)) return originalId;
  const match = originalId.match(/^(.+)_(\d+)$/);
  const base = match ? match[1] : originalId;
  let n = match ? parseInt(match[2], 10) + 1 : 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

function deleteElements(
  selectedIds: string[],
  m: DiagramModel,
): DiagramModel {
  const selectedSet = new Set(selectedIds);
  const newElements = { ...m.elements };
  for (const id of selectedIds) delete newElements[id];
  const newRoot = {
    ...m.root,
    childIds: m.root.childIds.filter((id) => !selectedSet.has(id)),
  };
  Object.values(newElements).forEach((el) => {
    if (el.childIds.some((id) => selectedSet.has(id))) {
      newElements[el.id] = {
        ...el,
        childIds: el.childIds.filter((id) => !selectedSet.has(id)),
      };
    }
  });
  const newRelationships = Object.fromEntries(
    Object.entries(m.relationships).filter(
      ([, r]) => !selectedSet.has(r.source) && !selectedSet.has(r.target),
    ),
  );
  return { ...m, root: newRoot, elements: newElements, relationships: newRelationships };
}

const MODE_KEYS: Record<string, InteractionMode> = {
  Digit1: "select",
  Digit2: "create",
  Digit3: "connect",
  Digit4: "delete",
  Digit5: "disconnect",
  Digit6: "readonly",
  Digit7: "presentation",
};

const QWERTY_CODES = ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY"] as const;

const ELEMENT_TYPES: ElementType[] = [
  "object",
  "collection",
  "state",
  "function",
  "flow",
  "choice",
];

const RELATIONSHIP_TYPES: RelationshipType[] = [
  "-->",
  "..>",
  "--|>",
  "..|>",
  "o--",
  "*--",
];

interface KeyboardShortcutsOptions {
  onSave?: () => void;
  onOpen?: () => void;
}

export function useKeyboardShortcuts({
  onSave,
  onOpen,
}: KeyboardShortcutsOptions = {}) {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((s) => s.diagram.viewState.viewMode);
  const execStatus = useAppSelector((s) => s.execution.status);
  const interactionMode = useAppSelector((s) => s.ui.interactionMode);
  const isExecuteMode = viewMode === "execute";
  const prevViewModeRef = useRef<ViewState["viewMode"]>(viewMode);
  const interactionModeRef = useRef(interactionMode);

  useEffect(() => {
    if (!isExecuteMode) {
      prevViewModeRef.current = viewMode;
    }
  }, [isExecuteMode, viewMode]);

  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  const onSaveRef = useRef(onSave);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onSaveRef.current = onSave;
    onOpenRef.current = onOpen;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || target?.isContentEditable)
        return;
      if (document.querySelector("[data-code-editor]")?.contains(target))
        return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && !e.shiftKey && e.code === "KeyS") {
        e.preventDefault();
        onSaveRef.current?.();
        return;
      }

      if (ctrl && e.code === "KeyO") {
        e.preventDefault();
        onOpenRef.current?.();
        return;
      }

      if (ctrl && e.code === "KeyA") {
        e.preventDefault();
        const allPaths = Object.keys(store.getState().diagram.viewState.positions);
        dispatch(setSelectedElements(allPaths));
        return;
      }

      if (e.key === "Escape" && !ctrl && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        dispatch(clearSelection());
        return;
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !ctrl &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const state = store.getState();
        const selectedIds = state.ui.selectedElementIds;
        if (selectedIds.length === 0) return;
        e.preventDefault();
        const elementIds = selectedIds.map((p) => p.split(".").at(-1)!);
        syncManager.syncFromVis(deleteElements(elementIds, state.diagram.model));
        dispatch(setSelectedElements([]));
        return;
      }

      if (ctrl && e.code === "KeyC") {
        e.preventDefault();
        const state = store.getState();
        const selectedIds = state.ui.selectedElementIds;
        if (selectedIds.length === 0) return;
        const m = state.diagram.model;
        const elementIds = selectedIds.map((p) => p.split(".").at(-1)!);
        clipboard = { topLevelIds: elementIds, elements: m.elements, relationships: m.relationships };
        return;
      }

      if (ctrl && e.code === "KeyX") {
        e.preventDefault();
        const state = store.getState();
        const selectedIds = state.ui.selectedElementIds;
        if (selectedIds.length === 0) return;
        const m = state.diagram.model;
        const elementIds = selectedIds.map((p) => p.split(".").at(-1)!);
        clipboard = { topLevelIds: elementIds, elements: m.elements, relationships: m.relationships };
        syncManager.syncFromVis(deleteElements(elementIds, m));
        dispatch(setSelectedElements([]));
        return;
      }

      if (ctrl && e.code === "KeyV") {
        e.preventDefault();
        if (!clipboard) return;
        const state = store.getState();
        const m = state.diagram.model;
        const pasteTargets = state.ui.selectedElementIds.map((p) => p.split(".").at(-1)!);

        const newElements = { ...m.elements };
        let newRoot = { ...m.root };
        const newSelectedIds: string[] = [];

        const targetList: (string | null)[] =
          pasteTargets.length > 0 ? pasteTargets : [null];
        for (const targetId of targetList) {
          const siblings =
            targetId === null
              ? newRoot.childIds
              : (newElements[targetId]?.childIds ?? []);
          const siblingSet = new Set(siblings);
          const toAdd: string[] = [];

          for (const srcId of clipboard.topLevelIds) {
            if (!newElements[srcId]) {
              const subtree: Record<string, Element> = {};
              collectSubtree(srcId, clipboard.elements, subtree);
              Object.assign(newElements, subtree);
            }
            if (!siblingSet.has(srcId)) {
              siblingSet.add(srcId);
              toAdd.push(srcId);
            } else {
              const id = freshId(srcId, new Set(Object.keys(newElements)));
              newElements[id] = { ...(newElements[srcId] ?? clipboard.elements[srcId]), id };
              siblingSet.add(id);
              toAdd.push(id);
            }
          }

          newSelectedIds.push(...toAdd);
          if (targetId === null) {
            newRoot = { ...newRoot, childIds: [...siblings, ...toAdd] };
          } else if (newElements[targetId]) {
            newElements[targetId] = { ...newElements[targetId], childIds: [...siblings, ...toAdd] };
          }
        }

        syncManager.syncFromVis({ ...m, root: newRoot, elements: newElements });
        dispatch(setSelectedElements(newSelectedIds));
        return;
      }

      if (ctrl && e.code === "KeyD") {
        e.preventDefault();
        const state = store.getState();
        const selectedIds = state.ui.selectedElementIds.map((p) => p.split(".").at(-1)!);
        if (selectedIds.length === 0) return;
        const m = state.diagram.model;

        const newElements = { ...m.elements };
        let newRoot = { ...m.root };
        const newSelectedIds: string[] = [];

        for (const selId of selectedIds) {
          let parentId: string | null = null;
          if (!m.root.childIds.includes(selId)) {
            for (const [pid, pel] of Object.entries(m.elements)) {
              if (pel.childIds.includes(selId)) { parentId = pid; break; }
            }
          }

          const siblings =
            parentId === null
              ? newRoot.childIds
              : (newElements[parentId]?.childIds ?? []);
          const newId = freshId(selId, new Set(Object.keys(newElements)));

          const deepCopy = (srcId: string, destId: string): void => {
            const src = newElements[srcId];
            if (!src) return;
            const newChildIds = src.childIds.map((childId) => {
              const childNewId = freshId(childId, new Set(Object.keys(newElements)));
              deepCopy(childId, childNewId);
              return childNewId;
            });
            newElements[destId] = { ...src, id: destId, childIds: newChildIds };
          };
          deepCopy(selId, newId);
          newSelectedIds.push(newId);

          if (parentId === null) {
            newRoot = { ...newRoot, childIds: [...siblings, newId] };
          } else if (newElements[parentId]) {
            newElements[parentId] = { ...newElements[parentId], childIds: [...siblings, newId] };
          }
        }

        syncManager.syncFromVis({ ...m, root: newRoot, elements: newElements });
        dispatch(setSelectedElements(newSelectedIds));
        return;
      }

      if (e.code === "F5") {
        e.preventDefault();
        if (isExecuteMode) {
          dispatch(setViewMode(prevViewModeRef.current));
        } else {
          dispatch(setViewMode("execute"));
        }
        return;
      }

      if (
        isExecuteMode &&
        e.code === "Space" &&
        !ctrl &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        if (execStatus === "running") {
          dispatch(pauseExecution());
        } else {
          dispatch(startExecution());
        }
        return;
      }

      {
        let dir: NavDirection | null = null;
        if (e.key === "ArrowRight") dir = "forward";
        else if (e.key === "ArrowLeft") dir = "backward";
        else if (e.key === "ArrowUp") dir = "parent";
        else if (e.key === "ArrowDown") dir = "child";

        if (dir !== null) {
          e.preventDefault();
          const state = store.getState();
          const currentPaths = state.ui.selectedElementIds;
          const currentIds = currentPaths.map((p) => p.split(".").at(-1)!);

          if (e.altKey && (dir === "backward" || dir === "forward")) {
            const newIds = navigateAlternative(
              currentIds,
              state.diagram.model,
              dir === "forward" ? "next" : "prev",
              state.ui.navigationParentId,
            );
            if (newIds.length > 0) dispatch(setSelectedElements(newIds));
            return;
          }

          const effectiveDir =
            e.shiftKey && dir === "child"
              ? "child-all"
              : e.shiftKey && dir === "forward"
                ? "forward-all"
                : e.shiftKey && dir === "backward"
                  ? "backward-all"
                  : dir;
          const newIds = navigateSelection(
            currentIds,
            state.diagram.model,
            effectiveDir,
            state.diagram.viewState.coloredPaths,
          );
          if (newIds.length > 0) {
            if (effectiveDir === "child" || effectiveDir === "child-all") {
              dispatch(setNavigationParentId(currentIds.at(-1) ?? null));
            } else {
              dispatch(setNavigationParentId(null));
            }
            dispatch(setSelectedElements(newIds));
          }
          return;
        }
      }

      if (ctrl || e.metaKey || e.altKey) return;

      const mode = MODE_KEYS[e.code];
      if (mode) {
        e.preventDefault();
        dispatch(setInteractionMode(mode));
        return;
      }

      const qwertyIndex = QWERTY_CODES.indexOf(
        e.code as (typeof QWERTY_CODES)[number],
      );
      if (qwertyIndex !== -1) {
        const currentMode = interactionModeRef.current;
        if (currentMode === "create") {
          e.preventDefault();
          dispatch(setActiveElementType(ELEMENT_TYPES[qwertyIndex]));
        } else if (currentMode === "connect") {
          e.preventDefault();
          dispatch(setActiveRelationshipType(RELATIONSHIP_TYPES[qwertyIndex]));
        } else {
          if (qwertyIndex === 1) {
            e.preventDefault();
            dispatch(sendZoomCommand("in"));
          } else if (qwertyIndex === 2) {
            e.preventDefault();
            dispatch(sendZoomCommand("out"));
          } else if (qwertyIndex === 3) {
            e.preventDefault();
            dispatch(sendZoomCommand("reset"));
          } else if (qwertyIndex === 5) {
            e.preventDefault();
            dispatch(toggleClassDiagramMode());
          }
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [dispatch, isExecuteMode, execStatus]);
}
