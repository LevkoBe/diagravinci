import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { FilterMode, FilterPreset } from "../../domain/models/Selector";

interface FilterState {
  presets: FilterPreset[];
  isModalOpen: boolean;
  activeModalPresetId: string | null;
  foldLevel: number;
  foldActive: boolean;
  manuallyFolded: string[];
  manuallyUnfolded: string[];
  _rev: number;
}

const initialState: FilterState = {
  presets: [],
  isModalOpen: false,
  activeModalPresetId: null,
  foldLevel: 1,
  foldActive: false,
  manuallyFolded: [],
  manuallyUnfolded: [],
  _rev: 0,
};

const filterSlice = createSlice({
  name: "filter",
  initialState,
  reducers: {
    openFilterModal(state) {
      state.isModalOpen = true;
    },
    closeFilterModal(state) {
      state.isModalOpen = false;
    },
    setActiveModalPreset(state, { payload }: PayloadAction<string | null>) {
      state.activeModalPresetId = payload;
    },

    addPreset(state, { payload }: PayloadAction<FilterPreset>) {
      state.presets.push(payload);
      console.log("[filterSlice] addPreset:", payload.id, payload.mode);
      state._rev++;
    },
    updatePreset(state, { payload }: PayloadAction<FilterPreset>) {
      const idx = state.presets.findIndex((p) => p.id === payload.id);
      if (idx !== -1) state.presets[idx] = payload;
      console.log("[filterSlice] updatePreset:", payload.id);
      state._rev++;
    },
    removePreset(state, { payload: id }: PayloadAction<string>) {
      state.presets = state.presets.filter((p) => p.id !== id);
      if (state.activeModalPresetId === id) state.activeModalPresetId = null;
      console.log("[filterSlice] removePreset:", id);
      state._rev++;
    },
    togglePresetActive(state, { payload: id }: PayloadAction<string>) {
      const preset = state.presets.find((p) => p.id === id);
      if (preset) {
        preset.isActive = !preset.isActive;
        console.log(`[filterSlice] togglePreset: ${id} -> ${preset.isActive}`);
      }
      state._rev++;
    },
    setPresetMode(
      state,
      {
        payload: { id, mode },
      }: PayloadAction<{ id: string; mode: FilterMode }>,
    ) {
      const preset = state.presets.find((p) => p.id === id);
      if (preset) {
        preset.mode = mode;
        console.log("[filterSlice] setPresetMode:", id, "->", mode);
      }
      state._rev++;
    },
    setPresetColor(
      state,
      { payload: { id, color } }: PayloadAction<{ id: string; color: string }>,
    ) {
      const preset = state.presets.find((p) => p.id === id);
      if (preset) {
        preset.color = color;
      }
      state._rev++;
    },

    setFoldLevel(state, { payload: level }: PayloadAction<number>) {
      state.foldLevel = Math.max(1, level);
      console.log("[filterSlice] setFoldLevel:", state.foldLevel);
      state._rev++;
    },
    setFoldActive(state, { payload: active }: PayloadAction<boolean>) {
      state.foldActive = active;
      console.log("[filterSlice] setFoldActive:", active);
      state._rev++;
    },
    toggleFoldActive(state) {
      state.foldActive = !state.foldActive;
      state.manuallyFolded = [];
      state.manuallyUnfolded = [];
      console.log("[filterSlice] toggleFoldActive ->", state.foldActive);
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
        console.log("[filterSlice] toggleElementFold: UNFOLDED", path);
      } else {
        if (!state.manuallyFolded.includes(path)) {
          state.manuallyFolded.push(path);
        }
        state.manuallyUnfolded = state.manuallyUnfolded.filter(
          (p) => p !== path,
        );
        console.log("[filterSlice] toggleElementFold: FOLDED", path);
      }
      state._rev++;
    },

    clearFoldOverrides(state) {
      state.manuallyFolded = [];
      state.manuallyUnfolded = [];
      console.log("[filterSlice] clearFoldOverrides");
      state._rev++;
    },

    movePresetUp(state, { payload: id }: PayloadAction<string>) {
      const idx = state.presets.findIndex((p) => p.id === id);
      if (idx <= 0) return;
      const tmp = state.presets[idx - 1];
      state.presets[idx - 1] = state.presets[idx];
      state.presets[idx] = tmp;
      state._rev++;
    },
    movePresetDown(state, { payload: id }: PayloadAction<string>) {
      const idx = state.presets.findIndex((p) => p.id === id);
      if (idx < 0 || idx >= state.presets.length - 1) return;
      const tmp = state.presets[idx + 1];
      state.presets[idx + 1] = state.presets[idx];
      state.presets[idx] = tmp;
      state._rev++;
    },
    cyclePreset(state, { payload: id }: PayloadAction<string>) {
      const preset = state.presets.find((p) => p.id === id);
      if (!preset) return;
      if (!preset.isActive) {
        preset.isActive = true;
        preset.mode = "color";
      } else if (preset.mode === "color") {
        preset.mode = "dim";
      } else if (preset.mode === "dim") {
        preset.mode = "hide";
      } else {
        preset.isActive = false;
      }
      state._rev++;
    },
    syncPresetsFromTab(
      state,
      { payload }: PayloadAction<Array<Omit<FilterPreset, "isActive">>>,
    ) {
      const localActives = new Map(state.presets.map((p) => [p.id, p.isActive]));
      state.presets = payload.map((p) => ({
        ...p,
        isActive: localActives.get(p.id) ?? false,
      }));
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
  },
});

export const {
  openFilterModal,
  closeFilterModal,
  setActiveModalPreset,
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
} = filterSlice.actions;

export default filterSlice.reducer;
export type { FilterState };
