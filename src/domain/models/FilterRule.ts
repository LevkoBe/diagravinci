export type ElementTypeName =
  | "object"
  | "state"
  | "function"
  | "flow"
  | "choice";

export type FilterMode = "hide" | "dim";

export interface FilterRule {
  id: string;
  types: ElementTypeName[];
  path: string;
}

export interface FilterConfig {
  rules: FilterRule[];
  combiner: string;
  mode: FilterMode;
  isActive: boolean;
}
