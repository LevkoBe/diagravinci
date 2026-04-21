import { describe, it, expect } from "vitest";
import { CodeGenerator } from "../../../infrastructure/codegen/CodeGenerator";
import { Lexer } from "../../../infrastructure/parser/Lexer";
import { Parser } from "../../../infrastructure/parser/Parser";
import type { DiagramModel } from "../../../domain/models/DiagramModel";
import { createEmptyDiagram } from "../../../domain/models/DiagramModel";
import { createElement } from "../../../domain/models/Element";
import { createRelationship } from "../../../domain/models/Relationship";

function parse(code: string): DiagramModel {
  const tokens = new Lexer(code).tokenize();
  return new Parser(tokens).parse();
}

function generate(model: DiagramModel): string {
  return new CodeGenerator(model).generate();
}

function modelWithElement(
  id: string,
  type: "object" | "state" | "function" | "flow" | "choice" | "collection",
): DiagramModel {
  const model = createEmptyDiagram();
  model.elements[id] = createElement(id, type);
  model.root.childIds.push(id);
  return model;
}

describe("CodeGenerator", () => {
  describe("single elements", () => {
    it("generates a leaf object element with {}", () => {
      const code = generate(parse("a"));
      expect(code).toContain("a{}");
    });

    it("generates a state element with []", () => {
      const code = generate(parse("a[]"));
      expect(code).toContain("a[]");
    });

    it("generates a function element with ()", () => {
      const code = generate(parse("a()"));
      expect(code).toContain("a()");
    });
  });

  describe("element type wrappers", () => {
    it("uses {} for object type", () => {
      const code = generate(modelWithElement("x", "object"));
      expect(code).toContain("x{}");
    });

    it("uses || for state type", () => {
      const code = generate(modelWithElement("x", "state"));
      expect(code).toContain("x||");
    });

    it("uses [] for collection type", () => {
      const code = generate(modelWithElement("x", "collection"));
      expect(code).toContain("x[]");
    });

    it("uses () for function type", () => {
      const code = generate(modelWithElement("x", "function"));
      expect(code).toContain("x()");
    });

    it("uses >> for flow type", () => {
      const code = generate(modelWithElement("x", "flow"));
      expect(code).toContain("x>>");
    });

    it("uses <> for choice type", () => {
      const code = generate(modelWithElement("x", "choice"));
      expect(code).toContain("x<>");
    });
  });

  describe("nested elements", () => {
    it("generates nested children with indentation", () => {
      const code = generate(parse("parent{child}"));
      expect(code).toContain("parent{");
      expect(code).toContain("  child{}");
      expect(code).toContain("}");
    });

    it("generates multi-level nesting", () => {
      const code = generate(parse("a{b{c}}"));
      expect(code).toContain("a{");
      expect(code).toContain("  b{");
      expect(code).toContain("    c{}");
    });

    it("generates multiple root elements", () => {
      const code = generate(parse("a b c"));
      expect(code).toContain("a{}");
      expect(code).toContain("b{}");
      expect(code).toContain("c{}");
    });

    it("generates multiple children in a container", () => {
      const code = generate(parse("parent{x y z}"));
      expect(code).toContain("x{}");
      expect(code).toContain("y{}");
      expect(code).toContain("z{}");
    });
  });

  describe("relationships", () => {
    it("generates a simple arrow relationship", () => {
      const code = generate(parse("a b\na --> b"));
      expect(code).toContain("a --> b");
    });

    it("generates a labeled relationship in arrow-label-arrow format", () => {
      const model = createEmptyDiagram();
      model.elements["a"] = createElement("a", "object");
      model.elements["b"] = createElement("b", "object");
      model.root.childIds.push("a", "b");
      model.relationships["r1"] = createRelationship(
        "r1",
        "a",
        "b",
        "-->",
        "calls",
      );
      const code = generate(model);
      expect(code).toContain("a --calls--> b");
    });

    it("generates dashed relationship", () => {
      const code = generate(parse("a b\na ..> b"));
      expect(code).toContain("a ..> b");
    });

    it("generates inheritance relationship", () => {
      const code = generate(parse("a b\na --|> b"));
      expect(code).toContain("a --|> b");
    });

    it("generates multiple relationships", () => {
      const code = generate(parse("a b c\na --> b\nb --> c"));
      expect(code).toContain("a --> b");
      expect(code).toContain("b --> c");
    });

    it("generates unlabeled relationship without label in output", () => {
      const code = generate(parse("a b\na --> b"));

      expect(code).toMatch(/a --> b/);
    });
  });

  describe("recursion detection", () => {
    it("marks recursive reference with # recursion comment", () => {
      const model = parse("a{b}");

      model.elements["b"] = { ...model.elements["b"], childIds: ["a"] };
      const code = generate(model);
      expect(code).toContain("# recursion");
    });
  });

  describe("missing element fallback", () => {
    it("uses [NON-EXISTING ELEMENT] for dangling child ids", () => {
      const model = parse("a");
      model.elements["a"] = { ...model.elements["a"], childIds: ["ghost"] };
      const code = generate(model);
      expect(code).toContain("[NON-EXISTING ELEMENT]");
    });
  });

  describe("empty model", () => {
    it("generates only a newline for empty model", () => {
      const model = parse("");
      const code = generate(model);
      expect(code.trim()).toBe("");
    });
  });
});
