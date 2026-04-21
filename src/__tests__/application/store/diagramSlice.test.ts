import { describe, it, expect } from "vitest";
import reducer, {
  setModel,
  setViewState,
  setCode,
  setCanvasSize,
  updateElementPositionInView,
  upsertElement,
  removeElement,
  upsertRelationship,
  removeRelationship,
  setViewMode,
  pruneElements,
  restoreHistory,
} from "../../../application/store/diagramSlice";
import { createEmptyDiagram } from "../../../domain/models/DiagramModel";
import { createElement } from "../../../domain/models/Element";
import { createRelationship } from "../../../domain/models/Relationship";
import { createEmptyViewState } from "../../../domain/models/ViewState";

describe("diagramSlice", () => {
  it("has correct initial state shape", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.code).toBe("");
    expect(state.canvasSize).toEqual({ width: 800, height: 600 });
    expect(state.model).toBeDefined();
    expect(state.viewState).toBeDefined();
  });

  describe("setModel", () => {
    it("replaces the model", () => {
      const newModel = createEmptyDiagram();
      newModel.elements["a"] = createElement("a", "object");
      const state = reducer(undefined, setModel(newModel));
      expect(state.model.elements["a"]).toBeDefined();
    });
  });

  describe("setViewState", () => {
    it("replaces the viewState", () => {
      const vs = createEmptyViewState();
      vs.zoom = 2;
      const state = reducer(undefined, setViewState(vs));
      expect(state.viewState.zoom).toBe(2);
    });
  });

  describe("setCode", () => {
    it("sets the code string", () => {
      const state = reducer(undefined, setCode("a --> b"));
      expect(state.code).toBe("a --> b");
    });
  });

  describe("setCanvasSize", () => {
    it("updates canvas dimensions", () => {
      const state = reducer(
        undefined,
        setCanvasSize({ width: 1200, height: 900 }),
      );
      expect(state.canvasSize).toEqual({ width: 1200, height: 900 });
    });
  });

  describe("updateElementPositionInView", () => {
    it("updates position of an existing positioned element", () => {
      const vs = createEmptyViewState();
      vs.positions["a"] = {
        id: "a",
        position: { x: 0, y: 0 },
        size: 60,
        value: 1,
      };
      const base = reducer(undefined, setViewState(vs));
      const next = reducer(
        base,
        updateElementPositionInView({ id: "a", position: { x: 100, y: 200 } }),
      );
      expect(next.viewState.positions["a"].position).toEqual({
        x: 100,
        y: 200,
      });
    });

    it("does nothing for an unknown element id", () => {
      const state = reducer(
        undefined,
        updateElementPositionInView({ id: "ghost", position: { x: 1, y: 2 } }),
      );
      expect(state.viewState.positions["ghost"]).toBeUndefined();
    });
  });

  describe("upsertElement", () => {
    it("adds a new element", () => {
      const el = createElement("b", "state");
      const state = reducer(undefined, upsertElement(el));
      expect(state.model.elements["b"]).toEqual(el);
    });

    it("overwrites an existing element", () => {
      const el1 = createElement("b", "state");
      const el2 = { ...createElement("b", "function") };
      const s1 = reducer(undefined, upsertElement(el1));
      const s2 = reducer(s1, upsertElement(el2));
      expect(s2.model.elements["b"].type).toBe("function");
    });
  });

  describe("removeElement", () => {
    it("removes an element by id", () => {
      const el = createElement("x", "object");
      const s1 = reducer(undefined, upsertElement(el));
      const s2 = reducer(s1, removeElement("x"));
      expect(s2.model.elements["x"]).toBeUndefined();
    });
  });

  describe("upsertRelationship", () => {
    it("adds a relationship", () => {
      const rel = createRelationship("r1", "a", "b", "-->");
      const state = reducer(undefined, upsertRelationship(rel));
      expect(state.model.relationships["r1"]).toEqual(rel);
    });
  });

  describe("removeRelationship", () => {
    it("removes a relationship by id", () => {
      const rel = createRelationship("r1", "a", "b", "-->");
      const s1 = reducer(undefined, upsertRelationship(rel));
      const s2 = reducer(s1, removeRelationship("r1"));
      expect(s2.model.relationships["r1"]).toBeUndefined();
    });
  });

  describe("setViewMode", () => {
    it("updates the view mode", () => {
      const state = reducer(undefined, setViewMode("hierarchical"));
      expect(state.viewState.viewMode).toBe("hierarchical");
    });
  });

  describe("pruneElements", () => {
    it("removes specified elements from model", () => {
      const s1 = reducer(undefined, upsertElement(createElement("a", "object")));
      const s2 = reducer(s1, upsertElement(createElement("b", "object")));
      const s3 = reducer(s2, pruneElements(["a"]));
      expect(s3.model.elements["a"]).toBeUndefined();
      expect(s3.model.elements["b"]).toBeDefined();
    });

    it("removes pruned ids from root.childIds", () => {
      const model = createEmptyDiagram();
      model.root.childIds = ["a", "b", "c"];
      model.elements["a"] = createElement("a", "object");
      model.elements["b"] = createElement("b", "object");
      model.elements["c"] = createElement("c", "object");
      const s1 = reducer(undefined, setModel(model));
      const s2 = reducer(s1, pruneElements(["a", "c"]));
      expect(s2.model.root.childIds).toEqual(["b"]);
    });

    it("handles pruning non-existent ids gracefully", () => {
      const state = reducer(undefined, pruneElements(["ghost"]));
      expect(state.model.elements["ghost"]).toBeUndefined();
    });
  });

  describe("restoreHistory", () => {
    it("restores code, model, positions, relationships, and viewMode", () => {
      const model = createEmptyDiagram();
      model.elements["x"] = createElement("x", "state");
      const state = reducer(undefined, restoreHistory({
        code: "x",
        model,
        positions: { "x": { id: "x", position: { x: 10, y: 20 }, size: 50, value: 1 } },
        relationships: [{ id: "r1", sourcePath: "x", targetPath: "x", type: "-->" }],
        viewMode: "circular",
      }));
      expect(state.code).toBe("x");
      expect(state.model.elements["x"]).toBeDefined();
      expect(state.viewState.positions["x"].position).toEqual({ x: 10, y: 20 });
      expect(state.viewState.relationships).toHaveLength(1);
      expect(state.viewState.viewMode).toBe("circular");
    });

    it("preserves existing zoom and pan when restoring", () => {
      const vs = createEmptyViewState();
      vs.zoom = 2;
      vs.pan = { x: 100, y: 50 };
      const s1 = reducer(undefined, setViewState(vs));
      const s2 = reducer(s1, restoreHistory({
        code: "",
        model: createEmptyDiagram(),
        positions: {},
        relationships: [],
        viewMode: "basic",
      }));
      expect(s2.viewState.zoom).toBe(2);
      expect(s2.viewState.pan).toEqual({ x: 100, y: 50 });
    });
  });
});
