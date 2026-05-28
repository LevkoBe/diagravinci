import { useRef, useState } from "react";
import { Trash2, Check, FileText, FolderPlus } from "lucide-react";
import { DangerIconBtn } from "./DangerIconBtn";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import { setViewMode } from "../../application/store/diagramSlice";
import { sendZoomCommand } from "../../application/store/uiSlice";
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
  force: "Force",
  manual: "Manual",
};

const VIEW_COLORS: Record<ViewState["viewMode"], string> = {
  circular: "bg-purple-500/15 text-purple-800",
  basic: "bg-fg-ternary/15 text-fg-muted",
  hierarchical: "bg-blue-500/15 text-blue-800",
  timeline: "bg-amber-500/15 text-amber-800",
  pipeline: "bg-green-500/15 text-green-800",
  radial: "bg-teal-500/15 text-teal-800",
  execute: "bg-indigo-500/15 text-indigo-800",
  force: "bg-orange-500/15 text-orange-800",
  manual: "bg-fg-ternary/15 text-fg-muted",
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
  force: {
    bg: "#fff7ed", dot: "#f97316",
    dots: [{ x: 50, y: 50 }, { x: 20, y: 25 }, { x: 80, y: 25 }, { x: 20, y: 75 }, { x: 80, y: 75 }],
    lines: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [3, 4]],
  },
  manual: {
    bg: "#f8fafc", dot: "#94a3b8",
    dots: [{ x: 25, y: 30 }, { x: 70, y: 20 }, { x: 50, y: 65 }, { x: 80, y: 70 }],
    lines: [[0, 2], [1, 3]],
  },
};

function getAllTemplates(col: TemplateCollection): DiagramTemplate[] {
  return [
    ...col.templates,
    ...(col.collections?.flatMap(getAllTemplates) ?? []),
  ];
}

function findCollectionById(
  cols: TemplateCollection[],
  id: string,
): TemplateCollection | null {
  for (const col of cols) {
    if (col.id === id) return col;
    if (col.collections) {
      const found = findCollectionById(col.collections, id);
      if (found) return found;
    }
  }
  return null;
}

function buildCrumbs(
  cols: TemplateCollection[],
  stack: string[],
): { id: string; name: string }[] {
  const crumbs: { id: string; name: string }[] = [];
  for (const id of stack) {
    const col = findCollectionById(cols, id);
    if (!col) break;
    crumbs.push({ id, name: col.name });
  }
  return crumbs;
}

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

