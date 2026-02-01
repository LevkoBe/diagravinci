export type ElementType = "object" | "state" | "function" | "flow" | "choice";
export type FoldState = "expanded" | "collapsed";

export interface Position {
  x: number;
  y: number;
}

export interface Element {
  id: string;
  name: string;
  type: ElementType;
  position: Position;
  foldState: FoldState;
  children: Element[];
  properties: string[];
}

export function createElement(
  id: string,
  name: string,
  type: ElementType,
  position?: Position,
): Element {
  return {
    id,
    name,
    type,
    position: position || { x: 0, y: 0 },
    foldState: "expanded",
    children: [],
    properties: [],
  };
}
