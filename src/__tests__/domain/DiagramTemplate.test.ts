import { describe, it, expect } from "vitest";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import {
  BUILT_IN_TEMPLATES,
  EDGE_CASE_TEMPLATES,
  SELECTOR_SHOWCASE_TEMPLATES,
  EXECUTION_TEMPLATES,
  STRESS_TEMPLATES,
  COMPLEX_TEMPLATES,
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

describe("BUILT_IN_TEMPLATES", () => {
  it("mvc — 3 groups × 3 children, 4 relationships", () => {
    const { id, code } = BUILT_IN_TEMPLATES.find((t) => t.id === "mvc")!;
    expect(id).toBe("mvc");
    expect(elCount(code)).toBe(12);
    expect(relCount(code)).toBe(4);
  });

  it("microservices — gateway + 4 services (2 nested) + 4 infra, 8 relationships", () => {
    const { code } = BUILT_IN_TEMPLATES.find((t) => t.id === "microservices")!;
    expect(elCount(code)).toBe(12);
    expect(relCount(code)).toBe(8);
  });

  it("event-driven — producer / bus / consumer groups, 4 relationships", () => {
    const { code } = BUILT_IN_TEMPLATES.find((t) => t.id === "event-driven")!;
    expect(elCount(code)).toBe(12);
    expect(relCount(code)).toBe(4);
  });

  it("layered — 4 layers × 3 children, 3 relationships", () => {
    const { code } = BUILT_IN_TEMPLATES.find((t) => t.id === "layered")!;
    expect(elCount(code)).toBe(16);
    expect(relCount(code)).toBe(3);
  });

  it("data-pipeline — 3 sources + 4 transforms + 3 sinks, 2 relationships", () => {
    const { code } = BUILT_IN_TEMPLATES.find((t) => t.id === "data-pipeline")!;
    expect(elCount(code)).toBe(13);
    expect(relCount(code)).toBe(2);
  });

  it("state-machine — 4 collection groups × ~2 children, 5 relationships", () => {
    const { code } = BUILT_IN_TEMPLATES.find((t) => t.id === "state-machine")!;
    expect(elCount(code)).toBe(11);
    expect(relCount(code)).toBe(5);
    const model = parse(code);
    const collectionElements = Object.values(model.elements).filter(
      (e) => e.type === "collection",
    );
    expect(collectionElements.length).toBe(4);
  });
});

describe("EDGE_CASE_TEMPLATES", () => {
  it("edge-deep-nesting — 6 nested levels, no relationships", () => {
    const { code } = EDGE_CASE_TEMPLATES.find(
      (t) => t.id === "edge-deep-nesting",
    )!;
    expect(elCount(code)).toBe(12);
    expect(relCount(code)).toBe(0);
  });

  it("edge-all-rel-types — 6 elements, one of each relationship style", () => {
    const { code } = EDGE_CASE_TEMPLATES.find(
      (t) => t.id === "edge-all-rel-types",
    )!;
    expect(elCount(code)).toBe(6);
    expect(relCount(code)).toBe(6);
    const rels = Object.values(parse(code).relationships);
    const types = new Set(rels.map((r) => r.type));
    expect(types.size).toBe(6);
  });

  it("edge-all-element-types — one of each element type", () => {
    const { code } = EDGE_CASE_TEMPLATES.find(
      (t) => t.id === "edge-all-element-types",
    )!;
    expect(elCount(code)).toBe(6);
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

  it("edge-cycle — 3 services with nested handlers, 6 relationships", () => {
    const { code } = EDGE_CASE_TEMPLATES.find((t) => t.id === "edge-cycle")!;
    expect(elCount(code)).toBe(10);
    expect(relCount(code)).toBe(6);
  });

  it("edge-wide-fanout — hub + 20 leaves, 20 relationships", () => {
    const { code } = EDGE_CASE_TEMPLATES.find(
      (t) => t.id === "edge-wide-fanout",
    )!;
    expect(elCount(code)).toBe(21);
    expect(relCount(code)).toBe(20);
  });

  it("edge-mutual-nesting — parses without throwing", () => {
    const { code } = EDGE_CASE_TEMPLATES.find(
      (t) => t.id === "edge-mutual-nesting",
    )!;
    expect(() => parse(code)).not.toThrow();
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBeGreaterThan(0);
  });

  it("edge-26-isolated — 26 nodes, no relationships", () => {
    const { code } = EDGE_CASE_TEMPLATES.find(
      (t) => t.id === "edge-26-isolated",
    )!;
    expect(elCount(code)).toBe(26);
    expect(relCount(code)).toBe(0);
  });

  it("edge-broken-chain — 26 nodes, 12 relationships (two chains, rest isolated)", () => {
    const { code } = EDGE_CASE_TEMPLATES.find(
      (t) => t.id === "edge-broken-chain",
    )!;
    expect(elCount(code)).toBe(26);
    expect(relCount(code)).toBe(12);
  });

  it("edge-diamond — A→B, A→C, B→D, C→D plus cross, 5 relationships", () => {
    const { code } = EDGE_CASE_TEMPLATES.find((t) => t.id === "edge-diamond")!;
    expect(elCount(code)).toBe(6);
    expect(relCount(code)).toBe(5);
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

  it("selector-atoms-name — 3 filter presets, 9 elements, 7 relationships", () => {
    const { code } = SELECTOR_SHOWCASE_TEMPLATES.find(
      (t) => t.id === "selector-atoms-name",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(9);
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

  it("exec-connector — two gen functions feed connector, 3 relationships", () => {
    const { code } = EXECUTION_TEMPLATES.find(
      (t) => t.id === "exec-connector",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(6);
    expect(Object.keys(model.relationships).length).toBe(3);
    expect(model.elements["gen_a"]?.type).toBe("function");
    expect(model.elements["gen_b"]?.type).toBe("function");
    expect(model.elements["connector"]?.type).toBe("function");
    const rels = Object.values(model.relationships);
    const connectorIns = rels.filter((r) => r.target === "connector");
    expect(connectorIns.length).toBe(2);
  });

  it("exec-disconnector — gen(X Y) → disconnector → out, X and Y are independent children", () => {
    const { code } = EXECUTION_TEMPLATES.find(
      (t) => t.id === "exec-disconnector",
    )!;
    const model = parse(code);
    expect(Object.keys(model.elements).length).toBe(5);
    expect(Object.keys(model.relationships).length).toBe(2);
    expect(model.elements["gen"]?.childIds).toContain("X");
    expect(model.elements["gen"]?.childIds).toContain("Y");
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

describe("COMPLEX_TEMPLATES", () => {
  it("cloud-infrastructure — 30 elements across 5 tiers, 5 relationships", () => {
    const { code } = COMPLEX_TEMPLATES.find(
      (t) => t.id === "cloud-infrastructure",
    )!;
    expect(elCount(code)).toBe(30);
    expect(relCount(code)).toBe(5);
  });

  it("cicd-pipeline — 32 elements (8 stages × 3 steps), 8 relationships", () => {
    const { code } = COMPLEX_TEMPLATES.find((t) => t.id === "cicd-pipeline")!;
    expect(elCount(code)).toBe(32);
    expect(relCount(code)).toBe(8);
  });

  it("analytics-platform — large nested model, 4 top-level relationships", () => {
    const { code } = COMPLEX_TEMPLATES.find(
      (t) => t.id === "analytics-platform",
    )!;
    expect(elCount(code)).toBeGreaterThan(30);
    expect(relCount(code)).toBe(4);
    const model = parse(code);
    expect(model.elements["RawSources"]).toBeDefined();
    expect(model.elements["Ingestion"]).toBeDefined();
    expect(model.elements["Processing"]).toBeDefined();
    expect(model.elements["Serving"]).toBeDefined();
    expect(model.elements["Consumption"]).toBeDefined();
  });
});
