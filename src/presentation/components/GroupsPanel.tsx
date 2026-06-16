import { useRef, useState, useCallback } from "react";
import { Trash2, Plus, Check, Download, Upload, Eraser } from "lucide-react";
import { Select } from "@levkobe/c7one";
import { DangerIconBtn } from "./DangerIconBtn";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  addGroup,
  updateGroup,
  removeGroup,
} from "../../application/store/filterSlice";
import {
  toGroupId,
  type SelectorMode,
  type Group,
} from "../../domain/models/Selector";
import { AppConfig } from "../../config/appConfig";
import { store, syncManager } from "../../application/store/store";
import { CodeGenerator } from "../../infrastructure/codegen/CodeGenerator";
import {
  upsertGroupInCode,
  removeGroupFromCode,
  upsertSessionModeInCode,
} from "../utils/groupUtils";

const PALETTE = AppConfig.ui.COLOR_PALETTE;
const MODES: SelectorMode[] = ["color", "dim", "hide", "off"];
const TYPE_FILTERS = ["", "{}", "[]", "()", "||", ">>", "<>"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

function buildNameRegex(name: string, type: TypeFilter): string {
  if (!name && !type) return "";
  return `(^|.*\\.)[^.]*${name}[^.]*${type}(?![^.]*\\.)`;
}

function buildLevelsRegex(from: number, to: number): string {
  const mn = Math.max(1, from);
  const mx = Math.max(mn, to);
  if (mn === 1 && mx === 1) return "^[^.]+$";
  if (mn === mx) return `^[^.]+(\\.[^.]+){${mn - 1}}$`;
  return `^[^.]+(\\.[^.]+){${mn - 1},${mx - 1}}$`;
}

function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

function freshGroup(): Group {
  return {
    id: "",
    regex: "",
    color: randomColor(),
  };
}

const inputCls =
  "bg-bg-elevated border border-border rounded px-2 py-1 text-[11px] font-mono text-fg-primary placeholder:text-fg-disabled focus:outline-none focus:border-accent";

export function GroupsPanel() {
  const dispatch = useAppDispatch();
  const { groups } = useAppSelector((s) => s.filter);
  const sessions = useAppSelector((s) => s.diagram.model.sessions ?? []);
  const activeSessionId = useAppSelector((s) => s.ui.activeSessionId);
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const importRef = useRef<HTMLInputElement>(null);
  const ruleRef = useRef<HTMLInputElement>(null);
  const composeRef = useRef<HTMLInputElement>(null);

  const [activeId, setActiveId] = useState<string | null>(
    () => groups[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<Group>(() => {
    const first = groups[0];
    return first ? { ...first } : freshGroup();
  });
  const [isNew, setIsNew] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [regexPreset, setRegexPreset] = useState<"path" | "name" | "levels">(
    "path",
  );
  const [nameInput, setNameInput] = useState("");
  const [nameTypeFilter, setNameTypeFilter] = useState<TypeFilter>("");
  const [levelFrom, setLevelFrom] = useState(1);
  const [levelTo, setLevelTo] = useState(1);

  const updateDraft = (updater: (d: Group) => Group) => {
    setDraft(updater);
    setIsDirty(true);
  };

  const selectTab = (g: Group) => {
    setActiveId(g.id);
    setDraft({ ...g });
    setIsNew(false);
    setIsDirty(false);
    setRegexPreset("path");
  };

  const startNew = () => {
    setDraft(freshGroup());
    setIsNew(true);
    setIsDirty(true);
    setActiveId(null);
    setRegexPreset("path");
    setNameInput("");
    setNameTypeFilter("");
    setLevelFrom(1);
    setLevelTo(1);
  };

  const insertAtCompose = useCallback((text: string) => {
    const input = composeRef.current;
    if (!input) {
      updateDraft((d) => ({
        ...d,
        compose: (d.compose ?? "") + text || undefined,
      }));
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    const newVal = before + text + after;
    updateDraft((d) => ({ ...d, compose: newVal || undefined }));
    setTimeout(() => {
      const pos = (before + text).length;
      input.setSelectionRange(pos, pos);
      input.focus();
    }, 0);
  }, []);

  const insertAtCursor = useCallback((text: string) => {
    const input = ruleRef.current;
    if (!input) {
      updateDraft((d) => ({
        ...d,
        regex: d.regex ? `${d.regex}${text}` : text,
      }));
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    const newVal = before + text + after;
    updateDraft((d) => ({ ...d, regex: newVal }));
    setTimeout(() => {
      const pos = (before + text).length;
      input.setSelectionRange(pos, pos);
      input.focus();
    }, 0);
  }, []);

  const handleSave = () => {
    const newId = toGroupId(draft.id) || "group";
    const groupToSave: Group = { ...draft, id: newId };
    setDraft(groupToSave);
    const code = store.getState().diagram.code;

    if (isNew) {
      const alreadyExists = groups.some((g) => g.id === newId);
      if (alreadyExists) {
        dispatch(updateGroup(groupToSave));
      } else {
        dispatch(addGroup(groupToSave));
      }
      syncManager.syncFromCode(upsertGroupInCode(groupToSave, code));
      setActiveId(groupToSave.id);
      setIsNew(false);
      setIsDirty(false);
    } else {
      if (newId !== activeId) {
        dispatch(removeGroup(activeId ?? ""));
        const targetExists = groups.some((g) => g.id === newId);
        if (targetExists) {
          dispatch(updateGroup(groupToSave));
        } else {
          dispatch(addGroup(groupToSave));
        }
        syncManager.syncFromCode(
          upsertGroupInCode(
            groupToSave,
            removeGroupFromCode(activeId ?? "", code),
          ),
        );
      } else {
        dispatch(updateGroup(groupToSave));
        syncManager.syncFromCode(upsertGroupInCode(groupToSave, code));
      }
      setActiveId(groupToSave.id);
      setIsDirty(false);
    }
  };

  const handleDeleteGroup = () => {
    if (!activeId) return;
    const code = store.getState().diagram.code;
    dispatch(removeGroup(activeId));
    syncManager.syncFromCode(removeGroupFromCode(activeId, code));
    const remaining = groups.filter((g) => g.id !== activeId);
    if (remaining.length > 0) {
      selectTab(remaining[0]);
    } else {
      setActiveId(null);
      setDraft(freshGroup());
      setIsNew(false);
      setIsDirty(false);
    }
  };

  const handleExport = () => {
    const lines = groups.map((g) => JSON.stringify(g));
    const blob = new Blob([lines.join("\n")], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "groups.jsonl";
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
          const g = JSON.parse(trimmed) as Partial<Group> & {
            label?: string;
            rule?: string;
          };
          const rawId = g.id || g.label;
          if (rawId) {
            const imported: Group = {
              id: toGroupId(rawId),
              regex: g.regex ?? g.rule ?? "",
              ...(g.compose ? { compose: g.compose } : {}),
              color: g.color ?? randomColor(),
            };
            dispatch(addGroup(imported));
            updatedCode = upsertGroupInCode(imported, updatedCode);
          }
        }
        syncManager.syncFromCode(updatedCode);
      } catch {
        console.error("Invalid groups file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClearOrphanedFlags = () => {
    const { model: currentModel } = store.getState().diagram;
    const { groups: currentGroups, selectors: currentSelectors } =
      store.getState().filter;
    const validIds = new Set([
      ...currentGroups.map((g) => g.id),
      ...currentSelectors.map((s) => s.id),
    ]);

    let changed = false;
    const updatedElements = { ...currentModel.elements };
    for (const [id, el] of Object.entries(currentModel.elements)) {
      if (!el.flags || el.flags.length === 0) continue;
      const cleanedFlags = el.flags.filter((f) => validIds.has(toGroupId(f)));
      if (cleanedFlags.length !== el.flags.length) {
        changed = true;
        updatedElements[id] = {
          ...el,
          flags: cleanedFlags.length > 0 ? cleanedFlags : undefined,
        };
      }
    }

    if (!changed) return;
    const newCode = new CodeGenerator({
      ...currentModel,
      elements: updatedElements,
    }).generate();
    syncManager.syncFromCode(newCode, true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-base text-fg-primary">
      <div className="flex items-center border-b border-border px-2 py-1 gap-1 shrink-0">
        <button
          onClick={handleExport}
          className="btn-icon p-1! shrink-0"
          title="Export groups"
        >
          <Download size={13} />
        </button>
        <button
          onClick={() => importRef.current?.click()}
          className="btn-icon p-1! shrink-0"
          title="Import groups"
        >
          <Upload size={13} />
        </button>
        <button
          onClick={handleClearOrphanedFlags}
          className="btn-icon p-1! shrink-0"
          title="Clear orphaned flags (flags whose group no longer exists)"
        >
          <Eraser size={13} />
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".jsonl"
          className="hidden"
          onChange={handleImport}
        />

        <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" />

        {groups.length > 0 && (
          <Select
            value={isNew ? "" : (activeId ?? groups[0]?.id ?? "")}
            onValueChange={(v) => {
              const g = groups.find((g) => g.id === v);
              if (g) selectTab(g);
            }}
            options={groups.map((g) => ({ value: g.id, label: g.id }))}
            className="w-auto"
          />
        )}

        <button
          onClick={startNew}
          className={[
            "flex items-center justify-center w-6 h-6 rounded-md border text-fg-muted shrink-0 transition-colors",
            isNew
              ? "border-accent bg-accent/15 text-accent"
              : "border-border hover:bg-bg-elevated hover:text-fg-primary",
          ].join(" ")}
          title="New group"
        >
          <Plus size={12} />
        </button>
      </div>

      {groups.length === 0 && !isNew ? (
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center text-center px-6 py-8 gap-6">
          <p className="text-[12px] text-fg-muted leading-relaxed max-w-xs">
            Groups let you highlight, dim, or hide diagram elements using
            expression rules.
          </p>
          <ol className="flex flex-col gap-3 text-left w-full max-w-xs">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 select-none">
                1
              </span>
              <span className="text-[12px] text-fg-muted leading-snug">
                Click{" "}
                <strong className="text-fg-primary font-semibold">+</strong>{" "}
                above to create a new group
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 select-none">
                2
              </span>
              <span className="text-[12px] text-fg-muted leading-snug">
                Write a{" "}
                <strong className="text-fg-primary font-semibold">rule</strong>{" "}
                — match elements by name, type, level, or combine with{" "}
                <code className="font-mono">/</code>{" "}
                <code className="font-mono">&</code>{" "}
                <code className="font-mono">-</code>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 select-none">
                3
              </span>
              <span className="text-[12px] text-fg-muted leading-snug">
                Choose a mode —{" "}
                <strong className="text-fg-primary font-semibold">Color</strong>{" "}
                highlights,{" "}
                <strong className="text-fg-primary font-semibold">Dim</strong>{" "}
                fades unmatched,{" "}
                <strong className="text-fg-primary font-semibold">Hide</strong>{" "}
                removes unmatched
              </span>
            </li>
          </ol>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-border/30 shrink-0">
            <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider shrink-0 w-20">
              Mode
            </span>
            {activeSessionId ? (
              <div className="flex gap-1">
                {MODES.map((m) => {
                  const currentMode =
                    activeSession?.groupModes?.[draft.id] ?? "off";
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        const code = store.getState().diagram.code;
                        syncManager.syncFromCode(
                          upsertSessionModeInCode(
                            activeSessionId,
                            draft.id,
                            m,
                            code,
                          ),
                          true,
                        );
                      }}
                      className={[
                        "px-3 py-1 rounded text-[11px] font-semibold border transition-colors",
                        currentMode === m
                          ? "border-accent bg-accent text-bg-base"
                          : "border-border text-fg-muted hover:border-accent/50 hover:text-fg-primary",
                      ].join(" ")}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="text-[11px] text-fg-disabled italic">
                Select a session in the toolbar to set mode
              </span>
            )}
          </div>

          <div className="px-4 pt-2.5 pb-2 border-b border-border/30 shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider shrink-0 w-20">
                Regex
              </span>
              {regexPreset === "path" && (
                <div className="flex items-center gap-0.5 ml-auto">
                  {([".*", "{}", "[]", "()", "||"] as const).map((snip) => (
                    <button
                      key={snip}
                      onClick={() => insertAtCursor(snip)}
                      className="px-1.5 h-6 flex items-center justify-center border border-border rounded text-[10px] font-mono text-fg-muted hover:border-accent/60 hover:text-fg-primary hover:bg-bg-elevated transition-colors"
                    >
                      {snip}
                    </button>
                  ))}
                  <button
                    onClick={() => updateDraft((d) => ({ ...d, regex: "" }))}
                    className="ml-1 px-2 py-0.5 text-[10px] border border-border rounded text-fg-muted hover:border-accent/50 hover:text-fg-primary hover:bg-bg-elevated transition-colors"
                  >
                    clear
                  </button>
                </div>
              )}
            </div>

            {regexPreset === "path" && (
              <div className="flex items-center gap-1.5">
                <Select
                  value={regexPreset}
                  onValueChange={(v) => {
                    const p = v as "path" | "name" | "levels";
                    setRegexPreset(p);
                    if (p === "name")
                      updateDraft((d) => ({
                        ...d,
                        regex: buildNameRegex(nameInput, nameTypeFilter),
                      }));
                    else if (p === "levels")
                      updateDraft((d) => ({
                        ...d,
                        regex: buildLevelsRegex(levelFrom, levelTo),
                      }));
                  }}
                  options={[
                    { value: "path", label: "Path" },
                    { value: "name", label: "Name" },
                    { value: "levels", label: "Levels" },
                  ]}
                  className="w-auto shrink-0"
                />
                <input
                  ref={ruleRef}
                  type="text"
                  value={draft.regex}
                  onChange={(e) =>
                    updateDraft((d) => ({ ...d, regex: e.target.value }))
                  }
                  placeholder="e.g.  .*Service\{\}  ·  game\{\}\..*  ·  .*\|\|"
                  className={`flex-1 ${inputCls} py-1.5`}
                />
              </div>
            )}

            {regexPreset === "name" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-0.5">
                  {TYPE_FILTERS.map((t) => (
                    <button
                      key={t || "any"}
                      onClick={() => {
                        setNameTypeFilter(t);
                        updateDraft((d) => ({
                          ...d,
                          regex: buildNameRegex(nameInput, t),
                        }));
                      }}
                      className={[
                        "px-1.5 h-6 flex items-center justify-center border rounded text-[10px] font-mono transition-colors",
                        nameTypeFilter === t
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border text-fg-muted hover:border-accent/60 hover:text-fg-primary hover:bg-bg-elevated",
                      ].join(" ")}
                    >
                      {t || "any"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Select
                    value={regexPreset}
                    onValueChange={(v) => {
                      const p = v as "path" | "name" | "levels";
                      setRegexPreset(p);
                      if (p === "levels")
                        updateDraft((d) => ({
                          ...d,
                          regex: buildLevelsRegex(levelFrom, levelTo),
                        }));
                    }}
                    options={[
                      { value: "path", label: "Path" },
                      { value: "name", label: "Name" },
                      { value: "levels", label: "Levels" },
                    ]}
                    className="w-auto shrink-0"
                  />
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNameInput(v);
                      updateDraft((d) => ({
                        ...d,
                        regex: buildNameRegex(v, nameTypeFilter),
                      }));
                    }}
                    placeholder="name pattern — e.g.  .*Service  ·  User"
                    className={`flex-1 ${inputCls} py-1.5`}
                  />
                  {buildNameRegex(nameInput, nameTypeFilter) && (
                    <span className="text-[11px] text-fg-muted font-mono shrink-0 truncate">
                      → {buildNameRegex(nameInput, nameTypeFilter)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {regexPreset === "levels" && (
              <div className="flex items-center gap-2">
                <Select
                  value={regexPreset}
                  onValueChange={(v) => {
                    const p = v as "path" | "name" | "levels";
                    setRegexPreset(p);
                    if (p === "name")
                      updateDraft((d) => ({
                        ...d,
                        regex: buildNameRegex(nameInput, nameTypeFilter),
                      }));
                  }}
                  options={[
                    { value: "path", label: "Path" },
                    { value: "name", label: "Name" },
                    { value: "levels", label: "Levels" },
                  ]}
                  className="w-auto shrink-0"
                />
                <span className="text-[11px] text-fg-muted shrink-0">from</span>
                <input
                  type="number"
                  min={1}
                  value={levelFrom}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    setLevelFrom(v);
                    const to = Math.max(v, levelTo);
                    setLevelTo(to);
                    updateDraft((d) => ({
                      ...d,
                      regex: buildLevelsRegex(v, to),
                    }));
                  }}
                  className={`w-16 ${inputCls} py-1.5`}
                />
                <span className="text-[11px] text-fg-muted shrink-0">to</span>
                <input
                  type="number"
                  min={levelFrom}
                  value={levelTo}
                  onChange={(e) => {
                    const v = Math.max(levelFrom, Number(e.target.value));
                    setLevelTo(v);
                    updateDraft((d) => ({
                      ...d,
                      regex: buildLevelsRegex(levelFrom, v),
                    }));
                  }}
                  className={`w-16 ${inputCls} py-1.5`}
                />
                <span className="text-[11px] text-fg-muted font-mono shrink-0 truncate">
                  → {buildLevelsRegex(levelFrom, levelTo)}
                </span>
              </div>
            )}
          </div>

          {groups.length > 1 && (
            <div className="flex-1 px-4 pt-2.5 pb-2 flex flex-col gap-2 min-h-0">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider shrink-0 w-20">
                  Compose
                </span>
                <div className="flex items-center gap-0.5">
                  {(["&", "|", "-", "(", ")"] as const).map((op) => (
                    <button
                      key={op}
                      onClick={() => insertAtCompose(op)}
                      className="w-6 h-6 flex items-center justify-center border border-border rounded text-[11px] font-mono text-fg-muted hover:border-accent/60 hover:text-fg-primary hover:bg-bg-elevated transition-colors"
                    >
                      {op}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      updateDraft((d) => ({ ...d, compose: undefined }))
                    }
                    className="ml-1 px-2 py-0.5 text-[10px] border border-border rounded text-fg-muted hover:border-accent/50 hover:text-fg-primary hover:bg-bg-elevated transition-colors"
                  >
                    clear
                  </button>
                </div>
              </div>
              <input
                ref={composeRef}
                type="text"
                value={draft.compose ?? ""}
                onChange={(e) =>
                  updateDraft((d) => ({
                    ...d,
                    compose: e.target.value || undefined,
                  }))
                }
                placeholder="e.g.  a&b  ·  a|b  ·  a-b  ·  (a|b)&c"
                className={`w-full ${inputCls} py-1.5`}
              />
              <div className="text-[10px] text-fg-disabled select-none shrink-0">
                click to insert group id
              </div>
              <div className="flex flex-wrap gap-1.5 overflow-y-auto flex-1 min-h-0">
                {groups
                  .filter((g) => g.id !== draft.id)
                  .map((g) => (
                    <button
                      key={g.id}
                      onClick={() => insertAtCompose(g.id)}
                      className="px-2 py-0.5 h-fit text-[10px] border border-border rounded font-mono text-fg-muted hover:border-accent/60 hover:text-fg-primary hover:bg-bg-elevated transition-colors"
                    >
                      {g.id}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(groups.length > 0 || isNew) && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border shrink-0 bg-bg-elevated">
          {!isNew && (
            <DangerIconBtn
              onClick={handleDeleteGroup}
              title="Delete group"
              className="p-1! shrink-0"
            >
              <Trash2 size={13} />
            </DangerIconBtn>
          )}
          <input
            type="text"
            value={draft.id}
            onChange={(e) => updateDraft((d) => ({ ...d, id: e.target.value }))}
            className="flex-1 bg-transparent border-b border-border text-[13px] font-semibold text-fg-primary focus:outline-none focus:border-accent placeholder:text-fg-disabled py-0.5 transition-colors"
            placeholder="Group id"
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
      )}
    </div>
  );
}
