import { describe, it, expect } from "vitest";
import { ExecuteLayout } from "../../domain/layout/ExecuteLayout";
import { createElement } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type {
  ViewState,
  PositionedElement,
} from "../../domain/models/ViewState";
import { createEmptyViewState } from "../../domain/models/ViewState";

function makeModel(
  elementDefs: Array<{
    id: string;
    type?: "object" | "collection" | "function" | "flow" | "choice" | "state";
    childIds?: string[];
  }>,
): DiagramModel {
  const root = createElement("root", "object");
  const elements: DiagramModel["elements"] = {};
  for (const def of elementDefs) {
    const el = createElement(def.id, def.type ?? "object");
    el.childIds = def.childIds ?? [];
    elements[el.id] = el;
    root.childIds.push(el.id);
  }
  return {
    root,
    elements,
    relationships: {},
    metadata: { version: "1", created: "", modified: "" },
  };
}

function pos(id: string, x: number, y: number, size = 80): PositionedElement {
  return { id, position: { x, y }, size, value: 1 };
}

const CANVAS = { width: 800, height: 600 };

describe("ExecuteLayout", () => {
  const layout = new ExecuteLayout();

  it("has name 'execute'", () => {
    expect(layout.name).toBe("execute");
  });

  it("falls back to CircularLayout when no previousViewState", () => {
    const model = makeModel([{ id: "A" }, { id: "B" }]);
    const result = layout.apply(model, CANVAS, undefined);
    expect(Object.keys(result.positions)).toContain("A");
    expect(Object.keys(result.positions)).toContain("B");
  });

  it("falls back to CircularLayout when previousViewState has no positions", () => {
    const model = makeModel([{ id: "A" }, { id: "B" }]);
    const empty = createEmptyViewState();
    const result = layout.apply(model, CANVAS, empty);
    expect(Object.keys(result.positions)).toContain("A");
    expect(Object.keys(result.positions)).toContain("B");
  });

  it("preserves existing positions for unchanged elements", () => {
    const model = makeModel([{ id: "A" }, { id: "B" }]);
    const prev: ViewState = {
      ...createEmptyViewState(),
      positions: {
        A: pos("A", 100, 200),
        B: pos("B", 300, 400),
      },
    };
    const result = layout.apply(model, CANVAS, prev);
    expect(result.positions["A"].position).toEqual({ x: 100, y: 200 });
    expect(result.positions["B"].position).toEqual({ x: 300, y: 400 });
  });

  it("removes stale positions for paths no longer in the model", () => {
    const model = makeModel([{ id: "A" }]);
    const prev: ViewState = {
      ...createEmptyViewState(),
      positions: {
        A: pos("A", 100, 200),
        B: pos("B", 300, 400),
      },
    };
    const result = layout.apply(model, CANVAS, prev);
    expect(result.positions["A"]).toBeDefined();
    expect(result.positions["B"]).toBeUndefined();
  });

  it("removes stale nested paths whose parent is no longer valid", () => {
    const model = makeModel([{ id: "A" }]);
    const prev: ViewState = {
      ...createEmptyViewState(),
      positions: {
        A: pos("A", 100, 200),
        "A.child": pos("child", 110, 210),
      },
    };
    const result = layout.apply(model, CANVAS, prev);
    expect(result.positions["A"]).toBeDefined();
    expect(result.positions["A.child"]).toBeUndefined();
  });

  it("places new children of an existing positioned element", () => {
    const model = makeModel([{ id: "A", childIds: ["C"] }, { id: "C" }]);

    const adjustedModel: DiagramModel = {
      ...model,
      root: { ...model.root, childIds: ["A"] },
    };

    const prev: ViewState = {
      ...createEmptyViewState(),
      positions: {
        A: pos("A", 400, 300, 160),
      },
    };
    const result = layout.apply(adjustedModel, CANVAS, prev);
    expect(result.positions["A.C"]).toBeDefined();
  });

  it("places unpositioned root-level elements to the right of existing ones", () => {
    const model = makeModel([{ id: "A" }, { id: "NEW" }]);
    const prev: ViewState = {
      ...createEmptyViewState(),
      positions: {
        A: pos("A", 100, 300),
      },
    };
    const result = layout.apply(model, CANVAS, prev);
    expect(result.positions["NEW"]).toBeDefined();

    expect(result.positions["NEW"].position.x).toBeGreaterThan(
      result.positions["A"].position.x,
    );
  });

  it("places children of newly positioned root-level elements", () => {
    const model = makeModel([
      { id: "A" },
      { id: "NEW", childIds: ["CHILD"] },
      { id: "CHILD" },
    ]);
    const adjustedModel: DiagramModel = {
      ...model,
      root: { ...model.root, childIds: ["A", "NEW"] },
    };
    const prev: ViewState = {
      ...createEmptyViewState(),
      positions: {
        A: pos("A", 100, 300),
      },
    };
    const result = layout.apply(adjustedModel, CANVAS, prev);
    expect(result.positions["NEW"]).toBeDefined();
    expect(result.positions["NEW.CHILD"]).toBeDefined();
  });

  it("handles single child being repositioned (circularChildPositions n=1)", () => {
    const model = makeModel([{ id: "A", childIds: ["C"] }, { id: "C" }]);
    const adjustedModel: DiagramModel = {
      ...model,
      root: { ...model.root, childIds: ["A"] },
    };
    const prev: ViewState = {
      ...createEmptyViewState(),
      positions: { A: pos("A", 200, 200, 160) },
    };
    const result = layout.apply(adjustedModel, CANVAS, prev);
    const childPos = result.positions["A.C"];
    expect(childPos).toBeDefined();

    expect(childPos.position.x).toBe(200);
    expect(childPos.position.y).toBe(200);
  });

  it("recomputes all siblings when a new child arrives alongside existing ones", () => {
    const model = makeModel([
      { id: "A", childIds: ["C1", "C2"] },
      { id: "C1" },
      { id: "C2" },
    ]);
    const adjustedModel: DiagramModel = {
      ...model,
      root: { ...model.root, childIds: ["A"] },
    };
    const prev: ViewState = {
      ...createEmptyViewState(),
      positions: {
        A: pos("A", 400, 300, 200),
        "A.C1": pos("C1", 430, 300),
      },
    };
    const result = layout.apply(adjustedModel, CANVAS, prev);

    expect(result.positions["A.C1"]).toBeDefined();
    expect(result.positions["A.C2"]).toBeDefined();
  });

  it("resolves relationships in output viewState", () => {
    const model: DiagramModel = {
      root: createElement("root", "object"),
      elements: {
        A: createElement("A", "object"),
        B: createElement("B", "object"),
      },
      relationships: {
        r1: { id: "r1", source: "A", target: "B", type: "-->" },
      },
      metadata: { version: "1", created: "", modified: "" },
    };
    model.root.childIds = ["A", "B"];
    const prev: ViewState = {
      ...createEmptyViewState(),
      positions: {
        A: pos("A", 100, 200),
        B: pos("B", 300, 200),
      },
    };
    const result = layout.apply(model, CANVAS, prev);
    expect(
      result.relationships.some(
        (r) => r.sourcePath === "A" && r.targetPath === "B",
      ),
    ).toBe(true);
  });

  it("inherits non-position fields (viewMode, zoom, pan) from previousViewState", () => {
    const model = makeModel([{ id: "A" }]);
    const prev: ViewState = {
      ...createEmptyViewState(),
      viewMode: "execute",
      zoom: 2,
      pan: { x: 50, y: 100 },
      positions: { A: pos("A", 100, 200) },
    };
    const result = layout.apply(model, CANVAS, prev);
    expect(result.zoom).toBe(2);
    expect(result.pan).toEqual({ x: 50, y: 100 });
  });
});
