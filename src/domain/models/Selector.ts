export type ElementTypeKey =
  | "object"
  | "state"
  | "collection"
  | "function"
  | "flow"
  | "choice";

export interface Rule {
  id: string;
  patterns: Record<string, string>;
}

export type SelectorMode = "color" | "dim" | "hide" | "off";

export interface Selector {
  id: string;
  label: string;
  expression: string;
  color: string;
}

export interface Group {
  id: string;
  label: string;
  rule: string;
  color: string;
}

export interface Session {
  id: string;
  label: string;
  groupModes: Record<string, SelectorMode>;
}

export const FOLD_SELECTOR_ID = "__fold__";

export function toSelectorId(label: string): string {
  const slug = label.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "selector";
}

export function toGroupId(label: string): string {
  return toSelectorId(label);
}
