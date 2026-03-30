import { useRef, useState } from "react";
import {
  Trash2,
  X,
  Check,
  Download,
  Upload,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  closeFilterModal,
  addPreset,
  updatePreset,
  removePreset,
  togglePresetActive,
  setPresetMode,
  movePresetUp,
  movePresetDown,
} from "../../application/store/filterSlice";
import {
  emptySelector,
  FOLD_PRESET_ID,
  type FilterMode,
  type FilterPreset,
} from "../../domain/models/Selector";
import { SelectorEditor } from "./SelectorEditor";

const MODE_CYCLE: FilterMode[] = ["color", "dim", "hide"];

const PALETTE = [
  "#e05c5c",
  "#e07a2f",
  "#d4a017",
  "#5cb85c",
  "#2f9ee0",
  "#7b5ce0",
  "#d45cb8",
  "#5ce0c8",
];

function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

function freshDraft(): FilterPreset {
  return {
    id: crypto.randomUUID(),
    label: "New preset",
    selector: emptySelector(),
    mode: "color",
    isActive: false,
    color: randomColor(),
  };
}

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function PresetRow({
  preset,
  isEditing,
  isFirst,
  isLast,
  onEdit,
}: {
  preset: FilterPreset;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const dispatch = useAppDispatch();
  const nextMode = (m: FilterMode): FilterMode =>
    MODE_CYCLE[(MODE_CYCLE.indexOf(m) + 1) % MODE_CYCLE.length];

  return (
    <div
      onClick={onEdit}
      className={[
        "flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
        isEditing
          ? "border-accent/60 bg-accent/10"
          : "border-fg-ternary/30 bg-bg-secondary/40 hover:bg-bg-secondary/70",
      ].join(" ")}
    >
      {/* Reorder */}
      <div className="flex flex-col shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch(movePresetUp(preset.id));
          }}
          disabled={isFirst}
          className="btn-icon p-0.5! disabled:opacity-20"
          title="Move up"
        >
          <ChevronUp size={11} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch(movePresetDown(preset.id));
          }}
          disabled={isLast}
          className="btn-icon p-0.5! disabled:opacity-20"
          title="Move down"
        >
          <ChevronDown size={11} />
        </button>
      </div>

      {/* Active toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          dispatch(togglePresetActive(preset.id));
        }}
        className="shrink-0 w-8 h-5 rounded-md border flex items-center justify-center transition-colors"
        style={{
          background: preset.isActive ? "var(--color-accent)" : "transparent",
          borderColor: preset.isActive
            ? "var(--color-accent)"
            : "var(--color-fg-ternary)",
        }}
        title={preset.isActive ? "Deactivate" : "Activate"}
      >
        {preset.isActive && (
          <Check size={11} style={{ color: "var(--color-bg-primary)" }} />
        )}
      </button>

      {/* Color dot */}
      <div
        className="shrink-0 w-3.5 h-3.5 rounded-full border border-black/20"
        style={{ background: preset.color }}
        title="Selector color"
      />

      <span className="flex-1 text-sm font-medium text-fg-primary truncate">
        {preset.label}
      </span>

      {/* Mode cycle button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          dispatch(
            setPresetMode({ id: preset.id, mode: nextMode(preset.mode) }),
          );
        }}
        className={[
          "rounded-md px-2.5 py-1 text-xs font-semibold border transition-colors shrink-0",
          preset.mode === "hide"
            ? "border-fg-ternary/50 text-fg-secondary bg-transparent hover:border-fg-secondary"
            : preset.mode === "dim"
              ? "border-accent/50 text-accent bg-accent/10 hover:border-accent"
              : "border-black/20 text-bg-primary hover:opacity-80",
        ].join(" ")}
        style={
          preset.mode === "color"
            ? { background: preset.color, borderColor: preset.color }
            : {}
        }
        title={`Mode: ${preset.mode} — click to cycle`}
      >
        {preset.mode}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          dispatch(removePreset(preset.id));
        }}
        className="btn-icon danger p-1.5! shrink-0"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function FilterModal() {
  const dispatch = useAppDispatch();
  const { presets } = useAppSelector((s) => s.filter);
  const importRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<FilterPreset>(() => freshDraft());
  const [editingId, setEditingId] = useState<string | null>(null);

  const visiblePresets = presets.filter((p) => p.id !== FOLD_PRESET_ID);
  const isNew = editingId === null;

  const handleEdit = (preset: FilterPreset) => {
    setEditingId(preset.id);
    setDraft({
      ...preset,
      selector: { ...preset.selector, atoms: [...preset.selector.atoms] },
    });
  };

  const handleSave = () => {
    if (isNew) {
      dispatch(addPreset(draft));
      setDraft(freshDraft());
    } else {
      dispatch(updatePreset(draft));
      setEditingId(null);
      setDraft(freshDraft());
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setDraft(freshDraft());
  };

  const handleExportPresets = () => {
    trigger(
      new Blob([JSON.stringify(visiblePresets, null, 2)], {
        type: "application/json",
      }),
      "selector_presets.json",
    );
  };

  const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) return;
        for (const p of parsed) {
          if (typeof p.label === "string" && p.selector) {
            dispatch(addPreset({ ...p, id: crypto.randomUUID() }));
          }
        }
      } catch {
        console.error("Invalid presets file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dispatch(closeFilterModal());
      }}
    >
      <div className="bg-bg-primary border border-fg-ternary/40 rounded-xl shadow-2xl w-165 max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-fg-ternary/30 shrink-0">
          <span className="font-semibold text-lg text-fg-primary">
            Selector Presets
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPresets}
              className="btn-icon p-1.5!"
              title="Export presets"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="btn-icon p-1.5!"
              title="Import presets"
            >
              <Upload size={14} />
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportPresets}
            />
            <button
              onClick={() => dispatch(closeFilterModal())}
              className="btn-icon p-1.5!"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {visiblePresets.length > 0 && (
            <div className="flex flex-col gap-2 px-6 py-4 border-b border-fg-ternary/20">
              {visiblePresets.map((preset, i) => (
                <PresetRow
                  key={preset.id}
                  preset={preset}
                  isEditing={preset.id === editingId}
                  isFirst={i === 0}
                  isLast={i === visiblePresets.length - 1}
                  onEdit={() => handleEdit(preset)}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-3 px-6 py-3.5 border-b border-fg-ternary/20 bg-accent/4 shrink-0">
              <input
                type="text"
                value={draft.label}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, label: e.target.value }))
                }
                className="flex-1 bg-transparent text-sm font-semibold text-fg-primary focus:outline-none placeholder:text-fg-ternary/60"
                placeholder="Preset name"
              />
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, color: e.target.value }))
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Pick color"
                  />
                  <div
                    className="w-6 h-6 rounded-full border-2 border-fg-ternary/40 cursor-pointer shrink-0"
                    style={{ background: draft.color }}
                    title="Pick color"
                  />
                </div>
                <button
                  onClick={handleSave}
                  className="rounded-lg px-4 py-1.5 text-sm font-semibold bg-accent text-bg-primary hover:bg-accent/85 transition-colors flex items-center gap-1.5"
                >
                  <Check size={13} />
                  {isNew ? "Create" : "Save"}
                </button>
                {!isNew && (
                  <button
                    onClick={handleCancel}
                    className="rounded-lg px-4 py-1.5 text-sm font-medium border border-fg-ternary/40 text-fg-secondary hover:bg-fg-ternary/10 transition-colors flex items-center gap-1.5"
                  >
                    <X size={13} />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <SelectorEditor
              selector={draft.selector}
              onChange={(sel) => setDraft((d) => ({ ...d, selector: sel }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
