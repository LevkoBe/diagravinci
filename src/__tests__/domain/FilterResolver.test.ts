import { describe, it, expect } from "vitest";
import { FilterResolver } from "../../domain/sync/FilterResolver";
import type { FilterState } from "../../application/store/filterSlice";
import type { PositionedElement } from "../../domain/models/ViewState";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import { createElement } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { Selector, Rule } from "../../domain/models/Selector";

function makeFilterState(overrides: Partial<FilterState> = {}): FilterState {
  return {
    selectors: [],
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

function makeModel(
  elementIds: string[],
  rules: Rule[] = [],
): DiagramModel {
  const model = createEmptyDiagram();
  model.rules = rules;
  for (const id of elementIds) {
    model.elements[id] = createElement(id, "object");
  }
  return model;
}

function makeSelector(
  id: string,
  mode: "hide" | "dim" | "color",
  expression = "r1",
): Selector {
  return {
    id,
    label: id,
    mode,
    color: "#e05c5c",
    expression,
  };
}

function ruleForSelector(pathRegex: string): Rule {
  return { id: "r1", patterns: { all: pathRegex } };
}

function makeSelectorWithFormula(
  id: string,
  mode: "hide" | "dim" | "color",
  rulePatterns: { path: string }[],
  expression: string,
): { selector: Selector; rules: Rule[] } {
  const rules: Rule[] = rulePatterns.map((a, i) => ({
    id: String(i + 1),
    patterns: { all: a.path },
  }));
  return {
    selector: { id, label: id, mode, color: "#e05c5c", expression },
    rules,
  };
}

describe("FilterResolver.resolve", () => {
  it("returns empty lists when no selectors and no fold", () => {
    const result = FilterResolver.resolve(
      makeFilterState(),
      makePositions(["a", "b"]),
      makeModel(["a", "b"]),
    );
    expect(result.hiddenPaths).toHaveLength(0);
    expect(result.dimmedPaths).toHaveLength(0);
    expect(result.foldedPaths).toHaveLength(0);
  });

  it("colors matched paths with selector color", () => {
    const selector = { ...makeSelector("p1", "color"), color: "#ff0000" };
    const filterState = makeFilterState({ selectors: [selector] });
    const positions = makePositions(["a", "b"]);
    const model = makeModel(["a", "b"], [ruleForSelector("^a$")]);
    const result = FilterResolver.resolve(filterState, positions, model);
    expect(result.coloredPaths["a"]).toBe("#ff0000");
    expect(result.coloredPaths["b"]).toBeUndefined();
    expect(result.hiddenPaths).toHaveLength(0);
    expect(result.dimmedPaths).toHaveLength(0);
  });

  it("hides paths not matching an active hide selector", () => {
    const filterState = makeFilterState({
      selectors: [makeSelector("p1", "hide")],
    });
    const positions = makePositions(["a", "b", "c"]);
    const model = makeModel(["a", "b", "c"], [ruleForSelector("^a$")]);
    const result = FilterResolver.resolve(filterState, positions, model);
    expect(result.hiddenPaths).toContain("b");
    expect(result.hiddenPaths).toContain("c");
    expect(result.hiddenPaths).not.toContain("a");
  });

  it("dims paths not matching an active dim selector", () => {
    const filterState = makeFilterState({
      selectors: [makeSelector("p1", "dim")],
    });
    const positions = makePositions(["a", "b"]);
    const model = makeModel(["a", "b"], [ruleForSelector("^a$")]);
    const result = FilterResolver.resolve(filterState, positions, model);
    expect(result.dimmedPaths).toContain("b");
    expect(result.dimmedPaths).not.toContain("a");
  });

  describe("formula logic", () => {
    it("-r1: hides paths that MATCH rule r1 (inverted)", () => {
      const { selector, rules } = makeSelectorWithFormula(
        "p1",
        "hide",
        [{ path: "^a$" }],
        "-1",
      );
      const filterState = makeFilterState({ selectors: [selector] });
      const positions = makePositions(["a", "b", "c"]);
      const model = makeModel(["a", "b", "c"], rules);
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.hiddenPaths).toContain("a");
      expect(result.hiddenPaths).not.toContain("b");
      expect(result.hiddenPaths).not.toContain("c");
    });

    it("1 & 2: hides paths matching neither rule", () => {
      const { selector, rules } = makeSelectorWithFormula(
        "p1",
        "hide",
        [{ path: "svc" }, { path: "auth" }],
        "1 & 2",
      );
      const positions = makePositions(["svc.auth", "svc.other", "other"]);
      const model = makeModel(["auth", "other", "other"], rules);
      const filterState = makeFilterState({ selectors: [selector] });
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.hiddenPaths).not.toContain("svc.auth");
      expect(result.hiddenPaths).toContain("svc.other");
      expect(result.hiddenPaths).toContain("other");
    });

    it("1 | 2: hides paths matching neither rule", () => {
      const { selector, rules } = makeSelectorWithFormula(
        "p1",
        "hide",
        [{ path: "^a$" }, { path: "^b$" }],
        "1 | 2",
      );
      const positions = makePositions(["a", "b", "c"]);
      const model = makeModel(["a", "b", "c"], rules);
      const filterState = makeFilterState({ selectors: [selector] });
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.hiddenPaths).not.toContain("a");
      expect(result.hiddenPaths).not.toContain("b");
      expect(result.hiddenPaths).toContain("c");
    });
  });

  it("ignores selectors with mode=off", () => {
    const filterState = makeFilterState({
      selectors: [{ ...makeSelector("p1", "hide"), mode: "off" }],
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
    const a = { hiddenPaths: ["x"], dimmedPaths: [], foldedPaths: [], coloredPaths: {} };
    const b = { hiddenPaths: ["y"], dimmedPaths: [], foldedPaths: [], coloredPaths: {} };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("returns false when dimmed paths differ", () => {
    const a = { hiddenPaths: [], dimmedPaths: ["x"], foldedPaths: [], coloredPaths: {} };
    const b = { hiddenPaths: [], dimmedPaths: [], foldedPaths: [], coloredPaths: {} };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("returns false when folded paths differ", () => {
    const a = { hiddenPaths: [], dimmedPaths: [], foldedPaths: ["x"], coloredPaths: {} };
    const b = { hiddenPaths: [], dimmedPaths: [], foldedPaths: [], coloredPaths: {} };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("returns false when colored paths differ", () => {
    const a = { hiddenPaths: [], dimmedPaths: [], foldedPaths: [], coloredPaths: { a: "#ff0000" } };
    const b = { hiddenPaths: [], dimmedPaths: [], foldedPaths: [], coloredPaths: {} };
    expect(FilterResolver.equal(a, b)).toBe(false);
  });

  it("returns true for equal colored paths regardless of insertion order", () => {
    const a = { hiddenPaths: [], dimmedPaths: [], foldedPaths: [], coloredPaths: { b: "#0000ff", a: "#ff0000" } };
    const b = { hiddenPaths: [], dimmedPaths: [], foldedPaths: [], coloredPaths: { a: "#ff0000", b: "#0000ff" } };
    expect(FilterResolver.equal(a, b)).toBe(true);
  });

  it("handles missing coloredPaths gracefully (treats as empty)", () => {
    const a = {
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
      coloredPaths: undefined as unknown as Record<string, string>,
    };
    const b = { hiddenPaths: [], dimmedPaths: [], foldedPaths: [], coloredPaths: {} };
    expect(FilterResolver.equal(a, b)).toBe(true);
  });
});

describe("FilterResolver.resolve — edge cases", () => {
  it("active hide selector with empty formula treats all paths as unmatched (hidden)", () => {
    const filterState: FilterState = {
      selectors: [
        { id: "empty", label: "empty", mode: "hide", color: "#f00", expression: "" },
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

  it("dim selector with a non-matching rule dims unmatched paths", () => {
    const filterState: FilterState = {
      selectors: [
        { id: "p1", label: "p1", mode: "dim", color: "#f00", expression: "" },
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

  it("matchesSelector handles element not in model (type defaults to empty string)", () => {
    const filterState: FilterState = {
      selectors: [
        { id: "p1", label: "p1", mode: "color", color: "#aabbcc", expression: "" },
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

  describe("selectionPattern matching", () => {
    it("colors paths matching the selectionPattern regex", () => {
      const filterState = makeFilterState({
        selectors: [
          {
            id: "_selection",
            label: "Selection",
            mode: "color",
            color: "#00aaff",
            expression: "",
            selectionPattern: "(^|\\.)myNode$",
          },
        ],
      });
      const positions = makePositions(["myNode", "other.myNode", "other"]);
      const model = makeModel(["myNode", "myNode", "other"]);
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.coloredPaths["myNode"]).toBe("#00aaff");
      expect(result.coloredPaths["other.myNode"]).toBe("#00aaff");
      expect(result.coloredPaths["other"]).toBeUndefined();
    });

    it("selectionPattern with invalid regex returns false (path not colored)", () => {
      const filterState = makeFilterState({
        selectors: [
          {
            id: "_selection",
            label: "Selection",
            mode: "color",
            color: "#00aaff",
            expression: "",
            selectionPattern: "[invalid",
          },
        ],
      });
      const positions = makePositions(["a"]);
      const model = makeModel(["a"]);
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.coloredPaths["a"]).toBeUndefined();
    });

    it("selectionPattern takes precedence over expression-based matching", () => {
      const rule = { id: "r1", patterns: { all: ".*" } };
      const filterState = makeFilterState({
        selectors: [
          {
            id: "sel",
            label: "sel",
            mode: "color",
            color: "#ff0000",
            expression: "r1",
            selectionPattern: "^exact$",
          },
        ],
      });
      const positions = makePositions(["exact", "other"]);
      const model = makeModel(["exact", "other"], [rule]);
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.coloredPaths["exact"]).toBe("#ff0000");
      expect(result.coloredPaths["other"]).toBeUndefined();
    });
  });

  describe("element flags matching", () => {
    it("colors a path when element has a flag matching the selector id", () => {
      const positions = makePositions(["flagged", "plain"]);
      const model = makeModel(["flagged", "plain"]);
      model.elements["flagged"].flags = ["mysel"];
      const filterState = makeFilterState({
        selectors: [
          { id: "mysel", label: "mysel", mode: "color", color: "#abcdef", expression: "" },
        ],
      });
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.coloredPaths["flagged"]).toBe("#abcdef");
      expect(result.coloredPaths["plain"]).toBeUndefined();
    });

    it("flags matching takes precedence over a non-matching expression", () => {
      const positions = makePositions(["flagged"]);
      const model = makeModel(["flagged"]);
      model.elements["flagged"].flags = ["sel"];
      const filterState = makeFilterState({
        selectors: [
          { id: "sel", label: "sel", mode: "color", color: "#123456", expression: "nonexistent_rule" },
        ],
      });
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.coloredPaths["flagged"]).toBe("#123456");
    });

    it("does not match when element flags do not include the selector id", () => {
      const positions = makePositions(["a"]);
      const model = makeModel(["a"]);
      model.elements["a"].flags = ["other_sel"];
      const filterState = makeFilterState({
        selectors: [
          { id: "sel", label: "sel", mode: "color", color: "#ff0000", expression: "" },
        ],
      });
      const result = FilterResolver.resolve(filterState, positions, model);
      expect(result.coloredPaths["a"]).toBeUndefined();
    });
  });
});
