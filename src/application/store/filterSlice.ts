import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { FilterMode, FilterPreset } from "../../domain/models/Selector";
import {
  SELECTION_PRESET_ID,
  emptySelector,
} from "../../domain/models/Selector";

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSelectionPreset(ids: string[], color: string): FilterPreset {
  const escaped = ids.map(escapeForRegex);
  const pattern =
    ids.length === 1
      ? `(^|\\.)${escaped[0]}$`
      : `(^|\\.)(${escaped.join("|")})$`;
  return {
    id: SELECTION_PRESET_ID,
    label: "Selection",
    selector: emptySelector(),
    selectionPattern: pattern,
    mode: "color",
    isActive: true,
    color,
  };
}

interface FilterState {
  presets: FilterPreset[];
  foldLevel: number;
  foldActive: boolean;
  manuallyFolded: string[];
  manuallyUnfolded: string[];
  _rev: number;
}

const initialState: FilterState = {
  presets: [],
  foldLevel: 1,
  foldActive: false,
  manuallyFolded: [],
  manuallyUnfolded: [],
  _rev: 0,
};

function swapPresets(state: FilterState, id: string, dir: 1 | -1): void {
  const idx = state.presets.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const target = idx + dir;
  if (target < 0 || target >= state.presets.length) return;
  [state.presets[idx], state.presets[target]] = [
    state.presets[target],
    state.presets[idx],
  ];
  state._rev++;
}

const CYCLE_MAP: Record<string, [FilterMode, boolean]> = {
  "color:false": ["color", true],
  "dim:false": ["color", true],
  "hide:false": ["color", true],
  "color:true": ["dim", true],
  "dim:true": ["hide", true],
  "hide:true": ["hide", false],
};

