import { describe, it, expect } from "vitest";
import {
  flattenElements,
  layoutWeight,
  makePositioned,
  scaleToRadius,
} from "../../domain/layout/LayoutUtils";
import { createElement } from "../../domain/models/Element";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import type { DiagramModel } from "../../domain/models/DiagramModel";

function buildModel(setup: (m: DiagramModel) => void): DiagramModel {
  const model = createEmptyDiagram();
  setup(model);
  return model;
}

describe("flattenElements", () => {
  it("returns empty array for model with no root children", () => {
    const model = createEmptyDiagram();
    expect(flattenElements(model)).toHaveLength(0);
  });

  it("flattens single root element", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.root.childIds.push("a");
    });
    const flat = flattenElements(model);
    expect(flat).toHaveLength(1);
    expect(flat[0].element.id).toBe("a");
    expect(flat[0].path).toBe("a");
    expect(flat[0].depth).toBe(0);
    expect(flat[0].parentPath).toBeNull();
  });

  it("flattens nested elements with correct paths and depths", () => {
    const model = buildModel((m) => {
      m.elements["a"] = { ...createElement("a", "object"), childIds: ["b"] };
      m.elements["b"] = createElement("b", "object");
      m.root.childIds.push("a");
    });
    const flat = flattenElements(model);
    expect(flat).toHaveLength(2);
    const b = flat.find((f) => f.element.id === "b")!;
    expect(b.path).toBe("a.b");
    expect(b.depth).toBe(1);
    expect(b.parentPath).toBe("a");
  });

  it("assigns correct parentPath for deeply nested elements", () => {
    const model = buildModel((m) => {
      m.elements["a"] = { ...createElement("a", "object"), childIds: ["b"] };
      m.elements["b"] = { ...createElement("b", "object"), childIds: ["c"] };
      m.elements["c"] = createElement("c", "object");
      m.root.childIds.push("a");
    });
    const flat = flattenElements(model);
    const c = flat.find((f) => f.element.id === "c")!;
    expect(c.path).toBe("a.b.c");
    expect(c.depth).toBe(2);
    expect(c.parentPath).toBe("a.b");
  });

  it("handles multiple root elements", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.elements["b"] = createElement("b", "object");
      m.root.childIds.push("a", "b");
    });
    const flat = flattenElements(model);
    expect(flat).toHaveLength(2);
    expect(flat.map((f) => f.path)).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("skips missing child elements", () => {
    const model = buildModel((m) => {
      m.elements["a"] = {
        ...createElement("a", "object"),
        childIds: ["ghost"],
      };
      m.root.childIds.push("a");
    });
    const flat = flattenElements(model);
    expect(flat).toHaveLength(1);
    expect(flat[0].element.id).toBe("a");
  });

  it("skips missing root-level elements (root.childIds references unknown id)", () => {
    const model = buildModel((m) => {
      m.root.childIds.push("ghost");
    });
    const flat = flattenElements(model);
    expect(flat).toHaveLength(0);
  });
});

describe("layoutWeight", () => {
  it("returns 1 for a leaf element", () => {
    const model = createEmptyDiagram();
    model.elements["a"] = createElement("a", "object");
    expect(layoutWeight(model.elements["a"], model)).toBe(1);
  });

  it("returns sum of children plus 1", () => {
    const model = buildModel((m) => {
      m.elements["a"] = {
        ...createElement("a", "object"),
        childIds: ["b", "c"],
      };
      m.elements["b"] = createElement("b", "object");
      m.elements["c"] = createElement("c", "object");
    });
    expect(layoutWeight(model.elements["a"], model)).toBe(3);
  });

  it("handles recursive cycle gracefully", () => {
    const model = buildModel((m) => {
      m.elements["a"] = { ...createElement("a", "object"), childIds: ["b"] };
      m.elements["b"] = { ...createElement("b", "object"), childIds: ["a"] };
    });

    const w = layoutWeight(model.elements["a"], model);
    expect(w).toBeGreaterThanOrEqual(1);
  });

  it("treats missing child element in childIds as weight 0", () => {
    const model = buildModel((m) => {
      m.elements["a"] = {
        ...createElement("a", "object"),
        childIds: ["ghost"],
      };
    });

    expect(layoutWeight(model.elements["a"], model)).toBe(1);
  });
});

describe("makePositioned", () => {
  it("creates a positioned element with correct id and position", () => {
    const pe = makePositioned("x", 10, 20);
    expect(pe.id).toBe("x");
    expect(pe.position.x).toBe(10);
    expect(pe.position.y).toBe(20);
    expect(pe.size).toBe(0);
    expect(pe.value).toBe(0);
  });
});

describe("scaleToRadius", () => {
  it("returns empty array for empty input", () => {
    expect(scaleToRadius([], 0, 0, 100)).toEqual([]);
  });

  it("returns center point for single element", () => {
    const result = scaleToRadius([{ x: 5, y: 5 }], 400, 300, 100);
    expect(result).toEqual([{ x: 400, y: 300 }]);
  });

  it("scales points to radius", () => {
    const points = [
      { x: 100, y: 0 },
      { x: -100, y: 0 },
    ];
    const result = scaleToRadius(points, 0, 0, 50);

    expect(result[0].x).toBeCloseTo(50);
    expect(result[0].y).toBeCloseTo(0);
    expect(result[1].x).toBeCloseTo(-50);
  });

  it("distributes degenerate (all-zero) points around circle", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const result = scaleToRadius(points, 0, 0, 100);

    for (const p of result) {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(100);
    }
  });
});
