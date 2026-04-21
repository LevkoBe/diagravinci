import { useState } from "react";
import { Trash2, ChevronRight, Check, X } from "lucide-react";
import { DangerIconBtn } from "./DangerIconBtn";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import { syncManager } from "../../application/store/store";
import {
  setSelectedElement,
  setSelectedElements,
} from "../../application/store/uiSlice";
import { setViewState } from "../../application/store/diagramSlice";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";

export function PropertiesPanel() {
  const dispatch = useAppDispatch();
  const model = useAppSelector((s) => s.diagram.model);
  const viewState = useAppSelector((s) => s.diagram.viewState);
  const selectedIds = useAppSelector((s) => s.ui.selectedElementIds);

  const selectedId = selectedIds.at(-1) ?? null;

  if (!selectedId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-fg-disabled select-none p-6">
        <div className="text-3xl opacity-40">◎</div>
        <div className="text-xs text-center leading-relaxed">
          Select an element
          <br />
          to inspect it
        </div>
      </div>
    );
  }

  const element = model.elements[selectedId];
  if (!element) return null;

  return (
    <PropertiesPanelContent
      selectedId={selectedId}
      selectedIds={selectedIds}
      model={model}
      viewState={viewState}
      dispatch={dispatch}
    />
  );
}

function PropertiesPanelContent({
  selectedId,
  selectedIds,
  model,
  viewState,
  dispatch,
}: {
  selectedId: string;
  selectedIds: string[];
  model: DiagramModel;
  viewState: ViewState;
  dispatch: ReturnType<
    typeof import("../../application/store/hooks").useAppDispatch
  >;
}) {
  const element = model.elements[selectedId]!;
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(selectedId);

  const paths = Object.keys(viewState.positions).filter(
    (p) => p === selectedId || p.endsWith(`.${selectedId}`),
  );
  const primaryPos = viewState.positions[paths[0]];
  const outgoing = Object.values(model.relationships).filter(
    (r) => r.source === selectedId,
  );
  const incoming = Object.values(model.relationships).filter(
    (r) => r.target === selectedId,
  );

  const handleDelete = () => {
    const newElements = { ...model.elements };
    delete newElements[selectedId];
    const newRoot = {
      ...model.root,
      childIds: model.root.childIds.filter((id) => id !== selectedId),
    };
    Object.values(newElements).forEach((el) => {
      if (el.childIds.includes(selectedId)) {
        newElements[el.id] = {
          ...el,
          childIds: el.childIds.filter((id) => id !== selectedId),
        };
      }
    });
    const newRelationships = Object.fromEntries(
      Object.entries(model.relationships).filter(
        ([, r]) => r.source !== selectedId && r.target !== selectedId,
      ),
    );
    syncManager.syncFromVis({
      ...model,
      root: newRoot,
      elements: newElements,
      relationships: newRelationships,
    });
    dispatch(setSelectedElements([]));
  };

  const commitRename = (newName: string) => {
    setEditingName(false);
    const trimmed = newName.trim();
    if (!trimmed || trimmed === selectedId) return;
    if (model.elements[trimmed]) return;

    const renamedModel = renameElement(model, selectedId, trimmed);

    const renamedPositions: typeof viewState.positions = {};
    for (const [path, val] of Object.entries(viewState.positions)) {
      const newPath = renamePath(path, selectedId, trimmed);
      renamedPositions[newPath] = val;
    }
    dispatch(setViewState({ ...viewState, positions: renamedPositions }));
    syncManager.syncFromVis(renamedModel);

    const newSelectedIds = selectedIds.map((id) =>
      id === selectedId ? trimmed : id,
    );
    dispatch(setSelectedElements(newSelectedIds));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 flex items-start justify-between gap-2 shrink-0">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                className="flex-1 min-w-0 text-sm font-semibold bg-bg-elevated border border-accent/60 rounded px-1.5 py-0.5 text-fg-primary outline-none"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(nameInput);
                  if (e.key === "Escape") setEditingName(false);
                }}
              />
              <button
                className="btn-icon shrink-0"
                style={{ width: "1.5rem", height: "1.5rem" }}
                onClick={() => commitRename(nameInput)}
              >
                <Check size={11} />
              </button>
              <button
                className="btn-icon shrink-0"
                style={{ width: "1.5rem", height: "1.5rem" }}
                onClick={() => setEditingName(false)}
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              className="font-semibold text-fg-primary text-sm truncate leading-tight text-left w-full hover:text-accent transition-colors"
              title="Click to rename"
              onClick={() => {
                setNameInput(selectedId);
                setEditingName(true);
              }}
            >
              {selectedId}
            </button>
          )}
          <div className="text-xs text-fg-muted mt-0.5">{element.type}</div>
        </div>
        <DangerIconBtn
          title="Delete element"
          onClick={handleDelete}
          className="shrink-0 mt-0.5"
          style={{ width: "1.75rem", height: "1.75rem" }}
        >
          <Trash2 size={13} />
        </DangerIconBtn>
      </div>

      {/* Multi-select indicator */}
      {selectedIds.length > 1 && (
        <div className="px-4 py-1.5 bg-accent/10 border-b border-accent/20 text-[11px] text-accent">
          {selectedIds.length} selected · showing last
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {primaryPos?.isRecursive && (
            <span className="px-2 py-0.5 rounded-full text-[10px] border border-orange-500/40 bg-orange-500/10 text-orange-500">
              ↺ recursive
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[10px] border border-border/50 bg-fg-ternary/10 text-fg-muted">
            {element.foldState}
          </span>
        </div>

        {/* Position */}
        {primaryPos && (
          <PanelSection label="Position">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <DataRow label="x" value={primaryPos.position.x.toFixed(1)} />
              <DataRow label="y" value={primaryPos.position.y.toFixed(1)} />
              <DataRow label="size" value={String(primaryPos.size)} />
              <DataRow label="value" value={String(primaryPos.value)} />
            </div>
          </PanelSection>
        )}

        {/* Path */}
        {paths.length > 0 && (
          <PanelSection label="Path">
            {paths.map((p) => (
              <div
                key={p}
                className="font-mono text-[11px] text-fg-muted break-all bg-bg-overlay/50 rounded px-2 py-1"
              >
                {p}
              </div>
            ))}
          </PanelSection>
        )}

        {/* Children */}
        {element.childIds.length > 0 && (
          <PanelSection label={`Children (${element.childIds.length})`}>
            {element.childIds.map((childId) => {
              const child = model.elements[childId];
              return (
                <button
                  key={childId}
                  className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded bg-bg-overlay/40 hover:bg-accent/10 hover:text-accent text-left transition-colors"
                  onClick={() => {
                    dispatch(setSelectedElement(childId));
                  }}
                >
                  <span className="text-xs truncate">{childId}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {child && (
                      <span className="text-[10px] text-fg-disabled">
                        {child.type}
                      </span>
                    )}
                    <ChevronRight size={11} className="text-fg-disabled" />
                  </div>
                </button>
              );
            })}
          </PanelSection>
        )}

        {/* Relationships */}
        {(outgoing.length > 0 || incoming.length > 0) && (
          <PanelSection label="Relationships">
            {outgoing.map((r) => (
              <RelRow
                key={r.id}
                dir="out"
                peerId={r.target}
                type={r.type}
                label={r.label}
                onNavigate={() => {
                  dispatch(setSelectedElement(r.target));
                }}
              />
            ))}
            {incoming.map((r) => (
              <RelRow
                key={r.id}
                dir="in"
                peerId={r.source}
                type={r.type}
                label={r.label}
                onNavigate={() => {
                  dispatch(setSelectedElement(r.source));
                }}
              />
            ))}
          </PanelSection>
        )}
      </div>
    </div>
  );
}

function renamePath(path: string, oldId: string, newId: string): string {
  return path
    .split(".")
    .map((seg) => (seg === oldId ? newId : seg))
    .join(".");
}

function renameElement(
  model: DiagramModel,
  oldId: string,
  newId: string,
): DiagramModel {
  const elements = { ...model.elements };

  const el = elements[oldId];
  delete elements[oldId];
  elements[newId] = { ...el, id: newId };

  let root = model.root;
  if (root.childIds.includes(oldId)) {
    root = {
      ...root,
      childIds: root.childIds.map((id) => (id === oldId ? newId : id)),
    };
  }
  for (const [id, elem] of Object.entries(elements)) {
    if (elem.childIds.includes(oldId)) {
      elements[id] = {
        ...elem,
        childIds: elem.childIds.map((cid) => (cid === oldId ? newId : cid)),
      };
    }
  }

  const relationships = Object.fromEntries(
    Object.entries(model.relationships).map(([rid, r]) => [
      rid,
      {
        ...r,
        source: r.source === oldId ? newId : r.source,
        target: r.target === oldId ? newId : r.target,
      },
    ]),
  );

  return { ...model, root, elements, relationships };
}

function PanelSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] text-fg-disabled uppercase tracking-widest mb-1.5 font-medium">
        {label}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-fg-muted">{label}</span>
      <span className="text-[11px] font-mono text-fg-primary">{value}</span>
    </div>
  );
}

function RelRow({
  dir,
  peerId,
  type,
  label,
  onNavigate,
}: {
  dir: "in" | "out";
  peerId: string;
  type: string;
  label?: string;
  onNavigate: () => void;
}) {
  return (
    <button
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-bg-overlay/40 hover:bg-accent/10 hover:text-accent text-left transition-colors"
      onClick={onNavigate}
    >
      <span
        className={`text-[10px] font-mono shrink-0 ${dir === "out" ? "text-accent" : "text-fg-muted"}`}
      >
        {dir === "out" ? "→" : "←"}
      </span>
      <span className="text-xs truncate">{peerId}</span>
      <span className="text-[10px] text-fg-disabled shrink-0 ml-auto">
        {type}
        {label ? ` · ${label}` : ""}
      </span>
    </button>
  );
}
