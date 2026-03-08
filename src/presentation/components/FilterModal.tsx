import { useState, useCallback } from "react";
import { X, RotateCcw, Check, Pencil, Trash2 } from "lucide-react";
import type { ElementType } from "../../domain/models/Element";
import {
  addRule,
  setCombiner,
  updateRule,
  removeRule,
} from "../../application/store/filterSlice";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import type {
  FilterRule,
  ElementTypeName,
} from "../../domain/models/FilterRule";
import { ELEMENT_SVGS } from "../ElementConfigs";

const ALL_TYPES: ElementType[] = [
  "object",
  "state",
  "function",
  "flow",
  "choice",
];

function newRule(): FilterRule {
  return { id: crypto.randomUUID(), types: [], path: "" };
}

function autoCombiner(count: number): string {
  return Array.from({ length: count }, (_, i) => i + 1).join(" or ");
}

function isAutoGenCombiner(combiner: string, ruleCount: number): boolean {
  return combiner === "" || combiner === autoCombiner(ruleCount);
}

function ElementIcon({ type }: { type: string }) {
  const config = ELEMENT_SVGS[type as keyof typeof ELEMENT_SVGS];
  if (!config)
    return <span className="text-xs font-bold">{type[0].toUpperCase()}</span>;
  const vbMax = Math.max(config.viewBoxWidth, config.viewBoxHeight);
  const displaySize = 18;
  const scaledStroke = (vbMax / displaySize) * 1.5;
  return (
    <svg
      width={displaySize}
      height={displaySize}
      viewBox={`0 0 ${config.viewBoxWidth} ${config.viewBoxHeight}`}
      fill="none"
    >
      <path
        d={config.data}
        stroke="currentColor"
        strokeWidth={scaledStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest text-fg-ternary/70 select-none">
      {children}
    </span>
  );
}

function Btn({
  children,
  active,
  danger,
  title,
  small,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  title?: string;
  small?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={[
        "btn-icon",
        active ? "active" : "",
        danger ? "danger" : "",
        small ? "p-1!" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

function RuleEditor({
  draft,
  isEditing,
  onChange,
  onConfirm,
  onCancel,
}: {
  draft: FilterRule;
  isEditing: boolean;
  onChange: (r: FilterRule) => void;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  const toggleType = (type: ElementTypeName) =>
    onChange({
      ...draft,
      types: draft.types.includes(type)
        ? draft.types.filter((t) => t !== type)
        : [...draft.types, type],
    });

  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>{isEditing ? "Edit Rule" : "Add Rule"}</SectionLabel>

      <div className="flex items-center gap-1 flex-wrap">
        {ALL_TYPES.map((type) => (
          <Btn
            key={type}
            title={type}
            active={draft.types.includes(type)}
            onClick={() => toggleType(type)}
          >
            <ElementIcon type={type} />
          </Btn>
        ))}
        {draft.types.length === 0 && (
          <span className="text-[10px] text-fg-ternary/60 ml-1 select-none">
            all types
          </span>
        )}
      </div>

      <input
        type="text"
        placeholder='path regex  (empty = match all,  e.g.  ".*foo.*")'
        value={draft.path}
        onChange={(e) => onChange({ ...draft, path: e.target.value })}
        className="text-xs bg-bg-secondary border border-fg-ternary/25 rounded-md px-3 py-1.5 text-fg-primary placeholder:text-fg-ternary/40 outline-none focus:border-accent/50 font-mono"
      />

      <div className="flex items-center gap-1.5 justify-end">
        {isEditing && onCancel && (
          <button
            onClick={onCancel}
            className="text-[10px] text-fg-ternary hover:text-fg-secondary px-2 py-1 rounded select-none"
          >
            cancel
          </button>
        )}
        <Btn
          title={isEditing ? "Save changes" : "Add rule"}
          onClick={onConfirm}
        >
          {isEditing ? (
            <Check size={13} />
          ) : (
            <span className="text-sm font-bold leading-none">+</span>
          )}
        </Btn>
      </div>
    </div>
  );
}

export function FilterModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { rules, combiner } = useAppSelector((s) => s.filter);

  const [draft, setDraft] = useState<FilterRule>(newRule);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reapply = useCallback(() => {
    import("../../application/store/store").then(({ syncManager }) =>
      syncManager.reapplyFilter(),
    );
  }, []);

  const handleAdd = () => {
    dispatch(addRule(draft));
    if (isAutoGenCombiner(combiner, rules.length)) {
      dispatch(setCombiner(autoCombiner(rules.length + 1)));
    }
    setDraft(newRule());
    reapply();
  };

  const handleSaveEdit = () => {
    dispatch(updateRule(draft));
    setDraft(newRule());
    setEditingId(null);
    reapply();
  };

  const handleEdit = (rule: FilterRule) => {
    setDraft({ ...rule });
    setEditingId(rule.id);
  };

  const handleCancelEdit = () => {
    setDraft(newRule());
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    dispatch(removeRule(id));
    reapply();
  };

  const handleCombinerChange = (val: string) => {
    dispatch(setCombiner(val));
    reapply();
  };

  const handleResetCombiner = () => {
    dispatch(setCombiner(autoCombiner(rules.length)));
    reapply();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-primary border border-fg-ternary/30 rounded-xl w-120 max-h-[80vh] overflow-y-auto shadow-2xl flex flex-col gap-0">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-fg-ternary/15">
          <span className="text-xs font-bold uppercase tracking-widest text-fg-primary">
            Filter Rules
          </span>
          <Btn title="Close" onClick={onClose}>
            <X size={14} />
          </Btn>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="p-3 rounded-lg border border-fg-ternary/20 bg-bg-secondary/20">
            <RuleEditor
              draft={draft}
              isEditing={editingId !== null}
              onChange={setDraft}
              onConfirm={editingId ? handleSaveEdit : handleAdd}
              onCancel={editingId ? handleCancelEdit : undefined}
            />
          </div>
          {rules.length > 0 && (
            <div className="flex flex-col gap-1 p-3 rounded-lg border border-fg-ternary/20">
              <SectionLabel>Rules</SectionLabel>
              <div className="flex flex-col gap-1 mt-1.5">
                {rules.map((rule, i) => (
                  <div
                    key={rule.id}
                    className={[
                      "flex items-center gap-2 px-2 py-1.5 rounded-md",
                      editingId === rule.id
                        ? "bg-accent/8 border border-accent/25"
                        : "hover:bg-bg-secondary/40",
                    ].join(" ")}
                  >
                    <span className="text-[11px] text-fg-ternary w-4 shrink-0 select-none font-mono">
                      {i + 1}.
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {rule.types.length === 0 ? (
                        <span className="text-[10px] text-fg-ternary/60 select-none">
                          all
                        </span>
                      ) : (
                        rule.types.map((t) => (
                          <span
                            key={t}
                            className="text-fg-secondary opacity-70"
                          >
                            <ElementIcon type={t} />
                          </span>
                        ))
                      )}
                    </div>

                    <span className="flex-1 min-w-0 text-[11px] font-mono text-fg-secondary truncate">
                      {rule.path || (
                        <span className="text-fg-ternary/50 italic">*</span>
                      )}
                    </span>

                    <Btn
                      title="Edit"
                      small
                      active={editingId === rule.id}
                      onClick={() =>
                        editingId === rule.id
                          ? handleCancelEdit()
                          : handleEdit(rule)
                      }
                    >
                      <Pencil size={11} />
                    </Btn>
                    <Btn
                      title="Delete"
                      small
                      danger
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 size={11} />
                    </Btn>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 p-3 rounded-lg border border-fg-ternary/20">
            <div className="flex items-center justify-between">
              <SectionLabel>Combiner</SectionLabel>
              <button
                title="Reset to auto"
                onClick={handleResetCombiner}
                className="flex items-center gap-1 text-[9px] text-fg-ternary/60 hover:text-fg-ternary transition-colors select-none"
              >
                <RotateCcw size={9} />
                auto
              </button>
            </div>
            <input
              type="text"
              value={combiner}
              onChange={(e) => handleCombinerChange(e.target.value)}
              placeholder={
                rules.length > 0
                  ? autoCombiner(rules.length)
                  : "e.g.  1 or (2 and not 3)"
              }
              className="text-xs bg-bg-secondary border border-fg-ternary/25 rounded-md px-3 py-1.5 text-fg-primary placeholder:text-fg-ternary/35 outline-none focus:border-accent/50 font-mono"
            />
            <p className="text-[9px] text-fg-ternary/50 leading-relaxed select-none">
              Reference rules by number. Operators:{" "}
              <code className="font-mono">and</code>,{" "}
              <code className="font-mono">or</code>,{" "}
              <code className="font-mono">not</code>, parentheses.
              <br />
              Empty → OR of all rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
