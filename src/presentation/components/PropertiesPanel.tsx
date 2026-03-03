import { Trash2, ChevronRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import { syncManager } from "../../application/store/store";
import { setSelectedElement } from "../../application/store/uiSlice";

export function PropertiesPanel() {
  const dispatch = useAppDispatch();
  const model = useAppSelector((s) => s.diagram.model);
  const viewState = useAppSelector((s) => s.diagram.viewState);
  const selectedId = useAppSelector((s) => s.ui.selectedElementId);

  if (!selectedId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-fg-ternary select-none p-6">
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
    dispatch(setSelectedElement(null));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-fg-ternary/40 flex items-start justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="font-semibold text-fg-primary text-sm truncate leading-tight">
            {element.id}
          </div>
          <div className="text-xs text-fg-secondary mt-0.5">{element.type}</div>
        </div>
        <button
          className="btn-icon danger shrink-0 mt-0.5"
          style={{ width: "1.75rem", height: "1.75rem" }}
          title="Delete element"
          onClick={handleDelete}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {primaryPos?.isRecursive && (
            <span className="px-2 py-0.5 rounded-full text-[10px] border border-orange-500/40 bg-orange-500/10 text-orange-500">
              ↺ recursive
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[10px] border border-fg-ternary/50 bg-fg-ternary/10 text-fg-secondary">
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
                className="font-mono text-[11px] text-fg-secondary break-all bg-bg-ternary/50 rounded px-2 py-1"
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
                  className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded bg-bg-ternary/40 hover:bg-accent/10 hover:text-accent text-left transition-colors"
                  onClick={() => dispatch(setSelectedElement(childId))}
                >
                  <span className="text-xs truncate">{childId}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {child && (
                      <span className="text-[10px] text-fg-ternary">
                        {child.type}
                      </span>
                    )}
                    <ChevronRight size={11} className="text-fg-ternary" />
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
                onNavigate={() => dispatch(setSelectedElement(r.target))}
              />
            ))}
            {incoming.map((r) => (
              <RelRow
                key={r.id}
                dir="in"
                peerId={r.source}
                type={r.type}
                label={r.label}
                onNavigate={() => dispatch(setSelectedElement(r.source))}
              />
            ))}
          </PanelSection>
        )}
      </div>
    </div>
  );
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
      <div className="text-[10px] text-fg-ternary uppercase tracking-widest mb-1.5 font-medium">
        {label}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-fg-secondary">{label}</span>
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
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-bg-ternary/40 hover:bg-accent/10 hover:text-accent text-left transition-colors"
      onClick={onNavigate}
    >
      <span
        className={`text-[10px] font-mono shrink-0 ${dir === "out" ? "text-accent" : "text-fg-secondary"}`}
      >
        {dir === "out" ? "→" : "←"}
      </span>
      <span className="text-xs truncate">{peerId}</span>
      <span className="text-[10px] text-fg-ternary shrink-0 ml-auto">
        {type}
        {label ? ` · ${label}` : ""}
      </span>
    </button>
  );
}