const filterSlice = createSlice({
  name: "filter",
  initialState,
  reducers: {
    addPreset(state, { payload }: PayloadAction<FilterPreset>) {
      state.presets.push(payload);
      state._rev++;
    },
    updatePreset(state, { payload }: PayloadAction<FilterPreset>) {
      const idx = state.presets.findIndex((p) => p.id === payload.id);
      if (idx !== -1) state.presets[idx] = payload;
      state._rev++;
    },
    removePreset(state, { payload: id }: PayloadAction<string>) {
      state.presets = state.presets.filter((p) => p.id !== id);
      state._rev++;
    },
    togglePresetActive(state, { payload: id }: PayloadAction<string>) {
      const preset = state.presets.find((p) => p.id === id);
      if (preset) preset.isActive = !preset.isActive;
      state._rev++;
    },
    setPresetMode(
      state,
      {
        payload: { id, mode },
      }: PayloadAction<{ id: string; mode: FilterMode }>,
    ) {
      const preset = state.presets.find((p) => p.id === id);
      if (preset) preset.mode = mode;
      state._rev++;
    },
    setPresetColor(
      state,
      { payload: { id, color } }: PayloadAction<{ id: string; color: string }>,
    ) {
      const preset = state.presets.find((p) => p.id === id);
      if (preset) preset.color = color;
      state._rev++;
    },

    setFoldLevel(state, { payload: level }: PayloadAction<number>) {
      state.foldLevel = Math.max(1, level);
      state._rev++;
    },
    setFoldActive(state, { payload: active }: PayloadAction<boolean>) {
      state.foldActive = active;
      state._rev++;
    },
    toggleFoldActive(state) {
      state.foldActive = !state.foldActive;
      state.manuallyFolded = [];
      state.manuallyUnfolded = [];
      state._rev++;
    },
    toggleElementFold(
      state,
      {
        payload: { path, currentlyFolded },
      }: PayloadAction<{ path: string; currentlyFolded: boolean }>,
    ) {
      if (currentlyFolded) {
        state.manuallyFolded = state.manuallyFolded.filter((p) => p !== path);
        if (!state.manuallyUnfolded.includes(path)) {
          state.manuallyUnfolded.push(path);
        }
      } else {
        if (!state.manuallyFolded.includes(path)) {
          state.manuallyFolded.push(path);
        }
        state.manuallyUnfolded = state.manuallyUnfolded.filter(
          (p) => p !== path,
        );
      }
      state._rev++;
    },

    clearFoldOverrides(state) {
      state.manuallyFolded = [];
      state.manuallyUnfolded = [];
      state._rev++;
    },

    movePresetUp(state, { payload: id }: PayloadAction<string>) {
      swapPresets(state, id, -1);
    },
    movePresetDown(state, { payload: id }: PayloadAction<string>) {
      swapPresets(state, id, 1);
    },
    cyclePreset(state, { payload: id }: PayloadAction<string>) {
      const preset = state.presets.find((p) => p.id === id);
      if (!preset) return;
      const next = CYCLE_MAP[`${preset.mode}:${preset.isActive}`];
      if (next) [preset.mode, preset.isActive] = next;
      state._rev++;
    },
    syncPresetsFromTab(
      state,
      { payload }: PayloadAction<Array<Omit<FilterPreset, "isActive">>>,
    ) {
      const localActives = new Map(
        state.presets.map((p) => [p.id, p.isActive]),
      );
      state.presets = payload.map((p) => ({
        ...p,
        isActive: localActives.get(p.id) ?? false,
      }));
      state._rev++;
    },
    setSelectionPreset(
      state,
      {
        payload: { ids, color },
      }: PayloadAction<{ ids: string[]; color: string }>,
    ) {
      state.presets = state.presets.filter((p) => p.id !== SELECTION_PRESET_ID);
      if (ids.length > 0) {
        state.presets.push(buildSelectionPreset(ids, color));
      }
      state._rev++;
    },

    restoreFilterState(
      state,
      {
        payload,
      }: PayloadAction<{
        presets: FilterPreset[];
        foldLevel: number;
        foldActive: boolean;
        manuallyFolded: string[];
        manuallyUnfolded: string[];
      }>,
    ) {
      state.presets = payload.presets;
      state.foldLevel = payload.foldLevel;
      state.foldActive = payload.foldActive;
      state.manuallyFolded = payload.manuallyFolded;
      state.manuallyUnfolded = payload.manuallyUnfolded;
      state._rev++;
    },

    syncPresetsFromCode(
      state,
      {
        payload: { modelPresets, prevModelPresetIds },
      }: PayloadAction<{
        modelPresets: FilterPreset[];
        prevModelPresetIds: string[];
      }>,
    ) {
      const prevCodeIds = new Set(prevModelPresetIds);
      const newCodeIds = new Set(modelPresets.map((p) => p.id));
      const localActives = new Map(
        state.presets.map((p) => [p.id, p.isActive]),
      );

      state.presets = state.presets.filter(
        (p) => !prevCodeIds.has(p.id) || newCodeIds.has(p.id),
      );

      for (const modelPreset of modelPresets) {
        const idx = state.presets.findIndex((p) => p.id === modelPreset.id);
        const isActive = localActives.has(modelPreset.id)
          ? localActives.get(modelPreset.id)!
          : true;
        if (idx !== -1) {
          state.presets[idx] = { ...modelPreset, isActive };
        } else {
          state.presets.push({ ...modelPreset, isActive: true });
        }
      }

      state._rev++;
    },
  },
});

export const {
  addPreset,
  updatePreset,
  removePreset,
  togglePresetActive,
  setPresetMode,
  setPresetColor,
  setFoldLevel,
  setFoldActive,
  toggleFoldActive,
  toggleElementFold,
  clearFoldOverrides,
  movePresetUp,
  movePresetDown,
  cyclePreset,
  syncPresetsFromTab,
  restoreFilterState,
  setSelectionPreset,
  syncPresetsFromCode,
} = filterSlice.actions;

export default filterSlice.reducer;
export type { FilterState };