function CollectionThumbnail({ collection }: { collection: TemplateCollection }) {
  const allTemplates = getAllTemplates(collection);
  const size = 64;

  if (allTemplates.length === 0) {
    const subcols = collection.collections ?? [];
    return (
      <div style={{ width: size, minWidth: size, height: size, background: "var(--color-bg-elevated)", borderRadius: "6px 0 0 6px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg viewBox="0 0 60 60" style={{ width: "70%", height: "70%" }}>
          {subcols.slice(0, 4).map((_, i) => (
            <rect
              key={i}
              x={(i % 2) * 32 + 2}
              y={Math.floor(i / 2) * 32 + 2}
              width={26}
              height={26}
              rx="3"
              fill="#64748b"
              opacity="0.25"
            />
          ))}
          {subcols.length === 0 && (
            <rect x="10" y="10" width="40" height="40" rx="4" fill="#64748b" opacity="0.15" />
          )}
        </svg>
      </div>
    );
  }

  const sample = allTemplates.slice(0, 25);
  const cols = Math.ceil(Math.sqrt(sample.length)) || 1;
  const rows = Math.ceil(sample.length / cols);

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
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${VIEW_COLORS[mode]}`}>
      {VIEW_LABELS[mode]}
    </span>
  );
}

function CollectionCard({
  collection,
  onOpen,
  onDelete,
}: {
  collection: TemplateCollection;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const subcols = collection.collections?.length ?? 0;
  const templates = collection.templates.length;
  const parts: string[] = [];
  if (subcols > 0) parts.push(`${subcols} collection${subcols !== 1 ? "s" : ""}`);
  if (templates > 0) parts.push(`${templates} template${templates !== 1 ? "s" : ""}`);

  return (
    <div
      role="button"
      tabIndex={0}
      className="w-full text-left rounded-lg border border-border/30 hover:border-accent/60 hover:shadow-sm transition-all group cursor-pointer shrink-0 flex overflow-hidden"
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
    >
      <CollectionThumbnail collection={collection} />
      <div className="p-3 flex flex-col justify-center min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-fg-primary group-hover:text-accent transition-colors leading-tight truncate">
            {collection.name}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {collection.isBuiltIn && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-fg-ternary/15 text-fg-disabled">
                built-in
              </span>
            )}
            {onDelete && (
              <DangerIconBtn
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete collection"
                className="p-1! opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={12} />
              </DangerIconBtn>
            )}
          </div>
        </div>
        <p className="text-xs text-fg-disabled mt-0.5">
          {parts.join(", ") || "Empty"}
        </p>
      </div>
    </div>
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
          <CollectionCard
            key={col.id}
            collection={col}
            onOpen={() => onOpen(col)}
          />
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
  breadcrumbs,
  currentCode,
  currentViewMode,
  onNavigateTo,
  onOpenSubcollection,
  onCreateSubcollection,
  onTemplateAdded,
  onTemplateRemoved,
  onExport,
  onDelete,
}: {
  collection: TemplateCollection;
  breadcrumbs: { id: string; name: string }[];
  currentCode: string;
  currentViewMode: ViewState["viewMode"];
  onNavigateTo: (index: number) => void;
  onOpenSubcollection: (sub: TemplateCollection) => void;
  onCreateSubcollection: (parentId: string, name: string) => void;
  onTemplateAdded: (collectionId: string, template: DiagramTemplate) => void;
  onTemplateRemoved: (collectionId: string, templateId: string) => void;
  onExport: (col: TemplateCollection) => void;
  onDelete: (col: TemplateCollection) => void;
}) {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [createMode, setCreateMode] = useState<"template" | "subcollection">("template");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const subCollections = collection.collections ?? [];
  const searchPool = query ? getAllTemplates(collection) : collection.templates;
  const filtered = searchPool.filter((t) => {
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
    dispatch(sendZoomCommand("reset"));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) return;
    if (createMode === "template") {
      if (!currentCode.trim()) return;
      const template: DiagramTemplate = {
        id: crypto.randomUUID(),
        name,
        description: "",
        tags: [],
        preferredView: currentViewMode === "basic" ? "circular" : currentViewMode,
        code: currentCode,
      };
      onTemplateAdded(collection.id, template);
    } else {
      onCreateSubcollection(collection.id, name);
    }
    setNewItemName("");
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

  const ancestors = breadcrumbs.slice(0, -1);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-1 mb-2">
          <div className="flex-1 flex items-center gap-0.5 text-[10px] min-w-0 overflow-hidden">
            <button
              onClick={() => onNavigateTo(-1)}
              className="text-fg-disabled hover:text-fg-muted transition-colors shrink-0"
            >
              ← All
            </button>
            {ancestors.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-0.5 shrink-0">
                <span className="text-fg-disabled px-0.5">/</span>
                <button
                  onClick={() => onNavigateTo(i)}
                  className="text-fg-disabled hover:text-fg-muted transition-colors truncate max-w-14"
                  title={crumb.name}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
            <span className="text-fg-disabled px-0.5 shrink-0">/</span>
            <span className="text-[11px] font-semibold text-fg-primary truncate">
              {collection.name}
            </span>
          </div>
          <button
            onClick={() => onExport(collection)}
            className="text-[10px] px-1.5 py-1 rounded border border-border/30 hover:border-accent/60 hover:bg-accent/5 text-fg-muted hover:text-accent transition-all shrink-0"
            title="Export as zip"
          >
            Export
          </button>
          {!collection.isBuiltIn && (
            <DangerIconBtn
              onClick={handleDelete}
              onBlur={() => setConfirmingDelete(false)}
              className="p-1.5!"
              title={confirmingDelete ? "Click again to confirm" : "Delete collection"}
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
        {!query && subCollections.map((sub) => (
          <CollectionCard
            key={sub.id}
            collection={sub}
            onOpen={() => onOpenSubcollection(sub)}
            onDelete={!sub.isBuiltIn ? () => onDelete(sub) : undefined}
          />
        ))}

        {!query && subCollections.length > 0 && filtered.length > 0 && (
          <div className="border-t border-border/20 mt-1 pt-1" />
        )}

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
          onSubmit={handleSubmit}
          className="px-3 pb-3 pt-2 border-t border-border/20 flex gap-2 items-center"
        >
          <button
            type="button"
            onClick={() => setCreateMode((m) => m === "template" ? "subcollection" : "template")}
            className={`p-1.5 rounded border transition-all shrink-0 ${
              createMode === "subcollection"
                ? "border-accent/60 bg-accent/5 text-accent"
                : "border-border/30 text-fg-muted hover:border-accent/40 hover:text-fg-primary"
            }`}
            title={createMode === "template" ? "Switch to create sub-collection" : "Switch to save as template"}
          >
            {createMode === "template" ? <FileText size={13} /> : <FolderPlus size={13} />}
          </button>
          <input
            type="text"
            placeholder={
              createMode === "template"
                ? "Save current diagram as…"
                : "New sub-collection name…"
            }
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 text-xs bg-bg-base/60 border border-border/30 rounded px-2 py-1.5 focus:outline-none focus:border-accent/60 text-fg-primary placeholder:text-fg-disabled"
          />
          <button
            type="submit"
            disabled={!newItemName.trim()}
            className="px-2.5 py-1.5 rounded border border-border/30 hover:border-accent/60 hover:bg-accent/5 text-fg-muted hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-bold"
            title={createMode === "template" ? "Save to collection" : "Create sub-collection"}
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
  const [navStack, setNavStack] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const currentCollection =
    navStack.length > 0
      ? findCollectionById(collections, navStack[navStack.length - 1])
      : null;

  const breadcrumbs = buildCrumbs(collections, navStack);

  function refresh() {
    setCollections(CollectionRepository.getAll());
  }

  function handleOpenCollection(col: TemplateCollection) {
    setNavStack((prev) => [...prev, col.id]);
  }

  function handleNavigateTo(index: number) {
    if (index < 0) setNavStack([]);
    else setNavStack((prev) => prev.slice(0, index + 1));
  }

  function handleCreateCollection(name: string) {
    CollectionRepository.create(name);
    refresh();
  }

  function handleCreateSubcollection(parentId: string, name: string) {
    CollectionRepository.create(name, parentId);
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
      setNavStack([imported.id]);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    }
  }

  function handleTemplateAdded(collectionId: string, template: DiagramTemplate) {
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
    setNavStack((prev) => {
      const idx = prev.indexOf(col.id);
      return idx >= 0 ? prev.slice(0, idx) : prev;
    });
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
          <button onClick={() => setImportError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {currentCollection ? (
        <CollectionView
          collection={currentCollection}
          breadcrumbs={breadcrumbs}
          currentCode={currentCode}
          currentViewMode={currentViewMode}
          onNavigateTo={handleNavigateTo}
          onOpenSubcollection={handleOpenCollection}
          onCreateSubcollection={handleCreateSubcollection}
          onTemplateAdded={handleTemplateAdded}
          onTemplateRemoved={handleTemplateRemoved}
          onExport={handleExport}
          onDelete={handleDelete}
        />
      ) : (
        <CollectionsView
          collections={collections}
          onOpen={handleOpenCollection}
          onImport={handleImportClick}
          onCreateCollection={handleCreateCollection}
        />
      )}
    </div>
  );
}
