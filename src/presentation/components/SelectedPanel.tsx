import { useMemo, useState } from "react";
import { Move, Trash2, LayoutGrid, MousePointer2 } from "lucide-react";
import { Select, Button } from "@levkobe/c7one";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  setSelectedElements,
  setGroupMoveSelectorId,
} from "../../application/store/uiSlice";
import { setSelectorMode, setSelectorColor } from "../../application/store/filterSlice";
import { setViewState } from "../../application/store/diagramSlice";
import { matchesSelector } from "../../domain/sync/FilterResolver";
import { ViewStateMerger } from "../../domain/sync/ViewStateMerger";
import type { Selector, SelectorMode } from "../../domain/models/Selector";
import { toSelectorId } from "../../domain/models/Selector";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { PositionedElement } from "../../domain/models/ViewState";
import { TAB_SESSION_ID } from "../../shared/tabSessionId";
import { upsertSelectorInCode } from "../utils/selectorCodeUtils";
import { syncManager, store } from "../../application/store/store";

const MODES: { value: SelectorMode; label: string }[] = [
  { value: "color", label: "Color" },
  { value: "dim", label: "Dim" },
  { value: "hide", label: "Hide" },
  { value: "off", label: "Off" },
];

function getMatchedPaths(
  selectorId: string,
  selectors: Selector[],
  positions: Record<string, PositionedElement>,
  model: DiagramModel,
): string[] {
  const selector = selectors.find((s) => s.id === selectorId);
  if (!selector) return [];
  const rules = model.rules ?? [];
  return Object.keys(positions).filter((path) =>
    matchesSelector(path, selector, model, rules),
  );
}

