import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Selector, SelectorMode } from "../../domain/models/Selector";
import { SELECTION_SELECTOR_ID } from "../../domain/models/Selector";

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSelectionSelector(ids: string[], color: string): Selector {
  const escaped = ids.map(escapeForRegex);
  const pattern =
    ids.length === 1
      ? `(^|\\.)${escaped[0]}$`
      : `(^|\\.)(${escaped.join("|")})$`;
  return {
    id: SELECTION_SELECTOR_ID,
    label: "Selection",
    expression: "",
    selectionPattern: pattern,
    mode: "color",
    color,
  };
}

interface FilterState {
  selectors: Selector[];
  foldLevel: number;
  foldActive: boolean;
  manuallyFolded: string[];
  manuallyUnfolded: string[];
  _rev: number;
}

const initialState: FilterState = {
  selectors: [],
  foldLevel: 1,
  foldActive: false,
  manuallyFolded: [],
  manuallyUnfolded: [],
  _rev: 0,
};

const MODE_CYCLE: SelectorMode[] = ["color", "dim", "hide", "off"];

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
    setSelectorMode(
      state,
      {
        payload: { id, mode },
      }: PayloadAction<{ id: string; mode: SelectorMode }>,
    ) {
      const sel = state.selectors.find((s) => s.id === id);
      if (sel) sel.mode = mode;
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
    cycleSelector(state, { payload: id }: PayloadAction<string>) {
      const sel = state.selectors.find((s) => s.id === id);
      if (!sel) return;
      const idx = MODE_CYCLE.indexOf(sel.mode);
      sel.mode = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
      state._rev++;
    },

    syncSelectorsFromTab(state, { payload }: PayloadAction<Selector[]>) {
      state.selectors = payload;
      state._rev++;
    },

    setSelectionSelector(
      state,
      {
        payload: { ids, color },
      }: PayloadAction<{ ids: string[]; color: string }>,
    ) {
      state.selectors = state.selectors.filter(
        (s) => s.id !== SELECTION_SELECTOR_ID,
      );
      if (ids.length > 0) {
        state.selectors.push(buildSelectionSelector(ids, color));
      }
      state._rev++;
    },

    restoreFilterState(
      state,
      {
        payload,
      }: PayloadAction<{
        selectors: Selector[];
        foldLevel: number;
        foldActive: boolean;
        manuallyFolded: string[];
        manuallyUnfolded: string[];
      }>,
    ) {
      state.selectors = payload.selectors;
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
  },
});

export const {
  addSelector,
  updateSelector,
  removeSelector,
  setSelectorMode,
  setSelectorColor,
  setFoldLevel,
  setFoldActive,
  toggleFoldActive,
  toggleElementFold,
  clearFoldOverrides,
  moveSelectorUp,
  moveSelectorDown,
  cycleSelector,
  syncSelectorsFromTab,
  restoreFilterState,
  setSelectionSelector,
  syncSelectorsFromCode,
} = filterSlice.actions;

export default filterSlice.reducer;
export type { FilterState };
