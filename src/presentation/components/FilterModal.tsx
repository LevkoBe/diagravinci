import { useRef, useState, useCallback } from "react";
import { Trash2, Plus, Check, Download, Upload, X, Pencil } from "lucide-react";
import { DangerIconBtn } from "./DangerIconBtn";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  addSelector,
  updateSelector,
  removeSelector,
} from "../../application/store/filterSlice";
import {
  FOLD_SELECTOR_ID,
  SELECTION_SELECTOR_ID,
  toSelectorId,
  type SelectorMode,
  type Selector,
  type Rule,
} from "../../domain/models/Selector";
import { AppConfig } from "../../config/appConfig";
import { store, syncManager } from "../../application/store/store";
import {
  upsertRuleInCode,
  removeRuleFromCode,
  upsertSelectorInCode,
  removeSelectorFromCode,
} from "../utils/selectorCodeUtils";

const PALETTE = AppConfig.ui.COLOR_PALETTE;
const MODES: SelectorMode[] = ["color", "dim", "hide", "off"];

const ELEMENT_TYPES = [
  { value: "all", label: "any type" },
  { value: "object", label: "object" },
  { value: "collection", label: "collection" },
  { value: "function", label: "function" },
  { value: "state", label: "state" },
  { value: "flow", label: "flow" },
  { value: "choice", label: "choice" },
] as const;

function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

function freshSelector(): Selector {
  return {
    id: "",
    label: "New selector",
    expression: "",
    mode: "color",
    color: randomColor(),
  };
}

type RuleType = "path" | "name" | "level";
type NameOp = "contains" | "matches";

interface RuleDraft {
  id: string;
  elementType: string;
  type: RuleType;
  nameOp: NameOp;
  value: string;
  levelMin: string;
  levelMax: string;
}

function freshRuleDraft(): RuleDraft {
  return {
    id: "",
    elementType: "all",
    type: "path",
    nameOp: "contains",
    value: "",
    levelMin: "1",
    levelMax: "1",
  };
}

function ruleToDraft(rule: Rule): RuleDraft {
  const firstKey = Object.keys(rule.patterns)[0] ?? "all";
  const firstValue = Object.values(rule.patterns)[0] ?? "";
  const underIdx = firstKey.lastIndexOf("_");

  let elementType = "all";
  let matchType: RuleType = "path";

  if (underIdx > 0) {
    const suffix = firstKey.slice(underIdx + 1);
    if (suffix === "name" || suffix === "level") {
      elementType = firstKey.slice(0, underIdx);
      matchType = suffix as RuleType;
    } else {
      elementType = firstKey;
    }
  } else {
    elementType = firstKey;
  }

  const isContains = matchType === "name" && firstValue.startsWith("c:");
  const dash = firstValue.indexOf("-");

  return {
    id: rule.id,
    elementType,
    type: matchType,
    nameOp: isContains ? "contains" : "matches",
    value:
      matchType !== "level"
        ? isContains
          ? firstValue.slice(2)
          : firstValue
        : "",
    levelMin:
      matchType === "level"
        ? dash === -1
          ? firstValue
          : firstValue.slice(0, dash)
        : "1",
    levelMax:
      matchType === "level"
        ? dash === -1
          ? firstValue
          : firstValue.slice(dash + 1)
        : "1",
  };
}

function draftToRule(draft: RuleDraft): Rule {
  const { elementType, type } = draft;
  let key: string;
  let value: string;

  if (type === "path") {
    key = elementType;
    value = draft.value;
  } else if (type === "name") {
    key = `${elementType}_name`;
    value = draft.nameOp === "contains" ? `c:${draft.value}` : draft.value;
  } else {
    key = `${elementType}_level`;
    const min = draft.levelMin || "1";
    const max = draft.levelMax || min;
    value = min === max ? min : `${min}-${max}`;
  }

  return { id: draft.id, patterns: { [key]: value } };
}

