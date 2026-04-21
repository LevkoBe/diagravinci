import { useState } from "react";
import { useAppDispatch } from "../../application/store/hooks";
import { setViewMode } from "../../application/store/diagramSlice";
import { syncManager } from "../../application/store/store";
import {
  BUILT_IN_TEMPLATES,
  COMPLEX_TEMPLATES,
  type DiagramTemplate,
} from "../../domain/models/DiagramTemplate";
import type { ViewState } from "../../domain/models/ViewState";

const ALL_TEMPLATES = [...BUILT_IN_TEMPLATES, ...COMPLEX_TEMPLATES];

const VIEW_LABELS: Record<ViewState["viewMode"], string> = {
  circular: "Circular",
  basic: "Basic",
  hierarchical: "Hierarchical",
  timeline: "Timeline",
  pipeline: "Pipeline",
};

const VIEW_COLORS: Record<ViewState["viewMode"], string> = {
  circular: "bg-purple-500/15 text-purple-800",
  basic: "bg-fg-ternary/15 text-fg-secondary",
  hierarchical: "bg-blue-500/15 text-blue-800",
  timeline: "bg-amber-500/15 text-amber-800",
  pipeline: "bg-green-500/15 text-green-800",
};

function TemplateBadge({ mode }: { mode: ViewState["viewMode"] }) {
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${VIEW_COLORS[mode]}`}
    >
      {VIEW_LABELS[mode]}
    </span>
  );
}

function TemplateCard({
  template,
  onApply,
}: {
  template: DiagramTemplate;
  onApply: (t: DiagramTemplate) => void;
}) {
  return (
    <button
      className="w-full text-left p-3 rounded-lg border border-fg-ternary/30 hover:border-accent/60 hover:bg-accent/5 transition-all group"
      onClick={() => onApply(template)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-fg-primary group-hover:text-accent transition-colors leading-tight">
          {template.name}
        </span>
        <TemplateBadge mode={template.preferredView} />
      </div>
      <p className="text-xs text-fg-secondary leading-snug">
        {template.description}
      </p>
      <div className="flex flex-wrap gap-1 mt-2">
        {template.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded bg-fg-ternary/15 text-fg-ternary"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

export function TemplatePanel() {
  const [query, setQuery] = useState("");
  const dispatch = useAppDispatch();

  const filtered = ALL_TEMPLATES.filter((t) => {
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

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <p className="text-[11px] font-semibold text-fg-ternary uppercase tracking-wider mb-2">
          Templates
        </p>
        <input
          type="text"
          placeholder="Search templates…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-xs bg-bg-primary/60 border border-fg-ternary/30 rounded px-2 py-1.5 focus:outline-none focus:border-accent/60 text-fg-primary placeholder:text-fg-ternary"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 min-h-0">
        {filtered.length === 0 ? (
          <p className="text-xs text-fg-ternary text-center py-4">
            No templates match "{query}"
          </p>
        ) : (
          filtered.map((t) => (
            <TemplateCard key={t.id} template={t} onApply={applyTemplate} />
          ))
        )}
      </div>
    </div>
  );
}
