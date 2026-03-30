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
});
