import { describe, it, expect } from "vitest";
import { CodeGenerator } from "../../../infrastructure/codegen/CodeGenerator";
import { Lexer } from "../../../infrastructure/parser/Lexer";
import { Parser } from "../../../infrastructure/parser/Parser";
import type { DiagramModel } from "../../../domain/models/DiagramModel";
import { createEmptyDiagram } from "../../../domain/models/DiagramModel";
import { createElement } from "../../../domain/models/Element";
import { createRelationship } from "../../../domain/models/Relationship";
import type { Rule, Selector } from "../../../domain/models/Selector";
import {
  BUILT_IN_TEMPLATES,
  EXECUTION_TEMPLATES,
} from "../../../domain/models/DiagramTemplate";

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

  describe("element flags", () => {
    it("appends a single flag as :flag suffix", () => {
      const model = parse("knight:fine{}");
      const code = generate(model);
      expect(code).toContain("knight:fine{}");
    });

    it("appends multiple flags in order", () => {
      const model = createEmptyDiagram();
      const el = createElement("hero", "object");
      el.flags = ["active", "selected"];
      model.elements["hero"] = el;
      model.root.childIds.push("hero");
      const code = generate(model);
      expect(code).toContain("hero:active:selected{}");
    });

    it("no flag suffix when flags array is absent", () => {
      const code = generate(parse("x{}"));
      expect(code).not.toContain(":");
    });
  });

  describe("labeled relationships — all arrow types", () => {
    it("formats label for --> as --label-->", () => {
      const model = createEmptyDiagram();
      model.elements["a"] = createElement("a", "object");
      model.elements["b"] = createElement("b", "object");
      model.root.childIds.push("a", "b");
      model.relationships["r"] = createRelationship("r", "a", "b", "-->", "calls");
      expect(generate(model)).toContain("a --calls--> b");
    });

    it("formats label for ..> as --label..>", () => {
      const model = createEmptyDiagram();
      model.elements["a"] = createElement("a", "object");
      model.elements["b"] = createElement("b", "object");
      model.root.childIds.push("a", "b");
      model.relationships["r"] = createRelationship("r", "a", "b", "..>", "async");
      expect(generate(model)).toContain("a --async..> b");
    });

    it("formats label for --|> as --label--|>", () => {
      const model = createEmptyDiagram();
      model.elements["a"] = createElement("a", "object");
      model.elements["b"] = createElement("b", "object");
      model.root.childIds.push("a", "b");
      model.relationships["r"] = createRelationship("r", "a", "b", "--|>", "extends");
      expect(generate(model)).toContain("a --extends--|> b");
    });

    it("omits label section when label is undefined", () => {
      const model = createEmptyDiagram();
      model.elements["a"] = createElement("a", "object");
      model.elements["b"] = createElement("b", "object");
      model.root.childIds.push("a", "b");
      model.relationships["r"] = createRelationship("r", "a", "b", "o--");
      expect(generate(model)).toContain("a o-- b");
      expect(generate(model)).not.toContain("--undefined");
    });
  });

  describe("rule generation", () => {
    function modelWithRule(rule: Rule): DiagramModel {
      const model = createEmptyDiagram();
      model.rules = [rule];
      return model;
    }

    it("generates !rule line with id and pattern", () => {
      const code = generate(
        modelWithRule({ id: "fn", patterns: { function_name: ".*" } }),
      );
      expect(code).toContain("!rule  id=fn  function_name=.*");
    });

    it("quotes pattern values that contain spaces", () => {
      const code = generate(
        modelWithRule({ id: "x", patterns: { all_name: "has spaces" } }),
      );
      expect(code).toContain('"has spaces"');
    });

    it("generates multiple rules in order", () => {
      const model = createEmptyDiagram();
      model.rules = [
        { id: "a", patterns: { object_name: ".*" } },
        { id: "b", patterns: { function_name: ".*" } },
      ];
      const code = generate(model);
      const aLine = code.indexOf("!rule  id=a");
      const bLine = code.indexOf("!rule  id=b");
      expect(aLine).toBeGreaterThanOrEqual(0);
      expect(bLine).toBeGreaterThan(aLine);
    });
  });

  describe("selector generation", () => {
    function makeSelector(overrides: Partial<Selector> = {}): Selector {
      return {
        id: "ok",
        label: "ok",
        color: "#123456",
        mode: "color",
        expression: "fn",
        ...overrides,
      };
    }

    it("generates !selector line with name, color, mode, expression", () => {
      const model = createEmptyDiagram();
      model.selectors = [makeSelector()];
      const code = generate(model);
      expect(code).toContain("!selector");
      expect(code).toContain("name=ok");
      expect(code).toContain("color=#123456");
      expect(code).toContain("mode=color");
      expect(code).toContain("expression=fn");
    });

    it("omits expression field when expression is empty", () => {
      const model = createEmptyDiagram();
      model.selectors = [makeSelector({ expression: "" })];
      const code = generate(model);
      expect(code).not.toContain("expression=");
    });

    it("quotes expression value that contains spaces", () => {
      const model = createEmptyDiagram();
      model.selectors = [makeSelector({ expression: "a b" })];
      const code = generate(model);
      expect(code).toContain('expression="a b"');
    });

    it("generates hide, dim, and off modes correctly", () => {
      const model = createEmptyDiagram();
      model.selectors = [
        makeSelector({ id: "h", mode: "hide" }),
        makeSelector({ id: "d", mode: "dim" }),
        makeSelector({ id: "o", mode: "off" }),
      ];
      const code = generate(model);
      expect(code).toContain("mode=hide");
      expect(code).toContain("mode=dim");
      expect(code).toContain("mode=off");
    });
  });

  describe("rules/selectors blank-line separator", () => {
    it("inserts a blank line between directives and elements", () => {
      const model = createEmptyDiagram();
      model.selectors = [
        { id: "p", label: "p", color: "#fff", mode: "color", expression: "" },
      ];
      model.elements["a"] = createElement("a", "object");
      model.root.childIds.push("a");
      const code = generate(model);
      expect(code).toMatch(/!selector[\s\S]*\n\na\{\}/);
    });

    it("does not insert extra blank line when there are no directives", () => {
      const code = generate(parse("a{}"));
      expect(code).not.toMatch(/^\n\n/);
    });
  });

  describe("deep nesting indentation", () => {
    it("indents three levels with 2 spaces each", () => {
      const code = generate(parse("a{b{c{d}}}"));
      expect(code).toContain("a{");
      expect(code).toContain("  b{");
      expect(code).toContain("    c{");
      expect(code).toContain("      d{}");
    });
  });

  describe("round-trip: parse → generate → parse", () => {
    function roundTrip(code: string) {
      const first = parse(code);
      const regenerated = parse(generate(first));
      return { first, regenerated };
    }

    it("preserves element count through round-trip", () => {
      const { first, regenerated } = roundTrip("a{b c} d e");
      expect(Object.keys(regenerated.elements).length).toBe(
        Object.keys(first.elements).length,
      );
    });

    it("preserves relationship count through round-trip", () => {
      const { first, regenerated } = roundTrip("a b c\na --> b\nb --> c");
      expect(Object.keys(regenerated.relationships).length).toBe(
        Object.keys(first.relationships).length,
      );
    });

    it("preserves element types through round-trip", () => {
      const { first, regenerated } = roundTrip("obj{} coll[] fn() st||");
      const firstTypes = Object.values(first.elements)
        .map((e) => e.type)
        .sort();
      const regenTypes = Object.values(regenerated.elements)
        .map((e) => e.type)
        .sort();
      expect(regenTypes).toEqual(firstTypes);
    });

    it("preserves relationship labels through round-trip", () => {
      const { first, regenerated } = roundTrip(
        "a b\na --calls--> b",
      );
      const firstLabels = Object.values(first.relationships)
        .map((r) => r.label)
        .filter(Boolean);
      const regenLabels = Object.values(regenerated.relationships)
        .map((r) => r.label)
        .filter(Boolean);
      expect(regenLabels).toEqual(firstLabels);
    });

    it("round-trips all BUILT_IN_TEMPLATES without losing elements or relationships", () => {
      for (const { id, code } of BUILT_IN_TEMPLATES) {
        const { first, regenerated } = roundTrip(code);
        expect(
          Object.keys(regenerated.elements).length,
          `${id}: element count`,
        ).toBe(Object.keys(first.elements).length);
        expect(
          Object.keys(regenerated.relationships).length,
          `${id}: relationship count`,
        ).toBe(Object.keys(first.relationships).length);
      }
    });

    it("round-trips all EXECUTION_TEMPLATES without losing elements or relationships", () => {
      for (const { id, code } of EXECUTION_TEMPLATES) {
        const { first, regenerated } = roundTrip(code);
        expect(
          Object.keys(regenerated.elements).length,
          `${id}: element count`,
        ).toBe(Object.keys(first.elements).length);
        expect(
          Object.keys(regenerated.relationships).length,
          `${id}: relationship count`,
        ).toBe(Object.keys(first.relationships).length);
      }
    });

    it("is idempotent: second round-trip produces identical model to first", () => {
      const cases = [
        "a() c()\nb{a c a-->c}",
        "f2{x-->y}",
        "a() c()\nb{a c .a-->.c}",
        "alt{a c}\nf{alt.a-->alt.c}",
        "a b c\na-->b-->c",
        ...BUILT_IN_TEMPLATES.map((t) => t.code),
      ];

      for (const code of cases) {
        const first = parse(generate(parse(code)));
        const second = parse(generate(first));

        expect(
          Object.keys(second.relationships).sort(),
          `idempotency: relationships for "${code.slice(0, 40)}"`,
        ).toEqual(Object.keys(first.relationships).sort());

        expect(
          second.root.childIds,
          `idempotency: root.childIds for "${code.slice(0, 40)}"`,
        ).toEqual(first.root.childIds);

        for (const id of Object.keys(first.elements)) {
          expect(
            second.elements[id]?.childIds,
            `idempotency: ${id}.childIds for "${code.slice(0, 40)}"`,
          ).toEqual(first.elements[id].childIds);
        }
      }
    });
  });
});
