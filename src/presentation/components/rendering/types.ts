export type Colors = {
  accent: string;
  fgPrimary: string;
  selected: string;
  bgSecondary: string;
  relationship: string;
};

export type RenderCallbacks = {
  onPositionChange: (path: string, worldPos: { x: number; y: number }) => void;
  onReparent: (
    elementId: string,
    oldParentId: string,
    newParentId: string,
  ) => void;
  onClick: (elementId: string) => void;
};

export type EndKind = "none" | "arrow" | "triangle" | "diamond" | "circle";

export interface EndSpec {
  source: EndKind;
  target: EndKind;
  sourceFilled: boolean;
  targetFilled: boolean;
}
