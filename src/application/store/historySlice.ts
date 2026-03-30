import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type {
  PositionedElement,
  PositionedRelationship,
  ViewState,
} from "../../domain/models/ViewState";

export interface HistoryEntry {
  code: string;
  model: DiagramModel;
  positions: Record<string, PositionedElement>;
  relationships: PositionedRelationship[];
  viewMode: ViewState["viewMode"];
}

interface HistoryState {
  past: HistoryEntry[];
  present: HistoryEntry | null;
  future: HistoryEntry[];
}

const MAX_HISTORY = 50;

function positionSignature(
  positions: Record<string, PositionedElement>,
): string {
  return Object.entries(positions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([k, v]) =>
        `${k}:${Math.round(v.position.x / 5) * 5},${Math.round(v.position.y / 5) * 5}`,
    )
    .join("|");
}

export function entriesEqual(a: HistoryEntry, b: HistoryEntry): boolean {
  return (
    a.code === b.code &&
    a.viewMode === b.viewMode &&
    positionSignature(a.positions) === positionSignature(b.positions)
  );
}

const initialState: HistoryState = {
  past: [],
  present: null,
  future: [],
};

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    pushHistory(state, { payload }: PayloadAction<HistoryEntry>) {
      if (state.present && entriesEqual(state.present, payload)) return;

      if (state.present) {
        state.past.push(state.present);
        if (state.past.length > MAX_HISTORY) {
          state.past.shift();
        }
      }
      state.present = payload;
      state.future = [];
    },
    undoHistory(state) {
      if (state.past.length === 0) return;
      if (state.present) {
        state.future.unshift(state.present);
      }
      state.present = state.past.pop()!;
    },
    redoHistory(state) {
      if (state.future.length === 0) return;
      if (state.present) {
        state.past.push(state.present);
      }
      state.present = state.future.shift()!;
    },
  },
});

export const { pushHistory, undoHistory, redoHistory } = historySlice.actions;
export default historySlice.reducer;
export type { HistoryState };
