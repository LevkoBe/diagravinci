import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  setInteractionMode,
  setActiveElementType,
  type InteractionMode,
} from "../../application/store/uiSlice";
import {
  startExecution,
  pauseExecution,
} from "../../application/store/executionSlice";
import { setViewMode } from "../../application/store/diagramSlice";
import type { ElementType } from "../../domain/models/Element";
import type { ViewState } from "../../domain/models/ViewState";

const MODE_KEYS: Record<string, InteractionMode> = {
  "1": "select",
  "2": "create",
  "3": "connect",
  "4": "delete",
  "5": "disconnect",
  "6": "readonly",
};

const ELEMENT_TYPE_KEYS: Record<string, ElementType> = {
  q: "object",
  w: "collection",
  e: "state",
  r: "function",
  t: "flow",
  y: "choice",
};

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
  const isExecuteMode = viewMode === "execute";
  const prevViewModeRef = useRef<ViewState["viewMode"]>(viewMode);

  useEffect(() => {
    if (!isExecuteMode) {
      prevViewModeRef.current = viewMode;
    }
  }, [isExecuteMode, viewMode]);

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

      const elementType = ELEMENT_TYPE_KEYS[e.key.toLowerCase()];
      if (elementType) {
        e.preventDefault();
        dispatch(setActiveElementType(elementType));
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, isExecuteMode, execStatus]);
}
