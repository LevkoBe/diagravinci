import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { applyReparent } from "../../application/reparent";
import { SyncManager } from "../../application/SyncManager";
import type { AppStore } from "../../application/store/store";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import { createElement } from "../../domain/models/Element";
import { createEmptyViewState } from "../../domain/models/ViewState";
import diagramReducer, { setModel, setViewState } from "../../application/store/diagramSlice";

function makeTestStore(model = createEmptyDiagram(), viewState = createEmptyViewState()) {
  const store = configureStore({
    reducer: { diagram: diagramReducer },
    preloadedState: {
      diagram: {
        model,
        viewState,
        code: "",
        canvasSize: { width: 800, height: 600 },
        history: [],
        historyIndex: -1,
      },
    },
  });
  return store;
}

/**
 * Build the model that `a{a}` produces: root → a, and a.childIds = ["a"] (self-ref).
 */
function buildSelfRefModel() {
  const model = createEmptyDiagram();
  const elemA = createElement("a", "object");
  elemA.childIds = ["a"];
  model.elements["a"] = elemA;
  model.root = { ...model.root, childIds: ["a"] };
  return model;
}

describe("applyReparent – a{a}: move inner a to root", () => {
  it("does not create duplicate entries in root.childIds", () => {
    const model = buildSelfRefModel();
    // inner "a" is a child of outer "a"; oldParentPath is outer "a"'s path
    const updated = applyReparent(model, "a", "a", model.root.id);

    const count = updated.root.childIds.filter((id) => id === "a").length;
    expect(count).toBe(1); // FAILS before fix: count is 2
  });

  it("removes the self-reference from element childIds", () => {
    const model = buildSelfRefModel();
    const updated = applyReparent(model, "a", "a", model.root.id);
    expect(updated.elements["a"].childIds).not.toContain("a");
  });
});

describe("SyncManager.syncFromVis – path remapping removes stale old key", () => {
  it('removes "a.a" from positions after remapping it to "a"', () => {
    const model = buildSelfRefModel();

    const viewState = createEmptyViewState();
    viewState.positions["a"] = { id: "a", position: { x: 100, y: 100 }, size: 60, value: 1 };
    viewState.positions["a.a"] = { id: "a", position: { x: 50, y: 50 }, size: 40, value: 1 };

    const store = makeTestStore(model, viewState);
    store.dispatch(setModel(model));
    store.dispatch(setViewState(viewState));

    const noop = { parse: (_: string) => createEmptyDiagram(), generate: () => "" };
    const syncManager = new SyncManager(store as unknown as AppStore, noop, noop);

    // After reparenting inner "a" (path "a.a") to root (new path "a")
    const updatedModel = applyReparent(model, "a", "a", model.root.id);
    syncManager.syncFromVis(updatedModel, true, { oldPrefix: "a.a", newPrefix: "a" });

    const finalPositions = store.getState().diagram.viewState.positions;
    expect(finalPositions["a.a"]).toBeUndefined(); // FAILS before fix: "a.a" lingers
  });
});
