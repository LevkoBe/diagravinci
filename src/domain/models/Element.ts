export type ElementType = "object" | "state" | "function" | "flow" | "choice";
export type FoldState = "expanded" | "collapsed";

export interface Position {
  x: number;
  y: number;
}

export interface Element {
  id: string;
  type: ElementType;
  position: Position;
  foldState: FoldState;
  childIds: string[];
}

export function createElement(
  id: string,
  type: ElementType,
  position?: Position,
): Element {
  return {
    id,
    type,
    position: position || { x: 0, y: 0 },
    foldState: "expanded",
    childIds: [],
  };
}
