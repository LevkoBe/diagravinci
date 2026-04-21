export type ElementTypeKey =
  | "object"
  | "state"
  | "collection"
  | "function"
  | "flow"
  | "choice";

export interface SelectorAtom {
  id: string;
  name?: string;
  patterns: Record<string, string>;
}

export interface Selector {
  combiner: string;
}

export const emptySelector = (): Selector => ({ combiner: "" });

export type FilterMode = "hide" | "dim" | "color";

export interface FilterPreset {
  id: string;
  label: string;
  selector: Selector;
  mode: FilterMode;
  isActive: boolean;
  color: string;
  selectionPattern?: string;
}

export const FOLD_PRESET_ID = "__fold__";
export const SELECTION_PRESET_ID = "_selection";
