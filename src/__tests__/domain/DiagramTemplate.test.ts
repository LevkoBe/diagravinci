import { describe, it, expect } from "vitest";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import {
  SELECTOR_SHOWCASE_TEMPLATES,
  EXECUTION_TEMPLATES,
  STRESS_TEMPLATES,
  ALL_REL_TYPES_TEMPLATE,
  ALL_ELEMENT_TYPES_TEMPLATE,
  WIDE_FANOUT_TEMPLATE,
} from "../../domain/models/DiagramTemplate";

function parse(code: string) {
  return new Parser(new Lexer(code).tokenize()).parse();
}

function elCount(code: string) {
  return Object.keys(parse(code).elements).length;
}

function relCount(code: string) {
  return Object.keys(parse(code).relationships).length;
}

describe("TYPE_SHOWCASE_TEMPLATES", () => {
  it("all-rel-types — 6 elements, one of each relationship style", () => {
    const { code } = ALL_REL_TYPES_TEMPLATE;
    expect(elCount(code)).toBe(6);
    expect(relCount(code)).toBe(6);
    const rels = Object.values(parse(code).relationships);
    const types = new Set(rels.map((r) => r.type));
    expect(types.size).toBe(6);
  });

  it("all-element-types — one of each element type", () => {
    const { code } = ALL_ELEMENT_TYPES_TEMPLATE;
    expect(relCount(code)).toBe(6);
    const model = parse(code);
    const types = Object.values(model.elements).map((e) => e.type);
    expect(types).toContain("object");
    expect(types).toContain("collection");
    expect(types).toContain("function");
    expect(types).toContain("state");
    expect(types).toContain("choice");
    expect(types).toContain("flow");
  });

  it("wide-fanout — hub + 20 leaves, 20 relationships", () => {
    const { code } = WIDE_FANOUT_TEMPLATE;
    expect(elCount(code)).toBe(21);
    expect(relCount(code)).toBe(20);
  });
});

