export type ElementType = "object" | "state" | "function" | "flow" | "choice";
export type FoldState = "expanded" | "collapsed";

export interface Position {
  x: number;
  y: number;
}

export interface Element {
  id: string;
  type: ElementType;
  foldState: FoldState;
  childIds: string[];
}

export function createElement(id: string, type: ElementType): Element {
  return {
    id,
    type,
    foldState: "expanded",
    childIds: [],
  };
}
