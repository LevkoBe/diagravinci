import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { ForceSimulationService } from "../../application/ForceSimulationService";
import diagramReducer, {
  setViewState,
} from "../../application/store/diagramSlice";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import {
  createEmptyViewState,
  type ViewState,
  type PositionedRelationship,
} from "../../domain/models/ViewState";
import type { AppStore } from "../../application/store/store";

let pendingRafs: FrameRequestCallback[] = [];
let rafCounter = 0;

function flushRaf(count = 1): void {
  for (let i = 0; i < count; i++) {
    const batch = [...pendingRafs];
    pendingRafs = [];
    for (const cb of batch) cb(performance.now());
  }
}

function makeStore(
  viewMode: ViewState["viewMode"] = "force",
  positions: Record<string, { x: number; y: number; size?: number }> = {},
  relationships: PositionedRelationship[] = [],
) {
  const viewState: ViewState = {
    ...createEmptyViewState(),
    viewMode,
    positions: Object.fromEntries(
      Object.entries(positions).map(([path, { x, y, size = 50 }]) => [
        path,
        { id: path.split(".").at(-1)!, position: { x, y }, size, value: 1 },
      ]),
    ),
    relationships,
  };
  return configureStore({
    reducer: { diagram: diagramReducer },
    preloadedState: {
      diagram: {
        model: createEmptyDiagram(),
        viewState,
        code: "",
        canvasSize: { width: 800, height: 600 },
      },
    },
  }) as unknown as AppStore;
}

describe("ForceSimulationService", () => {
  beforeEach(() => {
    pendingRafs = [];
    rafCounter = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pendingRafs.push(cb);
      return ++rafCounter;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      pendingRafs = [];
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isActive returns false before start", () => {
    const svc = new ForceSimulationService();
    expect(svc.isActive()).toBe(false);
  });

  it("isActive returns true after start", () => {
    const store = makeStore("force", { a: { x: 100, y: 100 } });
    const svc = new ForceSimulationService();
    svc.start(store);
    expect(svc.isActive()).toBe(true);
    svc.stop();
  });

  it("stop makes isActive return false", () => {
    const store = makeStore("force", { a: { x: 100, y: 100 } });
    const svc = new ForceSimulationService();
    svc.start(store);
    svc.stop();
    expect(svc.isActive()).toBe(false);
  });

  it("stop cancels pending RAF", () => {
    const store = makeStore("force", { a: { x: 100, y: 100 } });
    const svc = new ForceSimulationService();
    svc.start(store);
    expect(pendingRafs).toHaveLength(1);
    svc.stop();
    expect(pendingRafs).toHaveLength(0);
  });

  it("stop without prior start is a no-op", () => {
    const svc = new ForceSimulationService();
    expect(() => svc.stop()).not.toThrow();
    expect(svc.isActive()).toBe(false);
  });

  it("tick stops service when viewMode is not force", () => {
    const store = makeStore("basic", { a: { x: 100, y: 100 } });
    const svc = new ForceSimulationService();
    svc.start(store);
    flushRaf();
    expect(svc.isActive()).toBe(false);
  });

  it("tick returns early with no top-level nodes", () => {
    const store = makeStore("force", { "a.child": { x: 100, y: 100 } });
    const svc = new ForceSimulationService();
    svc.start(store);
    flushRaf();
    svc.stop();
  });

  it("tick updates node positions in the store", () => {
    const store = makeStore("force", {
      a: { x: 100, y: 100, size: 60 },
      b: { x: 700, y: 500, size: 60 },
    });
    const svc = new ForceSimulationService();
    svc.start(store);
    flushRaf();
    const { viewState } = store.getState().diagram;
    expect(viewState.positions["a"]).toBeDefined();
    expect(viewState.positions["b"]).toBeDefined();
    svc.stop();
  });

  it("tick moves child positions rigidly with parent", () => {
    const store = makeStore("force", {
      a: { x: 100, y: 100, size: 80 },
      "a.child": { x: 120, y: 120, size: 30 },
    });
    const svc = new ForceSimulationService();
    svc.start(store);
    flushRaf();
    const { viewState } = store.getState().diagram;
    expect(viewState.positions["a.child"]).toBeDefined();
    svc.stop();
  });

  it("tick applies spring forces along relationships", () => {
    const store = makeStore(
      "force",
      { a: { x: 100, y: 100, size: 50 }, b: { x: 700, y: 100, size: 50 } },
      [{ id: "r1", sourcePath: "a", targetPath: "b", type: "-->" }],
    );
    const svc = new ForceSimulationService();
    svc.start(store);
    flushRaf();
    const { viewState } = store.getState().diagram;
    expect(viewState.positions["a"]).toBeDefined();
    svc.stop();
  });

  it("tick resets velocity when store position has moved far from sim position", () => {
    const store = makeStore("force", { a: { x: 100, y: 100, size: 50 } });
    const svc = new ForceSimulationService();
    svc.start(store);
    flushRaf();

    const vs = store.getState().diagram.viewState;
    store.dispatch(
      setViewState({
        ...vs,
        positions: {
          ...vs.positions,
          a: { ...vs.positions["a"], position: { x: 600, y: 500 } },
        },
      }),
    );
    flushRaf();
    svc.stop();
  });

  it("tick removes sim state for nodes deleted from the store", () => {
    const store = makeStore("force", {
      a: { x: 100, y: 100 },
      b: { x: 300, y: 300 },
    });
    const svc = new ForceSimulationService();
    svc.start(store);
    flushRaf();
    const vs = store.getState().diagram.viewState;
    const { b: _removed, ...remaining } = vs.positions;
    store.dispatch(setViewState({ ...vs, positions: remaining }));
    flushRaf();
    svc.stop();
  });

  it("tick picks up a node added to the store during simulation", () => {
    const store = makeStore("force", { a: { x: 100, y: 100 } });
    const svc = new ForceSimulationService();
    svc.start(store);
    flushRaf();
    const vs = store.getState().diagram.viewState;
    store.dispatch(
      setViewState({
        ...vs,
        positions: {
          ...vs.positions,
          b: { id: "b", position: { x: 600, y: 100 }, size: 50, value: 1 },
        },
      }),
    );
    flushRaf();
    svc.stop();
  });

  it("tick converges and schedules no further RAF when KE is zero", () => {
    const store = makeStore("force", { a: { x: 400, y: 300 } });
    const svc = new ForceSimulationService();
    svc.start(store);
    flushRaf();
    expect(pendingRafs).toHaveLength(0);
  });

  it("store subscription re-activates RAF loop after convergence when user drags a node", () => {
    const store = makeStore("force", { a: { x: 400, y: 300 } });
    const svc = new ForceSimulationService();
    svc.start(store);
    flushRaf();
    expect(pendingRafs).toHaveLength(0);

    const vs = store.getState().diagram.viewState;
    store.dispatch(
      setViewState({
        ...vs,
        positions: {
          ...vs.positions,
          a: { ...vs.positions["a"], position: { x: 100, y: 100 } },
        },
      }),
    );
    expect(pendingRafs.length).toBeGreaterThan(0);
    svc.stop();
  });
});
