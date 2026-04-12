import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface TokenInstance {
  id: string;
  /** The diagram element this instance is currently anchored to. */
  currentElementId: string;
  /** The viewState path for the current element (e.g. "mid" or "parent.mid"). */
  currentPath: string;
  /** Real element IDs that were added to the model for this instance. */
  clonedElementIds: string[];
  /** Real relationship IDs that were added to the model for this instance. */
  clonedRelationshipIds: string[];
}

export type ExecutionStatus = "stopped" | "running" | "paused";

interface ExecutionState {
  status: ExecutionStatus;
  tickCount: number;
  instances: TokenInstance[];
  /** Auto-increment counter used to generate unique clone suffixes. */
  nextInstanceId: number;
  tickIntervalMs: number;
  /** When true, cloned elements survive a reset (they become permanent). */
  materialize: boolean;
  /** Stroke/fill color applied to generated element clones. */
  executionColor: string;
}

const initialState: ExecutionState = {
  status: "stopped",
  tickCount: 0,
  instances: [],
  nextInstanceId: 0,
  tickIntervalMs: 500,
  materialize: false,
  executionColor: "#f97316",
};

const executionSlice = createSlice({
  name: "execution",
  initialState,
  reducers: {
    startExecution(state) {
      state.status = "running";
    },
    pauseExecution(state) {
      state.status = "paused";
    },
    resetExecution(state) {
      state.status = "stopped";
      state.tickCount = 0;
      state.instances = [];
      state.nextInstanceId = 0;
    },
    tickAdvance(
      state,
      action: PayloadAction<{
        nextInstances: TokenInstance[];
        nextInstanceId: number;
      }>,
    ) {
      state.instances = action.payload.nextInstances;
      state.nextInstanceId = action.payload.nextInstanceId;
      state.tickCount += 1;
    },
    setTickIntervalMs(state, action: PayloadAction<number>) {
      state.tickIntervalMs = action.payload;
    },
    setMaterialize(state, action: PayloadAction<boolean>) {
      state.materialize = action.payload;
    },
    setExecutionColor(state, action: PayloadAction<string>) {
      state.executionColor = action.payload;
    },
  },
});

export const {
  startExecution,
  pauseExecution,
  resetExecution,
  tickAdvance,
  setTickIntervalMs,
  setMaterialize,
  setExecutionColor,
} = executionSlice.actions;

export default executionSlice.reducer;
export type { ExecutionState };
