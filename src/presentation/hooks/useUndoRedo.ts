import { useEffect, useRef } from "react";
import { AppConfig } from "../../config/appConfig";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  pushHistory,
  undoHistory,
  redoHistory,
  entriesEqual,
  type HistoryEntry,
} from "../../application/store/historySlice";
import { restoreHistory } from "../../application/store/diagramSlice";
import { store, syncManager } from "../../application/store/store";

export function useUndoRedo() {
  const dispatch = useAppDispatch();
  const code = useAppSelector((s) => s.diagram.code);
  const viewState = useAppSelector((s) => s.diagram.viewState);
  const model = useAppSelector((s) => s.diagram.model);

  const isApplyingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestRef = useRef<HistoryEntry>({
    code,
    model,
    positions: viewState.positions,
    relationships: viewState.relationships,
    viewMode: viewState.viewMode,
  });

  useEffect(() => {
    latestRef.current = {
      code,
      model,
      positions: viewState.positions,
      relationships: viewState.relationships,
      viewMode: viewState.viewMode,
    };
  });

  useEffect(() => {
    if (isApplyingRef.current) return;

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (isApplyingRef.current) return;
      dispatch(pushHistory(latestRef.current));
    }, AppConfig.history.DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, viewState.viewMode, viewState.positions, viewState.relationships]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey;
      const isRedo =
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z");

      if (!isUndo && !isRedo) return;

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      e.preventDefault();

      if (isUndo) {
        applyUndo();
      } else {
        applyRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyUndo() {
    const { history } = store.getState();
    if (history.past.length === 0) return;

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      dispatch(pushHistory(latestRef.current));
    }

    dispatch(undoHistory());
    applyEntry(store.getState().history.present);
  }

  function applyRedo() {
    const { history } = store.getState();
    if (history.future.length === 0) return;

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      dispatch(pushHistory(latestRef.current));
    }

    dispatch(redoHistory());
    applyEntry(store.getState().history.present);
  }

  function applyEntry(entry: HistoryEntry | null) {
    if (!entry) return;

    const currentState = store.getState();
    const current: HistoryEntry = {
      code: currentState.diagram.code,
      model: currentState.diagram.model,
      positions: currentState.diagram.viewState.positions,
      relationships: currentState.diagram.viewState.relationships,
      viewMode: currentState.diagram.viewState.viewMode,
    };

    if (entriesEqual(current, entry)) return;

    isApplyingRef.current = true;

    dispatch(
      restoreHistory({
        code: entry.code,
        model: entry.model,
        positions: entry.positions,
        relationships: entry.relationships,
        viewMode: entry.viewMode,
      }),
    );

    syncManager.syncFromCode(entry.code);

    requestAnimationFrame(() => {
      isApplyingRef.current = false;
    });
  }

  const canUndo = useAppSelector((s) => s.history.past.length > 0);
  const canRedo = useAppSelector((s) => s.history.future.length > 0);

  return { canUndo, canRedo, undo: applyUndo, redo: applyRedo };
}
