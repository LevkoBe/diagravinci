import { useRef, useState } from "react";
import { Trash2, Check } from "lucide-react";
import { DangerIconBtn } from "./DangerIconBtn";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import { setViewMode } from "../../application/store/diagramSlice";
import { syncManager } from "../../application/store/store";
import type { TemplateCollection } from "../../domain/models/TemplateCollection";
import type { DiagramTemplate } from "../../domain/models/DiagramTemplate";
import type { ViewState } from "../../domain/models/ViewState";
import { CollectionRepository } from "../../infrastructure/CollectionRepository";
import { downloadCollectionZip } from "../../infrastructure/CollectionZip";

const VIEW_LABELS: Record<ViewState["viewMode"], string> = {
  circular: "Circular",
  basic: "Basic",
  hierarchical: "Hierarchical",
  timeline: "Timeline",
  pipeline: "Pipeline",
  radial: "Radial",
  execute: "Execute",
};

const VIEW_COLORS: Record<ViewState["viewMode"], string> = {
  circular: "bg-purple-500/15 text-purple-800",
  basic: "bg-fg-ternary/15 text-fg-muted",
  hierarchical: "bg-blue-500/15 text-blue-800",
  timeline: "bg-amber-500/15 text-amber-800",
  pipeline: "bg-green-500/15 text-green-800",
  radial: "bg-teal-500/15 text-teal-800",
  execute: "bg-indigo-500/15 text-indigo-800",
};

type ThumbSpec = {
  bg: string;
  dot: string;
  dots: { x: number; y: number; r?: number }[];
  lines?: [number, number][];
};

const THUMB: Record<ViewState["viewMode"], ThumbSpec> = {
  circular: {
    bg: "#f3e8ff", dot: "#a855f7",
    dots: [0, 72, 144, 216, 288].map((deg) => ({
      x: 50 + 30 * Math.cos((deg * Math.PI) / 180),
      y: 50 + 30 * Math.sin((deg * Math.PI) / 180),
    })),
  },
  hierarchical: {
    bg: "#dbeafe", dot: "#3b82f6",
    dots: [{ x: 50, y: 20 }, { x: 25, y: 72 }, { x: 50, y: 72 }, { x: 75, y: 72 }],
    lines: [[0, 1], [0, 2], [0, 3]],
  },
  timeline: {
    bg: "#fef3c7", dot: "#f59e0b",
    dots: [{ x: 10, y: 50 }, { x: 30, y: 50 }, { x: 50, y: 50 }, { x: 70, y: 50 }, { x: 90, y: 50 }],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  pipeline: {
    bg: "#dcfce7", dot: "#22c55e",
    dots: [{ x: 12, y: 50, r: 10 }, { x: 38, y: 50, r: 10 }, { x: 62, y: 50, r: 10 }, { x: 88, y: 50, r: 10 }],
    lines: [[0, 1], [1, 2], [2, 3]],
  },
  execute: {
    bg: "#e0e7ff", dot: "#6366f1",
    dots: [{ x: 15, y: 50 }, { x: 40, y: 28 }, { x: 40, y: 72 }, { x: 65, y: 50 }, { x: 88, y: 50 }],
    lines: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]],
  },
  radial: {
    bg: "#ccfbf1", dot: "#14b8a6",
    dots: [
      { x: 50, y: 50, r: 8 },
      { x: 50, y: 18 }, { x: 82, y: 68 }, { x: 18, y: 68 },
    ],
    lines: [[0, 1], [0, 2], [0, 3]],
  },
  basic: {
    bg: "#f1f5f9", dot: "#64748b",
    dots: [{ x: 20, y: 33 }, { x: 50, y: 33 }, { x: 80, y: 33 }, { x: 20, y: 67 }, { x: 50, y: 67 }, { x: 80, y: 67 }],
  },
};

function ThumbnailPreview({ mode }: { mode: ViewState["viewMode"] }) {
  const { dot, dots, lines = [] } = THUMB[mode];
  return (
    <div style={{ position: "relative", width: "100%", height: 48, background: "var(--color-bg-elevated)", borderRadius: "6px 6px 0 0", overflow: "hidden", flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {lines.map(([a, b], i) => (
          <line key={i} x1={dots[a].x} y1={dots[a].y} x2={dots[b].x} y2={dots[b].y} stroke={dot} strokeWidth="2" opacity="0.35" />
        ))}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r ?? 6} fill={dot} opacity="0.75" />
        ))}
      </svg>
    </div>
  );
}

