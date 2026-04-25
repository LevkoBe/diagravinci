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
  mode: SelectorMode;
  color: string;
  selectionPattern?: string;
}

export const FOLD_SELECTOR_ID = "__fold__";
export const SELECTION_SELECTOR_ID = "_selection";

export function toSelectorId(label: string): string {
  const slug = label.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "selector";
}
