import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface DiffState {
  active: boolean;
  addedIds: string[];
  removedIds: string[];
}

const initialState: DiffState = {
  active: false,
  addedIds: [],
  removedIds: [],
};

const diffSlice = createSlice({
  name: "diff",
  initialState,
  reducers: {
    setDiff(
      state,
      { payload }: PayloadAction<{ addedIds: string[]; removedIds: string[] }>,
    ) {
      state.active = true;
      state.addedIds = payload.addedIds;
      state.removedIds = payload.removedIds;
    },
    acceptDiffId(state, { payload: id }: PayloadAction<string>) {
      state.addedIds = state.addedIds.filter((x) => x !== id);
      state.removedIds = state.removedIds.filter((x) => x !== id);
      if (state.addedIds.length === 0 && state.removedIds.length === 0) {
        state.active = false;
      }
    },
    clearAllAdded(state) {
      state.addedIds = [];
      if (state.removedIds.length === 0) state.active = false;
    },
    clearAllRemoved(state) {
      state.removedIds = [];
      if (state.addedIds.length === 0) state.active = false;
    },
    clearDiff(state) {
      state.active = false;
      state.addedIds = [];
      state.removedIds = [];
    },
  },
});

export const {
  setDiff,
  acceptDiffId,
  clearAllAdded,
  clearAllRemoved,
  clearDiff,
} = diffSlice.actions;
export default diffSlice.reducer;
export type { DiffState };
