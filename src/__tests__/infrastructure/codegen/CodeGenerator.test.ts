import { describe, it, expect } from "vitest";
import { CodeGenerator } from "../../../infrastructure/codegen/CodeGenerator";
import { Lexer } from "../../../infrastructure/parser/Lexer";
import { Parser } from "../../../infrastructure/parser/Parser";
import type { DiagramModel } from "../../../domain/models/DiagramModel";
import { createEmptyDiagram } from "../../../domain/models/DiagramModel";
import { createElement } from "../../../domain/models/Element";
import { createRelationship } from "../../../domain/models/Relationship";
import type { Group } from "../../../domain/models/Selector";
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

    it("named leaf flow emits name>>", () => {
      const code = generate(modelWithElement("pipe", "flow"));
      expect(code).toContain("pipe>>");
    });

    it("anonymous leaf flow (anon_N id) emits its id as name so it can be re-identified on re-parse", () => {
      const code = generate(modelWithElement("anon_1", "flow"));
      expect(code).toContain("anon_1>>");
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
    it("generates no directives for an empty model with empty default session", () => {
      const model = parse("");
      const code = generate(model);
      expect(code).not.toContain("!session");
      expect(code).not.toContain("!rule");
      expect(code).not.toContain("!selector");
    });

    it("emits the default session when it has selector modes", () => {
      const model = parse("!session  id=default  label=Default  selectors=foo:color");
      const code = generate(model);
      expect(code).toContain("!session");
      expect(code).toContain("id=default");
      expect(code).toContain("groups=foo:color");
    });
  });

  describe("session emission", () => {
    it("suppresses the default session when its groupModes is empty", () => {
      const model = createEmptyDiagram();
      const code = generate(model);
      expect(code).not.toContain("!session");
    });

    it("emits the default session when it has selector modes", () => {
      const model = createEmptyDiagram();
      model.sessions = [{ id: "default", label: "Default", groupModes: { s1: "color" } }];
      const code = generate(model);
      expect(code).toContain("!session  id=default");
      expect(code).toContain("groups=s1:color");
    });

    it("always emits non-default sessions even when groupModes is empty", () => {
      const model = createEmptyDiagram();
      model.sessions = [
        { id: "default", label: "Default", groupModes: {} },
        { id: "remote", label: "Remote", groupModes: {} },
      ];
      const code = generate(model);
      expect(code).toContain("!session  id=remote");
      expect(code).not.toContain("!session  id=default");
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
      model.relationships["r"] = createRelationship("r", "b", "a", "--o");
      expect(generate(model)).toContain("b --o a");
      expect(generate(model)).not.toContain("--undefined");
    });
  });

  describe("group generation", () => {
    function makeGroup(overrides: Partial<Group> = {}): Group {
      return { id: "svc", label: "Services", color: "#2196f3", rule: "'.*Service'?", ...overrides };
    }

    it("generates !group line with id, color, and rule", () => {
      const model = createEmptyDiagram();
      model.groups = [makeGroup()];
      const code = generate(model);
      expect(code).toContain("!group  id=svc");
      expect(code).toContain("color=#2196f3");
      expect(code).toContain("rule='.*Service'?");
    });

    it("omits rule field when rule is empty", () => {
      const model = createEmptyDiagram();
      model.groups = [makeGroup({ rule: "" })];
      const code = generate(model);
      expect(code).not.toContain("rule=");
    });

    it("inserts a blank line between group directives and elements", () => {
      const model = createEmptyDiagram();
      model.groups = [makeGroup()];
      model.elements["a"] = createElement("a", "object");
      model.root.childIds.push("a");
      const code = generate(model);
      expect(code).toMatch(/!group[\s\S]*\n\na\{\}/);
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

    it("named flow with children round-trips correctly", () => {
      const { first, regenerated } = roundTrip("player >emeralds> shop");
      expect(Object.keys(regenerated.elements).length).toBe(Object.keys(first.elements).length);
      expect(Object.keys(regenerated.relationships).length).toBe(Object.keys(first.relationships).length);
      expect(regenerated.elements["player"]?.type).toBe("flow");
      expect(regenerated.elements["player"]?.childIds).toContain("emeralds");
    });

    it("named flow with children preserves type through round-trip", () => {
      const { regenerated } = roundTrip("queue>Token> handler()");
      expect(regenerated.elements["queue"]?.type).toBe("flow");
      expect(regenerated.elements["queue"]?.childIds).toContain("Token");
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

    it("flow chain inside container stores positional (qualified) relationship paths", () => {
      const m = parse("c(a() >> x)");
      const rels = Object.values(m.relationships);
      expect(rels).toHaveLength(2);
      const [r1, r2] = rels.sort((a, b) => a.source.localeCompare(b.source));
      expect(r1.source).toMatch(/^c\./);
      expect(r1.target).toMatch(/^c\./);
      expect(r2.source).toMatch(/^c\./);
      expect(r2.target).toMatch(/^c\./);
      const code = generate(m);
      const relLines = code.split("\n").filter(l => l.includes("..>"));
      expect(relLines.every(l => l.startsWith("c."))).toBe(true);
    });

    it("shared element with anonymous flow does not accumulate extra flows across round-trips", () => {
      const code = "c(a() >> x)\nd{c} e{c}";
      const m1 = parse(code);
      const m2 = parse(generate(m1));
      const m3 = parse(generate(m2));

      const flowCount = (model: ReturnType<typeof parse>) =>
        Object.values(model.elements).filter((e) => e.type === "flow").length;

      expect(flowCount(m2), "flow count after first re-parse").toBe(flowCount(m1));
      expect(flowCount(m3), "flow count after second re-parse").toBe(flowCount(m1));

      expect(m2.elements["c"]?.childIds, "c.childIds after first re-parse").toEqual(
        m1.elements["c"]?.childIds,
      );
      expect(m3.elements["c"]?.childIds, "c.childIds after second re-parse").toEqual(
        m1.elements["c"]?.childIds,
      );
    });

    it("snapshot-v1-core.dg: round-trip preserves all named element structure", () => {
      const SNAPSHOT = `PresentationLayer{
  CodeEditor{
    Store
    SyncManager
  }
  VisualCanvas{
    Store
    SyncManager
    ExecutionEngine
  }
}
ApplicationLayer{
  Store{
    uiSlice
    diagramSlice
  }
  SyncManager{
    Parser
    Lexer
    CodeGenerator
    Store
    syncFromCode()
    syncFromVis()
  }
  ExecutionEngine
}

DomainLayer{
  DiagramModel{
    elements
    relationships
    metadata
  }
  ViewState{
    positionedElements
    positionedRelationships
  }
}

InfrastructureLayer{
  Lexer{
    tokenize(code)>token[]>
  }
  Parser{
    parse(code)>DiagramModel>
  }
  CodeGenerator{
    generate(model)>code>
  }
}

Store.diagramSlice --> DiagramModel
Store.diagramSlice --> ViewState
SyncManager --> DiagramModel
SyncManager --> ViewState
`;

      const isAnon = (id: string) => /(?:^|\.)anon_\d+$/.test(id);
      const namedIds = (model: ReturnType<typeof parse>) =>
        Object.keys(model.elements).filter((id) => !isAnon(id)).sort();
      const namedChildIds = (model: ReturnType<typeof parse>, id: string) =>
        (model.elements[id]?.childIds ?? []).filter((c) => !isAnon(c));
      const namedRels = (model: ReturnType<typeof parse>) =>
        Object.values(model.relationships)
          .filter((r) => !isAnon(r.source) && !isAnon(r.target))
          .map((r) => `${r.source}${r.type}${r.target}`)
          .sort();

      const m1 = parse(SNAPSHOT);
      const m2 = parse(generate(m1));

      expect(namedIds(m2), "element set").toEqual(namedIds(m1));
      expect(m2.root.childIds, "root.childIds order").toEqual(m1.root.childIds);

      for (const id of namedIds(m1)) {
        expect(
          namedChildIds(m2, id),
          `${id}.childIds`,
        ).toEqual(namedChildIds(m1, id));
        expect(m2.elements[id]?.type, `${id}.type`).toBe(m1.elements[id]?.type);
      }

      expect(namedRels(m2), "relationships").toEqual(namedRels(m1));
    });
  });
});
