import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { AppConfig } from "../../config/appConfig";

export interface TokenInstance {
  id: string;
  currentElementId: string;
  currentPath: string;
  clonedElementIds: string[];
  clonedRelationshipIds: string[];
}

export type ExecutionStatus = "stopped" | "running" | "paused";

interface ExecutionState {
  status: ExecutionStatus;
  tickCount: number;
  instances: TokenInstance[];
  nextInstanceId: number;
  tickIntervalMs: number;
  materialize: boolean;
  executionColor: string;
}

const initialState: ExecutionState = {
  status: "stopped",
  tickCount: 0,
  instances: [],
  nextInstanceId: 0,
  tickIntervalMs: AppConfig.execution.DEFAULT_TICK_INTERVAL_MS,
  materialize: false,
  executionColor: AppConfig.execution.TOKEN_COLOR,
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
