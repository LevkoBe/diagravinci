import { useState, useEffect, useRef } from "react";
import { Plus, Check, Pencil, Trash2, X, RotateCcw } from "lucide-react";
import { DangerIconBtn } from "./DangerIconBtn";
import type {
  Selector,
  SelectorAtom,
  ElementTypeKey,
  AtomPresetMeta,
} from "../../domain/models/Selector";
import { emptyAtom } from "../../domain/models/Selector";
import { resolveAtomPath } from "../../domain/selector/SelectorPresets";
import { ELEMENT_SVGS } from "../ElementConfigs";

function ElementIcon({ type }: { type: string }) {
  const config = ELEMENT_SVGS[type as keyof typeof ELEMENT_SVGS];
  if (!config)
    return <span className="text-xs font-bold">{type[0].toUpperCase()}</span>;
  const vbMax = Math.max(config.viewBoxWidth, config.viewBoxHeight);
  return (
    <svg
      width={18}
      height={18}
      viewBox={`0 0 ${config.viewBoxWidth} ${config.viewBoxHeight}`}
      fill="none"
    >
      <path
        d={config.data}
        stroke="currentColor"
        strokeWidth={(vbMax / 18) * 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ELEMENT_TYPES: ElementTypeKey[] = [
  "object",
  "state",
  "function",
  "flow",
  "choice",
];
const PRESETS = ["raw", "name", "level"] as const;
type PresetKind = (typeof PRESETS)[number];

interface AtomDraft {
  id: string;
  types: ElementTypeKey[];
  preset: PresetKind;
  rawPath: string;
  nameValue: string;
  levelMin: number;
  levelMax: number;
}

function freshDraft(): AtomDraft {
  return {
    id: emptyAtom().id,
    types: [],
    preset: "raw",
    rawPath: "",
    nameValue: "",
    levelMin: 1,
    levelMax: 1,
  };
}

function draftFromAtom(atom: SelectorAtom): AtomDraft {
  return {
    id: atom.id,
    types: [...atom.types],
    preset: atom.meta.kind,
    rawPath: atom.meta.kind === "raw" ? atom.path : "",
    nameValue: atom.meta.kind === "name" ? atom.meta.name : "",
    levelMin: atom.meta.kind === "level" ? atom.meta.min : 1,
    levelMax: atom.meta.kind === "level" ? atom.meta.max : 1,
  };
}

function draftToAtom(draft: AtomDraft): SelectorAtom {
  let meta: AtomPresetMeta;
  if (draft.preset === "name") meta = { kind: "name", name: draft.nameValue };
  else if (draft.preset === "level")
    meta = {
      kind: "level",
      min: draft.levelMin,
      max: Math.max(draft.levelMin, draft.levelMax),
    };
  else meta = { kind: "raw" };
  return {
    id: draft.id,
    types: draft.types,
    path: resolveAtomPath(meta, draft.rawPath),
    meta,
  };
}

function isDraftValid(draft: AtomDraft): boolean {
  if (draft.types.length > 0) return true;
  if (draft.preset === "raw") return !!draft.rawPath.trim();
  if (draft.preset === "name") return !!draft.nameValue.trim();
  if (draft.preset === "level") return true;
  return false;
}

function AtomRow({
  atom,
  index,
  isEditing,
  onEdit,
  onDelete,
}: {
  atom: SelectorAtom;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const presetLabel =
    atom.meta.kind === "name"
      ? `name: "${atom.meta.name}"`
      : atom.meta.kind === "level"
        ? `lvl ${atom.meta.min}–${atom.meta.max}`
        : atom.path || "*";

  return (
    <div
      className={[
        "flex items-center gap-2 px-2 py-1.5 rounded-md border text-sm",
        isEditing
          ? "border-accent/70 bg-accent/8"
          : "border-border/30 bg-bg-elevated/50",
      ].join(" ")}
    >
      <span className="text-[10px] font-bold text-fg-disabled/60 w-4 select-none shrink-0">
        {index}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        {atom.types.length === 0 ? (
          <span className="text-[10px] text-fg-disabled/50 italic">all</span>
        ) : (
          atom.types.map((t) => (
            <span key={t} className="opacity-70 flex items-center" title={t}>
              <ElementIcon type={t} />
            </span>
          ))
        )}
      </div>
      <code className="flex-1 text-[11px] truncate text-fg-muted font-mono">
        {presetLabel}
      </code>
      <button title="Edit" onClick={onEdit} className="btn-icon p-1!">
        <Pencil size={11} />
      </button>
      <DangerIconBtn title="Delete" onClick={onDelete} className="p-1!">
        <Trash2 size={11} />
      </DangerIconBtn>
    </div>
  );
}

export interface SelectorEditorProps {
  selector: Selector;
  onChange: (selector: Selector) => void;
}

export function SelectorEditor({ selector, onChange }: SelectorEditorProps) {
  const [draft, setDraft] = useState<AtomDraft>(freshDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  const update = (partial: Partial<Selector>) =>
    onChange({ ...selector, ...partial });

  const toggleType = (type: ElementTypeKey) =>
    setDraft((d) => ({
      ...d,
      types: d.types.includes(type)
        ? d.types.filter((t) => t !== type)
        : [...d.types, type],
    }));

  const handleCommit = () => {
    if (!isDraftValid(draft)) return;
    const atom = draftToAtom(draft);
    if (editingId) {
      update({
        atoms: selector.atoms.map((a) => (a.id === editingId ? atom : a)),
      });
      setEditingId(null);
    } else {
      update({ atoms: [...selector.atoms, atom] });
    }
    setDraft(freshDraft());
  };

  const handleEdit = (atom: SelectorAtom) => {
    setDraft(draftFromAtom(atom));
    setEditingId(atom.id);
  };

  const handleDelete = (id: string) => {
    const idx = selector.atoms.findIndex((a) => a.id === id);
    const atoms = selector.atoms.filter((a) => a.id !== id);
    const combiner = shiftCombiner(
      selector.combiner,
      idx + 1,
      selector.atoms.length,
    );
    update({ atoms, combiner });
    if (editingId === id) {
      setEditingId(null);
      setDraft(freshDraft());
    }
  };

  const handleDefaultCombiner = () =>
    update({ combiner: selector.atoms.map((_, i) => i + 1).join(" or ") });

  const valid = isDraftValid(draft);

  const renderPresetInput = () => {
    if (draft.preset === "name")
      return (
        <input
          ref={inputRef}
          type="text"
          value={draft.nameValue}
          onChange={(e) =>
            setDraft((d) => ({ ...d, nameValue: e.target.value }))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) handleCommit();
            if (e.key === "Escape") cancelEdit();
          }}
          placeholder="element name substring"
          className="flex-1 bg-bg-elevated/60 border border-border/30 rounded-md px-2 py-1 text-xs font-mono text-fg-primary placeholder:text-fg-disabled/40 focus:outline-none focus:border-accent/60"
        />
      );
    if (draft.preset === "level")
      return (
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[10px] text-fg-disabled/60">lvl</span>
          <input
            type="number"
            min={1}
            value={draft.levelMin}
            onChange={(e) =>
              setDraft((d) => ({ ...d, levelMin: +e.target.value }))
            }
            className="w-12 bg-bg-elevated/60 border border-border/30 rounded px-1.5 py-1 text-xs font-mono text-center focus:outline-none focus:border-accent/60"
          />
          <span className="text-[10px] text-fg-disabled/60">–</span>
          <input
            type="number"
            min={draft.levelMin}
            value={draft.levelMax}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                levelMax: Math.max(d.levelMin, +e.target.value),
              }))
            }
            className="w-12 bg-bg-elevated/60 border border-border/30 rounded px-1.5 py-1 text-xs font-mono text-center focus:outline-none focus:border-accent/60"
          />
        </div>
      );
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft.rawPath}
        onChange={(e) => setDraft((d) => ({ ...d, rawPath: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valid) handleCommit();
          if (e.key === "Escape") cancelEdit();
        }}
        placeholder="regex  (e.g. .*foo.*, empty = all)"
        className="flex-1 bg-bg-elevated/60 border border-border/30 rounded-md px-2 py-1 text-xs font-mono text-fg-primary placeholder:text-fg-disabled/40 focus:outline-none focus:border-accent/60"
      />
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(freshDraft());
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 pt-4 pb-3 border-b border-border/20">
        <p className="text-[10px] font-bold text-accent/70 tracking-widest uppercase mb-2 select-none">
          {editingId ? "Edit Atom" : "Add Atom"}
        </p>

        <div className="flex items-center gap-1 mb-2">
          <span className="text-[10px] text-fg-disabled/60 w-10 select-none">
            Types
          </span>
          {ELEMENT_TYPES.map((type) => (
            <button
              key={type}
              title={type}
              onClick={() => toggleType(type)}
              className={[
                "btn-icon p-1!",
                draft.types.includes(type) ? "active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <ElementIcon type={type} />
            </button>
          ))}
          {draft.types.length > 0 && (
            <button
              title="Clear"
              onClick={() => setDraft((d) => ({ ...d, types: [] }))}
              className="btn-icon p-1! ml-1 opacity-50 hover:opacity-100"
            >
              <X size={10} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 mb-2">
          <span className="text-[10px] text-fg-disabled/60 w-10 select-none">
            Preset
          </span>
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setDraft((d) => ({ ...d, preset: p }))}
              className={[
                "btn-icon px-2! py-0.5! text-[10px]",
                draft.preset === p ? "active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-fg-disabled/60 w-10 select-none shrink-0">
            {draft.preset === "name"
              ? "Name"
              : draft.preset === "level"
                ? "Depth"
                : "Path"}
          </span>
          {renderPresetInput()}
        </div>

        <div className="flex justify-end items-center gap-1.5 mt-2">
          {editingId && (
            <button
              onClick={cancelEdit}
              className="btn-icon px-2! py-1! text-[11px] gap-1"
            >
              <X size={11} />
              <span>Cancel</span>
            </button>
          )}
          <button
            disabled={!valid}
            onClick={handleCommit}
            className={[
              "btn-icon px-2! py-1! text-[11px] gap-1",
              valid ? "active" : "opacity-40 cursor-not-allowed",
            ].join(" ")}
          >
            {editingId ? (
              <>
                <Check size={11} />
                <span>Save</span>
              </>
            ) : (
              <>
                <Plus size={11} />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-3 border-b border-border/20">
        <p className="text-[10px] font-bold text-accent/70 tracking-widest uppercase mb-2 select-none">
          Atoms
        </p>
        {selector.atoms.length === 0 ? (
          <p className="text-[11px] text-fg-disabled/50 italic py-1">
            No atoms yet — add one above.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {selector.atoms.map((atom, i) => (
              <AtomRow
                key={atom.id}
                atom={atom}
                index={i + 1}
                isEditing={editingId === atom.id}
                onEdit={() => handleEdit(atom)}
                onDelete={() => handleDelete(atom.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-accent/70 tracking-widest uppercase select-none">
            Combiner
          </p>
          {selector.atoms.length > 0 && (
            <button
              title="Reset to default (1 or 2 or …)"
              onClick={handleDefaultCombiner}
              className="btn-icon p-1! gap-0.5 opacity-60 hover:opacity-100"
            >
              <RotateCcw size={10} />
              <span className="text-[9px]">default</span>
            </button>
          )}
        </div>
        {selector.atoms.length > 0 && (
          <p className="text-[10px] text-fg-disabled/50 mb-1.5 font-mono">
            {selector.atoms.map((_, i) => (
              <span key={i} className="text-accent/70 mr-1">
                {i + 1}
              </span>
            ))}
            ·{" "}
            <span className="text-fg-muted">
              and · or · xor · not · ( )
            </span>
          </p>
        )}
        <input
          type="text"
          value={selector.combiner}
          onChange={(e) => update({ combiner: e.target.value })}
          disabled={selector.atoms.length === 0}
          placeholder={
            selector.atoms.length === 0
              ? "Add atoms above first"
              : "e.g.  1  ·  1 or 2  ·  (1 xor 2) and not 3"
          }
          className="w-full bg-bg-elevated/60 border border-border/30 rounded-md px-2.5 py-1.5 text-xs font-mono text-fg-primary placeholder:text-fg-disabled/40 focus:outline-none focus:border-accent/60 disabled:opacity-40"
        />
      </div>
    </div>
  );
}

function shiftCombiner(
  combiner: string,
  deletedNum: number,
  oldTotal: number,
): string {
  return combiner
    .replace(/\b(\d+)\b/g, (_, n) => {
      const num = +n;
      if (num === deletedNum) return "0";
      if (num > deletedNum && num <= oldTotal) return String(num - 1);
      return n;
    })
    .replace(/\bnot\s+0\b/g, "")
    .replace(/\b0\b/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\bnot\s+(and|or|xor)\b/gi, "$1")
    .replace(/\b(and|or|xor)\s+not\s*$/gi, "")
    .replace(/\b(and|or|xor)\s+(and|or|xor)\b/gi, "$2")
    .replace(/^\s*(and|or|xor)\s*/i, "")
    .replace(/\s*(and|or|xor)\s*$/i, "")
    .replace(/^\s*not\s*$/i, "")
    .trim();
}