function ruleDescription(rule: Rule): string {
  const firstKey = Object.keys(rule.patterns)[0] ?? "all";
  const firstValue = Object.values(rule.patterns)[0] ?? "";
  const underIdx = firstKey.lastIndexOf("_");

  let elementType = "all";
  let matchType = "path";

  if (underIdx > 0) {
    const suffix = firstKey.slice(underIdx + 1);
    if (suffix === "name" || suffix === "level") {
      elementType = firstKey.slice(0, underIdx);
      matchType = suffix;
    } else {
      elementType = firstKey;
    }
  } else {
    elementType = firstKey;
  }

  const typeLabel = elementType === "all" ? "any" : elementType;

  if (matchType === "name") {
    return firstValue.startsWith("c:")
      ? `${typeLabel} name contains "${firstValue.slice(2)}"`
      : `${typeLabel} name ~ ${firstValue}`;
  }
  if (matchType === "level") {
    const dash = firstValue.indexOf("-");
    return dash === -1
      ? `level = ${firstValue}`
      : `level ${firstValue.slice(0, dash)}–${firstValue.slice(dash + 1)}`;
  }
  return `${typeLabel} path ~ ${firstValue}`;
}

function correctToken(token: string, ruleIds: string[]): string {
  if (!token) return token;
  if (ruleIds.includes(token)) return token;
  if (["&", "|", "-", "(", ")"].includes(token)) return token;
  if (token === "+") return "|";
  const u = token.toUpperCase();
  if (u === "OR") return "|";
  if (u === "AND") return "&";
  if (u === "NOT") return "-";
  return token;
}

function correctExpression(expression: string, ruleIds: string[]): string {
  if (!expression.trim()) return expression;
  const tokens = expression
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => correctToken(t, ruleIds));
  const EXPLICIT_OPS = new Set(["&", "|"]);
  const result: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    result.push(tokens[i]);
    if (i < tokens.length - 1) {
      const curr = tokens[i];
      const next = tokens[i + 1];

      const currEnds = !EXPLICIT_OPS.has(curr) && curr !== "(" && curr !== "-";
      const nextStarts = !EXPLICIT_OPS.has(next) && next !== ")";
      if (currEnds && nextStarts) result.push("&");
    }
  }
  return result.join(" ");
}

const inputCls =
  "bg-bg-elevated border border-border rounded px-2 py-1 text-[11px] font-mono text-fg-primary placeholder:text-fg-disabled focus:outline-none focus:border-accent";

const selectCls =
  "bg-bg-elevated border border-border rounded px-1.5 py-1 text-[11px] font-mono text-fg-primary focus:outline-none focus:border-accent";

