import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FilterConfig,
  FilterMode,
  FilterRule,
} from "../../domain/models/FilterRule";

const initialState: FilterConfig = {
  rules: [],
  combiner: "",
  mode: "hide",
  isActive: false,
};

const filterSlice = createSlice({
  name: "filter",
  initialState,
  reducers: {
    addRule(state, { payload }: PayloadAction<FilterRule>) {
      state.rules.push(payload);
    },
    updateRule(state, { payload }: PayloadAction<FilterRule>) {
      const idx = state.rules.findIndex((r) => r.id === payload.id);
      if (idx !== -1) state.rules[idx] = payload;
    },
    removeRule(state, { payload }: PayloadAction<string>) {
      state.rules = state.rules.filter((r) => r.id !== payload);
    },
    setCombiner(state, { payload }: PayloadAction<string>) {
      state.combiner = payload;
    },
    setFilterMode(state, { payload }: PayloadAction<FilterMode>) {
      state.mode = payload;
    },
    setFilterActive(state, { payload }: PayloadAction<boolean>) {
      state.isActive = payload;
    },
    setFilterConfig(_state, { payload }: PayloadAction<FilterConfig>) {
      return payload;
    },
  },
});

export const {
  addRule,
  updateRule,
  removeRule,
  setCombiner,
  setFilterMode,
  setFilterActive,
  setFilterConfig,
} = filterSlice.actions;

export default filterSlice.reducer;
