import type Konva from "konva";

let _stage: Konva.Stage | null = null;
let _exportPng: (() => Promise<string | null>) | null = null;

export const stageRegistry = {
  set: (s: Konva.Stage | null) => {
    _stage = s;
  },
  get: () => _stage,
  setExportFn: (fn: () => Promise<string | null>) => {
    _exportPng = fn;
  },
  exportPng: (): Promise<string | null> => _exportPng?.() ?? Promise.resolve(null),
};
