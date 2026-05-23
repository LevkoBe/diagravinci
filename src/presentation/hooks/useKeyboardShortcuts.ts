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
  elements: Record<string, Element>;
  relationships: Record<string, Relationship>;
  topLevelIds: string[];
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

function freshId(
  type: ElementType,
  existing: Record<string, Element>,
  reserved: Set<string>,
): string {
  const prefix = `${type}_`;
  let max = 0;
  for (const id of [...Object.keys(existing), ...Array.from(reserved)]) {
    if (id.startsWith(prefix)) {
      const n = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}

function buildIdMap(
  subtree: Record<string, Element>,
  existing: Record<string, Element>,
): Record<string, string> {
  const map: Record<string, string> = {};
  const reserved = new Set<string>();
  for (const [, el] of Object.entries(subtree)) {
    const newId = freshId(el.type, existing, reserved);
    map[el.id] = newId;
    reserved.add(newId);
  }
  return map;
}

function cloneWithMap(
  subtree: Record<string, Element>,
  idMap: Record<string, string>,
): Record<string, Element> {
  const result: Record<string, Element> = {};
  for (const [, el] of Object.entries(subtree)) {
    const newId = idMap[el.id];
    result[newId] = {
      ...el,
      id: newId,
      childIds: el.childIds.map((c) => idMap[c] ?? c),
    };
  }
  return result;
}

function cloneRels(
  rels: Record<string, Relationship>,
  idMap: Record<string, string>,
): Relationship[] {
  return Object.values(rels).map((r) => ({
    ...r,
    id: `rel_${idMap[r.source] ?? r.source}_${idMap[r.target] ?? r.target}_${Date.now().toString(36)}`,
    source: idMap[r.source] ?? r.source,
    target: idMap[r.target] ?? r.target,
  }));
}

function copySelection(
  selectedIds: string[],
  m: DiagramModel,
): ClipboardData {
  const collected: Record<string, Element> = {};
  for (const id of selectedIds) collectSubtree(id, m.elements, collected);
  const internalRels: Record<string, Relationship> = {};
  for (const [relId, rel] of Object.entries(m.relationships)) {
    if (collected[rel.source] && collected[rel.target])
      internalRels[relId] = rel;
  }
  return {
    elements: collected,
    relationships: internalRels,
    topLevelIds: selectedIds.filter((id) => collected[id]),
  };
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
  "1": "select",
  "2": "create",
  "3": "connect",
  "4": "delete",
  "5": "disconnect",
  "6": "readonly",
  "7": "presentation",
};

const QWERTY = ["q", "w", "e", "r", "t", "y"] as const;

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

      if (ctrl && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        onSaveRef.current?.();
        return;
      }

      if (ctrl && e.key === "o") {
        e.preventDefault();
        onOpenRef.current?.();
        return;
      }

      if (ctrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const allIds = Object.keys(store.getState().diagram.model.elements);
        dispatch(setSelectedElements(allIds));
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
        syncManager.syncFromVis(deleteElements(selectedIds, state.diagram.model));
        dispatch(setSelectedElements([]));
        return;
      }

      if (ctrl && e.key.toLowerCase() === "c") {
        e.preventDefault();
        const state = store.getState();
        const selectedIds = state.ui.selectedElementIds;
        if (selectedIds.length === 0) return;
        clipboard = copySelection(selectedIds, state.diagram.model);
        return;
      }

      if (ctrl && e.key.toLowerCase() === "x") {
        e.preventDefault();
        const state = store.getState();
        const selectedIds = state.ui.selectedElementIds;
        if (selectedIds.length === 0) return;
        const m = state.diagram.model;
        clipboard = copySelection(selectedIds, m);
        syncManager.syncFromVis(deleteElements(selectedIds, m));
        dispatch(setSelectedElements([]));
        return;
      }

      if (ctrl && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (!clipboard) return;
        const state = store.getState();
        const m = state.diagram.model;
        const pasteTargets = state.ui.selectedElementIds;

        const newElements = { ...m.elements };
        let newRoot = { ...m.root };
        const newRelationships = { ...m.relationships };
        const newSelectedIds: string[] = [];

        const targetList: (string | null)[] =
          pasteTargets.length > 0 ? pasteTargets : [null];
        for (const targetId of targetList) {
          const idMap = buildIdMap(clipboard.elements, newElements);
          const cloned = cloneWithMap(clipboard.elements, idMap);
          Object.assign(newElements, cloned);

          const newTopIds = clipboard.topLevelIds.map((id) => idMap[id]);
          newSelectedIds.push(...newTopIds);

          if (targetId === null) {
            newRoot = {
              ...newRoot,
              childIds: [...newRoot.childIds, ...newTopIds],
            };
          } else {
            const target = newElements[targetId];
            if (target) {
              newElements[targetId] = {
                ...target,
                childIds: [...target.childIds, ...newTopIds],
              };
            }
          }

          for (const rel of cloneRels(clipboard.relationships, idMap)) {
            newRelationships[rel.id] = rel;
          }
        }

        syncManager.syncFromVis({
          ...m,
          root: newRoot,
          elements: newElements,
          relationships: newRelationships,
        });
        dispatch(setSelectedElements(newSelectedIds));
        return;
      }

      if (ctrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const state = store.getState();
        const selectedIds = state.ui.selectedElementIds;
        if (selectedIds.length === 0) return;
        const m = state.diagram.model;

        const newElements = { ...m.elements };
        let newRoot = { ...m.root };
        const newRelationships = { ...m.relationships };
        const newSelectedIds: string[] = [];

        for (const selId of selectedIds) {
          const subtree: Record<string, Element> = {};
          collectSubtree(selId, m.elements, subtree);

          const internalRels: Record<string, Relationship> = {};
          for (const [relId, rel] of Object.entries(m.relationships)) {
            if (subtree[rel.source] && subtree[rel.target])
              internalRels[relId] = rel;
          }

          const idMap = buildIdMap(subtree, newElements);
          const cloned = cloneWithMap(subtree, idMap);
          Object.assign(newElements, cloned);

          const newId = idMap[selId];
          newSelectedIds.push(newId);

          let parentId: string | null = null;
          if (m.root.childIds.includes(selId)) {
            parentId = null;
          } else {
            for (const [pid, pel] of Object.entries(newElements)) {
              if (pel.childIds.includes(selId) && !subtree[pid]) {
                parentId = pid;
                break;
              }
            }
          }

          if (parentId === null) {
            newRoot = { ...newRoot, childIds: [...newRoot.childIds, newId] };
          } else {
            const parent = newElements[parentId];
            if (parent) {
              newElements[parentId] = {
                ...parent,
                childIds: [...parent.childIds, newId],
              };
            }
          }

          for (const rel of cloneRels(internalRels, idMap)) {
            newRelationships[rel.id] = rel;
          }
        }

        syncManager.syncFromVis({
          ...m,
          root: newRoot,
          elements: newElements,
          relationships: newRelationships,
        });
        dispatch(setSelectedElements(newSelectedIds));
        return;
      }

      if (e.key === "F5") {
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
        e.key === " " &&
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

      if (interactionModeRef.current === "presentation") {
        let dir: NavDirection | null = null;
        if (e.key === "ArrowRight") dir = "forward";
        else if (e.key === "ArrowLeft") dir = "backward";
        else if (e.key === "ArrowUp") dir = "parent";
        else if (e.key === "ArrowDown") dir = "child";

        if (dir !== null) {
          e.preventDefault();
          const state = store.getState();
          const currentIds = state.ui.selectedElementIds;

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

      const mode = MODE_KEYS[e.key];
      if (mode) {
        e.preventDefault();
        dispatch(setInteractionMode(mode));
        return;
      }

      const qwertyIndex = QWERTY.indexOf(
        e.key.toLowerCase() as (typeof QWERTY)[number],
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