function RuleEditor({
  draft,
  onChange,
  onDone,
  onCancel,
  isNew,
}: {
  draft: RuleDraft;
  onChange: (d: RuleDraft) => void;
  onDone: () => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const valid = !!draft.id.trim();

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 border border-accent/40 rounded-lg bg-bg-elevated">
      <input
        type="text"
        value={draft.id}
        onChange={(e) =>
          onChange({ ...draft, id: e.target.value.replace(/\s/g, "_") })
        }
        placeholder="rule id  (e.g. royals)"
        className={`w-full ${inputCls}`}
      />
      <div className="flex gap-1.5 items-center flex-wrap">
        <select
          value={draft.elementType}
          onChange={(e) => onChange({ ...draft, elementType: e.target.value })}
          className={selectCls}
        >
          {ELEMENT_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={draft.type}
          onChange={(e) =>
            onChange({ ...draft, type: e.target.value as RuleType })
          }
          className={selectCls}
        >
          <option value="path">path</option>
          <option value="name">name</option>
          <option value="level">level</option>
        </select>
        {draft.type === "name" && (
          <select
            value={draft.nameOp}
            onChange={(e) =>
              onChange({ ...draft, nameOp: e.target.value as NameOp })
            }
            className={selectCls}
          >
            <option value="contains">contains</option>
            <option value="matches">matches</option>
          </select>
        )}
        {draft.type === "level" ? (
          <>
            <input
              type="number"
              value={draft.levelMin}
              onChange={(e) => onChange({ ...draft, levelMin: e.target.value })}
              placeholder="min"
              className={`w-14 ${inputCls}`}
            />
            <span className="text-[11px] text-fg-muted">–</span>
            <input
              type="number"
              value={draft.levelMax}
              onChange={(e) => onChange({ ...draft, levelMax: e.target.value })}
              placeholder="max"
              className={`w-14 ${inputCls}`}
            />
          </>
        ) : (
          <input
            type="text"
            value={draft.value}
            onChange={(e) => onChange({ ...draft, value: e.target.value })}
            placeholder={
              draft.type === "path"
                ? "path regex"
                : draft.nameOp === "contains"
                  ? "substring"
                  : "regex"
            }
            className={`flex-1 min-w-0 ${inputCls}`}
          />
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1 rounded border border-border text-[11px] text-fg-muted hover:bg-bg-overlay transition-colors"
        >
          <X size={11} /> cancel
        </button>
        <button
          disabled={!valid}
          onClick={onDone}
          className={[
            "flex items-center gap-1 px-3 py-1 rounded border text-[11px] font-medium transition-colors",
            valid
              ? "border-accent bg-accent text-bg-base hover:bg-accent-hover cursor-pointer"
              : "border-border text-fg-disabled cursor-not-allowed opacity-40",
          ].join(" ")}
        >
          <Check size={11} /> {isNew ? "add rule" : "done"}
        </button>
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  isEditing,
  onInsert,
  onEdit,
  onDelete,
}: {
  rule: Rule;
  isEditing: boolean;
  onInsert: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onInsert}
      className={[
        "flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors",
        isEditing
          ? "border-accent/60 bg-accent/8"
          : "border-border/50 bg-bg-elevated hover:border-accent/40 hover:bg-bg-overlay",
      ].join(" ")}
      title="Click to insert rule id into expression"
    >
      <code className="text-[11px] font-bold text-accent font-mono shrink-0">
        {rule.id}
      </code>
      <span className="flex-1 text-[11px] truncate text-fg-muted font-mono">
        {ruleDescription(rule)}
      </span>
      <button
        title="Edit rule"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="btn-icon p-1! shrink-0"
      >
        <Pencil size={11} />
      </button>
      <DangerIconBtn
        title="Delete rule"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1! shrink-0"
      >
        <Trash2 size={11} />
      </DangerIconBtn>
    </div>
  );
}

export function FiltersPanel() {
  const dispatch = useAppDispatch();
  const { selectors } = useAppSelector((s) => s.filter);
  const rules = useAppSelector((s) => s.diagram.model.rules ?? []);
  const importRef = useRef<HTMLInputElement>(null);
  const expressionRef = useRef<HTMLInputElement>(null);

  const visibleSelectors = selectors.filter(
    (s) => s.id !== FOLD_SELECTOR_ID && s.id !== SELECTION_SELECTOR_ID,
  );

  const [activeId, setActiveId] = useState<string | null>(
    () => visibleSelectors[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<Selector>(() => {
    const first = visibleSelectors[0];
    return first ? { ...first } : freshSelector();
  });
  const [isNew, setIsNew] = useState(() => visibleSelectors.length === 0);
  const [isDirty, setIsDirty] = useState(false);

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isNewRule, setIsNewRule] = useState(false);
  const [ruleDrafts, setRuleDrafts] = useState<Map<string, RuleDraft>>(
    new Map(),
  );

  const ruleIds = rules.map((r) => r.id);

  const updateDraft = (updater: (d: Selector) => Selector) => {
    setDraft(updater);
    setIsDirty(true);
  };

  const selectTab = (sel: Selector) => {
    setActiveId(sel.id);
    setDraft({ ...sel });
    setIsNew(false);
    setIsDirty(false);
    setEditingRuleId(null);
    setIsNewRule(false);
  };

  const startNew = () => {
    setDraft(freshSelector());
    setIsNew(true);
    setIsDirty(true);
    setActiveId(null);
    setEditingRuleId(null);
    setIsNewRule(false);
  };

  const insertAtCursor = useCallback((text: string) => {
    const input = expressionRef.current;
    if (!input) {
      updateDraft((d) => ({
        ...d,
        expression: d.expression ? `${d.expression} ${text}` : text,
      }));
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    const sep = before && !before.endsWith(" ") ? " " : "";
    const sepAfter = after && !after.startsWith(" ") ? " " : "";
    const newVal = before + sep + text + sepAfter + after;
    updateDraft((d) => ({ ...d, expression: newVal }));
    setTimeout(() => {
      const pos = (before + sep + text + sepAfter).length;
      input.setSelectionRange(pos, pos);
      input.focus();
    }, 0);
  }, []);

  const handleExpressionBlur = () => {
    setDraft((d) => {
      const corrected = correctExpression(d.expression, ruleIds);
      if (corrected !== d.expression) setIsDirty(true);
      return { ...d, expression: corrected };
    });
  };

  const handleExpressionKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === " ") {
      const input = e.currentTarget;
      const cursor = input.selectionStart ?? input.value.length;
      const beforeCursor = input.value.slice(0, cursor);
      const lastSpace = beforeCursor.lastIndexOf(" ");
      const lastToken = beforeCursor.slice(lastSpace + 1);
      if (lastToken) {
        const corrected = correctToken(lastToken, ruleIds);
        if (corrected !== lastToken) {
          e.preventDefault();
          const after = input.value.slice(cursor);
          const newVal =
            beforeCursor.slice(0, lastSpace + 1) + corrected + " " + after;
          updateDraft((d) => ({ ...d, expression: newVal }));
          setTimeout(() => {
            const pos =
              beforeCursor.slice(0, lastSpace + 1).length +
              corrected.length +
              1;
            input.setSelectionRange(pos, pos);
          }, 0);
        }
      }
    }
  };

  const startEditRule = (rule: Rule) => {
    setIsNewRule(false);
    const existing = ruleDrafts.get(rule.id) ?? ruleToDraft(rule);
    setRuleDrafts((m) => new Map(m).set(rule.id, existing));
    setEditingRuleId(rule.id);
  };

  const startNewRule = () => {
    setIsNewRule(true);
    setEditingRuleId("__new__");
    setRuleDrafts((m) => new Map(m).set("__new__", freshRuleDraft()));
  };

  const cancelRuleEdit = () => {
    setEditingRuleId(null);
    setIsNewRule(false);
  };

  const commitRule = (draftId: string) => {
    const rd = ruleDrafts.get(draftId);
    if (!rd || !rd.id.trim()) return;
    const rule = draftToRule({ ...rd, id: rd.id.trim() });
    const code = store.getState().diagram.code;
    syncManager.syncFromCode(upsertRuleInCode(rule, code));
    setRuleDrafts((m) => {
      const n = new Map(m);
      n.delete(draftId);
      return n;
    });
    setEditingRuleId(null);
    setIsNewRule(false);
  };

  const deleteRule = (id: string) => {
    const code = store.getState().diagram.code;
    syncManager.syncFromCode(removeRuleFromCode(id, code));
  };

  const handleSave = () => {
    const correctedExpression = correctExpression(draft.expression, ruleIds);
    const newId = toSelectorId(draft.label);
    const selectorToSave: Selector = {
      ...draft,
      id: newId,
      expression: correctedExpression,
    };
    setDraft(selectorToSave);

    const code = store.getState().diagram.code;

    if (isNew) {
      const alreadyExists = visibleSelectors.some((s) => s.id === newId);
      if (alreadyExists) {
        dispatch(updateSelector(selectorToSave));
      } else {
        dispatch(addSelector(selectorToSave));
      }
      syncManager.syncFromCode(upsertSelectorInCode(selectorToSave, code));
      setActiveId(selectorToSave.id);
      setIsNew(false);
      setIsDirty(false);
    } else {
      const oldLabel =
        visibleSelectors.find((s) => s.id === activeId)?.label ??
        activeId ??
        newId;
      if (newId !== activeId) {
        dispatch(removeSelector(activeId ?? ""));
        const targetExists = visibleSelectors.some((s) => s.id === newId);
        if (targetExists) {
          dispatch(updateSelector(selectorToSave));
        } else {
          dispatch(addSelector(selectorToSave));
        }

        syncManager.syncFromCode(
          upsertSelectorInCode(
            selectorToSave,
            removeSelectorFromCode(oldLabel, code),
          ),
        );
      } else {
        dispatch(updateSelector(selectorToSave));
        syncManager.syncFromCode(
          upsertSelectorInCode(selectorToSave, code, oldLabel),
        );
      }
      setActiveId(selectorToSave.id);
      setIsDirty(false);
    }
  };

  const handleDeleteSelector = () => {
    if (!activeId) return;
    const code = store.getState().diagram.code;
    const labelToRemove =
      visibleSelectors.find((s) => s.id === activeId)?.label ?? activeId;
    dispatch(removeSelector(activeId));
    syncManager.syncFromCode(removeSelectorFromCode(labelToRemove, code));
    const remaining = visibleSelectors.filter((s) => s.id !== activeId);
    if (remaining.length > 0) {
      selectTab(remaining[0]);
    } else {
      startNew();
    }
  };

  const handleExport = () => {
    const lines = visibleSelectors.map((s) => JSON.stringify(s));
    const blob = new Blob([lines.join("\n")], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "selectors.jsonl";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const code = store.getState().diagram.code;
        let updatedCode = code;
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const s = JSON.parse(trimmed);
          if (typeof s.label === "string" && typeof s.expression === "string") {
            const imported: Selector = { ...s, id: crypto.randomUUID() };
            dispatch(addSelector(imported));
            updatedCode = upsertSelectorInCode(imported, updatedCode);
          }
        }
        syncManager.syncFromCode(updatedCode);
      } catch {
        console.error("Invalid selectors file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const editingRuleDraft =
    editingRuleId !== null ? (ruleDrafts.get(editingRuleId) ?? null) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-base text-fg-primary">
      <div className="flex items-center border-b border-border px-2 py-1 gap-1 shrink-0">
        <button
          onClick={handleExport}
          className="btn-icon p-1! shrink-0"
          title="Export selectors"
        >
          <Download size={13} />
        </button>
        <button
          onClick={() => importRef.current?.click()}
          className="btn-icon p-1! shrink-0"
          title="Import selectors"
        >
          <Upload size={13} />
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".jsonl"
          className="hidden"
          onChange={handleImport}
        />

        <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" />

        <div className="flex items-center overflow-x-auto gap-1 flex-1 scrollbar-none">
          {visibleSelectors.map((sel) => (
            <button
              key={sel.id}
              onClick={() => selectTab(sel)}
              className={[
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 border transition-colors",
                !isNew && activeId === sel.id
                  ? "border-accent bg-accent/15 text-fg-primary"
                  : "border-transparent text-fg-muted hover:bg-bg-elevated hover:text-fg-primary",
              ].join(" ")}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 border"
                style={
                  sel.mode === "off"
                    ? { background: "transparent", borderColor: "currentColor" }
                    : { background: sel.color, borderColor: sel.color }
                }
              />
              {sel.label}
            </button>
          ))}
        </div>

        <button
          onClick={startNew}
          className={[
            "flex items-center justify-center w-6 h-6 rounded-md border text-fg-muted shrink-0 transition-colors",
            isNew
              ? "border-accent bg-accent/15 text-accent"
              : "border-border hover:bg-bg-elevated hover:text-fg-primary",
          ].join(" ")}
          title="New selector"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-border/30 shrink-0">
          <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider shrink-0 w-20">
            Mode
          </span>
          <div className="flex gap-1">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => updateDraft((d) => ({ ...d, mode: m }))}
                className={[
                  "px-3 py-1 rounded text-[11px] font-semibold border transition-colors",
                  draft.mode === m
                    ? "border-accent bg-accent text-bg-base"
                    : "border-border text-fg-muted hover:border-accent/50 hover:text-fg-primary",
                ].join(" ")}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-2.5 pb-2 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider shrink-0 w-20">
              Expression
            </span>
            <div className="flex items-center gap-0.5">
              {(["&", "|", "-", "(", ")"] as const).map((op) => (
                <button
                  key={op}
                  onClick={() => insertAtCursor(op)}
                  className="w-6 h-6 flex items-center justify-center border border-border rounded text-[11px] font-mono text-fg-muted hover:border-accent/60 hover:text-fg-primary hover:bg-bg-elevated transition-colors"
                >
                  {op}
                </button>
              ))}
              <button
                onClick={() => updateDraft((d) => ({ ...d, expression: "" }))}
                className="ml-1 px-2 py-0.5 text-[10px] border border-border rounded text-fg-muted hover:border-accent/50 hover:text-fg-primary hover:bg-bg-elevated transition-colors"
              >
                clear
              </button>
            </div>
          </div>
          <input
            ref={expressionRef}
            type="text"
            value={draft.expression}
            onChange={(e) =>
              updateDraft((d) => ({ ...d, expression: e.target.value }))
            }
            onBlur={handleExpressionBlur}
            onKeyDown={handleExpressionKeyDown}
            placeholder={
              ruleIds.length > 0
                ? `e.g.  ${ruleIds[0]}  ·  ${ruleIds[0]} | ${ruleIds[1] ?? "r2"}  ·  (${ruleIds[0]} & -${ruleIds[1] ?? "r2"})`
                : "add rules below, then combine them here"
            }
            className={`w-full ${inputCls} py-1.5`}
          />
        </div>

        <div className="flex-1 px-4 pt-2.5 pb-2 flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider select-none">
              Rules
            </span>
            <span className="text-[10px] text-fg-disabled select-none">
              click row to insert · ✎ to edit
            </span>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0">
            {rules.map((rule) =>
              editingRuleId === rule.id && editingRuleDraft ? (
                <RuleEditor
                  key={rule.id}
                  draft={editingRuleDraft}
                  onChange={(d) =>
                    setRuleDrafts((m) => new Map(m).set(rule.id, d))
                  }
                  onDone={() => commitRule(rule.id)}
                  onCancel={cancelRuleEdit}
                  isNew={false}
                />
              ) : (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  isEditing={editingRuleId === rule.id}
                  onInsert={() => insertAtCursor(rule.id)}
                  onEdit={() => startEditRule(rule)}
                  onDelete={() => deleteRule(rule.id)}
                />
              ),
            )}

            {isNewRule && editingRuleId === "__new__" && editingRuleDraft ? (
              <RuleEditor
                draft={editingRuleDraft}
                onChange={(d) =>
                  setRuleDrafts((m) => new Map(m).set("__new__", d))
                }
                onDone={() => commitRule("__new__")}
                onCancel={cancelRuleEdit}
                isNew
              />
            ) : (
              <button
                onClick={startNewRule}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-border rounded text-fg-muted hover:border-accent/50 hover:text-fg-primary hover:bg-bg-elevated transition-colors self-start"
              >
                <Plus size={12} />
                Define rule
              </button>
            )}

            {rules.length === 0 && !isNewRule && (
              <p className="text-[11px] text-fg-disabled italic py-1">
                No rules yet — define one above.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-border shrink-0 bg-bg-elevated">
        {!isNew && (
          <DangerIconBtn
            onClick={handleDeleteSelector}
            title="Delete selector"
            className="p-1! shrink-0"
          >
            <Trash2 size={13} />
          </DangerIconBtn>
        )}
        <input
          type="text"
          value={draft.label}
          onChange={(e) =>
            updateDraft((d) => ({ ...d, label: e.target.value }))
          }
          className="flex-1 bg-transparent border-b border-border text-[13px] font-semibold text-fg-primary focus:outline-none focus:border-accent placeholder:text-fg-disabled py-0.5 transition-colors"
          placeholder="Selector name"
        />
        <div className="relative shrink-0">
          <input
            type="color"
            value={draft.color}
            onChange={(e) =>
              updateDraft((d) => ({ ...d, color: e.target.value }))
            }
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Pick color"
          />
          <div
            className="w-5 h-5 rounded-full border-2 border-border cursor-pointer hover:border-accent transition-colors"
            style={{ background: draft.color }}
            title="Pick color"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className={[
            "flex items-center gap-1 px-3 py-1 rounded text-[11px] font-semibold border transition-colors shrink-0",
            isDirty
              ? "bg-accent border-accent text-bg-base hover:bg-accent-hover hover:border-accent-hover cursor-pointer"
              : "bg-bg-overlay border-border text-fg-disabled cursor-default",
          ].join(" ")}
        >
          <Check size={12} />
          {isNew ? "Create" : "Save"}
        </button>
      </div>
    </div>
  );
}
