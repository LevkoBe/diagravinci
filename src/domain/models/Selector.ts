export type ElementTypeKey =
  | "object"
  | "state"
  | "collection"
  | "function"
  | "flow"
  | "choice";

export type AtomPresetMeta =
  | { kind: "name"; name: string }
  | { kind: "level"; min: number; max: number }
  | { kind: "raw" };

export interface SelectorAtom {
  id: string;
  types: ElementTypeKey[];
  path: string;
  meta: AtomPresetMeta;
}

export interface Selector {
  atoms: SelectorAtom[];
  combiner: string;
}

export const emptyAtom = (): SelectorAtom => ({
  id: crypto.randomUUID(),
  types: [],
  path: "",
  meta: { kind: "raw" },
});

export const emptySelector = (): Selector => ({
  atoms: [],
  combiner: "",
});

export type FilterMode = "hide" | "dim" | "color";

export interface FilterConfig {
  selector: Selector;
  mode: FilterMode;
  isActive: boolean;
}

export interface FilterPreset {
  id: string;
  label: string;
  selector: Selector;
  mode: FilterMode;
  isActive: boolean;
  color: string;
}

export const FOLD_PRESET_ID = "__fold__";
export const SELECTION_PRESET_ID = "_selection";
