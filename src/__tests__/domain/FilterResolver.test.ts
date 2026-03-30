import { describe, it, expect } from "vitest";
import { FilterResolver } from "../../domain/sync/FilterResolver";
import type { FilterState } from "../../application/store/filterSlice";
import type { PositionedElement } from "../../domain/models/ViewState";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import { createElement } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { FilterPreset } from "../../domain/models/Selector";

function makeFilterState(overrides: Partial<FilterState> = {}): FilterState {
  return {
    presets: [],
    isModalOpen: false,
    activeModalPresetId: null,
    foldLevel: 1,
    foldActive: false,
    manuallyFolded: [],
    manuallyUnfolded: [],
    _rev: 0,
    ...overrides,
  };
}

function makePositions(paths: string[]): Record<string, PositionedElement> {
  return Object.fromEntries(
    paths.map((p) => [
      p,
      {
        id: p.split(".").at(-1)!,
        position: { x: 0, y: 0 },
        size: 60,
        value: 1,
      },
    ]),
  );
}

function makeModel(elementIds: string[]): DiagramModel {
  const model = createEmptyDiagram();
  for (const id of elementIds) {
    model.elements[id] = createElement(id, "object");
  }
  return model;
}

function makePreset(
  id: string,
  mode: "hide" | "dim",
  pathRegex: string,
  isActive = true,
): FilterPreset {
  return {
    id,
    label: id,
    mode,
    isActive,
    selector: {
      atoms: [{ id: "a", types: [], path: pathRegex, meta: { kind: "raw" } }],
      combiner: "",
    },
  };
}

describe("FilterResolver.resolve", () => {
  it("returns empty lists when no presets and no fold", () => {
    const result = FilterResolver.resolve(
      makeFilterState(),
      makePositions(["a", "b"]),
      makeModel(["a", "b"]),
    );
    expect(result.hiddenPaths).toHaveLength(0);
    expect(result.dimmedPaths).toHaveLength(0);
    expect(result.foldedPaths).toHaveLength(0);
  });

  it("hides paths not matching an active hide preset", () => {
    const filterState = makeFilterState({
      presets: [makePreset("p1", "hide", "^a$")],
    });
    const positions = makePositions(["a", "b", "c"]);
    const model = makeModel(["a", "b", "c"]);
    const result = FilterResolver.resolve(filterState, positions, model);
    expect(result.hiddenPaths).toContain("b");
    expect(result.hiddenPaths).toContain("c");
    expect(result.hiddenPaths).not.toContain("a");
  });

  it("dims paths not matching an active dim preset", () => {
    const filterState = makeFilterState({
      presets: [makePreset("p1", "dim", "^a$")],
    });
    const positions = makePositions(["a", "b"]);
    const model = makeModel(["a", "b"]);
    const result = FilterResolver.resolve(filterState, positions, model);
    expect(result.dimmedPaths).toContain("b");
    expect(result.dimmedPaths).not.toContain("a");
  });

  it("ignores inactive presets", () => {
    const filterState = makeFilterState({
      presets: [makePreset("p1", "hide", "^a$", false)],
    });
    const positions = makePositions(["a", "b"]);
    const model = makeModel(["a", "b"]);
    const result = FilterResolver.resolve(filterState, positions, model);
    expect(result.hiddenPaths).toHaveLength(0);
  });

  describe("fold", () => {
    it("folds paths at the specified depth level", () => {
      const filterState = makeFilterState({ foldActive: true, foldLevel: 1 });
      const positions = makePositions(["a", "b", "a.child"]);
      const result = FilterResolver.resolve(
        filterState,
        positions,
        makeModel([]),
      );

      expect(result.foldedPaths).toContain("a");
      expect(result.foldedPaths).toContain("b");
      expect(result.foldedPaths).not.toContain("a.child");
    });

    it("does not fold manually unfolded paths", () => {
      const filterState = makeFilterState({
        foldActive: true,
        foldLevel: 1,
        manuallyUnfolded: ["a"],
      });
      const positions = makePositions(["a", "b"]);
      const result = FilterResolver.resolve(
        filterState,
        positions,
        makeModel([]),
      );
      expect(result.foldedPaths).not.toContain("a");
      expect(result.foldedPaths).toContain("b");
    });

    it("does not fold when foldActive is false", () => {
      const filterState = makeFilterState({ foldActive: false, foldLevel: 1 });
      const positions = makePositions(["a", "b"]);
      const result = FilterResolver.resolve(
        filterState,
        positions,
        makeModel([]),
      );
      expect(result.foldedPaths).toHaveLength(0);
    });

    it("adds manually folded paths", () => {
      const filterState = makeFilterState({ manuallyFolded: ["a"] });
      const positions = makePositions(["a", "b"]);
      const result = FilterResolver.resolve(
        filterState,
        positions,
        makeModel([]),
      );
      expect(result.foldedPaths).toContain("a");
    });

    it("skips manually folded paths not in positions (stale)", () => {
      const filterState = makeFilterState({ manuallyFolded: ["stale"] });
      const positions = makePositions(["a"]);
      const result = FilterResolver.resolve(
        filterState,
        positions,
        makeModel([]),
      );
      expect(result.foldedPaths).not.toContain("stale");
    });

    it("manually unfolded path overrides manuallyFolded", () => {
      const filterState = makeFilterState({
        manuallyFolded: ["a"],
        manuallyUnfolded: ["a"],
      });
      const positions = makePositions(["a"]);
      const result = FilterResolver.resolve(
        filterState,
        positions,
        makeModel([]),
      );
      expect(result.foldedPaths).not.toContain("a");
    });
  });
});

describe("FilterResolver.equal", () => {
  it("returns true for equal filter lists", () => {
    const a = { hiddenPaths: ["x", "y"], dimmedPaths: ["z"], foldedPaths: [] };
    const b = { hiddenPaths: ["y", "x"], dimmedPaths: ["z"], foldedPaths: [] };
    expect(FilterResolver.equal(a, b)).toBe(true);
  });

  it("returns false when hidden paths differ", () => {
    const a = { hiddenPaths: ["x"], dimmedPaths: [], foldedPaths: [] };
    const b = { hiddenPaths: ["y"], dimmedPaths: [], foldedPaths: [] };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("returns false when dimmed paths differ", () => {
    const a = { hiddenPaths: [], dimmedPaths: ["x"], foldedPaths: [] };
    const b = { hiddenPaths: [], dimmedPaths: [], foldedPaths: [] };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("returns false when folded paths differ", () => {
    const a = { hiddenPaths: [], dimmedPaths: [], foldedPaths: ["x"] };
    const b = { hiddenPaths: [], dimmedPaths: [], foldedPaths: [] };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });
});