describe("SELECTOR_SHOWCASE_TEMPLATES", () => {
  it("selector-flags — 4 filter presets, 12 elements, 4 relationships", () => {
    const { code } = SELECTOR_SHOWCASE_TEMPLATES.find(
      (t) => t.id === "selector-flags",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(12);
    expect(Object.keys(model.relationships).length).toBe(4);
    expect(model.selectors?.length).toBe(4);
  });

  it("selector-atoms-type — 3 filter presets, 10 elements, 4 relationships", () => {
    const { code } = SELECTOR_SHOWCASE_TEMPLATES.find(
      (t) => t.id === "selector-atoms-type",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(10);
    expect(Object.keys(model.relationships).length).toBe(4);
    expect(model.selectors?.length).toBe(3);
  });

  it("selector-atoms-name — 3 filter presets, 12 elements, 7 relationships", () => {
    const { code } = SELECTOR_SHOWCASE_TEMPLATES.find(
      (t) => t.id === "selector-atoms-name",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(12);
    expect(Object.keys(model.relationships).length).toBe(7);
    expect(model.selectors?.length).toBe(3);
  });

  it("selector-atoms-combine — 3 atoms → 5 filter presets, 7 elements, 6 relationships", () => {
    const { code } = SELECTOR_SHOWCASE_TEMPLATES.find(
      (t) => t.id === "selector-atoms-combine",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(7);
    expect(Object.keys(model.relationships).length).toBe(6);
    expect(model.selectors?.length).toBe(5);
  });
});

describe("EXECUTION_TEMPLATES", () => {
  it("exec-linear-pipeline — gen(a b c) → choice → two sinks", () => {
    const { code } = EXECUTION_TEMPLATES.find(
      (t) => t.id === "exec-linear-pipeline",
    )!;
    const model = parse(code);
    expect(Object.keys(model.relationships).length).toBe(5);
    const gen = model.elements["gen"];
    expect(gen?.type).toBe("function");
    const ch = model.elements["ch"];
    expect(ch?.type).toBe("choice");
    const rels = Object.values(model.relationships);
    const labeledRels = rels.filter((r) => r.label);
    expect(labeledRels.map((r) => r.label?.toLowerCase())).toContain("yes");
    expect(labeledRels.map((r) => r.label?.toLowerCase())).toContain("no");
  });

  it("exec-generator-filter — gen spawns Good_Item and Faulty_Itm as separate children, filter is choice<Item>", () => {
    const { code } = EXECUTION_TEMPLATES.find(
      (t) => t.id === "exec-generator-filter",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(8);
    expect(Object.keys(model.relationships).length).toBe(4);
    const gen = model.elements["gen"];
    expect(gen?.type).toBe("function");
    expect(gen?.childIds).toContain("Good_Item");
    expect(gen?.childIds).toContain("Faulty_Itm");
    const filter = model.elements["filter"];
    expect(filter?.type).toBe("choice");
    expect(filter?.childIds).toContain("Item");
    const rels = Object.values(model.relationships);
    expect(rels.some((r) => r.label === "pass")).toBe(true);
    expect(rels.some((r) => r.label === "reject")).toBe(true);
  });

  it("exec-round-robin — round_robin function with 3 worker targets", () => {
    const { code } = EXECUTION_TEMPLATES.find(
      (t) => t.id === "exec-round-robin",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(6);
    expect(Object.keys(model.relationships).length).toBe(4);
    expect(model.elements["round_robin"]?.type).toBe("function");
    const rels = Object.values(model.relationships);
    const rrOuts = rels.filter((r) => r.source === "round_robin");
    expect(rrOuts.length).toBe(3);
  });

  it("exec-decision-tree — root/branch1/branch2 are choice elements, 7 yes/no-labeled relationships", () => {
    const { code } = EXECUTION_TEMPLATES.find(
      (t) => t.id === "exec-decision-tree",
    )!;
    const model = parse(code);
    expect(Object.keys(model.relationships).length).toBe(7);
    expect(model.elements["root"]?.type).toBe("choice");
    expect(model.elements["branch1"]?.type).toBe("choice");
    expect(model.elements["branch2"]?.type).toBe("choice");
    const rels = Object.values(model.relationships);
    const labeled = rels.filter((r) => r.label);
    expect(labeled.length).toBe(6);
  });

  it("exec-connector — four gen functions feed connector, 5 relationships", () => {
    const { code } = EXECUTION_TEMPLATES.find(
      (t) => t.id === "exec-connector",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(10);
    expect(Object.keys(model.relationships).length).toBe(5);
    expect(model.elements["gen_a"]?.type).toBe("function");
    expect(model.elements["gen_b"]?.type).toBe("function");
    expect(model.elements["connector"]?.type).toBe("function");
    const rels = Object.values(model.relationships);
    const connectorIns = rels.filter((r) => r.target === "connector");
    expect(connectorIns.length).toBe(4);
  });

  it("exec-disconnector — gen(triangle) → disconnector → out, x/y/z are internally connected", () => {
    const { code } = EXECUTION_TEMPLATES.find(
      (t) => t.id === "exec-disconnector",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(6);
    expect(Object.keys(model.relationships).length).toBe(5);
    expect(model.elements["gen"]?.childIds).toContain("x");
    expect(model.elements["gen"]?.childIds).toContain("y");
    expect(model.elements["gen"]?.childIds).toContain("z");
    expect(model.elements["disconnector"]?.type).toBe("function");
  });

  it("exec-multiplier-duplicator — multiplier_3 and duplicator are function elements", () => {
    const { code } = EXECUTION_TEMPLATES.find(
      (t) => t.id === "exec-multiplier-duplicator",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(8);
    expect(Object.keys(model.relationships).length).toBe(6);
    expect(model.elements["multiplier_3"]?.type).toBe("function");
    expect(model.elements["duplicator"]?.type).toBe("function");
    const dupOuts = Object.values(model.relationships).filter(
      (r) => r.source === "duplicator",
    );
    expect(dupOuts.length).toBe(2);
  });

  it("exec-deduplicator-throttler — multiplier_4 / deduplicator / throttler_3 are function elements, 6 relationships", () => {
    const { code } = EXECUTION_TEMPLATES.find(
      (t) => t.id === "exec-deduplicator-throttler",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(8);
    expect(Object.keys(model.relationships).length).toBe(6);
    expect(model.elements["multiplier_4"]?.type).toBe("function");
    expect(model.elements["deduplicator"]?.type).toBe("function");
    expect(model.elements["throttler_3"]?.type).toBe("function");
  });
});

describe("STRESS_TEMPLATES", () => {
  it("stress-star — hub + 200 spokes, 200 relationships", () => {
    const { code } = STRESS_TEMPLATES.find((t) => t.id === "stress-star")!;
    expect(elCount(code)).toBe(201);
    expect(relCount(code)).toBe(200);
    const model = parse(code);
    expect(model.elements["Hub"]).toBeDefined();
    const hubOuts = Object.values(model.relationships).filter(
      (r) => r.source === "Hub",
    );
    expect(hubOuts.length).toBe(200);
  });

  it("stress-chain — 300 nodes, 329 relationships (299 sequential + 30 skip)", () => {
    const { code } = STRESS_TEMPLATES.find((t) => t.id === "stress-chain")!;
    expect(elCount(code)).toBe(300);
    expect(relCount(code)).toBe(329);
  });

  it("stress-clusters — 252 elements (12 clusters × 20 nodes + 12 parents), 21 inter-cluster relationships", () => {
    const { code } = STRESS_TEMPLATES.find((t) => t.id === "stress-clusters")!;
    expect(elCount(code)).toBe(252);
    expect(relCount(code)).toBe(21);
  });
});
