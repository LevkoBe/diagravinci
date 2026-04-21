import { useState } from "react";
import { Plus, Check, Pencil, Trash2, X, RotateCcw } from "lucide-react";
import { DangerIconBtn } from "./DangerIconBtn";
import type {
  Selector,
  SelectorAtom,
  ElementTypeKey,
} from "../../domain/models/Selector";

const ELEMENT_TYPES: ElementTypeKey[] = [
  "object",
  "state",
  "function",
  "flow",
  "choice",
  "collection",
];
const PATTERN_SUFFIXES = ["path", "name", "level"] as const;
type PatternSuffix = (typeof PATTERN_SUFFIXES)[number];
type PatternType = "all" | ElementTypeKey;

interface PatternRow {
  type: PatternType;
  suffix: PatternSuffix;
  value: string;
}

interface AtomDraft {
  id: string;
  name: string;
  patterns: PatternRow[];
}

function freshAtomDraft(): AtomDraft {
  return { id: "", name: "", patterns: [] };
}

function atomToPatterns(rows: PatternRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const key = r.suffix === "path" ? r.type : `${r.type}_${r.suffix}`;
    out[key] = r.value;
  }
  return out;
}

function atomFromModel(atom: SelectorAtom): AtomDraft {
  const patterns: PatternRow[] = Object.entries(atom.patterns).map(
    ([key, value]) => {
      const underIdx = key.lastIndexOf("_");
      let type: PatternType;
      let suffix: PatternSuffix;
      if (underIdx > 0) {
        const potSuffix = key.slice(underIdx + 1);
        if (potSuffix === "name" || potSuffix === "level") {
          type = key.slice(0, underIdx) as PatternType;
          suffix = potSuffix;
        } else {
          type = key as PatternType;
          suffix = "path";
        }
      } else {
        type = key as PatternType;
        suffix = "path";
      }
      return { type, suffix, value };
    },
  );
  return { id: atom.id, name: atom.name ?? "", patterns };
}

