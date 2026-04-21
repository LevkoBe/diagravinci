import { describe, it, expect } from "vitest";
import {
  createEmptyDiagram,
  addElement,
  addRelationship,
  getSubtreeIds,
} from "../../domain/models/DiagramModel";
import { createElement } from "../../domain/models/Element";
import { createRelationship } from "../../domain/models/Relationship";

describe("createEmptyDiagram", () => {
  it("returns a model with a root element", () => {
    const model = createEmptyDiagram();
    expect(model.root).toBeDefined();
    expect(model.root.type).toBe("object");
    expect(model.root.childIds).toEqual([]);
  });

  it("returns empty elements and relationships", () => {
    const model = createEmptyDiagram();
    expect(Object.keys(model.elements)).toHaveLength(0);
    expect(Object.keys(model.relationships)).toHaveLength(0);
  });

  it("sets metadata with version and timestamps", () => {
    const model = createEmptyDiagram();
    expect(model.metadata.version).toBe("1.0.0");
    expect(model.metadata.created).toBeTruthy();
    expect(model.metadata.modified).toBeTruthy();
  });
});

describe("addElement", () => {
  it("adds element to the elements map", () => {
    const model = createEmptyDiagram();
    const el = createElement("foo", "object");
    const updated = addElement(model, el);
    expect(updated.elements["foo"]).toBeDefined();
    expect(updated.elements["foo"].id).toBe("foo");
  });

  it("does not mutate the original model", () => {
    const model = createEmptyDiagram();
    const el = createElement("foo", "object");
    addElement(model, el);
    expect(model.elements["foo"]).toBeUndefined();
  });

  it("preserves existing elements", () => {
    const model = createEmptyDiagram();
    const e1 = createElement("e1", "object");
    const e2 = createElement("e2", "object");
    const m1 = addElement(model, e1);
    const m2 = addElement(m1, e2);
    expect(m2.elements["e1"]).toBeDefined();
    expect(m2.elements["e2"]).toBeDefined();
  });

  it("updates the modified timestamp", () => {
    const model = createEmptyDiagram();
    const el = createElement("foo", "object");
    const before = model.metadata.modified;
    const updated = addElement(model, el);
    expect(updated.metadata.modified >= before).toBe(true);
  });
});

describe("addRelationship", () => {
  it("adds relationship to the relationships map", () => {
    const model = createEmptyDiagram();
    const rel = createRelationship("r1", "A", "B", "-->");
    const updated = addRelationship(model, rel);
    expect(updated.relationships["r1"]).toBeDefined();
    expect(updated.relationships["r1"].source).toBe("A");
    expect(updated.relationships["r1"].target).toBe("B");
  });

  it("does not mutate the original model", () => {
    const model = createEmptyDiagram();
    const rel = createRelationship("r1", "A", "B", "-->");
    addRelationship(model, rel);
    expect(model.relationships["r1"]).toBeUndefined();
  });

  it("preserves existing relationships", () => {
    const model = createEmptyDiagram();
    const r1 = createRelationship("r1", "A", "B", "-->");
    const r2 = createRelationship("r2", "B", "C", "-->");
    const m2 = addRelationship(addRelationship(model, r1), r2);
    expect(m2.relationships["r1"]).toBeDefined();
    expect(m2.relationships["r2"]).toBeDefined();
  });
});

describe("getSubtreeIds", () => {
  function makeElements(
    defs: Array<{ id: string; childIds?: string[] }>,
  ): Record<string, ReturnType<typeof createElement>> {
    const result: Record<string, ReturnType<typeof createElement>> = {};
    for (const def of defs) {
      const el = createElement(def.id, "object");
      el.childIds = def.childIds ?? [];
      result[def.id] = el;
    }
    return result;
  }

  it("returns just the root when it has no children", () => {
    const els = makeElements([{ id: "A" }]);
    expect(getSubtreeIds("A", els)).toEqual(["A"]);
  });

  it("returns root and all descendants", () => {
    const els = makeElements([
      { id: "A", childIds: ["B", "C"] },
      { id: "B", childIds: ["D"] },
      { id: "C" },
      { id: "D" },
    ]);
    const ids = getSubtreeIds("A", els);
    expect(ids).toContain("A");
    expect(ids).toContain("B");
    expect(ids).toContain("C");
    expect(ids).toContain("D");
    expect(ids).toHaveLength(4);
  });

  it("handles an element not in the map (returns just the id)", () => {
    expect(getSubtreeIds("missing", {})).toEqual(["missing"]);
  });

  it("is cycle-safe", () => {
    const els = makeElements([
      { id: "A", childIds: ["B"] },
      { id: "B", childIds: ["A"] },
    ]);
    const ids = getSubtreeIds("A", els);
    expect(ids).toContain("A");
    expect(ids).toContain("B");
    expect(ids).toHaveLength(2);
  });

  it("handles deeply nested trees", () => {
    const els = makeElements([
      { id: "A", childIds: ["B"] },
      { id: "B", childIds: ["C"] },
      { id: "C", childIds: ["D"] },
      { id: "D" },
    ]);
    expect(getSubtreeIds("A", els)).toHaveLength(4);
  });
});
