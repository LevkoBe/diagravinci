import { describe, it, expect } from "vitest";
import {
  AncestryTracker,
  getChildren,
  calculateSize,
  resolveRelationships,
  CHILD_FILL,
  ELEMENT_FILL,
  RADIO,
} from "../../domain/layout/BaseLayout";
import CircularLayout from "../../domain/layout/CircularLayout";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import { createElement } from "../../domain/models/Element";
import { createRelationship } from "../../domain/models/Relationship";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { PositionedElement } from "../../domain/models/ViewState";
import { AppConfig } from "../../config/appConfig";

type ElementType = Parameters<typeof createElement>[1];

function makeModel(
  elements: Array<{ id: string; type?: ElementType; children?: string[] }>,
  rootChildren: string[],
): DiagramModel {
  const model = createEmptyDiagram();
  for (const { id, type = "object", children = [] } of elements) {
    const el = createElement(id, type);
    el.childIds = children;
    model.elements[id] = el;
  }
  model.root.childIds = rootChildren;
  return model;
}

function pe(id: string, x = 0, y = 0, size = 100): PositionedElement {
  return { id, position: { x, y }, size, value: 0 };
}

describe("exported constants", () => {
  it("CHILD_FILL matches config", () => {
    expect(CHILD_FILL).toBe(AppConfig.layout.CHILD_FILL);
  });
  it("ELEMENT_FILL matches config", () => {
    expect(ELEMENT_FILL).toBe(AppConfig.layout.ELEMENT_FILL);
  });
  it("RADIO matches config", () => {
    expect(RADIO).toBe(AppConfig.layout.RADIO);
  });
});

describe("AncestryTracker", () => {
  it("tryAdd returns a new tracker for an unseen id", () => {
    const tracker = new AncestryTracker();
    const next = tracker.tryAdd("a");
    expect(next).not.toBeNull();
  });

  it("tryAdd returns null when id was already seen (cycle)", () => {
    const tracker = new AncestryTracker();
    const next = tracker.tryAdd("a")!;
    expect(next.tryAdd("a")).toBeNull();
  });

  it("allows the same id in sibling chains (not in same chain)", () => {
    const tracker = new AncestryTracker();
    const chainA = tracker.tryAdd("a")!;

    const chainB = tracker.tryAdd("a");
    expect(chainB).not.toBeNull();

    expect(chainA.tryAdd("a")).toBeNull();
  });

  it("tracks multiple distinct ids without collision", () => {
    const tracker = new AncestryTracker();
    const t1 = tracker.tryAdd("a")!;
    const t2 = t1.tryAdd("b")!;
    const t3 = t2.tryAdd("c")!;
    expect(t3.tryAdd("a")).toBeNull();
    expect(t3.tryAdd("b")).toBeNull();
    expect(t3.tryAdd("c")).toBeNull();
    expect(t3.tryAdd("d")).not.toBeNull();
  });

  it("original tracker is unaffected by a derived tracker", () => {
    const root = new AncestryTracker();
    const derived = root.tryAdd("x")!;
    expect(root.tryAdd("x")).not.toBeNull();
    expect(derived.tryAdd("x")).toBeNull();
  });
});

