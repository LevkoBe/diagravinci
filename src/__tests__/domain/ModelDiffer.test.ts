import { describe, it, expect } from "vitest";
import { ModelDiffer } from "../../domain/sync/ModelDiffer";
import { createElement } from "../../domain/models/Element";
import { createRelationship } from "../../domain/models/Relationship";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import type { DiagramModel } from "../../domain/models/DiagramModel";

function baseModel(): DiagramModel {
  return createEmptyDiagram();
}

function withElement(model: DiagramModel, id: string, type = "object" as const): DiagramModel {
  return {
    ...model,
    elements: { ...model.elements, [id]: createElement(id, type) },
  };
}

function withRootChild(model: DiagramModel, id: string): DiagramModel {
  return {
    ...model,
    root: { ...model.root, childIds: [...model.root.childIds, id] },
  };
}

function withRelationship(model: DiagramModel, id: string, source: string, target: string): DiagramModel {
  return {
    ...model,
    relationships: {
      ...model.relationships,
      [id]: createRelationship(id, source, target, "-->"),
    },
  };
}

describe("ModelDiffer", () => {
  describe("isEmpty", () => {
    it("returns true for identical empty models", () => {
      const m = baseModel();
      const diff = ModelDiffer.diff(m, m);
      expect(ModelDiffer.isEmpty(diff)).toBe(true);
    });

    it("returns false when elements differ", () => {
      const old = baseModel();
      const next = withElement(old, "a");
      const diff = ModelDiffer.diff(old, next);
      expect(ModelDiffer.isEmpty(diff)).toBe(false);
    });
  });

  describe("element diffing", () => {
    it("detects added elements", () => {
      const old = baseModel();
      const next = withElement(old, "a");
      const diff = ModelDiffer.diff(old, next);
      expect(diff.addedElements.some((e) => e.id === "a")).toBe(true);
      expect(diff.removedElementIds).toHaveLength(0);
      expect(diff.modifiedElements).toHaveLength(0);
    });

    it("detects removed elements", () => {
      const old = withElement(baseModel(), "a");
      const next = baseModel();
      const diff = ModelDiffer.diff(old, next);
      expect(diff.removedElementIds).toContain("a");
      expect(diff.addedElements).toHaveLength(0);
    });

    it("detects modified elements", () => {
      const old = withElement(baseModel(), "a");
      const next = {
        ...old,
        elements: {
          ...old.elements,
          a: { ...old.elements["a"], type: "state" as const },
        },
      };
      const diff = ModelDiffer.diff(old, next);
      expect(diff.modifiedElements.some((e) => e.id === "a")).toBe(true);
    });

    it("does not flag unchanged elements as modified", () => {
      const old = withElement(baseModel(), "a");
      const next = withElement(old, "b");
      const diff = ModelDiffer.diff(old, next);
      expect(diff.modifiedElements).toHaveLength(0);
    });
  });

  describe("root childIds diffing", () => {
    it("detects added root child ids", () => {
      const old = baseModel();
      const next = withRootChild(withElement(old, "a"), "a");
      const diff = ModelDiffer.diff(old, next);
      expect(diff.addedElements.some((e) => e.id === "a")).toBe(true);
    });

    it("detects removed root child ids", () => {
      const old = withRootChild(withElement(baseModel(), "a"), "a");
      const next = withElement(baseModel(), "a");
      const diff = ModelDiffer.diff(old, next);
      expect(diff.removedElementIds).toContain("a");
    });
  });

  describe("relationship diffing", () => {
    it("detects added relationships", () => {
      const old = withElement(withElement(baseModel(), "a"), "b");
      const next = withRelationship(old, "r1", "a", "b");
      const diff = ModelDiffer.diff(old, next);
      expect(diff.addedRelationships.some((r) => r.id === "r1")).toBe(true);
      expect(diff.removedRelationshipIds).toHaveLength(0);
    });

    it("detects removed relationships", () => {
      const base = withElement(withElement(baseModel(), "a"), "b");
      const old = withRelationship(base, "r1", "a", "b");
      const next = base;
      const diff = ModelDiffer.diff(old, next);
      expect(diff.removedRelationshipIds).toContain("r1");
    });

    it("detects modified relationships", () => {
      const base = withElement(withElement(baseModel(), "a"), "b");
      const old = withRelationship(base, "r1", "a", "b");
      const next = {
        ...old,
        relationships: {
          ...old.relationships,
          r1: { ...old.relationships["r1"], label: "changed" },
        },
      };
      const diff = ModelDiffer.diff(old, next);
      expect(diff.modifiedRelationships.some((r) => r.id === "r1")).toBe(true);
    });

    it("does not flag unchanged relationships as modified", () => {
      const base = withElement(withElement(baseModel(), "a"), "b");
      const old = withRelationship(base, "r1", "a", "b");
      const diff = ModelDiffer.diff(old, old);
      expect(diff.modifiedRelationships).toHaveLength(0);
    });
  });

  describe("no changes", () => {
    it("produces empty diff for identical non-empty models", () => {
      let m = withElement(baseModel(), "a");
      m = withElement(m, "b");
      m = withRelationship(m, "r1", "a", "b");
      const diff = ModelDiffer.diff(m, m);
      expect(ModelDiffer.isEmpty(diff)).toBe(true);
    });
  });
});
