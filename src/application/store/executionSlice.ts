import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { AppConfig } from "../../config/appConfig";
import type { RemovedTemplate } from "../ExecutionEngine";

export interface TokenInstance {
  id: string;
  currentElementId: string;
  currentPath: string;
  clonedElementIds: string[];
  clonedRelationshipIds: string[];
  pendingExits?: Array<{ enteredAt: string; exitTargets: string[] }>;
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
  settledCloneIds: string[];
  removedTemplates: RemovedTemplate[];
}

const initialState: ExecutionState = {
  status: "stopped",
  tickCount: 0,
  instances: [],
  nextInstanceId: 0,
  tickIntervalMs: AppConfig.execution.DEFAULT_TICK_INTERVAL_MS,
  materialize: false,
  executionColor: AppConfig.execution.TOKEN_COLOR,
  settledCloneIds: [],
  removedTemplates: [],
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
      state.settledCloneIds = [];
      state.removedTemplates = [];
    },
    tickAdvance(
      state,
      action: PayloadAction<{
        nextInstances: TokenInstance[];
        nextInstanceId: number;
        addSettledIds?: string[];
        removeSettledIds?: string[];
        addRemovedTemplates?: RemovedTemplate[];
      }>,
    ) {
      state.instances = action.payload.nextInstances;
      state.nextInstanceId = action.payload.nextInstanceId;
      state.tickCount += 1;
      if (action.payload.addSettledIds?.length) {
        state.settledCloneIds.push(...action.payload.addSettledIds);
      }
      if (action.payload.removeSettledIds?.length) {
        const removeSet = new Set(action.payload.removeSettledIds);
        state.settledCloneIds = state.settledCloneIds.filter((id) => !removeSet.has(id));
      }
      if (action.payload.addRemovedTemplates?.length) {
        state.removedTemplates.push(...action.payload.addRemovedTemplates);
      }
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