function AtomRow({
  atom,
  isEditing,
  onEdit,
  onDelete,
}: {
  atom: SelectorAtom;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const patternSummary =
    Object.entries(atom.patterns)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ") || "—";

  return (
    <div
      className={[
        "flex items-center gap-2 px-2 py-1.5 rounded-md border text-sm",
        isEditing
          ? "border-accent/70 bg-accent/8"
          : "border-border/30 bg-bg-elevated/50",
      ].join(" ")}
    >
      <span className="text-[10px] font-bold text-accent/80 w-10 shrink-0 select-none font-mono">
        {atom.id}
      </span>
      {atom.name && (
        <span className="text-[11px] text-fg-muted shrink-0">{atom.name}</span>
      )}
      <code className="flex-1 text-[10px] truncate text-fg-disabled font-mono">
        {patternSummary}
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

function PatternRowEditor({
  row,
  onChange,
  onDelete,
}: {
  row: PatternRow;
  onChange: (r: PatternRow) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={row.type}
        onChange={(e) =>
          onChange({ ...row, type: e.target.value as PatternType })
        }
        className="bg-bg-elevated/60 border border-border/30 rounded px-1.5 py-1 text-[10px] font-mono text-fg-primary focus:outline-none focus:border-accent/60"
      >
        <option value="all">all</option>
        {ELEMENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        value={row.suffix}
        onChange={(e) =>
          onChange({ ...row, suffix: e.target.value as PatternSuffix })
        }
        className="bg-bg-elevated/60 border border-border/30 rounded px-1.5 py-1 text-[10px] font-mono text-fg-primary focus:outline-none focus:border-accent/60"
      >
        {PATTERN_SUFFIXES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={row.value}
        onChange={(e) => onChange({ ...row, value: e.target.value })}
        placeholder={
          row.suffix === "level"
            ? "e.g. 2-4"
            : row.suffix === "name"
              ? "name regex"
              : "path regex"
        }
        className="flex-1 bg-bg-elevated/60 border border-border/30 rounded-md px-2 py-1 text-[10px] font-mono text-fg-primary placeholder:text-fg-disabled/40 focus:outline-none focus:border-accent/60"
      />

      <DangerIconBtn
        title="Remove"
        onClick={onDelete}
        className="p-1! shrink-0"
      >
        <X size={10} />
      </DangerIconBtn>
    </div>
  );
}

export interface SelectorEditorProps {
  selector: Selector;
  atoms: SelectorAtom[];
  onChange: (selector: Selector) => void;
  onAtomSave: (atom: SelectorAtom) => void;
  onAtomDelete: (id: string) => void;
}

export function SelectorEditor({
  selector,
  atoms,
  onChange,
  onAtomSave,
  onAtomDelete,
}: SelectorEditorProps) {
  const [draft, setDraft] = useState<AtomDraft>(freshAtomDraft);
  const [editingAtomId, setEditingAtomId] = useState<string | null>(null);

  const handleCommitAtom = () => {
    if (!draft.id.trim()) return;
    const atom: SelectorAtom = {
      id: draft.id.trim(),
      ...(draft.name.trim() ? { name: draft.name.trim() } : {}),
      patterns: atomToPatterns(draft.patterns),
    };
    onAtomSave(atom);
    setDraft(freshAtomDraft());
    setEditingAtomId(null);
  };

  const handleEditAtom = (atom: SelectorAtom) => {
    setDraft(atomFromModel(atom));
    setEditingAtomId(atom.id);
  };

  const cancelAtomEdit = () => {
    setDraft(freshAtomDraft());
    setEditingAtomId(null);
  };

  const addPatternRow = () =>
    setDraft((d) => ({
      ...d,
      patterns: [...d.patterns, { type: "all", suffix: "path", value: "" }],
    }));

  const updatePatternRow = (i: number, row: PatternRow) =>
    setDraft((d) => {
      const patterns = [...d.patterns];
      patterns[i] = row;
      return { ...d, patterns };
    });

  const deletePatternRow = (i: number) =>
    setDraft((d) => ({ ...d, patterns: d.patterns.filter((_, j) => j !== i) }));

  const insertAtomId = (id: string) =>
    onChange({
      ...selector,
      combiner: selector.combiner ? `${selector.combiner} + ${id}` : id,
    });

  const resetCombiner = () =>
    onChange({ ...selector, combiner: atoms.map((a) => a.id).join(" + ") });

  const draftValid = !!draft.id.trim();

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 pt-4 pb-3 border-b border-border/20">
        <p className="text-[10px] font-bold text-accent/70 tracking-widest uppercase mb-2 select-none">
          {editingAtomId ? "Edit Atom" : "New Atom"}
        </p>

        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
            placeholder="id (e.g. 1 or sel_atom)"
            className="w-32 bg-bg-elevated/60 border border-border/30 rounded-md px-2 py-1 text-[11px] font-mono text-fg-primary placeholder:text-fg-disabled/40 focus:outline-none focus:border-accent/60"
          />
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="name (optional)"
            className="flex-1 bg-bg-elevated/60 border border-border/30 rounded-md px-2 py-1 text-[11px] text-fg-muted placeholder:text-fg-disabled/40 focus:outline-none focus:border-accent/60"
          />
        </div>

        <div className="flex flex-col gap-1 mb-2">
          {draft.patterns.map((row, i) => (
            <PatternRowEditor
              key={i}
              row={row}
              onChange={(r) => updatePatternRow(i, r)}
              onDelete={() => deletePatternRow(i)}
            />
          ))}
          <button
            onClick={addPatternRow}
            className="btn-icon px-2! py-0.5! text-[10px] gap-1 self-start opacity-70 hover:opacity-100"
          >
            <Plus size={10} />
            <span>pattern</span>
          </button>
        </div>

        <div className="flex justify-end items-center gap-1.5 mt-1">
          {editingAtomId && (
            <button
              onClick={cancelAtomEdit}
              className="btn-icon px-2! py-1! text-[11px] gap-1"
            >
              <X size={11} />
              <span>Cancel</span>
            </button>
          )}
          <button
            disabled={!draftValid}
            onClick={handleCommitAtom}
            className={[
              "btn-icon px-2! py-1! text-[11px] gap-1",
              draftValid ? "active" : "opacity-40 cursor-not-allowed",
            ].join(" ")}
          >
            <Check size={11} />
            <span>{editingAtomId ? "Save" : "Add"}</span>
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-3 border-b border-border/20">
        <p className="text-[10px] font-bold text-accent/70 tracking-widest uppercase mb-2 select-none">
          Atoms
        </p>
        {atoms.length === 0 ? (
          <p className="text-[11px] text-fg-disabled/50 italic py-1">
            No atoms yet.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {atoms.map((atom) => (
              <AtomRow
                key={atom.id}
                atom={atom}
                isEditing={editingAtomId === atom.id}
                onEdit={() => handleEditAtom(atom)}
                onDelete={() => onAtomDelete(atom.id)}
              />
            ))}
          </div>
        )}
        {atoms.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {atoms.map((a) => (
              <button
                key={a.id}
                onClick={() => insertAtomId(a.id)}
                title={`Insert "${a.id}" into combiner`}
                className="btn-icon px-1.5! py-0.5! text-[10px] font-mono gap-0.5"
              >
                <span className="text-accent/80">{a.id}</span>
                {a.name && (
                  <span className="text-fg-disabled/60">({a.name})</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-accent/70 tracking-widest uppercase select-none">
            Combiner
          </p>
          {atoms.length > 0 && (
            <button
              title="Reset to OR of all atoms"
              onClick={resetCombiner}
              className="btn-icon p-1! gap-0.5 opacity-60 hover:opacity-100"
            >
              <RotateCcw size={10} />
              <span className="text-[9px]">default</span>
            </button>
          )}
        </div>
        <p className="text-[10px] text-fg-disabled/50 mb-1.5 font-mono">
          <span className="text-fg-muted">
            +&nbsp;(or)&nbsp; &amp;&nbsp;(and)&nbsp; -&nbsp;(not)&nbsp; ( )
          </span>
          {atoms.length > 0 && (
            <span className="ml-2 text-fg-disabled/40">
              · click atoms above to insert
            </span>
          )}
        </p>
        <input
          type="text"
          value={selector.combiner}
          onChange={(e) => onChange({ ...selector, combiner: e.target.value })}
          placeholder={
            atoms.length === 0
              ? "Define atoms above, then write combiner"
              : "e.g.  1  ·  1 + 2  ·  (1 + 3) & -2"
          }
          className="w-full bg-bg-elevated/60 border border-border/30 rounded-md px-2.5 py-1.5 text-xs font-mono text-fg-primary placeholder:text-fg-disabled/40 focus:outline-none focus:border-accent/60"
        />
        <p className="text-[9px] text-fg-disabled/40 mt-1">
          Empty combiner = flag-only matching (elements tagged :name)
        </p>
      </div>
    </div>
  );
}
