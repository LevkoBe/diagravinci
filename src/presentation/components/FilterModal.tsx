import { useState } from "react";
import { Trash2, X, Check } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  closeFilterModal,
  addPreset,
  updatePreset,
  removePreset,
  togglePresetActive,
  setPresetMode,
} from "../../application/store/filterSlice";
import {
  emptySelector,
  FOLD_PRESET_ID,
  type FilterPreset,
} from "../../domain/models/Selector";
import { SelectorEditor } from "./SelectorEditor";

function freshDraft(): FilterPreset {
  return {
    id: crypto.randomUUID(),
    label: "New preset",
    selector: emptySelector(),
    mode: "hide",
    isActive: false,
  };
}

function PresetRow({
  preset,
  isEditing,
  onEdit,
}: {
  preset: FilterPreset;
  isEditing: boolean;
  onEdit: () => void;
}) {
  const dispatch = useAppDispatch();
  return (
    <div
      onClick={onEdit}
      className={[
        "flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors",
        isEditing
          ? "border-accent/60 bg-accent/10"
          : "border-fg-ternary/30 bg-bg-secondary/40 hover:bg-bg-secondary/70",
      ].join(" ")}
    >
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

      <span className="flex-1 text-sm font-medium text-fg-primary truncate">
        {preset.label}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          dispatch(
            setPresetMode({
              id: preset.id,
              mode: preset.mode === "hide" ? "dim" : "hide",
            }),
          );
        }}
        className={[
          "rounded-md px-2.5 py-1 text-xs font-semibold border transition-colors shrink-0",
          preset.mode === "hide"
            ? "border-fg-ternary/50 text-fg-secondary bg-transparent hover:border-fg-secondary"
            : "border-accent/50 text-accent bg-accent/10 hover:border-accent",
        ].join(" ")}
        title={`Mode: ${preset.mode} — click to toggle`}
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
            Filter Presets
          </span>
          <button
            onClick={() => dispatch(closeFilterModal())}
            className="btn-icon p-1.5!"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {visiblePresets.length > 0 && (
            <div className="flex flex-col gap-2 px-6 py-4 border-b border-fg-ternary/20">
              {visiblePresets.map((preset) => (
                <PresetRow
                  key={preset.id}
                  preset={preset}
                  isEditing={preset.id === editingId}
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
