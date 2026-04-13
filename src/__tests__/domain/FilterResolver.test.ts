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
  mode: "hide" | "dim" | "color",
  pathRegex: string,
  isActive = true,
): FilterPreset {
  return {
    id,
    label: id,
    mode,
    isActive,
    color: "#e05c5c",
    selector: {
      atoms: [{ id: "a", types: [], path: pathRegex, meta: { kind: "raw" } }],
      combiner: "",
    },
  };
}

function makePresetWithCombiner(
  id: string,
  mode: "hide" | "dim" | "color",
  atoms: { path: string }[],
  combiner: string,
  isActive = true,
): FilterPreset {
  return {
    id,
    label: id,
    mode,
    isActive,
    color: "#e05c5c",
    selector: {
      atoms: atoms.map((a, i) => ({
        id: String(i),
        types: [],
        path: a.path,
        meta: { kind: "raw" as const },
      })),
      combiner,
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

  it("colors matched paths with preset color", () => {
    const preset = { ...makePreset("p1", "color", "^a$"), color: "#ff0000" };
    const filterState = makeFilterState({ presets: [preset] });
    const positions = makePositions(["a", "b"]);
    const model = makeModel(["a", "b"]);
    const result = FilterResolver.resolve(filterState, positions, model);
    expect(result.coloredPaths["a"]).toBe("#ff0000");
    expect(result.coloredPaths["b"]).toBeUndefined();
    expect(result.hiddenPaths).toHaveLength(0);
    expect(result.dimmedPaths).toHaveLength(0);
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

  describe("combiner logic", () => {
    it("not 1: hides paths that MATCH atom 1 (inverted)", () => {
      const filterState = makeFilterState({
        presets: [
          makePresetWithCombiner("p1", "hide", [{ path: "^a$" }], "not 1"),
        ],
      });
      const positions = makePositions(["a", "b", "c"]);
      const model = makeModel(["a", "b", "c"]);
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.hiddenPaths).toContain("a");
      expect(result.hiddenPaths).not.toContain("b");
      expect(result.hiddenPaths).not.toContain("c");
    });

    it("1 and 2: hides paths matching neither atom", () => {
      const filterState = makeFilterState({
        presets: [
          makePresetWithCombiner(
            "p1",
            "hide",
            [{ path: "svc" }, { path: "auth" }],
            "1 and 2",
          ),
        ],
      });

      const positions = makePositions(["svc.auth", "svc.other", "other"]);
      const model = makeModel(["auth", "other", "other"]);
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.hiddenPaths).not.toContain("svc.auth");
      expect(result.hiddenPaths).toContain("svc.other");
      expect(result.hiddenPaths).toContain("other");
    });

    it("1 or 2: hides paths matching neither atom", () => {
      const filterState = makeFilterState({
        presets: [
          makePresetWithCombiner(
            "p1",
            "hide",
            [{ path: "^a$" }, { path: "^b$" }],
            "1 or 2",
          ),
        ],
      });
      const positions = makePositions(["a", "b", "c"]);
      const model = makeModel(["a", "b", "c"]);
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.hiddenPaths).not.toContain("a");
      expect(result.hiddenPaths).not.toContain("b");
      expect(result.hiddenPaths).toContain("c");
    });
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
    const a = {
      hiddenPaths: ["x", "y"],
      dimmedPaths: ["z"],
      foldedPaths: [],
      coloredPaths: {},
    };
    const b = {
      hiddenPaths: ["y", "x"],
      dimmedPaths: ["z"],
      foldedPaths: [],
      coloredPaths: {},
    };
    expect(FilterResolver.equal(a, b)).toBe(true);
  });

  it("returns false when hidden paths differ", () => {
    const a = {
      hiddenPaths: ["x"],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: {},
    };
    const b = {
      hiddenPaths: ["y"],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: {},
    };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("returns false when dimmed paths differ", () => {
    const a = {
      hiddenPaths: [],
      dimmedPaths: ["x"],
      foldedPaths: [],
      coloredPaths: {},
    };
    const b = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: {},
    };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("returns false when folded paths differ", () => {
    const a = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: ["x"],
      coloredPaths: {},
    };
    const b = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: {},
    };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("returns false when colored paths differ", () => {
    const a = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: { a: "#ff0000" },
    };
    const b = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: {},
    };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("returns true for equal colored paths with multiple entries regardless of insertion order", () => {
    const a = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: { b: "#0000ff", a: "#ff0000" },
    };
    const b = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: { a: "#ff0000", b: "#0000ff" },
    };
    expect(FilterResolver.equal(a, b)).toBe(true);
  });

  it("returns false when multiple colored paths differ in values", () => {
    const a = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: { a: "#ff0000", b: "#00ff00" },
    };
    const b = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: { a: "#ff0000", b: "#0000ff" },
    };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("handles missing coloredPaths gracefully (treats as empty)", () => {
    const a = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: undefined as unknown as Record<string, string>,
    };
    const b = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: {},
    };
    expect(FilterResolver.equal(a, b)).toBe(true);
  });
});

describe("FilterResolver.resolve — matchesPreset edge cases", () => {
  it("active hide preset with empty atoms treats all paths as unmatched (hidden)", () => {
    const filterState: FilterState = {
      presets: [
        {
          id: "empty",
          label: "empty",
          mode: "hide",
          isActive: true,
          color: "#f00",
          selector: { atoms: [], combiner: "" },
        },
      ],
      foldLevel: 1,
      foldActive: false,
      manuallyFolded: [],
      manuallyUnfolded: [],
      _rev: 0,
    };
    const positions = makePositions(["a"]);
    const model = makeModel(["a"]);
    const result = FilterResolver.resolve(filterState, positions, model);
    expect(result.hiddenPaths).toContain("a");
  });

  it("dim preset with a non-matching atom dims unmatched paths", () => {
    const filterState: FilterState = {
      presets: [
        {
          id: "p1",
          label: "p1",
          mode: "dim",
          isActive: true,
          color: "#f00",
          selector: {
            atoms: [
              { id: "a0", types: [], path: "^NOMATCH$", meta: { kind: "raw" } },
            ],
            combiner: "",
          },
        },
      ],
      foldLevel: 1,
      foldActive: false,
      manuallyFolded: [],
      manuallyUnfolded: [],
      _rev: 0,
    };
    const positions = makePositions(["x"]);
    const model = makeModel(["x"]);
    const result = FilterResolver.resolve(filterState, positions, model);
    expect(result.dimmedPaths).toContain("x");
  });

  it("matchesPreset handles element not in model (type defaults to empty string)", () => {
    const filterState: FilterState = {
      presets: [
        {
          id: "p1",
          label: "p1",
          mode: "color",
          isActive: true,
          color: "#aabbcc",
          selector: {
            atoms: [
              { id: "a0", types: [], path: "ghost", meta: { kind: "raw" } },
            ],
            combiner: "",
          },
        },
      ],
      foldLevel: 1,
      foldActive: false,
      manuallyFolded: [],
      manuallyUnfolded: [],
      _rev: 0,
    };

    const positions = makePositions(["ghost"]);
    const model = makeModel([]);
    const result = FilterResolver.resolve(filterState, positions, model);
    expect(result).toBeDefined();
  });
});
