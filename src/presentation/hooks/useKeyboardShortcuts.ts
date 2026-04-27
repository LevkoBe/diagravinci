import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  setInteractionMode,
  setActiveElementType,
  setActiveRelationshipType,
  sendZoomCommand,
  toggleClassDiagramMode,
  type InteractionMode,
} from "../../application/store/uiSlice";
import {
  startExecution,
  pauseExecution,
} from "../../application/store/executionSlice";
import { setViewMode } from "../../application/store/diagramSlice";
import type { ElementType } from "../../domain/models/Element";
import type { RelationshipType } from "../../infrastructure/parser/Token";
import type { ViewState } from "../../domain/models/ViewState";

const MODE_KEYS: Record<string, InteractionMode> = {
  "1": "select",
  "2": "create",
  "3": "connect",
  "4": "delete",
  "5": "disconnect",
  "6": "readonly",
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
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

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

      if (e.key === "F5") {
        e.preventDefault();
        if (isExecuteMode) {
          dispatch(setViewMode(prevViewModeRef.current));
        } else {
          dispatch(setViewMode("execute"));
        }
        return;
      }

      if (isExecuteMode && e.key === " " && !ctrl && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (execStatus === "running") {
          dispatch(pauseExecution());
        } else {
          dispatch(startExecution());
        }
        return;
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, isExecuteMode, execStatus]);
}