describe("getChildren", () => {
  it("returns all children that exist in the model", () => {
    const model = makeModel(
      [{ id: "a", children: ["b", "c"] }, { id: "b" }, { id: "c" }],
      ["a"],
    );
    const children = getChildren(model.elements["a"]!, model);
    expect(children.map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("filters out child ids that are missing from the model", () => {
    const model = makeModel(
      [{ id: "a", children: ["b", "missing"] }, { id: "b" }],
      ["a"],
    );
    const children = getChildren(model.elements["a"]!, model);
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe("b");
  });

  it("returns empty array when element has no children", () => {
    const model = makeModel([{ id: "leaf" }], ["leaf"]);
    expect(getChildren(model.elements["leaf"]!, model)).toEqual([]);
  });
});

describe("calculateSize", () => {
  const { SIZE_EXP, SIZE_MULT } = AppConfig.layout;

  it("satisfies the formula value^SIZE_EXP * SIZE_MULT", () => {
    for (const v of [1, 2, 5, 10]) {
      expect(calculateSize(v)).toBeCloseTo(Math.pow(v, SIZE_EXP) * SIZE_MULT);
    }
  });

  it("returns 0 for value 0", () => {
    expect(calculateSize(0)).toBe(0);
  });

  it("produces larger sizes for larger values", () => {
    expect(calculateSize(10)).toBeGreaterThan(calculateSize(5));
    expect(calculateSize(5)).toBeGreaterThan(calculateSize(1));
  });
});

describe("resolveRelationships", () => {
  it("maps a root-level relationship using direct path keys", () => {
    const model = makeModel([{ id: "a" }, { id: "b" }], ["a", "b"]);
    model.relationships["r1"] = createRelationship("r1", "a", "b", "-->");
    const positions = { a: pe("a", 10, 20), b: pe("b", 50, 60) };

    const rels = resolveRelationships(model, positions);
    expect(rels).toHaveLength(1);
    expect(rels[0]).toMatchObject({
      id: "r1",
      sourcePath: "a",
      targetPath: "b",
      type: "-->",
    });
  });

  it("resolves a target that only appears as a child path", () => {
    const model = makeModel(
      [{ id: "parent", children: ["child"] }, { id: "child" }],
      ["parent"],
    );
    model.relationships["r1"] = createRelationship(
      "r1",
      "parent",
      "child",
      "-->",
    );

    const positions = { parent: pe("parent"), "parent.child": pe("child") };

    const rels = resolveRelationships(model, positions);
    expect(rels).toHaveLength(1);
    expect(rels[0].sourcePath).toBe("parent");
    expect(rels[0].targetPath).toBe("parent.child");
  });

  it("picks the shallowest path when an element appears at multiple depths", () => {
    const model = makeModel([{ id: "a" }, { id: "b" }], ["a"]);
    model.relationships["r1"] = createRelationship("r1", "a", "b", "-->");

    const positions = {
      a: pe("a"),
      "a.b": pe("b", 1, 1, 80),
      "a.x.b": pe("b", 2, 2, 60),
    };

    const rels = resolveRelationships(model, positions);
    expect(rels[0].targetPath).toBe("a.b");
  });

  it("skips relationship when source has no matching position", () => {
    const model = makeModel([{ id: "a" }, { id: "b" }], ["b"]);
    model.relationships["r1"] = createRelationship("r1", "a", "b", "-->");
    const positions = { b: pe("b") };

    expect(resolveRelationships(model, positions)).toHaveLength(0);
  });

  it("skips relationship when target has no matching position", () => {
    const model = makeModel([{ id: "a" }, { id: "b" }], ["a"]);
    model.relationships["r1"] = createRelationship("r1", "a", "b", "-->");
    const positions = { a: pe("a") };

    expect(resolveRelationships(model, positions)).toHaveLength(0);
  });

  it("preserves relationship type and label", () => {
    const model = makeModel([{ id: "a" }, { id: "b" }], ["a", "b"]);
    model.relationships["r1"] = createRelationship(
      "r1",
      "a",
      "b",
      "o--",
      "uses",
    );
    const positions = { a: pe("a"), b: pe("b") };

    const rels = resolveRelationships(model, positions);
    expect(rels[0].type).toBe("o--");
    expect(rels[0].label).toBe("uses");
  });

  it("handles an empty relationships record", () => {
    const model = makeModel([{ id: "a" }], ["a"]);
    expect(resolveRelationships(model, { a: pe("a") })).toEqual([]);
  });
});

describe("BaseLayout.apply (via CircularLayout)", () => {
  const layout = new CircularLayout();

  it("returns empty positions for an empty model", () => {
    const model = makeModel([], []);
    const vs = layout.apply(model, { width: 800, height: 600 });
    expect(Object.keys(vs.positions)).toHaveLength(0);
    expect(vs.relationships).toEqual([]);
  });

  it("positions a single root element at canvas centre", () => {
    const model = makeModel([{ id: "a" }], ["a"]);
    const vs = layout.apply(model, { width: 800, height: 600 });
    expect(vs.positions["a"].position).toEqual({ x: 400, y: 300 });
  });

  it("includes nested paths in positions", () => {
    const model = makeModel([{ id: "a", children: ["b"] }, { id: "b" }], ["a"]);
    const vs = layout.apply(model, { width: 800, height: 600 });
    expect(vs.positions["a"]).toBeDefined();
    expect(vs.positions["a.b"]).toBeDefined();
  });

  it("preserves pan and zoom from the previous ViewState", () => {
    const model = makeModel([{ id: "a" }], ["a"]);
    const first = layout.apply(model, { width: 800, height: 600 });
    const withPanZoom = { ...first, zoom: 2.5, pan: { x: 100, y: -50 } };
    const second = layout.apply(
      model,
      { width: 800, height: 600 },
      withPanZoom,
    );
    expect(second.zoom).toBe(2.5);
    expect(second.pan).toEqual({ x: 100, y: -50 });
  });

  describe("preservePositions=true", () => {
    it("restores a root element's custom position from the previous ViewState", () => {
      const model = makeModel([{ id: "a" }], ["a"]);
      const baseline = layout.apply(model, { width: 800, height: 600 });
      const prev = {
        ...baseline,
        positions: {
          a: { ...baseline.positions["a"]!, position: { x: 123, y: 456 } },
        },
      };

      const result = layout.apply(
        model,
        { width: 800, height: 600 },
        prev,
        true,
      );
      expect(result.positions["a"].position).toEqual({ x: 123, y: 456 });
    });

    it("scales child positions when the parent's size changes", () => {
      const model = makeModel(
        [{ id: "a", children: ["b"] }, { id: "b" }],
        ["a"],
      );
      const baseline = layout.apply(model, { width: 800, height: 600 });
      const newASize = baseline.positions["a"]!.size;

      const prevASize = newASize / 2;
      const prev = {
        ...baseline,
        positions: {
          a: pe("a", 200, 200, prevASize),
          "a.b": pe("b", 250, 200, 50),
        },
      };

      const result = layout.apply(
        model,
        { width: 800, height: 600 },
        prev,
        true,
      );

      expect(result.positions["a"].position).toEqual({ x: 200, y: 200 });
      expect(result.positions["a.b"]!.position.x).toBeCloseTo(200 + 50 * 2);
      expect(result.positions["a.b"]!.position.y).toBeCloseTo(200);
    });

    it("anchors a new child (absent from prev) using the layout offset from its parent", () => {
      const model = makeModel(
        [{ id: "a", children: ["b", "c"] }, { id: "b" }, { id: "c" }],
        ["a"],
      );
      const baseline = layout.apply(model, { width: 800, height: 600 });

      const aLx = baseline.positions["a"]!.position.x;
      const aLy = baseline.positions["a"]!.position.y;
      const cLx = baseline.positions["a.c"]!.position.x;
      const cLy = baseline.positions["a.c"]!.position.y;

      const prev = {
        ...baseline,
        positions: {
          a: { ...baseline.positions["a"]!, position: { x: 200, y: 200 } },
          "a.b": pe("b", 220, 180, 50),
        },
      };

      const result = layout.apply(
        model,
        { width: 800, height: 600 },
        prev,
        true,
      );

      expect(result.positions["a.c"]!.position.x).toBeCloseTo(
        200 + (cLx - aLx),
      );
      expect(result.positions["a.c"]!.position.y).toBeCloseTo(
        200 + (cLy - aLy),
      );
    });

    it("does not adjust children when parent position and size are unchanged", () => {
      const model = makeModel(
        [{ id: "a", children: ["b"] }, { id: "b" }],
        ["a"],
      );
      const baseline = layout.apply(model, { width: 800, height: 600 });

      const customBPos = { x: 999, y: 888 };
      const prev = {
        ...baseline,
        positions: {
          a: { ...baseline.positions["a"]! },
          "a.b": { ...baseline.positions["a.b"]!, position: customBPos },
        },
      };

      const result = layout.apply(
        model,
        { width: 800, height: 600 },
        prev,
        true,
      );
      expect(result.positions["a.b"]!.position).toEqual(customBPos);
    });

    it("resolves relationships in the preserved state", () => {
      const model = makeModel([{ id: "a" }, { id: "b" }], ["a", "b"]);
      model.relationships["r1"] = createRelationship("r1", "a", "b", "-->");
      const baseline = layout.apply(model, { width: 800, height: 600 });

      const result = layout.apply(
        model,
        { width: 800, height: 600 },
        baseline,
        true,
      );
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0]).toMatchObject({
        sourcePath: "a",
        targetPath: "b",
      });
    });
  });
});
