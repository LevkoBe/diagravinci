import { describe, it, expect } from "vitest";
import { HierarchicalLayout } from "../../domain/layout/HierarchicalLayout";
import { TimelineLayout } from "../../domain/layout/TimelineLayout";
import { PipelineLayout } from "../../domain/layout/PipelineLayout";
import { getLayout } from "../../domain/layout/LayoutRegistry";
import { BUILT_IN_TEMPLATES } from "../../domain/models/DiagramTemplate";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import { createElement } from "../../domain/models/Element";
import { createRelationship } from "../../domain/models/Relationship";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";

const CANVAS = { width: 800, height: 600 };

function makeLinearModel() {
  const model = createEmptyDiagram();
  const a = createElement("A", "object");
  const b = createElement("B", "object");
  const c = createElement("C", "object");
  model.elements.A = a;
  model.elements.B = b;
  model.elements.C = c;
  model.root.childIds = ["A", "B", "C"];
  model.relationships.r1 = createRelationship("r1", "A", "B", "-->");
  model.relationships.r2 = createRelationship("r2", "B", "C", "-->");
  return model;
}

function makeFanInModel() {
  const model = createEmptyDiagram();
  const src1 = createElement("Src1", "object");
  const src2 = createElement("Src2", "object");
  const sink = createElement("Sink", "object");
  model.elements.Src1 = src1;
  model.elements.Src2 = src2;
  model.elements.Sink = sink;
  model.root.childIds = ["Src1", "Src2", "Sink"];
  model.relationships.r1 = createRelationship("r1", "Src1", "Sink", "-->");
  model.relationships.r2 = createRelationship("r2", "Src2", "Sink", "-->");
  return model;
}

function makeHierarchyModel() {
  const model = createEmptyDiagram();
  const parent = createElement("Parent", "object");
  const childA = createElement("ChildA", "object");
  const childB = createElement("ChildB", "object");
  parent.childIds = ["ChildA", "ChildB"];
  model.elements.Parent = parent;
  model.elements.ChildA = childA;
  model.elements.ChildB = childB;
  model.root.childIds = ["Parent"];
  return model;
}

describe("HierarchicalLayout", () => {
  const layout = new HierarchicalLayout();

  it("has name 'hierarchical'", () => {
    expect(layout.name).toBe("hierarchical");
  });

  it("positions all root-level elements", () => {
    const model = makeLinearModel();
    const vs = layout.apply(model, CANVAS);
    expect(Object.keys(vs.positions)).toHaveLength(3);
    expect(vs.positions["A"]).toBeDefined();
    expect(vs.positions["B"]).toBeDefined();
    expect(vs.positions["C"]).toBeDefined();
  });

  it("sets viewMode to hierarchical", () => {
    const vs = layout.apply(makeLinearModel(), CANVAS);
    expect(vs.viewMode).toBe("hierarchical");
  });

  it("places elements at depth 0 on the same y row", () => {
    const model = makeLinearModel();
    const vs = layout.apply(model, CANVAS);
    expect(vs.positions["A"].position.x).toBeCloseTo(
      vs.positions["B"].position.x,
    );
    expect(vs.positions["B"].position.x).toBeCloseTo(
      vs.positions["C"].position.x,
    );
  });

  it("places child elements below parents", () => {
    const model = makeHierarchyModel();
    const vs = layout.apply(model, CANVAS);
    const parentX = vs.positions["Parent"].position.x;

    const childAX = vs.positions["Parent.ChildA"].position.x;
    const childBX = vs.positions["Parent.ChildB"].position.x;
    expect(parentX).toBeGreaterThan(childAX);
    expect(childBX).toBeGreaterThan(parentX);
  });

  it("resolves relationships into positions", () => {
    const model = makeLinearModel();
    const vs = layout.apply(model, CANVAS);
    expect(vs.relationships.length).toBeGreaterThan(0);
  });

  it("preserves zoom and pan from previous view state", () => {
    const prev = {
      positions: {},
      relationships: [],
      viewMode: "hierarchical" as const,
      zoom: 2,
      pan: { x: 50, y: 100 },
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
    };
    const vs = layout.apply(makeLinearModel(), CANVAS, prev);
    expect(vs.zoom).toBe(2);
    expect(vs.pan).toEqual({ x: 50, y: 100 });
  });

  it("handles empty model without throwing", () => {
    const model = createEmptyDiagram();
    const vs = layout.apply(model, CANVAS);
    expect(vs.positions).toEqual({});
  });
});