function CollectionThumbnail({ templates }: { templates: DiagramTemplate[] }) {
  const sample = templates.slice(0, 25);
  const cols = Math.ceil(Math.sqrt(sample.length)) || 1;
  const rows = Math.ceil(sample.length / cols);
  const size = 64;

  return (
    <div style={{ width: size, minWidth: size, height: size, background: "var(--color-bg-elevated)", borderRadius: "6px 0 0 6px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg viewBox={`0 0 ${cols * 13} ${rows * 13}`} style={{ width: "80%", height: "80%" }}>
        {sample.map((t, i) => (
          <circle
            key={t.id}
            cx={(i % cols) * 13 + 6.5}
            cy={Math.floor(i / cols) * 13 + 6.5}
            r={4.5}
            fill={THUMB[t.preferredView].dot}
            opacity="0.85"
          />
        ))}
      </svg>
    </div>
  );
}

function TemplateBadge({ mode }: { mode: ViewState["viewMode"] }) {
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${VIEW_COLORS[mode]}`}
    >
      {VIEW_LABELS[mode]}
    </span>
  );
}

function CollectionsView({
  collections,
  onOpen,
  onImport,
  onCreateCollection,
}: {
  collections: TemplateCollection[];
  onOpen: (col: TemplateCollection) => void;
  onImport: () => void;
  onCreateCollection: (name: string) => void;
}) {
  const [newName, setNewName] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onCreateCollection(name);
    setNewName("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-fg-disabled uppercase tracking-wider">
          Collections
        </p>
        <button
          onClick={onImport}
          title="Import collection from zip"
          className="text-[10px] px-2 py-1 rounded border border-border/30 hover:border-accent/60 hover:bg-accent/5 text-fg-muted hover:text-accent transition-all"
        >
          Import
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-2 min-h-0">
        {collections.map((col) => (
          <div
            key={col.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(col)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(col)}
            className="w-full text-left rounded-lg border border-border/30 hover:border-accent/60 hover:shadow-sm transition-all group cursor-pointer shrink-0 flex overflow-hidden"
          >
            {col.templates.length > 0 && <CollectionThumbnail templates={col.templates} />}
            <div className="p-3 flex flex-col justify-center min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-fg-primary group-hover:text-accent transition-colors leading-tight truncate">
                  {col.name}
                </span>
                {col.isBuiltIn && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-fg-ternary/15 text-fg-disabled shrink-0">
                    built-in
                  </span>
                )}
              </div>
              <p className="text-xs text-fg-disabled mt-0.5">
                {col.templates.length} template
                {col.templates.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleCreate}
        className="px-3 pb-3 pt-2 border-t border-border/20 flex gap-2"
      >
        <input
          type="text"
          placeholder="New collection name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 text-xs bg-bg-base/60 border border-border/30 rounded px-2 py-1.5 focus:outline-none focus:border-accent/60 text-fg-primary placeholder:text-fg-disabled"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="px-2.5 py-1.5 rounded border border-border/30 hover:border-accent/60 hover:bg-accent/5 text-fg-muted hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-bold"
          title="Create collection"
        >
          +
        </button>
      </form>
    </div>
  );
}

function TemplateCard({
  template,
  onApply,
  onDelete,
}: {
  template: DiagramTemplate;
  onApply: (t: DiagramTemplate) => void;
  onDelete?: (t: DiagramTemplate) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="w-full text-left rounded-lg border border-border/30 hover:border-accent/60 hover:shadow-sm transition-all group cursor-pointer overflow-hidden shrink-0"
      onClick={() => onApply(template)}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && onApply(template)
      }
    >
      <ThumbnailPreview mode={template.preferredView} />
      <div className="p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-fg-primary group-hover:text-accent transition-colors leading-tight">
          {template.name}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <TemplateBadge mode={template.preferredView} />
          {onDelete && (
            <DangerIconBtn
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template);
              }}
              title="Remove template"
              className="p-1! opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </DangerIconBtn>
          )}
        </div>
      </div>
      <p className="text-xs text-fg-muted leading-snug">
        {template.description}
      </p>
      <div className="flex flex-wrap gap-1 mt-2">
        {template.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded bg-fg-ternary/15 text-fg-disabled"
          >
            {tag}
          </span>
        ))}
      </div>
      </div>
    </div>
  );
}

function CollectionView({
  collection,
  currentCode,
  currentViewMode,
  onClose,
  onTemplateAdded,
  onTemplateRemoved,
  onExport,
  onDelete,
}: {
  collection: TemplateCollection;
  currentCode: string;
  currentViewMode: ViewState["viewMode"];
  onClose: () => void;
  onTemplateAdded: (collectionId: string, template: DiagramTemplate) => void;
  onTemplateRemoved: (collectionId: string, templateId: string) => void;
  onExport: (col: TemplateCollection) => void;
  onDelete: (col: TemplateCollection) => void;
}) {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const filtered = collection.templates.filter((t) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q))
    );
  });

  function applyTemplate(template: DiagramTemplate) {
    dispatch(setViewMode(template.preferredView));
    syncManager.syncFromCode(template.code);
  }

  function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    const name = newTemplateName.trim();
    if (!name || !currentCode.trim()) return;
    const template: DiagramTemplate = {
      id: crypto.randomUUID(),
      name,
      description: "",
      tags: [],
      preferredView: currentViewMode === "basic" ? "circular" : currentViewMode,
      code: currentCode,
    };
    onTemplateAdded(collection.id, template);
    setNewTemplateName("");
  }

  function handleRemoveTemplate(template: DiagramTemplate) {
    onTemplateRemoved(collection.id, template.id);
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    onDelete(collection);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={onClose}
            className="text-[10px] px-1.5 py-1 rounded hover:bg-border/10 text-fg-disabled hover:text-fg-muted transition-all"
            title="Back to collections"
          >
            ← All
          </button>
          <p className="flex-1 text-[11px] font-semibold text-fg-primary truncate">
            {collection.name}
          </p>
          <button
            onClick={() => onExport(collection)}
            className="text-[10px] px-1.5 py-1 rounded border border-border/30 hover:border-accent/60 hover:bg-accent/5 text-fg-muted hover:text-accent transition-all"
            title="Export as zip"
          >
            Export
          </button>
          {!collection.isBuiltIn && (
            <DangerIconBtn
              onClick={handleDelete}
              onBlur={() => setConfirmingDelete(false)}
              className="p-1.5!"
              title={
                confirmingDelete
                  ? "Click again to confirm"
                  : "Delete collection"
              }
            >
              {confirmingDelete ? <Check size={13} /> : <Trash2 size={13} />}
            </DangerIconBtn>
          )}
        </div>

        <input
          type="text"
          placeholder="Search templates…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-xs bg-bg-base/60 border border-border/30 rounded px-2 py-1.5 focus:outline-none focus:border-accent/60 text-fg-primary placeholder:text-fg-disabled"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-2 min-h-0">
        {filtered.length === 0 ? (
          <p className="text-xs text-fg-disabled text-center py-4">
            {query ? `No templates match "${query}"` : "No templates yet."}
          </p>
        ) : (
          filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onApply={applyTemplate}
              onDelete={collection.isBuiltIn ? undefined : handleRemoveTemplate}
            />
          ))
        )}
      </div>

      {!collection.isBuiltIn && (
        <form
          onSubmit={handleSaveTemplate}
          className="px-3 pb-3 pt-2 border-t border-border/20 flex gap-2"
        >
          <input
            type="text"
            placeholder="Save current diagram as…"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            className="flex-1 text-xs bg-bg-base/60 border border-border/30 rounded px-2 py-1.5 focus:outline-none focus:border-accent/60 text-fg-primary placeholder:text-fg-disabled"
          />
          <button
            type="submit"
            disabled={!newTemplateName.trim()}
            className="px-2.5 py-1.5 rounded border border-border/30 hover:border-accent/60 hover:bg-accent/5 text-fg-muted hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-bold"
            title="Save to collection"
          >
            +
          </button>
        </form>
      )}
    </div>
  );
}

export function TemplatePanel() {
  const currentCode = useAppSelector((s) => s.diagram.code);
  const currentViewMode = useAppSelector((s) => s.diagram.viewState.viewMode);
  const importRef = useRef<HTMLInputElement>(null);

  const [collections, setCollections] = useState<TemplateCollection[]>(() =>
    CollectionRepository.getAll(),
  );
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const openCollection =
    collections.find((c) => c.id === openCollectionId) ?? null;

  function refresh() {
    setCollections(CollectionRepository.getAll());
  }

  function handleCreateCollection(name: string) {
    CollectionRepository.create(name);
    refresh();
  }

  function handleImportClick() {
    setImportError(null);
    importRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { importCollectionFromZip } =
        await import("../../infrastructure/CollectionZip");
      const imported = await importCollectionFromZip(file);
      CollectionRepository.upsert(imported);
      refresh();
      setOpenCollectionId(imported.id);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    }
  }

  function handleTemplateAdded(
    collectionId: string,
    template: DiagramTemplate,
  ) {
    CollectionRepository.addTemplate(collectionId, template);
    refresh();
  }

  function handleTemplateRemoved(collectionId: string, templateId: string) {
    CollectionRepository.removeTemplate(collectionId, templateId);
    refresh();
  }

  function handleExport(col: TemplateCollection) {
    downloadCollectionZip(col);
  }

  function handleDelete(col: TemplateCollection) {
    CollectionRepository.delete(col.id);
    setOpenCollectionId(null);
    refresh();
  }

  return (
    <div className="flex flex-col h-full">
      <input
        ref={importRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleImportFile}
      />

      {importError && (
        <div className="mx-3 mt-2 px-2 py-1.5 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded">
          {importError}
          <button
            onClick={() => setImportError(null)}
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {openCollection ? (
        <CollectionView
          collection={openCollection}
          currentCode={currentCode}
          currentViewMode={currentViewMode}
          onClose={() => setOpenCollectionId(null)}
          onTemplateAdded={handleTemplateAdded}
          onTemplateRemoved={handleTemplateRemoved}
          onExport={handleExport}
          onDelete={handleDelete}
        />
      ) : (
        <CollectionsView
          collections={collections}
          onOpen={(col) => setOpenCollectionId(col.id)}
          onImport={handleImportClick}
          onCreateCollection={handleCreateCollection}
        />
      )}
    </div>
  );
}