export function SelectedPanel() {
  const dispatch = useAppDispatch();
  const model = useAppSelector((s) => s.diagram.model);
  const viewState = useAppSelector((s) => s.diagram.viewState);
  const { selectors } = useAppSelector((s) => s.filter);
  const { groupMoveSelectorId } = useAppSelector((s) => s.ui);

  const FOLD_SELECTOR_ID = "__fold__";
  const visibleSelectors = selectors.filter((s) => s.id !== FOLD_SELECTOR_ID);

  const defaultId = toSelectorId(`Selected_${TAB_SESSION_ID}`);
  const [activeSelectorId, setActiveSelectorId] = useState(defaultId);

  const selector =
    visibleSelectors.find((s) => s.id === activeSelectorId) ??
    visibleSelectors[0] ??
    null;
  const effectiveId = selector?.id ?? null;

  const matchedPaths = useMemo(
    () =>
      effectiveId
        ? getMatchedPaths(effectiveId, selectors, viewState.positions, model)
        : [],
    [effectiveId, selectors, viewState.positions, model],
  );

  const matchedIds = useMemo(
    () => [...new Set(matchedPaths.map((p) => p.split(".").at(-1)!))],
    [matchedPaths],
  );

  const isGroupMove = groupMoveSelectorId === effectiveId && effectiveId !== null;

  if (visibleSelectors.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-fg-disabled select-none p-6">
        <div className="text-3xl opacity-40">⊡</div>
        <div className="text-xs text-center leading-relaxed">
          No selectors yet
          <br />
          Select elements to create one
        </div>
      </div>
    );
  }

  const handleModeChange = (newMode: SelectorMode) => {
    if (!selector) return;
    dispatch(setSelectorMode({ id: selector.id, mode: newMode }));
    const { code } = store.getState().diagram;
    const newCode = upsertSelectorInCode({ ...selector, mode: newMode }, code);
    syncManager.syncFromCode(newCode, true);
  };

  const handleColorChange = (color: string) => {
    if (!selector) return;
    dispatch(setSelectorColor({ id: selector.id, color }));
    const { code } = store.getState().diagram;
    const newCode = upsertSelectorInCode({ ...selector, color }, code);
    syncManager.syncFromCode(newCode, true);
  };

  const handleSelectAll = () => {
    dispatch(setSelectedElements(matchedIds));
  };

  const handleAutoLayout = () => {
    const { model: m, viewState: vs, canvasSize: cs } = store.getState().diagram;
    const layoutVS = ViewStateMerger.merge(vs, m, cs);
    const matchedSet = new Set(matchedPaths);
    const newPositions = { ...vs.positions };
    for (const path of matchedPaths) {
      if (layoutVS.positions[path]) newPositions[path] = layoutVS.positions[path];
    }
    dispatch(setViewState({ ...vs, positions: newPositions }));
  };

  const handleToggleGroupMove = () => {
    dispatch(setGroupMoveSelectorId(isGroupMove ? null : effectiveId));
  };

  const handleDeleteMatched = () => {
    if (matchedIds.length === 0) return;
    const matchedSet = new Set(matchedIds);
    const newElements = { ...model.elements };
    for (const id of matchedIds) delete newElements[id];
    const newRoot = {
      ...model.root,
      childIds: model.root.childIds.filter((id) => !matchedSet.has(id)),
    };
    for (const [id, el] of Object.entries(newElements)) {
      if (el.childIds.some((c) => matchedSet.has(c))) {
        newElements[id] = {
          ...el,
          childIds: el.childIds.filter((c) => !matchedSet.has(c)),
        };
      }
    }
    const newRelationships = Object.fromEntries(
      Object.entries(model.relationships).filter(
        ([, r]) => !matchedSet.has(r.source) && !matchedSet.has(r.target),
      ),
    );
    syncManager.syncFromVis({ ...model, root: newRoot, elements: newElements, relationships: newRelationships });
    dispatch(setSelectedElements([]));
  };

  const handleDeleteNonMatched = () => {
    const allIds = Object.keys(model.elements);
    const matchedSet = new Set(matchedIds);
    const toDelete = new Set(allIds.filter((id) => !matchedSet.has(id) && id !== model.root.id));
    if (toDelete.size === 0) return;
    const newElements = { ...model.elements };
    for (const id of toDelete) delete newElements[id];
    const newRoot = {
      ...model.root,
      childIds: model.root.childIds.filter((id) => !toDelete.has(id)),
    };
    for (const [id, el] of Object.entries(newElements)) {
      if (el.childIds.some((c) => toDelete.has(c))) {
        newElements[id] = {
          ...el,
          childIds: el.childIds.filter((c) => !toDelete.has(c)),
        };
      }
    }
    const newRelationships = Object.fromEntries(
      Object.entries(model.relationships).filter(
        ([, r]) => !toDelete.has(r.source) && !toDelete.has(r.target),
      ),
    );
    syncManager.syncFromVis({ ...model, root: newRoot, elements: newElements, relationships: newRelationships });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border/40 shrink-0">
        <Select
          value={effectiveId ?? ""}
          onValueChange={(v) => setActiveSelectorId(v)}
          options={visibleSelectors.map((s) => ({ value: s.id, label: s.label }))}
        />
      </div>

      {selector && (
        <>
          <div className="px-3 py-2.5 border-b border-border/40 shrink-0 flex flex-col gap-2">
            <div className="flex items-center gap-1 flex-wrap">
              {MODES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleModeChange(value)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                    selector.mode === value
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border/40 text-fg-muted hover:border-accent/50 hover:text-fg-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
              {selector.mode === "color" && (
                <input
                  type="color"
                  value={selector.color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-border/40 bg-transparent p-0"
                  title="Selector color"
                />
              )}
            </div>
          </div>

          <div className="px-3 py-2.5 border-b border-border/40 shrink-0 flex flex-col gap-1.5">
            <div className="text-[10px] text-fg-disabled uppercase tracking-widest font-medium mb-0.5">
              {matchedIds.length} element{matchedIds.length !== 1 ? "s" : ""} matched
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSelectAll}
                disabled={matchedIds.length === 0}
                title="Set canvas selection to all matched elements"
              >
                <MousePointer2 size={13} />
                Select all
              </Button>
              <Button
                size="sm"
                variant={isGroupMove ? "secondary" : "ghost"}
                onClick={handleToggleGroupMove}
                disabled={matchedIds.length === 0}
                title="Move all matched elements together when dragging any one of them"
              >
                <Move size={13} />
                Move together
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAutoLayout}
                disabled={matchedIds.length === 0}
                title="Reset matched elements to auto-computed layout positions"
              >
                <LayoutGrid size={13} />
                Auto layout
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteMatched}
                disabled={matchedIds.length === 0}
                title="Delete all matched elements"
              >
                <Trash2 size={13} />
                Delete matched
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteNonMatched}
                title="Delete all non-matched elements"
              >
                <Trash2 size={13} />
                Delete others
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {matchedIds.length === 0 ? (
              <div className="text-[11px] text-fg-disabled italic text-center py-4">
                No elements match this selector
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {matchedIds.map((id) => {
                  const el = model.elements[id];
                  return (
                    <button
                      key={id}
                      className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent/10 hover:text-accent text-left transition-colors"
                      onClick={() => dispatch(setSelectedElements([id]))}
                    >
                      <span className="text-xs truncate">{id}</span>
                      {el && (
                        <span className="text-[10px] text-fg-disabled shrink-0 ml-2">
                          {el.type}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
