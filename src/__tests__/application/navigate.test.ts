import { describe, it, expect } from "vitest";
import {
  navigateSelection,
  navigateAlternative,
  findParentId,
} from "../../application/navigate";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { Element } from "../../domain/models/Element";
import { createElement } from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";

function makeModel(
  rootChildren: string[],
  elDefs: Record<string, string[]>,
  relDefs: Array<[string, string]> = [],
): DiagramModel {
  const root = createElement("root", "object");
  root.childIds = rootChildren;
  const elements: Record<string, Element> = {};
  for (const [id, children] of Object.entries(elDefs)) {
    const el = createElement(id, "object");
    el.childIds = children;
    elements[id] = el;
  }
  const relationships: Record<string, Relationship> = {};
  for (const [s, t] of relDefs) {
    const id = `rel_${s}_${t}`;
    relationships[id] = { id, source: s, target: t, type: "-->" };
  }
  return {
    root,
    elements,
    relationships,
    metadata: { version: "1.0.0", created: "", modified: "" },
  };
}

describe("findParentId", () => {
  it("returns root id for a direct root child", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] });
    expect(findParentId("a", m)).toBe(m.root.id);
  });

  it("returns parent element id for a nested child", () => {
    const m = makeModel(["a"], { a: ["b"], b: [] });
    expect(findParentId("b", m)).toBe("a");
  });

  it("returns null for an unknown id", () => {
    const m = makeModel(["a"], { a: [] });
    expect(findParentId("z", m)).toBeNull();
  });
});

describe("navigateSelection", () => {
  it("returns empty array when no elements are selected", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
    expect(navigateSelection([], m, "forward")).toEqual([]);
  });

  describe("forward", () => {
    it("navigates to the first outgoing relationship target", () => {
      const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
      expect(navigateSelection(["a"], m, "forward")).toEqual(["b"]);
    });

    it("returns empty when no outgoing relationships", () => {
      const m = makeModel(["a", "b"], { a: [], b: [] }, [["b", "a"]]);
      expect(navigateSelection(["a"], m, "forward")).toEqual([]);
    });
  });

  describe("forward-all", () => {
    it("collects all outgoing targets", () => {
      const m = makeModel(
        ["a", "b", "c"],
        { a: [], b: [], c: [] },
        [["a", "b"], ["a", "c"]],
      );
      const result = navigateSelection(["a"], m, "forward-all");
      expect(result).toHaveLength(2);
      expect(result).toContain("b");
      expect(result).toContain("c");
    });
  });

  describe("backward", () => {
    it("navigates to the first incoming relationship source", () => {
      const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
      expect(navigateSelection(["b"], m, "backward")).toEqual(["a"]);
    });

    it("returns empty when no incoming relationships", () => {
      const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
      expect(navigateSelection(["a"], m, "backward")).toEqual([]);
    });
  });

  describe("backward-all", () => {
    it("collects all incoming sources", () => {
      const m = makeModel(
        ["a", "b", "c"],
        { a: [], b: [], c: [] },
        [["a", "c"], ["b", "c"]],
      );
      const result = navigateSelection(["c"], m, "backward-all");
      expect(result).toHaveLength(2);
      expect(result).toContain("a");
      expect(result).toContain("b");
    });
  });

  describe("parent", () => {
    it("returns the parent element when it is not root", () => {
      const m = makeModel(["a"], { a: ["b"], b: [] });
      expect(navigateSelection(["b"], m, "parent")).toEqual(["a"]);
    });

    it("returns empty when element is a direct root child", () => {
      const m = makeModel(["a"], { a: [] });
      expect(navigateSelection(["a"], m, "parent")).toEqual([]);
    });
  });

  describe("child", () => {
    it("navigates to the first child", () => {
      const m = makeModel(["a"], { a: ["b", "c"], b: [], c: [] });
      expect(navigateSelection(["a"], m, "child")).toEqual(["b"]);
    });

    it("returns empty when element has no children", () => {
      const m = makeModel(["a"], { a: [] });
      expect(navigateSelection(["a"], m, "child")).toEqual([]);
    });
  });

  describe("child-all", () => {
    it("navigates to all children", () => {
      const m = makeModel(["a"], { a: ["b", "c"], b: [], c: [] });
      const result = navigateSelection(["a"], m, "child-all");
      expect(result).toHaveLength(2);
      expect(result).toContain("b");
      expect(result).toContain("c");
    });
  });

  it("deduplicates results when multiple selected elements share a neighbor", () => {
    const m = makeModel(
      ["a", "b", "c"],
      { a: [], b: [], c: [] },
      [["a", "c"], ["b", "c"]],
    );
    const result = navigateSelection(["a", "b"], m, "forward");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("c");
  });
});

describe("navigateAlternative", () => {
  it("returns empty array when no elements are selected", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] });
    expect(navigateAlternative([], m, "next", null)).toEqual([]);
  });

  it("navigates to the next sibling", () => {
    const m = makeModel(["a", "b", "c"], { a: [], b: [], c: [] });
    expect(navigateAlternative(["a"], m, "next", m.root.id)).toEqual(["b"]);
  });

  it("navigates to the previous sibling", () => {
    const m = makeModel(["a", "b", "c"], { a: [], b: [], c: [] });
    expect(navigateAlternative(["b"], m, "prev", m.root.id)).toEqual(["a"]);
  });

  it("wraps from last to first for next", () => {
    const m = makeModel(["a", "b", "c"], { a: [], b: [], c: [] });
    expect(navigateAlternative(["c"], m, "next", m.root.id)).toEqual(["a"]);
  });

  it("wraps from first to last for prev", () => {
    const m = makeModel(["a", "b", "c"], { a: [], b: [], c: [] });
    expect(navigateAlternative(["a"], m, "prev", m.root.id)).toEqual(["c"]);
  });

  it("returns empty when element is an only child", () => {
    const m = makeModel(["a"], { a: [] });
    expect(navigateAlternative(["a"], m, "next", m.root.id)).toEqual([]);
  });

  it("uses parentIdHint when valid", () => {
    const m = makeModel(["p"], { p: ["x", "y"], x: [], y: [] });
    expect(navigateAlternative(["x"], m, "next", "p")).toEqual(["y"]);
  });

  it("falls back to real parent when hint does not contain the element", () => {
    const m = makeModel(["p"], { p: ["x", "y"], x: [], y: [] });
    expect(navigateAlternative(["x"], m, "next", "z")).toEqual(["y"]);
  });

  it("navigates nested children via their parent", () => {
    const m = makeModel(["a"], { a: ["b", "c"], b: [], c: [] });
    expect(navigateAlternative(["b"], m, "next", null)).toEqual(["c"]);
  });
});
