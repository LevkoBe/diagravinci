import { describe, it, expect } from "vitest";
import {
  createEmptyViewState,
  updateElementPosition,
} from "../../domain/models/ViewState";

describe("createEmptyViewState", () => {
  it("returns a valid empty view state", () => {
    const vs = createEmptyViewState();
    expect(vs.positions).toEqual({});
    expect(vs.relationships).toEqual([]);
    expect(vs.viewMode).toBe("basic");
    expect(vs.zoom).toBe(1);
    expect(vs.pan).toEqual({ x: 0, y: 0 });
    expect(vs.hiddenPaths).toEqual([]);
    expect(vs.dimmedPaths).toEqual([]);
    expect(vs.foldedPaths).toEqual([]);
    expect(vs.coloredPaths).toEqual({});
  });
});

describe("updateElementPosition", () => {
  it("adds a new position for an element not yet in viewState", () => {
    const vs = createEmptyViewState();
    const updated = updateElementPosition(vs, "a", { x: 100, y: 200 });
    expect(updated.positions["a"].position).toEqual({ x: 100, y: 200 });
    expect(updated.positions["a"].id).toBe("a");
  });

  it("updates an existing position", () => {
    const vs = createEmptyViewState();
    vs.positions["a"] = {
      id: "a",
      position: { x: 0, y: 0 },
      size: 60,
      value: 1,
    };
    const updated = updateElementPosition(vs, "a", { x: 50, y: 75 });
    expect(updated.positions["a"].position).toEqual({ x: 50, y: 75 });
    expect(updated.positions["a"].size).toBe(60);
  });

  it("does not mutate the original viewState", () => {
    const vs = createEmptyViewState();
    updateElementPosition(vs, "a", { x: 10, y: 20 });
    expect(vs.positions["a"]).toBeUndefined();
  });

  it("preserves other positions when updating", () => {
    const vs = createEmptyViewState();
    vs.positions["b"] = {
      id: "b",
      position: { x: 500, y: 500 },
      size: 40,
      value: 1,
    };
    const updated = updateElementPosition(vs, "a", { x: 10, y: 20 });
    expect(updated.positions["b"].position).toEqual({ x: 500, y: 500 });
  });

  it("returns the same reference when position is unchanged (equality guard)", () => {
    const vs = createEmptyViewState();
    vs.positions["a"] = {
      id: "a",
      position: { x: 42, y: 99 },
      size: 60,
      value: 1,
    };
    const result = updateElementPosition(vs, "a", { x: 42, y: 99 });

    expect(result).toBe(vs);
  });

  it("returns a new reference when only x changes", () => {
    const vs = createEmptyViewState();
    vs.positions["a"] = {
      id: "a",
      position: { x: 42, y: 99 },
      size: 60,
      value: 1,
    };
    const result = updateElementPosition(vs, "a", { x: 43, y: 99 });
    expect(result).not.toBe(vs);
    expect(result.positions["a"].position.x).toBe(43);
  });

  it("preserves size and value when updating an existing entry", () => {
    const vs = createEmptyViewState();
    vs.positions["a"] = {
      id: "a",
      position: { x: 0, y: 0 },
      size: 80,
      value: 5,
    };
    const updated = updateElementPosition(vs, "a", { x: 10, y: 20 });
    expect(updated.positions["a"].size).toBe(80);
    expect(updated.positions["a"].value).toBe(5);
  });
});

