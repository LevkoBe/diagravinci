import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Selector, Group } from "../../domain/models/Selector";

interface FilterState {
  selectors: Selector[];
  groups: Group[];
  foldLevel: number;
  foldActive: boolean;
  manuallyFolded: string[];
  manuallyUnfolded: string[];
  _rev: number;
}

const initialState: FilterState = {
  selectors: [],
  groups: [],
  foldLevel: 1,
  foldActive: false,
  manuallyFolded: [],
  manuallyUnfolded: [],
  _rev: 0,
};

function swapSelectors(state: FilterState, id: string, dir: 1 | -1): void {
  const idx = state.selectors.findIndex((s) => s.id === id);
  if (idx < 0) return;
  const target = idx + dir;
  if (target < 0 || target >= state.selectors.length) return;
  [state.selectors[idx], state.selectors[target]] = [
    state.selectors[target],
    state.selectors[idx],
  ];
  state._rev++;
}

const filterSlice = createSlice({
  name: "filter",
  initialState,
  reducers: {
    addSelector(state, { payload }: PayloadAction<Selector>) {
      state.selectors.push(payload);
      state._rev++;
    },
    updateSelector(state, { payload }: PayloadAction<Selector>) {
      const idx = state.selectors.findIndex((s) => s.id === payload.id);
      if (idx !== -1) state.selectors[idx] = payload;
      state._rev++;
    },
    removeSelector(state, { payload: id }: PayloadAction<string>) {
      state.selectors = state.selectors.filter((s) => s.id !== id);
      state._rev++;
    },
    setSelectorColor(
      state,
      { payload: { id, color } }: PayloadAction<{ id: string; color: string }>,
    ) {
      const sel = state.selectors.find((s) => s.id === id);
      if (sel) sel.color = color;
      state._rev++;
    },

    addGroup(state, { payload }: PayloadAction<Group>) {
      state.groups.push(payload);
      state._rev++;
    },
    updateGroup(state, { payload }: PayloadAction<Group>) {
      const idx = state.groups.findIndex((g) => g.id === payload.id);
      if (idx !== -1) state.groups[idx] = payload;
      state._rev++;
    },
    removeGroup(state, { payload: id }: PayloadAction<string>) {
      state.groups = state.groups.filter((g) => g.id !== id);
      state._rev++;
    },
    setGroupColor(
      state,
      { payload: { id, color } }: PayloadAction<{ id: string; color: string }>,
    ) {
      const grp = state.groups.find((g) => g.id === id);
      if (grp) grp.color = color;
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

    moveSelectorUp(state, { payload: id }: PayloadAction<string>) {
      swapSelectors(state, id, -1);
    },
    moveSelectorDown(state, { payload: id }: PayloadAction<string>) {
      swapSelectors(state, id, 1);
    },
    syncSelectorsFromTab(state, { payload }: PayloadAction<Selector[]>) {
      state.selectors = payload;
      state._rev++;
    },
    syncGroupsFromTab(state, { payload }: PayloadAction<Group[]>) {
      state.groups = payload;
      state._rev++;
    },

    restoreFilterState(
      state,
      {
        payload,
      }: PayloadAction<{
        selectors: Selector[];
        groups?: Group[];
        foldLevel: number;
        foldActive: boolean;
        manuallyFolded: string[];
        manuallyUnfolded: string[];
      }>,
    ) {
      state.selectors = payload.selectors;
      state.groups = payload.groups ?? [];
      state.foldLevel = payload.foldLevel;
      state.foldActive = payload.foldActive;
      state.manuallyFolded = payload.manuallyFolded;
      state.manuallyUnfolded = payload.manuallyUnfolded;
      state._rev++;
    },

    syncSelectorsFromCode(
      state,
      {
        payload: { modelSelectors, prevModelSelectorIds },
      }: PayloadAction<{
        modelSelectors: Selector[];
        prevModelSelectorIds: string[];
      }>,
    ) {
      const prevCodeIds = new Set(prevModelSelectorIds);
      const newCodeIds = new Set(modelSelectors.map((s) => s.id));

      state.selectors = state.selectors.filter(
        (s) => !prevCodeIds.has(s.id) || newCodeIds.has(s.id),
      );

      for (const modelSelector of modelSelectors) {
        const idx = state.selectors.findIndex((s) => s.id === modelSelector.id);
        if (idx !== -1) {
          state.selectors[idx] = {
            ...modelSelector,
            label: state.selectors[idx].label,
          };
        } else {
          state.selectors.push(modelSelector);
        }
      }

      state._rev++;
    },

    syncGroupsFromCode(
      state,
      {
        payload: { modelGroups, prevModelGroupIds },
      }: PayloadAction<{
        modelGroups: Group[];
        prevModelGroupIds: string[];
      }>,
    ) {
      const prevCodeIds = new Set(prevModelGroupIds);
      const newCodeIds = new Set(modelGroups.map((g) => g.id));

      state.groups = state.groups.filter(
        (g) => !prevCodeIds.has(g.id) || newCodeIds.has(g.id),
      );

      for (const modelGroup of modelGroups) {
        const idx = state.groups.findIndex((g) => g.id === modelGroup.id);
        if (idx !== -1) {
          state.groups[idx] = { ...modelGroup };
        } else {
          state.groups.push(modelGroup);
        }
      }

      state._rev++;
    },
  },
});

export const {
  addSelector,
  updateSelector,
  removeSelector,
  setSelectorColor,
  addGroup,
  updateGroup,
  removeGroup,
  setGroupColor,
  setFoldLevel,
  setFoldActive,
  toggleFoldActive,
  toggleElementFold,
  clearFoldOverrides,
  moveSelectorUp,
  moveSelectorDown,
  syncSelectorsFromTab,
  syncGroupsFromTab,
  restoreFilterState,
  syncSelectorsFromCode,
  syncGroupsFromCode,
} = filterSlice.actions;

export default filterSlice.reducer;
export type { FilterState };
