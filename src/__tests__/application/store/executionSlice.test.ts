import { describe, it, expect } from "vitest";
import reducer, {
  startExecution,
  pauseExecution,
  resetExecution,
  tickAdvance,
  setTickIntervalMs,
  setMaterialize,
  setExecutionColor,
  type TokenInstance,
} from "../../../application/store/executionSlice";
import { AppConfig } from "../../../config/appConfig";

const initialState = {
  status: "stopped" as const,
  tickCount: 0,
  instances: [],
  nextInstanceId: 0,
  tickIntervalMs: AppConfig.execution.DEFAULT_TICK_INTERVAL_MS,
  materialize: false,
  executionColor: AppConfig.execution.TOKEN_COLOR,
};

function makeToken(id: string): TokenInstance {
  return { id, currentElementId: "a", currentPath: "a", clonedElementIds: [], clonedRelationshipIds: [] };
}

describe("startExecution", () => {
  it("sets status to running", () => {
    const s = reducer(initialState, startExecution());
    expect(s.status).toBe("running");
  });

  it("transitions from paused to running", () => {
    let s = reducer(initialState, startExecution());
    s = reducer(s, pauseExecution());
    s = reducer(s, startExecution());
    expect(s.status).toBe("running");
  });
});

describe("pauseExecution", () => {
  it("sets status to paused", () => {
    let s = reducer(initialState, startExecution());
    s = reducer(s, pauseExecution());
    expect(s.status).toBe("paused");
  });
});

describe("resetExecution", () => {
  it("resets status, tickCount, instances, and nextInstanceId", () => {
    let s = reducer(initialState, startExecution());
    s = reducer(s, tickAdvance({ nextInstances: [makeToken("t1")], nextInstanceId: 5 }));
    s = reducer(s, resetExecution());
    expect(s.status).toBe("stopped");
    expect(s.tickCount).toBe(0);
    expect(s.instances).toEqual([]);
    expect(s.nextInstanceId).toBe(0);
  });

  it("preserves tickIntervalMs after reset", () => {
    let s = reducer(initialState, setTickIntervalMs(200));
    s = reducer(s, resetExecution());
    expect(s.tickIntervalMs).toBe(200);
  });
});

describe("tickAdvance", () => {
  it("replaces instances and increments tickCount", () => {
    const tokens = [makeToken("t1"), makeToken("t2")];
    const s = reducer(initialState, tickAdvance({ nextInstances: tokens, nextInstanceId: 3 }));
    expect(s.instances).toEqual(tokens);
    expect(s.nextInstanceId).toBe(3);
    expect(s.tickCount).toBe(1);
  });

  it("increments tickCount on each advance", () => {
    let s = reducer(initialState, tickAdvance({ nextInstances: [], nextInstanceId: 0 }));
    s = reducer(s, tickAdvance({ nextInstances: [], nextInstanceId: 0 }));
    s = reducer(s, tickAdvance({ nextInstances: [], nextInstanceId: 0 }));
    expect(s.tickCount).toBe(3);
  });
});

describe("setTickIntervalMs", () => {
  it("updates tickIntervalMs", () => {
    const s = reducer(initialState, setTickIntervalMs(250));
    expect(s.tickIntervalMs).toBe(250);
  });
});

describe("setMaterialize", () => {
  it("sets materialize to true", () => {
    const s = reducer(initialState, setMaterialize(true));
    expect(s.materialize).toBe(true);
  });

  it("sets materialize to false", () => {
    let s = reducer(initialState, setMaterialize(true));
    s = reducer(s, setMaterialize(false));
    expect(s.materialize).toBe(false);
  });
});

describe("setExecutionColor", () => {
  it("updates executionColor", () => {
    const s = reducer(initialState, setExecutionColor("#123456"));
    expect(s.executionColor).toBe("#123456");
  });
});