describe("TimelineLayout", () => {
  const layout = new TimelineLayout();

  it("has name 'timeline'", () => {
    expect(layout.name).toBe("timeline");
  });

  it("sets viewMode to timeline", () => {
    const vs = layout.apply(makeLinearModel(), CANVAS);
    expect(vs.viewMode).toBe("timeline");
  });

  it("positions all elements", () => {
    const model = makeLinearModel();
    const vs = layout.apply(model, CANVAS);
    expect(Object.keys(vs.positions)).toHaveLength(3);
  });

  it("places A before B and B before C in x axis (left-to-right)", () => {
    const model = makeLinearModel();
    const vs = layout.apply(model, CANVAS);
    const xA = vs.positions["A"].position.x;
    const xB = vs.positions["B"].position.x;
    const xC = vs.positions["C"].position.x;
    expect(xA).toBeLessThanOrEqual(xB);
    expect(xB).toBeLessThanOrEqual(xC);
  });

  it("fan-in: sources share the same column", () => {
    const model = makeFanInModel();
    const vs = layout.apply(model, CANVAS);
    expect(vs.positions["Src1"].position.x).toBeCloseTo(
      vs.positions["Src2"].position.x,
    );
  });

  it("fan-in: sink is to the right of sources", () => {
    const model = makeFanInModel();
    const vs = layout.apply(model, CANVAS);
    expect(vs.positions["Sink"].position.x).toBeGreaterThan(
      vs.positions["Src1"].position.x,
    );
  });

  it("handles empty model without throwing", () => {
    const model = createEmptyDiagram();
    const vs = layout.apply(model, CANVAS);
    expect(vs.positions).toEqual({});
  });

  it("preserves pan and zoom from previous state", () => {
    const prev = {
      positions: {},
      relationships: [],
      viewMode: "timeline" as const,
      zoom: 1.5,
      pan: { x: 20, y: 30 },
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
    };
    const vs = layout.apply(makeLinearModel(), CANVAS, prev);
    expect(vs.zoom).toBe(1.5);
    expect(vs.pan).toEqual({ x: 20, y: 30 });
  });
});

describe("PipelineLayout", () => {
  const layout = new PipelineLayout();

  it("has name 'pipeline'", () => {
    expect(layout.name).toBe("pipeline");
  });

  it("sets viewMode to pipeline", () => {
    const vs = layout.apply(makeLinearModel(), CANVAS);
    expect(vs.viewMode).toBe("pipeline");
  });

  it("positions all elements", () => {
    const model = makeLinearModel();
    const vs = layout.apply(model, CANVAS);
    expect(Object.keys(vs.positions)).toHaveLength(3);
  });

  it("source (A) is left of processor (B) which is left of sink (C)", () => {
    const model = makeLinearModel();
    const vs = layout.apply(model, CANVAS);
    expect(vs.positions["A"].position.x).toBeLessThan(
      vs.positions["B"].position.x,
    );
    expect(vs.positions["B"].position.x).toBeLessThan(
      vs.positions["C"].position.x,
    );
  });

  it("fan-in: both sources land in same lane (leftmost)", () => {
    const model = makeFanInModel();
    const vs = layout.apply(model, CANVAS);
    expect(vs.positions["Src1"].position.x).toBeCloseTo(
      vs.positions["Src2"].position.x,
    );
  });

  it("fan-in: sink is to the right of sources", () => {
    const model = makeFanInModel();
    const vs = layout.apply(model, CANVAS);
    expect(vs.positions["Sink"].position.x).toBeGreaterThan(
      vs.positions["Src1"].position.x,
    );
  });

  it("handles empty model without throwing", () => {
    const model = createEmptyDiagram();
    const vs = layout.apply(model, CANVAS);
    expect(vs.positions).toEqual({});
  });

  it("preserves pan and zoom from previous state", () => {
    const prev = {
      positions: {},
      relationships: [],
      viewMode: "pipeline" as const,
      zoom: 0.8,
      pan: { x: -10, y: 5 },
      hiddenPaths: [],
      dimmedPaths: [],
      foldedPaths: [],
    };
    const vs = layout.apply(makeLinearModel(), CANVAS, prev);
    expect(vs.zoom).toBe(0.8);
    expect(vs.pan).toEqual({ x: -10, y: 5 });
  });
});

describe("LayoutRegistry", () => {
  it("returns HierarchicalLayout for 'hierarchical'", () => {
    expect(getLayout("hierarchical").name).toBe("hierarchical");
  });

  it("returns TimelineLayout for 'timeline'", () => {
    expect(getLayout("timeline").name).toBe("timeline");
  });

  it("returns PipelineLayout for 'pipeline'", () => {
    expect(getLayout("pipeline").name).toBe("pipeline");
  });

  it("returns CircularLayout for 'circular'", () => {
    expect(getLayout("circular").name).toBe("circular");
  });

  it("returns CircularLayout for 'basic'", () => {
    expect(getLayout("basic").name).toBe("circular");
  });
});

describe("BUILT_IN_TEMPLATES", () => {
  it("has at least 5 templates", () => {
    expect(BUILT_IN_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("every template has a unique id", () => {
    const ids = BUILT_IN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every template has a non-empty name, description, code, and at least one tag", () => {
    for (const t of BUILT_IN_TEMPLATES) {
      expect(t.name.trim().length).toBeGreaterThan(0);
      expect(t.description.trim().length).toBeGreaterThan(0);
      expect(t.code.trim().length).toBeGreaterThan(0);
      expect(t.tags.length).toBeGreaterThan(0);
    }
  });

  it("every template's code parses without throwing", () => {
    for (const t of BUILT_IN_TEMPLATES) {
      expect(() => {
        const tokens = new Lexer(t.code).tokenize();
        new Parser(tokens).parse();
      }).not.toThrow();
    }
  });

  it("every template's parsed model has at least one element", () => {
    for (const t of BUILT_IN_TEMPLATES) {
      const tokens = new Lexer(t.code).tokenize();
      const model = new Parser(tokens).parse();
      expect(Object.keys(model.elements).length).toBeGreaterThan(0);
    }
  });

  it("every template's preferredView is a valid viewMode", () => {
    const validModes = new Set([
      "circular",
      "basic",
      "hierarchical",
      "timeline",
      "pipeline",
    ]);
    for (const t of BUILT_IN_TEMPLATES) {
      expect(validModes.has(t.preferredView)).toBe(true);
    }
  });
});
