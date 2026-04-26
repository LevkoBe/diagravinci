import Konva from "konva";

export type Colors = {
  accent: string;
  fgPrimary: string;
  selected: string;
  bgSecondary: string;
  relationship: string;
};

export type RenderCallbacks = {
  onPositionChange: (
    path: string,
    worldPos: { x: number; y: number } | null,
  ) => void;
  onReparent: (
    elementId: string,
    oldParentId: string,
    newParentId: string,
  ) => void;
  onClick: (elementId: string, shiftKey: boolean, ctrlKey: boolean) => void;
  onContextMenu?: (elementId: string, path: string) => void;
};

export type EndKind = "none" | "arrow" | "triangle" | "diamond" | "circle";

export interface EndSpec {
  source: EndKind;
  target: EndKind;
  sourceFilled: boolean;
  targetFilled: boolean;
}

export interface ElementRenderResult {
  group: Konva.Group;
  onHoverIn: () => void;
  onHoverOut: () => void;
  tooltipLabel?: string;
}
