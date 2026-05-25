import { describe, it, expect } from "vitest";
import {
  computeExecutionStep,
  applyDeltaToModel,
  buildCleanedModel,
  getExecutionColorMap,
  type ExecutionStepDelta,
} from "../../application/ExecutionEngine";
import type { TokenInstance } from "../../application/store/executionSlice";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";
import { createElement } from "../../domain/models/Element";
import { createRelationship } from "../../domain/models/Relationship";
import { createEmptyViewState } from "../../domain/models/ViewState";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import CircularLayout from "../../domain/layout/CircularLayout";
import { ExecuteLayout } from "../../domain/layout/ExecuteLayout";

function makeModel(
  elements: ReturnType<typeof createElement>[],
  relationships: ReturnType<typeof createRelationship>[] = [],
): DiagramModel {
  const rootEl = createElement("root", "object");
  const elemMap: DiagramModel["elements"] = {};
  const relMap: DiagramModel["relationships"] = {};
  for (const el of elements) {
    elemMap[el.id] = el;
    rootEl.childIds.push(el.id);
  }
  for (const rel of relationships) {
    relMap[rel.id] = rel;
  }
  return {
    root: rootEl,
    elements: elemMap,
    relationships: relMap,
    metadata: { version: "1.0.0", created: "", modified: "" },
  };
}

function makeViewState(
  positions: Record<string, { x: number; y: number; size?: number }>,
): ViewState {
  const vs = createEmptyViewState();
  for (const [id, p] of Object.entries(positions)) {
    vs.positions[id] = {
      id,
      position: { x: p.x, y: p.y },
      size: p.size ?? 60,
      value: 1,
    };
  }
  return vs;
}

function gen(childIds: string[] = []) {
  const el = createElement("gen", "function");
  el.childIds = childIds;
  return el;
}

function roundRobin() {
  return createElement("round_robin", "function");
}

function fn(id: string, childIds: string[] = []) {
  const el = createElement(id, "function");
  el.childIds = childIds;
  return el;
}

function obj(id: string) {
  return createElement(id, "object");
}
function coll(id: string) {
  return createElement(id, "collection");
}
function state(id: string) {
  return createElement(id, "state");
}
function flow(id: string, childIds: string[] = []) {
  const el = createElement(id, "flow");
  el.childIds = childIds;
  return el;
}
function choice(id: string, childIds: string[] = []) {
  const el = createElement(id, "choice");
  el.childIds = childIds;
  return el;
}

function rel(source: string, target: string) {
  return createRelationship(`${source}-->${target}`, source, target, "-->");
}

function drel(source: string, target: string) {
  return createRelationship(`${source}..>${target}`, source, target, "..>");
}

function irel(source: string, target: string) {
  return createRelationship(`${source}--|>${target}`, source, target, "--|>");
}

function lrel(source: string, label: string, target: string) {
  return createRelationship(
    `${source}--${label}-->${target}`,
    source,
    target,
    "-->",
    label,
  );
}

const COLOR = "#f97316";

describe("computeExecutionStep — gen (spontaneous generation)", () => {
  it("gen generates cloned children nested inside the target on every tick", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const model = makeModel([g, child, mid], [drel("gen", "mid")]);
    const vs = makeViewState({
      gen: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      child: { x: 0, y: 50 },
    });

    const result = computeExecutionStep(model, vs, [], 0, 0, COLOR);

    expect(result.delta.addElements).toHaveLength(1);
    const added = result.delta.addElements[0];
    expect(added.element.id).toBe("child_0");
    expect(added.parentElementId).toBe("mid");
    expect(added.path).toBe("mid.child_0");
    expect(added.posEntry.position).toEqual({ x: 100, y: 0 });
  });

  it("gen generates on EVERY tick (no frequency gating)", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const model = makeModel([g, child, mid], [drel("gen", "mid")]);
    const vs = makeViewState({
      gen: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      child: { x: 0, y: 50 },
    });

    expect(
      computeExecutionStep(model, vs, [], 0, 0, COLOR).delta.addElements,
    ).toHaveLength(1);
    expect(
      computeExecutionStep(model, vs, [], 1, 0, COLOR).delta.addElements,
    ).toHaveLength(1);
    expect(
      computeExecutionStep(model, vs, [], 2, 0, COLOR).delta.addElements,
    ).toHaveLength(1);
  });

  it("gen does not generate if it has no template children", () => {
    const g = gen();
    const mid = coll("mid");
    const model = makeModel([g, mid], [drel("gen", "mid")]);
    const vs = makeViewState({ gen: { x: 0, y: 0 }, mid: { x: 100, y: 0 } });

    const result = computeExecutionStep(model, vs, [], 0, 0, COLOR);
    expect(result.delta.addElements).toHaveLength(0);
    expect(result.nextInstances).toHaveLength(0);
  });

  it("gen does NOT generate when the only outgoing is inheritance (--|>)", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const model = makeModel([g, child, mid], [irel("gen", "mid")]);
    const vs = makeViewState({
      gen: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      child: { x: 0, y: 50 },
    });

    const result = computeExecutionStep(model, vs, [], 0, 0, COLOR);
    expect(result.delta.addElements).toHaveLength(0);
  });

  it("gen clones the entire child subtree including nested children", () => {
    const grandchild = obj("gc");
    const child = obj("child");
    child.childIds = ["gc"];
    const g = gen(["child"]);
    const mid = coll("mid");
    const model = makeModel([g, child, grandchild, mid], [drel("gen", "mid")]);
    const vs = makeViewState({
      gen: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      child: { x: 0, y: 50 },
      gc: { x: 0, y: 80 },
    });

    const result = computeExecutionStep(model, vs, [], 0, 0, COLOR);
    const ids = result.delta.addElements.map((e) => e.element.id);
    expect(ids).toContain("child_0");
    expect(ids).toContain("gc_0");
  });

  it("gen increments nextInstanceId for each generated instance", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const model = makeModel([g, child, mid], [drel("gen", "mid")]);
    const vs = makeViewState({
      gen: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      child: { x: 0, y: 50 },
    });

    const r = computeExecutionStep(model, vs, [], 0, 42, COLOR);
    expect(r.nextInstanceId).toBe(43);
    expect(r.delta.addElements[0].element.id).toBe("child_42");
  });

  it("TokenInstance carries correct currentPath after gen generation", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const model = makeModel([g, child, mid], [drel("gen", "mid")]);
    const vs = makeViewState({
      gen: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      child: { x: 0, y: 50 },
    });

    const result = computeExecutionStep(model, vs, [], 0, 0, COLOR);
    expect(result.nextInstances[0].currentElementId).toBe("mid");
    expect(result.nextInstances[0].currentPath).toBe("mid");
  });

  it("gen absorbs tokens that arrive at it (prevents feedback loops)", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const model = makeModel([g, child], []);
    const vs = makeViewState({
      gen: { x: 0, y: 0 },
      "gen.child_0": { x: 0, y: 30 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "gen",
      currentPath: "gen",
      clonedElementIds: ["child_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);

    expect(
      result.delta.removeElements.some((r) => r.elementId === "child_0"),
    ).toBe(true);

    expect(result.delta.addElements).toHaveLength(0);
  });
});

describe("computeExecutionStep — regular function (trigger-based)", () => {
  it("regular function does NOT spontaneously generate", () => {
    const child = obj("child");
    const f = fn("transformer", ["child"]);
    const mid = coll("mid");
    const model = makeModel([f, child, mid], [rel("transformer", "mid")]);
    const vs = makeViewState({
      transformer: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      child: { x: 0, y: 50 },
    });

    const result = computeExecutionStep(model, vs, [], 0, 0, COLOR);
    expect(result.delta.addElements).toHaveLength(0);
    expect(result.nextInstances).toHaveLength(0);
  });

  it("regular function with template children: passes incoming token through unchanged", () => {
    const tmpl = obj("tmpl");
    const f = fn("transformer", ["tmpl"]);
    const src = coll("src");
    const dst = coll("dst");
    const incoming = obj("incoming_0");
    const model = makeModel(
      [f, tmpl, src, dst, incoming],
      [rel("transformer", "dst")],
    );
    const vs = makeViewState({
      transformer: { x: 100, y: 0 },
      dst: { x: 200, y: 0 },
      "transformer.incoming_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "transformer",
      currentPath: "transformer",
      clonedElementIds: ["incoming_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);

    expect(result.delta.addElements).toHaveLength(0);
    expect(
      result.delta.removeElements.some((r) => r.elementId === "incoming_0"),
    ).toBe(false);
    expect(result.delta.moveElements).toHaveLength(1);
    expect(result.delta.moveElements[0].elementId).toBe("incoming_0");
    expect(result.delta.moveElements[0].toParentId).toBe("dst");

    expect(result.nextInstances).toHaveLength(1);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
  });

  it("regular function without template children passes incoming token through", () => {
    const f = fn("passthrough");
    const src = coll("src");
    const dst = coll("dst");
    const incoming = obj("incoming_0");
    const model = makeModel(
      [f, src, dst, incoming],
      [rel("passthrough", "dst")],
    );
    const vs = makeViewState({
      passthrough: { x: 100, y: 0 },
      dst: { x: 200, y: 0 },
      "passthrough.incoming_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "passthrough",
      currentPath: "passthrough",
      clonedElementIds: ["incoming_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);

    expect(result.delta.removeElements).toHaveLength(0);
    expect(result.delta.moveElements).toHaveLength(1);
    expect(result.delta.moveElements[0].elementId).toBe("incoming_0");
    expect(result.delta.moveElements[0].toParentId).toBe("dst");
  });
});

describe("computeExecutionStep — round_robin routing", () => {
  it("round_robin distributes incoming tokens round-robin across outgoing targets", () => {
    const rr = roundRobin();
    const one = coll("one");
    const two = coll("two");
    const token0 = obj("token_0");
    const token1 = obj("token_1");
    const model = makeModel(
      [rr, one, two, token0, token1],
      [rel("round_robin", "one"), rel("round_robin", "two")],
    );
    const vs = makeViewState({
      round_robin: { x: 100, y: 0 },
      one: { x: 200, y: -50 },
      two: { x: 200, y: 50 },
      "round_robin.token_0": { x: 100, y: 0 },
      "round_robin.token_1": { x: 100, y: 0 },
    });

    const inst0: TokenInstance = {
      id: "i0",
      currentElementId: "round_robin",
      currentPath: "round_robin",
      clonedElementIds: ["token_0"],
      clonedRelationshipIds: [],
    };
    const inst1: TokenInstance = {
      id: "i1",
      currentElementId: "round_robin",
      currentPath: "round_robin",
      clonedElementIds: ["token_1"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [inst0, inst1], 1, 2, COLOR);
    const destinations = result.nextInstances.map((i) => i.currentElementId);
    expect(destinations).toContain("one");
    expect(destinations).toContain("two");

    expect(result.delta.addElements).toHaveLength(0);
    expect(result.delta.removeElements).toHaveLength(0);
  });
});

describe("computeExecutionStep — object upserts", () => {
  it("{} object keeps incoming token as permanent child; replaces same-named existing children", () => {
    const g = gen(["child"]);
    const child = obj("child");
    const sink = obj("sink");
    sink.childIds = ["child"];
    const model = makeModel([g, child, sink], [drel("gen", "sink")]);
    const vs = makeViewState({
      gen: { x: 0, y: 0 },
      sink: { x: 100, y: 0 },
      "sink.child_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "sink",
      currentPath: "sink",
      clonedElementIds: ["child_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);

    expect(
      result.delta.removeElements.some((r) => r.elementId === "child_0"),
    ).toBe(false);

    expect(result.delta.addElements).toHaveLength(1);

    expect(result.nextInstances.every((i) => i.id !== "inst_0")).toBe(true);
  });
});

describe("computeExecutionStep — collection and state accumulate at dead ends", () => {
  it("collection [] at dead end keeps instance alive", () => {
    const supplier = fn("supplier", ["child"]);
    const child = obj("child");
    const q = coll("q");
    const model = makeModel([supplier, child, q], [drel("supplier", "q")]);
    const vs = makeViewState({
      supplier: { x: 0, y: 0 },
      q: { x: 100, y: 0 },
      "q.child_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "q",
      currentPath: "q",
      clonedElementIds: ["child_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances.some((i) => i.currentElementId === "q")).toBe(
      true,
    );
    expect(result.delta.removeElements).toHaveLength(0);
  });

  it("state || at dead end keeps instance alive", () => {
    const supplier = fn("supplier", ["child"]);
    const child = obj("child");
    const s = state("s");
    const model = makeModel([supplier, child, s], [drel("supplier", "s")]);
    const vs = makeViewState({
      supplier: { x: 0, y: 0 },
      s: { x: 100, y: 0 },
      "s.child_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "s",
      currentPath: "s",
      clonedElementIds: ["child_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances.some((i) => i.currentElementId === "s")).toBe(
      true,
    );
    expect(result.delta.removeElements).toHaveLength(0);
  });
});

describe("computeExecutionStep — flow type filtering", () => {
  it("flow with no template children passes all token types", () => {
    const f = flow("f");
    const dst = coll("dst");
    const token = obj("token_0");
    const model = makeModel([f, dst, token], [rel("f", "dst")]);
    const vs = makeViewState({
      f: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "f.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "f",
      currentPath: "f",
      clonedElementIds: ["token_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.delta.moveElements).toHaveLength(1);
    expect(result.delta.removeElements).toHaveLength(0);
  });

  it("flow passes tokens whose type matches a template child type", () => {
    const tmplChild = state("cond");
    const f = flow("f", ["cond"]);
    const dst = coll("dst");
    const token = state("token_0");
    const model = makeModel([f, tmplChild, dst, token], [rel("f", "dst")]);
    const vs = makeViewState({
      f: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "f.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "f",
      currentPath: "f",
      clonedElementIds: ["token_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.delta.moveElements).toHaveLength(1);
    expect(result.delta.removeElements).toHaveLength(0);
  });

  it("flow drops tokens whose type does NOT match template child types", () => {
    const tmplChild = state("cond");
    const f = flow("f", ["cond"]);
    const dst = coll("dst");
    const token = obj("token_0");
    const model = makeModel([f, tmplChild, dst, token], [rel("f", "dst")]);
    const vs = makeViewState({
      f: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "f.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "f",
      currentPath: "f",
      clonedElementIds: ["token_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);

    expect(
      result.delta.removeElements.some((r) => r.elementId === "token_0"),
    ).toBe(true);
    expect(result.delta.moveElements).toHaveLength(0);
    expect(result.nextInstances).toHaveLength(0);
  });

  it("flow at dead end consumes regardless of type filter", () => {
    const f = flow("f");
    const token = obj("token_0");
    const model = makeModel([f, token], []);
    const vs = makeViewState({
      f: { x: 0, y: 0 },
      "f.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "f",
      currentPath: "f",
      clonedElementIds: ["token_0"],
      clonedRelationshipIds: ["rel_0"],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(0);
    expect(result.delta.removeElements[0].elementId).toBe("token_0");
    expect(result.delta.removeRelationshipIds).toContain("rel_0");
  });
});

describe("computeExecutionStep — collection type filtering", () => {
  it("collection with no template children accepts any token type", () => {
    const q = coll("q");
    const dst = coll("dst");
    const token = state("token_0");
    const model = makeModel([q, dst, token], [rel("q", "dst")]);
    const vs = makeViewState({
      q: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "q.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "q",
      currentPath: "q",
      clonedElementIds: ["token_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.delta.moveElements).toHaveLength(1);
    expect(result.delta.removeElements).toHaveLength(0);
  });

  it("collection with type-hint children accepts tokens of any type (hints are descriptive only)", () => {
    const tmplChild = state("cond");
    const q = coll("q");
    q.childIds = ["cond"];
    const dst = coll("dst");
    const token = obj("token_0");
    const model = makeModel([q, tmplChild, dst, token], [rel("q", "dst")]);
    const vs = makeViewState({
      q: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "q.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "q",
      currentPath: "q",
      clonedElementIds: ["token_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.delta.removeElements).toHaveLength(0);
    expect(result.delta.moveElements).toHaveLength(1);
    expect(result.delta.moveElements[0].elementId).toBe("token_0");
    expect(result.delta.moveElements[0].toParentId).toBe("dst");
  });
});

describe("computeExecutionStep — propagation forwarding", () => {
  it("moves instance to next outgoing dotted target", () => {
    const supplier = fn("supplier", ["child"]);
    const child = obj("child");
    const mid = coll("mid");
    const end = state("end");
    const model = makeModel(
      [supplier, child, mid, end],
      [drel("supplier", "mid"), drel("mid", "end")],
    );
    const vs = makeViewState({
      supplier: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      end: { x: 200, y: 0 },
      child: { x: 0, y: 50 },
      "mid.child_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "mid",
      currentPath: "mid",
      clonedElementIds: ["child_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances.some((i) => i.currentElementId === "end")).toBe(
      true,
    );

    const move = result.delta.moveElements[0];
    expect(move.elementId).toBe("child_0");
    expect(move.fromParentId).toBe("mid");
    expect(move.toParentId).toBe("end");
    expect(move.newPosition).toEqual({ x: 200, y: 0 });
  });

  it("does NOT move via inheritance (--|>) relationships", () => {
    const supplier = fn("supplier", ["child"]);
    const child = obj("child");
    const mid = coll("mid");
    const end = state("end");
    const model = makeModel(
      [supplier, child, mid, end],
      [drel("supplier", "mid"), irel("mid", "end")],
    );
    const vs = makeViewState({
      supplier: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      end: { x: 200, y: 0 },
      "mid.child_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "mid",
      currentPath: "mid",
      clonedElementIds: ["child_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);

    expect(result.nextInstances.some((i) => i.currentElementId === "mid")).toBe(
      true,
    );
    expect(result.delta.moveElements).toHaveLength(0);
  });
});

describe("computeExecutionStep — combined generation + propagation", () => {
  it("propagates existing AND gen generates new in the same tick", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const end = state("end");
    const model = makeModel(
      [g, child, mid, end],
      [drel("gen", "mid"), drel("mid", "end")],
    );
    const vs = makeViewState({
      gen: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      end: { x: 200, y: 0 },
      child: { x: 0, y: 50 },
      "mid.child_0": { x: 100, y: 0 },
    });

    const existing: TokenInstance = {
      id: "inst_0",
      currentElementId: "mid",
      currentPath: "mid",
      clonedElementIds: ["child_0"],
      clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [existing], 1, 1, COLOR);

    expect(result.nextInstances.some((i) => i.currentElementId === "end")).toBe(
      true,
    );

    expect(
      result.delta.addElements.some((e) => e.element.id === "child_1"),
    ).toBe(true);
    expect(result.nextInstances.some((i) => i.currentElementId === "mid")).toBe(
      true,
    );
  });
});

describe("computeExecutionStep — edge cases", () => {
  it("returns empty delta when nothing to do", () => {
    const g = gen();
    const model = makeModel([g]);
    const vs = makeViewState({ gen: { x: 0, y: 0 } });

    const result = computeExecutionStep(model, vs, [], 1, 0, COLOR);
    expect(result.delta.addElements).toHaveLength(0);
    expect(result.delta.removeElements).toHaveLength(0);
    expect(result.delta.moveElements).toHaveLength(0);
    expect(result.nextInstances).toHaveLength(0);
  });

  it("does not mutate the input instances array", () => {
    const child = obj("child");
    const supplier = fn("supplier", ["child"]);
    const mid = coll("mid");
    const end = state("end");
    const model = makeModel(
      [supplier, child, mid, end],
      [drel("supplier", "mid"), drel("mid", "end")],
    );
    const vs = makeViewState({
      supplier: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      end: { x: 200, y: 0 },
      "mid.child_0": { x: 100, y: 0 },
    });
    const original: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "mid",
        currentPath: "mid",
        clonedElementIds: ["child_0"],
        clonedRelationshipIds: [],
      },
    ];
    const snapshot = JSON.stringify(original);
    computeExecutionStep(model, vs, original, 1, 1, COLOR);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it("uses nextInstanceId as clone suffix", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const model = makeModel([g, child, mid], [drel("gen", "mid")]);
    const vs = makeViewState({
      gen: { x: 0, y: 0 },
      mid: { x: 100, y: 0 },
      child: { x: 0, y: 50 },
    });

    const r = computeExecutionStep(model, vs, [], 0, 99, COLOR);
    expect(r.delta.addElements[0].element.id).toBe("child_99");
  });
});

describe("computeExecutionStep — choice routing", () => {
  it("routes to yes branch when clone type AND base name match a child selector", () => {
    const cond = state("cond");
    const ch = choice("ch", ["cond"]);
    const yes_el = coll("yes_dest");
    const no_el = coll("no_dest");
    const clone = state("cond_0");
    const model = makeModel(
      [cond, ch, yes_el, no_el, clone],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      cond: { x: 0, y: 0 },
      ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 },
      no_dest: { x: 200, y: 50 },
      "ch.cond_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "ch",
        currentPath: "ch",
        clonedElementIds: ["cond_0"],
        clonedRelationshipIds: [],
      },
    ];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    expect(moved?.currentElementId).toBe("yes_dest");
  });

  it("routes to no branch when clone type matches but name does NOT match selector", () => {
    const cond = state("cond");
    const ch = choice("ch", ["cond"]);
    const yes_el = coll("yes_dest");
    const no_el = coll("no_dest");
    const clone = state("other_0");
    const model = makeModel(
      [cond, ch, yes_el, no_el, clone],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      cond: { x: 0, y: 0 },
      ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 },
      no_dest: { x: 200, y: 50 },
      "ch.other_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "ch",
        currentPath: "ch",
        clonedElementIds: ["other_0"],
        clonedRelationshipIds: [],
      },
    ];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    expect(moved?.currentElementId).toBe("no_dest");
  });

  it("routes to no branch when clone type does NOT match condition types", () => {
    const cond = state("cond");
    const ch = choice("ch", ["cond"]);
    const yes_el = coll("yes_dest");
    const no_el = coll("no_dest");
    const clone = obj("clone_0");
    const model = makeModel(
      [cond, ch, yes_el, no_el, clone],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      cond: { x: 0, y: 0 },
      ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 },
      no_dest: { x: 200, y: 50 },
      "ch.clone_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "ch",
        currentPath: "ch",
        clonedElementIds: ["clone_0"],
        clonedRelationshipIds: [],
      },
    ];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    expect(moved?.currentElementId).toBe("no_dest");
  });

  it("always routes to yes branch when choice has no condition children", () => {
    const ch = choice("ch", []);
    const yes_el = coll("yes_dest");
    const no_el = coll("no_dest");
    const clone = obj("clone_0");
    const model = makeModel(
      [ch, yes_el, no_el, clone],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 },
      no_dest: { x: 200, y: 50 },
      "ch.clone_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "ch",
        currentPath: "ch",
        clonedElementIds: ["clone_0"],
        clonedRelationshipIds: [],
      },
    ];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    expect(moved?.currentElementId).toBe("yes_dest");
  });

  it("falls back to positional ordering when outgoing have no labels", () => {
    const cond = state("cond");
    const ch = choice("ch", ["cond"]);
    const first = coll("first");
    const second = coll("second");
    const clone = obj("clone_0");
    const model = makeModel(
      [cond, ch, first, second, clone],
      [
        createRelationship("ch-->first", "ch", "first", "-->"),
        createRelationship("ch-->second", "ch", "second", "-->"),
      ],
    );
    const vs = makeViewState({
      cond: { x: 0, y: 0 },
      ch: { x: 100, y: 0 },
      first: { x: 200, y: -50 },
      second: { x: 200, y: 50 },
      "ch.clone_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "ch",
        currentPath: "ch",
        clonedElementIds: ["clone_0"],
        clonedRelationshipIds: [],
      },
    ];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    expect(moved?.currentElementId).toBe("second");
  });

  it("ignores execution clones in choice childIds when evaluating condition (regression)", () => {
    const cond = state("cond");
    const clone = obj("clone_0");
    const ch = choice("ch", ["cond", "clone_0"]);
    const yes_el = coll("yes_dest");
    const no_el = coll("no_dest");
    const model = makeModel(
      [cond, clone, ch, yes_el, no_el],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      cond: { x: 0, y: 0 },
      ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 },
      no_dest: { x: 200, y: 50 },
      "ch.clone_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "ch",
        currentPath: "ch",
        clonedElementIds: ["clone_0"],
        clonedRelationshipIds: [],
      },
    ];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");

    expect(moved?.currentElementId).toBe("no_dest");
  });

  it("routes by name regex when choice child has a specific (non-anonymous) name", () => {
    const namedCond = state("alpha");
    const ch = choice("ch", ["alpha"]);
    const yes_el = coll("yes_dest");
    const no_el = coll("no_dest");
    const matchingClone = state("alpha_0");
    const nonMatchingClone = state("beta_0");
    const model = makeModel(
      [namedCond, ch, yes_el, no_el, matchingClone, nonMatchingClone],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      alpha: { x: 0, y: 0 },
      ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 },
      no_dest: { x: 200, y: 50 },
      "ch.alpha_0": { x: 100, y: 0 },
      "ch.beta_0": { x: 100, y: 10 },
    });

    const instAlpha: TokenInstance = {
      id: "inst_0",
      currentElementId: "ch",
      currentPath: "ch",
      clonedElementIds: ["alpha_0"],
      clonedRelationshipIds: [],
    };
    const rAlpha = computeExecutionStep(model, vs, [instAlpha], 1, 1, COLOR);
    expect(rAlpha.nextInstances[0].currentElementId).toBe("yes_dest");

    const instBeta: TokenInstance = {
      id: "inst_1",
      currentElementId: "ch",
      currentPath: "ch",
      clonedElementIds: ["beta_0"],
      clonedRelationshipIds: [],
    };
    const rBeta = computeExecutionStep(model, vs, [instBeta], 1, 2, COLOR);
    expect(rBeta.nextInstances[0].currentElementId).toBe("no_dest");
  });
});

describe("getExecutionColorMap", () => {
  it("returns empty map for no instances", () => {
    expect(getExecutionColorMap([], makeModel([]), "#f00")).toEqual({});
  });

  it("maps each cloned element id to the color", () => {
    const instances: TokenInstance[] = [
      {
        id: "i1",
        currentElementId: "A",
        currentPath: "A",
        clonedElementIds: ["c1", "c2"],
        clonedRelationshipIds: [],
      },
    ];
    const map = getExecutionColorMap(instances, makeModel([]), "#f97316");
    expect(map["c1"]).toBe("#f97316");
    expect(map["c2"]).toBe("#f97316");
  });

  it("handles multiple instances each with clones", () => {
    const instances: TokenInstance[] = [
      {
        id: "i1",
        currentElementId: "A",
        currentPath: "A",
        clonedElementIds: ["c1"],
        clonedRelationshipIds: [],
      },
      {
        id: "i2",
        currentElementId: "B",
        currentPath: "B",
        clonedElementIds: ["c2", "c3"],
        clonedRelationshipIds: [],
      },
    ];
    const map = getExecutionColorMap(instances, makeModel([]), "#abc");
    expect(Object.keys(map)).toHaveLength(3);
    expect(map["c1"]).toBe("#abc");
    expect(map["c3"]).toBe("#abc");
  });

  it("handles instances with no clones", () => {
    const instances: TokenInstance[] = [
      {
        id: "i1",
        currentElementId: "A",
        currentPath: "A",
        clonedElementIds: [],
        clonedRelationshipIds: [],
      },
    ];
    expect(getExecutionColorMap(instances, makeModel([]), "#f00")).toEqual({});
  });
});

describe("applyDeltaToModel", () => {
  function baseModel(): DiagramModel {
    const root = createElement("root", "object");
    const a = createElement("A", "object");
    const b = createElement("B", "object");
    root.childIds = ["A", "B"];
    return {
      root,
      elements: { A: a, B: b },
      relationships: {},
      metadata: { version: "1", created: "", modified: "" },
    };
  }

  const emptyDelta = (): ExecutionStepDelta => ({
    addElements: [],
    addRelationships: [],
    removeElements: [],
    removeRelationshipIds: [],
    moveElements: [],
    hideFromParent: [],
  });

  it("returns unchanged model when delta is empty", () => {
    const model = baseModel();
    const result = applyDeltaToModel(model, emptyDelta());
    expect(Object.keys(result.elements)).toHaveLength(2);
  });

  it("adds new elements as children of their parent", () => {
    const model = baseModel();
    const clone = createElement("clone1", "object");
    const delta: ExecutionStepDelta = {
      ...emptyDelta(),
      addElements: [
        {
          element: clone,
          parentElementId: "A",
          path: "A.clone1",
          posEntry: {
            id: "clone1",
            position: { x: 0, y: 0 },
            size: 40,
            value: 1,
          },
          spawnOriginId: "A",
        },
      ],
    };
    const result = applyDeltaToModel(model, delta);
    expect(result.elements["clone1"]).toBeDefined();
    expect(result.elements["A"].childIds).toContain("clone1");
  });

  it("does not duplicate child if already present", () => {
    const model = baseModel();
    model.elements["A"].childIds = ["clone1"];
    const clone = createElement("clone1", "object");
    const delta: ExecutionStepDelta = {
      ...emptyDelta(),
      addElements: [
        {
          element: clone,
          parentElementId: "A",
          path: "A.clone1",
          posEntry: {
            id: "clone1",
            position: { x: 0, y: 0 },
            size: 40,
            value: 1,
          },
          spawnOriginId: "A",
        },
      ],
    };
    const result = applyDeltaToModel(model, delta);
    expect(
      result.elements["A"].childIds.filter((id) => id === "clone1"),
    ).toHaveLength(1);
  });

  it("adds new relationships", () => {
    const model = baseModel();
    const rel = createRelationship("r1", "A", "B", "-->");
    const delta: ExecutionStepDelta = {
      ...emptyDelta(),
      addRelationships: [rel],
    };
    const result = applyDeltaToModel(model, delta);
    expect(result.relationships["r1"]).toBeDefined();
  });

  it("removes elements from model and their parent childIds", () => {
    const model = baseModel();
    model.elements["A"].childIds = ["clone1"];
    model.elements["clone1"] = createElement("clone1", "object");
    const delta: ExecutionStepDelta = {
      ...emptyDelta(),
      removeElements: [
        { elementId: "clone1", parentElementId: "A", path: "A.clone1" },
      ],
    };
    const result = applyDeltaToModel(model, delta);
    expect(result.elements["clone1"]).toBeUndefined();
    expect(result.elements["A"].childIds).not.toContain("clone1");
  });

  it("removes relationships by id", () => {
    const model = baseModel();
    model.relationships["r1"] = createRelationship("r1", "A", "B", "-->");
    const delta: ExecutionStepDelta = {
      ...emptyDelta(),
      removeRelationshipIds: ["r1"],
    };
    const result = applyDeltaToModel(model, delta);
    expect(result.relationships["r1"]).toBeUndefined();
  });

  it("moves elements between parents", () => {
    const model = baseModel();
    model.elements["A"].childIds = ["clone1"];
    model.elements["clone1"] = createElement("clone1", "object");
    const delta: ExecutionStepDelta = {
      ...emptyDelta(),
      moveElements: [
        {
          elementId: "clone1",
          fromParentId: "A",
          fromPath: "A.clone1",
          toParentId: "B",
          toPath: "B.clone1",
          newPosition: { x: 10, y: 10 },
        },
      ],
    };
    const result = applyDeltaToModel(model, delta);
    expect(result.elements["A"].childIds).not.toContain("clone1");
    expect(result.elements["B"].childIds).toContain("clone1");
  });

  it("does not mutate the original model", () => {
    const model = baseModel();
    const clone = createElement("clone1", "object");
    const delta: ExecutionStepDelta = {
      ...emptyDelta(),
      addElements: [
        {
          element: clone,
          parentElementId: "A",
          path: "A.clone1",
          posEntry: {
            id: "clone1",
            position: { x: 0, y: 0 },
            size: 40,
            value: 1,
          },
          spawnOriginId: "A",
        },
      ],
    };
    applyDeltaToModel(model, delta);
    expect(model.elements["clone1"]).toBeUndefined();
    expect(model.elements["A"].childIds).not.toContain("clone1");
  });
});

describe("buildCleanedModel", () => {
  function modelWithClone(): { model: DiagramModel; instance: TokenInstance } {
    const root = createElement("root", "object");
    const a = createElement("A", "object");
    const clone = createElement("clone_0", "object");
    a.childIds = ["clone_0"];
    root.childIds = ["A"];
    const model: DiagramModel = {
      root,
      elements: { A: a, clone_0: clone },
      relationships: {
        r_clone: createRelationship("r_clone", "clone_0", "A", "-->"),
      },
      metadata: { version: "1", created: "", modified: "" },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "A",
      currentPath: "A",
      clonedElementIds: ["clone_0"],
      clonedRelationshipIds: ["r_clone"],
    };
    return { model, instance };
  }

  it("removes cloned elements from the model", () => {
    const { model, instance } = modelWithClone();
    const cleaned = buildCleanedModel(model, [instance]);
    expect(cleaned.elements["clone_0"]).toBeUndefined();
  });

  it("removes cloned element from its parent's childIds", () => {
    const { model, instance } = modelWithClone();
    const cleaned = buildCleanedModel(model, [instance]);
    expect(cleaned.elements["A"].childIds).not.toContain("clone_0");
  });

  it("removes cloned relationships", () => {
    const { model, instance } = modelWithClone();
    const cleaned = buildCleanedModel(model, [instance]);
    expect(cleaned.relationships["r_clone"]).toBeUndefined();
  });

  it("leaves non-cloned elements and relationships intact", () => {
    const { model, instance } = modelWithClone();
    model.relationships["original"] = createRelationship(
      "original",
      "A",
      "A",
      "-->",
    );
    const cleaned = buildCleanedModel(model, [instance]);
    expect(cleaned.elements["A"]).toBeDefined();
    expect(cleaned.relationships["original"]).toBeDefined();
  });

  it("returns unchanged model when instances list is empty", () => {
    const { model } = modelWithClone();
    const cleaned = buildCleanedModel(model, []);
    expect(Object.keys(cleaned.elements)).toHaveLength(2);
  });

  it("does not mutate the original model", () => {
    const { model, instance } = modelWithClone();
    buildCleanedModel(model, [instance]);
    expect(model.elements["clone_0"]).toBeDefined();
    expect(model.elements["A"].childIds).toContain("clone_0");
  });
});

function multiplier(id: string) {
  return createElement(id, "function");
}

describe("computeExecutionStep — multiplier_N", () => {
  it("multiplier_3 produces 3 instances at targets[0]", () => {
    const m = multiplier("multiplier_3");
    const dst = coll("dst");
    const token = obj("tok");
    const model = makeModel([m, dst, token], [rel("multiplier_3", "dst")]);
    const vs = makeViewState({
      multiplier_3: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "multiplier_3.tok": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "multiplier_3",
      currentPath: "multiplier_3",
      clonedElementIds: ["tok"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(3);
    expect(
      result.nextInstances.every((i) => i.currentElementId === "dst"),
    ).toBe(true);
  });

  it("multiplier_1 acts as a pass-through", () => {
    const m = multiplier("multiplier_1");
    const dst = coll("dst");
    const token = obj("tok");
    const model = makeModel([m, dst, token], [rel("multiplier_1", "dst")]);
    const vs = makeViewState({
      multiplier_1: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "multiplier_1.tok": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "multiplier_1",
      currentPath: "multiplier_1",
      clonedElementIds: ["tok"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(1);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
  });

  it("multiplier copies have distinct element IDs — actual clones, not shared references", () => {
    const m = multiplier("multiplier_2");
    const dst = coll("dst");
    const token = obj("tok");
    const model = makeModel([m, dst, token], [rel("multiplier_2", "dst")]);
    const vs = makeViewState({
      multiplier_2: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "multiplier_2.tok": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "multiplier_2",
      currentPath: "multiplier_2",
      clonedElementIds: ["tok"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(2);
    expect(result.nextInstances[0].clonedElementIds).toContain("tok");
    expect(result.nextInstances[1].clonedElementIds).not.toContain("tok");
    expect(result.nextInstances[1].clonedElementIds).toHaveLength(1);
  });
});

describe("computeExecutionStep — gen with relationships", () => {
  it("gen clones all template children together in one batch, preserving relationships", () => {
    const a = obj("a");
    const b = obj("b");
    const g = gen(["a", "b"]);
    const dst = coll("dst");
    const ab = createRelationship("a-->b", "a", "b", "-->");
    const model = makeModel([g, a, b, dst], [drel("gen", "dst"), ab]);
    const vs = makeViewState({ gen: { x: 0, y: 0 }, dst: { x: 100, y: 0 } });

    const result = computeExecutionStep(model, vs, [], 0, 0, COLOR);

    expect(result.nextInstances).toHaveLength(1);
    const inst = result.nextInstances[0];
    expect(inst.clonedElementIds).toContain("a_0");
    expect(inst.clonedElementIds).toContain("b_0");

    const addedRel = result.delta.addRelationships.find(
      (r) => r.source === "a_0" && r.target === "b_0",
    );
    expect(addedRel).toBeDefined();
    expect(inst.clonedRelationshipIds).toContain(addedRel!.id);
  });

  it("gen with single child still produces one instance per tick", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const dst = coll("dst");
    const model = makeModel([g, child, dst], [drel("gen", "dst")]);
    const vs = makeViewState({ gen: { x: 0, y: 0 }, dst: { x: 100, y: 0 } });

    const result = computeExecutionStep(model, vs, [], 0, 0, COLOR);
    expect(result.nextInstances).toHaveLength(1);
    expect(result.nextInstances[0].clonedElementIds).toContain("child_0");
  });
});

describe("computeExecutionStep — duplicator", () => {
  it("duplicator fans out to all 3 outgoing targets", () => {
    const d = createElement("duplicator", "function");
    const dst1 = coll("dst1"),
      dst2 = coll("dst2"),
      dst3 = coll("dst3");
    const token = obj("tok");
    const model = makeModel(
      [d, dst1, dst2, dst3, token],
      [
        rel("duplicator", "dst1"),
        rel("duplicator", "dst2"),
        rel("duplicator", "dst3"),
      ],
    );
    const vs = makeViewState({
      duplicator: { x: 0, y: 0 },
      dst1: { x: 100, y: -50 },
      dst2: { x: 100, y: 0 },
      dst3: { x: 100, y: 50 },
      "duplicator.tok": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "duplicator",
      currentPath: "duplicator",
      clonedElementIds: ["tok"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(3);
    expect(result.nextInstances.map((i) => i.currentElementId).sort()).toEqual([
      "dst1",
      "dst2",
      "dst3",
    ]);
  });

  it("duplicator with single target acts as pass-through", () => {
    const d = createElement("duplicator", "function");
    const dst = coll("dst"),
      token = obj("tok");
    const model = makeModel([d, dst, token], [rel("duplicator", "dst")]);
    const vs = makeViewState({
      duplicator: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "duplicator.tok": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "duplicator",
      currentPath: "duplicator",
      clonedElementIds: ["tok"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(1);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
  });
});

describe("computeExecutionStep — deduplicator", () => {
  it("first token with a given base-name passes through", () => {
    const d = createElement("deduplicator", "function");
    const dst = coll("dst"),
      token = obj("Packet_0");
    const model = makeModel([d, dst, token], [rel("deduplicator", "dst")]);
    const vs = makeViewState({
      deduplicator: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "deduplicator.Packet_0": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "deduplicator",
      currentPath: "deduplicator",
      clonedElementIds: ["Packet_0"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(1);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
  });

  it("duplicate (same base-name) token is dropped", () => {
    const d = createElement("deduplicator", "function");
    const dst = coll("dst"),
      t0 = obj("Packet_0"),
      t1 = obj("Packet_1");
    const model = makeModel([d, dst, t0, t1], [rel("deduplicator", "dst")]);
    const vs = makeViewState({
      deduplicator: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "deduplicator.Packet_0": { x: 0, y: 0 },
      "deduplicator.Packet_1": { x: 0, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "deduplicator",
        currentPath: "deduplicator",
        clonedElementIds: ["Packet_0"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_1",
        currentElementId: "deduplicator",
        currentPath: "deduplicator",
        clonedElementIds: ["Packet_1"],
        clonedRelationshipIds: [],
      },
    ];
    const result = computeExecutionStep(model, vs, instances, 1, 2, COLOR);
    expect(result.nextInstances).toHaveLength(1);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
    expect(
      result.delta.removeElements.some((r) => r.elementId === "Packet_1"),
    ).toBe(true);
  });

  it("tokens with different base-names both pass through", () => {
    const d = createElement("deduplicator", "function");
    const dst = coll("dst"),
      t0 = obj("Alpha_0"),
      t1 = obj("Beta_0");
    const model = makeModel([d, dst, t0, t1], [rel("deduplicator", "dst")]);
    const vs = makeViewState({
      deduplicator: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "deduplicator.Alpha_0": { x: 0, y: 0 },
      "deduplicator.Beta_0": { x: 0, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "deduplicator",
        currentPath: "deduplicator",
        clonedElementIds: ["Alpha_0"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_1",
        currentElementId: "deduplicator",
        currentPath: "deduplicator",
        clonedElementIds: ["Beta_0"],
        clonedRelationshipIds: [],
      },
    ];
    const result = computeExecutionStep(model, vs, instances, 1, 2, COLOR);
    expect(result.nextInstances).toHaveLength(2);
    expect(
      result.nextInstances.every((i) => i.currentElementId === "dst"),
    ).toBe(true);
  });
});

describe("computeExecutionStep — connector", () => {
  it("3 tokens at connector merge into 1 with all cloneIds", () => {
    const c = createElement("connector", "function");
    const dst = coll("dst"),
      t0 = obj("A"),
      t1 = obj("B"),
      t2 = obj("C");
    const model = makeModel([c, dst, t0, t1, t2], [rel("connector", "dst")]);
    const vs = makeViewState({
      connector: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "connector.A": { x: 0, y: 0 },
      "connector.B": { x: 0, y: 0 },
      "connector.C": { x: 0, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["A"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_1",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["B"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_2",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["C"],
        clonedRelationshipIds: [],
      },
    ];
    const result = computeExecutionStep(model, vs, instances, 1, 3, COLOR);
    expect(result.nextInstances).toHaveLength(1);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
    expect(result.nextInstances[0].clonedElementIds).toEqual(
      expect.arrayContaining(["A", "B", "C"]),
    );
  });

  it("single token at connector passes through unchanged", () => {
    const c = createElement("connector", "function");
    const dst = coll("dst"),
      t0 = obj("A");
    const model = makeModel([c, dst, t0], [rel("connector", "dst")]);
    const vs = makeViewState({
      connector: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "connector.A": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "connector",
      currentPath: "connector",
      clonedElementIds: ["A"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(1);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
    expect(result.nextInstances[0].clonedElementIds).toEqual(["A"]);
  });

  it("connector adds loop-chain relationships between merged elements", () => {
    const c = createElement("connector", "function");
    const dst = coll("dst"),
      t0 = obj("A"),
      t1 = obj("B"),
      t2 = obj("C");
    const model = makeModel([c, dst, t0, t1, t2], [rel("connector", "dst")]);
    const vs = makeViewState({
      connector: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "connector.A": { x: 0, y: 0 },
      "connector.B": { x: 0, y: 0 },
      "connector.C": { x: 0, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["A"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_1",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["B"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_2",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["C"],
        clonedRelationshipIds: [],
      },
    ];
    const result = computeExecutionStep(model, vs, instances, 1, 3, COLOR);
    const sourcesAndTargets = result.delta.addRelationships.map(
      (r) => `${r.source}->${r.target}`,
    );
    expect(sourcesAndTargets).toContain("A->B");
    expect(sourcesAndTargets).toContain("B->C");
    expect(sourcesAndTargets).toContain("C->A");
    expect(result.nextInstances[0].clonedRelationshipIds).toHaveLength(3);
  });

  it("connector at dead end drops all tokens", () => {
    const c = createElement("connector", "function");
    const t0 = obj("A"),
      t1 = obj("B");
    const model = makeModel([c, t0, t1], []);
    const vs = makeViewState({
      connector: { x: 0, y: 0 },
      "connector.A": { x: 0, y: 0 },
      "connector.B": { x: 0, y: 0 },
    });
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["A"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_1",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["B"],
        clonedRelationshipIds: [],
      },
    ];
    const result = computeExecutionStep(model, vs, instances, 1, 2, COLOR);
    expect(result.nextInstances).toHaveLength(0);
    const removedIds = result.delta.removeElements.map((r) => r.elementId);
    expect(removedIds).toContain("A");
    expect(removedIds).toContain("B");
  });
});

describe("computeExecutionStep — disconnector", () => {
  it("disconnector splits multi-element token into independent instances and removes relationships", () => {
    const d = createElement("disconnector", "function");
    const dst = coll("dst"),
      t0 = obj("A"),
      t1 = obj("B");
    const rel1 = createRelationship("A-->B", "A", "B", "-->");
    const model = makeModel([d, dst, t0, t1], [rel("disconnector", "dst")]);
    model.relationships["A-->B"] = rel1;
    const vs = makeViewState({
      disconnector: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "disconnector.A": { x: 0, y: 0 },
      "disconnector.B": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "disconnector",
      currentPath: "disconnector",
      clonedElementIds: ["A", "B"],
      clonedRelationshipIds: ["A-->B"],
    };
    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(2);
    expect(
      result.nextInstances.every((i) => i.currentElementId === "dst"),
    ).toBe(true);
    expect(
      result.nextInstances.every((i) => i.clonedRelationshipIds.length === 0),
    ).toBe(true);
    expect(result.nextInstances[0].clonedElementIds).toHaveLength(1);
    expect(result.nextInstances[1].clonedElementIds).toHaveLength(1);
    expect(result.delta.removeRelationshipIds).toContain("A-->B");
  });

  it("disconnector with no relationships forwards token unchanged", () => {
    const d = createElement("disconnector", "function");
    const dst = coll("dst"),
      t0 = obj("A");
    const model = makeModel([d, dst, t0], [rel("disconnector", "dst")]);
    const vs = makeViewState({
      disconnector: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "disconnector.A": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "disconnector",
      currentPath: "disconnector",
      clonedElementIds: ["A"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
    expect(result.delta.removeRelationshipIds).toHaveLength(0);
  });
});

describe("computeExecutionStep — throttler_N", () => {
  it("throttler_3 forwards token when tickCount % 3 === 0", () => {
    const th = multiplier("throttler_3");
    const dst = coll("dst"),
      token = obj("tok");
    const model = makeModel([th, dst, token], [rel("throttler_3", "dst")]);
    const vs = makeViewState({
      throttler_3: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "throttler_3.tok": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "throttler_3",
      currentPath: "throttler_3",
      clonedElementIds: ["tok"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 0, 1, COLOR);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
  });

  it("throttler_3 drops token when tickCount % 3 !== 0", () => {
    const th = multiplier("throttler_3");
    const dst = coll("dst"),
      token = obj("tok");
    const model = makeModel([th, dst, token], [rel("throttler_3", "dst")]);
    const vs = makeViewState({
      throttler_3: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "throttler_3.tok": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "throttler_3",
      currentPath: "throttler_3",
      clonedElementIds: ["tok"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(0);
    expect(result.delta.removeElements.some((r) => r.elementId === "tok")).toBe(
      true,
    );
  });

  it("throttler_3 forwards on tick 3", () => {
    const th = multiplier("throttler_3");
    const dst = coll("dst"),
      token = obj("tok");
    const model = makeModel([th, dst, token], [rel("throttler_3", "dst")]);
    const vs = makeViewState({
      throttler_3: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "throttler_3.tok": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "throttler_3",
      currentPath: "throttler_3",
      clonedElementIds: ["tok"],
      clonedRelationshipIds: [],
    };
    const result = computeExecutionStep(model, vs, [instance], 3, 1, COLOR);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
  });

  it("throttler_1 always forwards (every tick)", () => {
    const th = multiplier("throttler_1");
    const dst = coll("dst"),
      token = obj("tok");
    const model = makeModel([th, dst, token], [rel("throttler_1", "dst")]);
    const vs = makeViewState({
      throttler_1: { x: 0, y: 0 },
      dst: { x: 100, y: 0 },
      "throttler_1.tok": { x: 0, y: 0 },
    });
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "throttler_1",
      currentPath: "throttler_1",
      clonedElementIds: ["tok"],
      clonedRelationshipIds: [],
    };
    for (const tick of [0, 1, 2, 5, 99]) {
      const result = computeExecutionStep(
        model,
        vs,
        [instance],
        tick,
        1,
        COLOR,
      );
      expect(result.nextInstances[0].currentElementId).toBe("dst");
    }
  });
});

describe("computeExecutionStep — scope entry/exit: b(c..>d) scenario", () => {
  function pe(
    id: string,
    x: number,
    y: number,
    size = 60,
  ): import("../../domain/models/ViewState").PositionedElement {
    return { id, position: { x, y }, size, value: 1 };
  }

  const gEl = gen(["x"]);
  const xEl = obj("x");
  const aEl = fn("a");
  const bEl = fn("b");
  bEl.childIds = ["c", "d"];
  const cEl = fn("c");
  const dEl = fn("d");
  const eEl = fn("e");

  const scopeModel: DiagramModel = (() => {
    const rootEl = createElement("root", "object");
    rootEl.childIds = ["gen", "x", "a", "b", "c", "d", "e"];
    return {
      root: rootEl,
      elements: { gen: gEl, x: xEl, a: aEl, b: bEl, c: cEl, d: dEl, e: eEl },
      relationships: {},
      metadata: { version: "1.0.0", created: "", modified: "" },
    };
  })();

  const scopeVS: ViewState = {
    ...createEmptyViewState(),
    positions: {
      gen: pe("gen", 0, 0),
      x: pe("x", 0, 80, 40),
      a: pe("a", 100, 0),
      b: pe("b", 200, 0, 100),
      "b.c": pe("c", 250, -50),
      "b.d": pe("d", 250, 50),
      c: pe("c", 400, -50),
      d: pe("d", 400, 50),
      e: pe("e", 500, 0),
    },
    relationships: [
      { id: "r1", sourcePath: "gen", targetPath: "a", type: "..>" },
      { id: "r2", sourcePath: "a", targetPath: "b", type: "..>" },
      { id: "r3", sourcePath: "b.c", targetPath: "b.d", type: "..>" },
      { id: "r4", sourcePath: "b", targetPath: "e", type: "..>" },
    ],
  };

  it("tick 0: gen spawns x_0 into a", () => {
    const r = computeExecutionStep(scopeModel, scopeVS, [], 0, 0, COLOR);

    expect(r.delta.addElements).toHaveLength(1);
    expect(r.delta.addElements[0].element.id).toBe("x_0");
    expect(r.delta.addElements[0].parentElementId).toBe("a");
    expect(r.delta.addElements[0].path).toBe("a.x_0");

    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentElementId).toBe("a");
    expect(r.nextInstances[0].currentPath).toBe("a");
    expect(r.nextInstances[0].clonedElementIds).toContain("x_0");
  });

  it("tick 1: token at a forwards to b, no scope push", () => {
    const vs: ViewState = {
      ...scopeVS,
      positions: { ...scopeVS.positions, "a.x_0": pe("x_0", 100, 0, 30) },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "a",
      currentPath: "a",
      clonedElementIds: ["x_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(scopeModel, vs, [instance], 1, 1, COLOR);

    const ni = r.nextInstances.find((i) => i.id === "inst_0");
    expect(ni).toBeDefined();
    expect(ni!.currentElementId).toBe("b");
    expect(ni!.currentPath).toBe("b");
    expect(ni!.pendingExits ?? []).toHaveLength(0);

    const move = r.delta.moveElements.find((m) => m.elementId === "x_0");
    expect(move).toBeDefined();
    expect(move!.fromParentId).toBe("a");
    expect(move!.toParentId).toBe("b");
    expect(move!.fromPath).toBe("a.x_0");
    expect(move!.toPath).toBe("b.x_0");
  });

  it("tick 2: token at b enters scope → currentPath becomes b.c, pendingExit pushed", () => {
    const vs: ViewState = {
      ...scopeVS,
      positions: { ...scopeVS.positions, "b.x_0": pe("x_0", 200, 0, 30) },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "b",
      currentPath: "b",
      clonedElementIds: ["x_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(scopeModel, vs, [instance], 1, 1, COLOR);

    const ni = r.nextInstances.find((i) => i.id === "inst_0");
    expect(ni).toBeDefined();
    expect(ni!.currentElementId).toBe("c");
    expect(ni!.currentPath).toBe("b.c");
    expect(ni!.pendingExits).toHaveLength(1);
    expect(ni!.pendingExits![0].enteredAt).toBe("b");
    expect(ni!.pendingExits![0].exitTargets).toEqual(["e"]);

    const move = r.delta.moveElements.find((m) => m.elementId === "x_0");
    expect(move).toBeDefined();
    expect(move!.fromParentId).toBe("b");
    expect(move!.toParentId).toBe("c");
    expect(move!.fromPath).toBe("b.x_0");
    expect(move!.toPath).toBe("b.c.x_0");
  });

  it("tick 2: clone toPath is b.c.x_0, never c.x_0 (core regression check)", () => {
    const vs: ViewState = {
      ...scopeVS,
      positions: { ...scopeVS.positions, "b.x_0": pe("x_0", 200, 0, 30) },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "b",
      currentPath: "b",
      clonedElementIds: ["x_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(scopeModel, vs, [instance], 1, 1, COLOR);

    const move = r.delta.moveElements[0];
    expect(move.toPath).toBe("b.c.x_0");
    expect(move.toPath).not.toBe("c.x_0");
  });

  it("tick 3: token at b.c continues inside scope → moves to b.d", () => {
    const vs: ViewState = {
      ...scopeVS,
      positions: { ...scopeVS.positions, "b.c.x_0": pe("x_0", 250, -50, 30) },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "c",
      currentPath: "b.c",
      clonedElementIds: ["x_0"],
      clonedRelationshipIds: [],
      pendingExits: [{ enteredAt: "b", exitTargets: ["e"] }],
    };
    const r = computeExecutionStep(scopeModel, vs, [instance], 1, 1, COLOR);

    const ni = r.nextInstances.find((i) => i.id === "inst_0");
    expect(ni).toBeDefined();
    expect(ni!.currentElementId).toBe("d");
    expect(ni!.currentPath).toBe("b.d");
    expect(ni!.pendingExits).toHaveLength(1);

    const move = r.delta.moveElements.find((m) => m.elementId === "x_0");
    expect(move).toBeDefined();
    expect(move!.fromParentId).toBe("c");
    expect(move!.toParentId).toBe("d");
    expect(move!.fromPath).toBe("b.c.x_0");
    expect(move!.toPath).toBe("b.d.x_0");
  });

  it("tick 4: token at b.d (dead end) exits scope to e", () => {
    const vs: ViewState = {
      ...scopeVS,
      positions: { ...scopeVS.positions, "b.d.x_0": pe("x_0", 250, 50, 30) },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "d",
      currentPath: "b.d",
      clonedElementIds: ["x_0"],
      clonedRelationshipIds: [],
      pendingExits: [{ enteredAt: "b", exitTargets: ["e"] }],
    };
    const r = computeExecutionStep(scopeModel, vs, [instance], 1, 1, COLOR);

    const ni = r.nextInstances.find((i) => i.id === "inst_0");
    expect(ni).toBeDefined();
    expect(ni!.currentElementId).toBe("e");
    expect(ni!.currentPath).toBe("e");
    expect((ni!.pendingExits ?? []).length).toBe(0);

    const move = r.delta.moveElements.find((m) => m.elementId === "x_0");
    expect(move).toBeDefined();
    expect(move!.fromParentId).toBe("d");
    expect(move!.toParentId).toBe("e");
    expect(move!.fromPath).toBe("b.d.x_0");
    expect(move!.toPath).toBe("e.x_0");
  });

  it("tick 5: token at e (dead end, no scope) is consumed", () => {
    const vs: ViewState = {
      ...scopeVS,
      positions: { ...scopeVS.positions, "e.x_0": pe("x_0", 500, 0, 30) },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "e",
      currentPath: "e",
      clonedElementIds: ["x_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(scopeModel, vs, [instance], 1, 1, COLOR);

    expect(r.nextInstances.find((i) => i.id === "inst_0")).toBeUndefined();
    expect(r.delta.removeElements.some((re) => re.elementId === "x_0")).toBe(
      true,
    );
    expect(r.delta.moveElements.some((m) => m.elementId === "x_0")).toBe(false);
  });

  it("flat chain regression: gen..>a..>b..>c still works without scope", () => {
    const g2 = gen(["tok"]);
    const tok = obj("tok");
    const na = fn("na");
    const nb = fn("nb");
    const nc = coll("nc");
    const model2: DiagramModel = {
      root: {
        ...createElement("root", "object"),
        childIds: ["gen", "tok", "na", "nb", "nc"],
      },
      elements: { gen: g2, tok, na: na, nb: nb, nc: nc },
      relationships: {},
      metadata: { version: "1.0.0", created: "", modified: "" },
    };
    const vs2: ViewState = {
      ...createEmptyViewState(),
      positions: {
        gen: pe("gen", 0, 0),
        tok: pe("tok", 0, 80, 40),
        na: pe("na", 100, 0),
        nb: pe("nb", 200, 0),
        nc: pe("nc", 300, 0),
      },
      relationships: [
        { id: "r1", sourcePath: "gen", targetPath: "na", type: "..>" },
        { id: "r2", sourcePath: "na", targetPath: "nb", type: "..>" },
        { id: "r3", sourcePath: "nb", targetPath: "nc", type: "..>" },
      ],
    };

    const r0 = computeExecutionStep(model2, vs2, [], 0, 0, COLOR);
    expect(r0.nextInstances[0].currentPath).toBe("na");

    const vs1 = {
      ...vs2,
      positions: { ...vs2.positions, "na.tok_0": pe("tok_0", 100, 0, 30) },
    };
    const inst1: TokenInstance = {
      id: "i",
      currentElementId: "na",
      currentPath: "na",
      clonedElementIds: ["tok_0"],
      clonedRelationshipIds: [],
    };
    const r1 = computeExecutionStep(model2, vs1, [inst1], 1, 1, COLOR);
    expect(r1.nextInstances[0].currentPath).toBe("nb");
    expect((r1.nextInstances[0].pendingExits ?? []).length).toBe(0);

    const vs2b = {
      ...vs2,
      positions: { ...vs2.positions, "nb.tok_0": pe("tok_0", 200, 0, 30) },
    };
    const inst2: TokenInstance = {
      id: "i",
      currentElementId: "nb",
      currentPath: "nb",
      clonedElementIds: ["tok_0"],
      clonedRelationshipIds: [],
    };
    const r2 = computeExecutionStep(model2, vs2b, [inst2], 1, 1, COLOR);
    expect(r2.nextInstances[0].currentPath).toBe("nc");
  });
});

describe("computeExecutionStep — routing: gen(x)..>a()..>b() c(a) shared-element path resolution", () => {
  function pe2(
    id: string,
    x: number,
    y: number,
    size = 60,
  ): import("../../domain/models/ViewState").PositionedElement {
    return { id, position: { x, y }, size, value: 1 };
  }

  const gEl2 = gen(["x"]);
  const xEl2 = obj("x");
  const aEl2 = fn("a");
  const bEl2 = fn("b");
  const cEl2 = fn("c", ["a"]);

  const sharedModel: DiagramModel = (() => {
    const rootEl = createElement("root", "object");
    rootEl.childIds = ["gen", "x", "a", "b", "c"];
    return {
      root: rootEl,
      elements: { gen: gEl2, x: xEl2, a: aEl2, b: bEl2, c: cEl2 },
      relationships: {},
      metadata: { version: "1.0.0", created: "", modified: "" },
    };
  })();

  const sharedVS: ViewState = {
    ...createEmptyViewState(),
    positions: {
      gen: pe2("gen", 0, 0),
      x: pe2("x", 0, 80, 40),
      a: pe2("a", 100, 0),
      b: pe2("b", 200, 0),
      c: pe2("c", 300, 0, 100),
      "c.a": pe2("a", 350, 0),
    },
    relationships: [
      { id: "r1", sourcePath: "gen", targetPath: "a", type: "..>" },
      { id: "r2", sourcePath: "a", targetPath: "b", type: "..>" },
    ],
  };

  it("tick 0: gen routes token to standalone a (not c.a)", () => {
    const r = computeExecutionStep(sharedModel, sharedVS, [], 0, 0, COLOR);
    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentElementId).toBe("a");
    expect(r.nextInstances[0].currentPath).toBe("a");
  });
});

function parseAndLayout(code: string): {
  model: DiagramModel;
  viewState: ViewState;
} {
  const tokens = new Lexer(code).tokenize();
  const model = new Parser(tokens).parse();
  const layout = new CircularLayout();
  const viewState = layout.apply(model, { width: 1000, height: 1000 });
  return { model, viewState };
}

describe("integration: gen(x)..>a()..>b() c(a) routes through a, not c.a", () => {
  it("chain-first ordering: c(a) after the chain", () => {
    const { model, viewState } = parseAndLayout("gen(x) ..> a() ..> b()\nc(a)");
    const r = computeExecutionStep(model, viewState, [], 0, 0, COLOR);
    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentPath).toBe("a");
  });

  it("container-first ordering: c(a) before the chain", () => {
    const { model, viewState } = parseAndLayout("c(a)\ngen(x) ..> a() ..> b()");
    const r = computeExecutionStep(model, viewState, [], 0, 0, COLOR);
    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentPath).toBe("a");
  });
});

describe("integration: a() c(a) gen(x)..>c.a..>b() routes through c.a, not standalone a", () => {
  it("token routes to c.a then b", () => {
    const { model, viewState } = parseAndLayout(
      "a() c(a)\ngen(x) ..> c.a ..> b()",
    );
    const r = computeExecutionStep(model, viewState, [], 0, 0, COLOR);
    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentPath).toBe("c.a");
  });

  it("clone is positioned inside c.a (not root a) after gen fires", () => {
    const { model, viewState } = parseAndLayout(
      "a() c(a)\ngen(x) ..> c.a ..> b()",
    );
    const r = computeExecutionStep(model, viewState, [], 0, 0, COLOR);
    const newModel = applyDeltaToModel(model, r.delta);
    const newVS = new ExecuteLayout().apply(
      newModel,
      { width: 1000, height: 1000 },
      viewState,
    );
    const cloneId = r.nextInstances[0].clonedElementIds[0];
    expect(newVS.positions[`c.a.${cloneId}`]).toBeDefined();
    expect(newVS.positions[`a.${cloneId}`]).toBeUndefined();
  });

  it("clone is positioned inside root a (not c.a) when route goes through root a", () => {
    const { model, viewState } = parseAndLayout("gen(x) ..> a() ..> b()\nc(a)");
    const r = computeExecutionStep(model, viewState, [], 0, 0, COLOR);
    const newModel = applyDeltaToModel(model, r.delta);
    const newVS = new ExecuteLayout().apply(
      newModel,
      { width: 1000, height: 1000 },
      viewState,
    );
    const cloneId = r.nextInstances[0].clonedElementIds[0];
    expect(newVS.positions[`a.${cloneId}`]).toBeDefined();
    expect(newVS.positions[`c.a.${cloneId}`]).toBeUndefined();
  });
});

describe("integration: object without template slots forwards token through chain", () => {
  it("b(c) gen(x) --> a --> b.c --> d: token passes through bare object a to b.c", () => {
    const { model, viewState } = parseAndLayout(
      "b(c)\ngen(x) --> a --> b.c --> d",
    );

    const r0 = computeExecutionStep(model, viewState, [], 0, 0, COLOR);
    expect(r0.nextInstances).toHaveLength(1);
    expect(r0.nextInstances[0].currentPath).toBe("a");

    const m1 = applyDeltaToModel(model, r0.delta);
    const vs1 = new ExecuteLayout().apply(
      m1,
      { width: 1000, height: 1000 },
      viewState,
    );
    const r1 = computeExecutionStep(
      m1,
      vs1,
      r0.nextInstances,
      1,
      r0.nextInstanceId,
      COLOR,
    );
    const paths1 = r1.nextInstances.map((i) => i.currentPath);
    expect(paths1).toContain("b.c");
  });
});

describe("EXECUTION_TEMPLATES: exec-linear-pipeline", () => {
  const gEl = gen(["a", "b", "c"]);
  const aEl = obj("a");
  const bEl = coll("b");
  const cEl = fn("c");
  const qEl = coll("q");
  const sEl = state("s");
  const chEl = choice("ch", []);
  const oEl = obj("o");
  const eEl = coll("e");

  const pipelineModel = makeModel(
    [gEl, aEl, bEl, cEl, qEl, sEl, chEl, oEl, eEl],
    [
      rel("gen", "q"),
      rel("q", "s"),
      rel("s", "ch"),
      lrel("ch", "yes", "o"),
      lrel("ch", "no", "e"),
    ],
  );
  const pipelineVS = makeViewState({
    gen: { x: 0, y: 0 },
    a: { x: 0, y: 80, size: 40 },
    b: { x: 0, y: 120, size: 40 },
    c: { x: 0, y: 160, size: 40 },
    q: { x: 100, y: 0 },
    s: { x: 200, y: 0 },
    ch: { x: 300, y: 0 },
    o: { x: 400, y: -50 },
    e: { x: 400, y: 50 },
  });

  it("gen spawns a_0, b_1, c_2 as 3 separate instances (one per disconnected child) into q", () => {
    const r = computeExecutionStep(pipelineModel, pipelineVS, [], 0, 0, COLOR);
    expect(r.delta.addElements).toHaveLength(3);
    const addedIds = r.delta.addElements.map((e) => e.element.id);
    expect(addedIds).toContain("a_0");
    expect(addedIds).toContain("b_1");
    expect(addedIds).toContain("c_2");
    expect(r.nextInstances).toHaveLength(3);
    expect(r.nextInstances.every((i) => i.currentElementId === "q")).toBe(true);
  });

  it("token at q passes through to s", () => {
    const vs: ViewState = {
      ...pipelineVS,
      positions: {
        ...pipelineVS.positions,
        "q.a_0": { id: "a_0", position: { x: 100, y: 0 }, size: 30, value: 1 },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "q",
      currentPath: "q",
      clonedElementIds: ["a_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(pipelineModel, vs, [instance], 1, 1, COLOR);
    const ni = r.nextInstances.find((i) => i.id === "inst_0");
    expect(ni?.currentElementId).toBe("s");
  });

  it("token at s passes through to ch", () => {
    const vs: ViewState = {
      ...pipelineVS,
      positions: {
        ...pipelineVS.positions,
        "s.a_0": { id: "a_0", position: { x: 200, y: 0 }, size: 30, value: 1 },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "s",
      currentPath: "s",
      clonedElementIds: ["a_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(pipelineModel, vs, [instance], 1, 1, COLOR);
    const ni = r.nextInstances.find((i) => i.id === "inst_0");
    expect(ni?.currentElementId).toBe("ch");
  });

  it("ch (no condition children) always routes to o via --yes--> label", () => {
    const vs: ViewState = {
      ...pipelineVS,
      positions: {
        ...pipelineVS.positions,
        "ch.a_0": { id: "a_0", position: { x: 300, y: 0 }, size: 30, value: 1 },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "ch",
      currentPath: "ch",
      clonedElementIds: ["a_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(pipelineModel, vs, [instance], 1, 1, COLOR);
    const ni = r.nextInstances.find((i) => i.id === "inst_0");
    expect(ni?.currentElementId).toBe("o");
  });

  it("full pipeline: token reaches o after passing q → s → ch", () => {
    const vs: ViewState = {
      ...pipelineVS,
      positions: {
        ...pipelineVS.positions,
        "o.a_0": {
          id: "a_0",
          position: { x: 400, y: -50 },
          size: 30,
          value: 1,
        },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "o",
      currentPath: "o",
      clonedElementIds: ["a_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(pipelineModel, vs, [instance], 1, 1, COLOR);

    expect(r.nextInstances.find((i) => i.id === "inst_0")).toBeUndefined();
  });
});

describe("EXECUTION_TEMPLATES: exec-generator-filter", () => {
  const gEl = gen(["Good_Item", "Faulty_Itm"]);
  const goodEl = obj("Good_Item");
  const faultyEl = obj("Faulty_Itm");
  const itemEl = obj("Item");
  const filterEl = choice("filter", ["Item"]);
  const transformEl = fn("transform");
  const storeEl = coll("store");
  const skipEl = coll("skip");

  const filterModel = makeModel(
    [gEl, goodEl, faultyEl, itemEl, filterEl, transformEl, storeEl, skipEl],
    [
      rel("gen", "filter"),
      lrel("filter", "pass", "transform"),
      lrel("filter", "reject", "skip"),
      rel("transform", "store"),
    ],
  );
  const filterVS = makeViewState({
    gen: { x: 0, y: 0 },
    Good_Item: { x: 0, y: 60, size: 40 },
    Faulty_Itm: { x: 0, y: 100, size: 40 },
    Item: { x: 0, y: 140, size: 40 },
    filter: { x: 100, y: 0 },
    transform: { x: 200, y: -50 },
    store: { x: 300, y: -50 },
    skip: { x: 200, y: 50 },
  });

  it("gen spawns Good_Item_0 and Faulty_Itm_1 as separate instances into filter", () => {
    const r = computeExecutionStep(filterModel, filterVS, [], 0, 0, COLOR);
    expect(r.nextInstances).toHaveLength(2);
    expect(r.nextInstances.every((i) => i.currentElementId === "filter")).toBe(
      true,
    );
    const addedIds = r.delta.addElements.map((e) => e.element.id);
    expect(addedIds).toContain("Good_Item_0");
    expect(addedIds).toContain("Faulty_Itm_1");
  });

  it("Good_Item_0 at filter: regex /Item/.test(Good_Item) matches → routes to transform", () => {
    const goodClone = obj("Good_Item_0");
    const model2 = {
      ...filterModel,
      elements: { ...filterModel.elements, Good_Item_0: goodClone },
    };
    const vs: ViewState = {
      ...filterVS,
      positions: {
        ...filterVS.positions,
        "filter.Good_Item_0": {
          id: "Good_Item_0",
          position: { x: 100, y: 0 },
          size: 30,
          value: 1,
        },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "filter",
      currentPath: "filter",
      clonedElementIds: ["Good_Item_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(model2, vs, [instance], 1, 1, COLOR);
    const ni = r.nextInstances.find((i) => i.id === "inst_0");
    expect(ni?.currentElementId).toBe("transform");
  });

  it("Faulty_Itm_0 at filter: regex /Item/.test(Faulty_Itm) fails → routes to skip", () => {
    const faultyClone = obj("Faulty_Itm_0");
    const model2 = {
      ...filterModel,
      elements: { ...filterModel.elements, Faulty_Itm_0: faultyClone },
    };
    const vs: ViewState = {
      ...filterVS,
      positions: {
        ...filterVS.positions,
        "filter.Faulty_Itm_0": {
          id: "Faulty_Itm_0",
          position: { x: 100, y: 0 },
          size: 30,
          value: 1,
        },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "filter",
      currentPath: "filter",
      clonedElementIds: ["Faulty_Itm_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(model2, vs, [instance], 1, 1, COLOR);
    const ni = r.nextInstances.find((i) => i.id === "inst_0");
    expect(ni?.currentElementId).toBe("skip");
  });

  it("transform forwards token to store", () => {
    const goodClone = obj("Good_Item_0");
    const model2 = {
      ...filterModel,
      elements: { ...filterModel.elements, Good_Item_0: goodClone },
    };
    const vs: ViewState = {
      ...filterVS,
      positions: {
        ...filterVS.positions,
        "transform.Good_Item_0": {
          id: "Good_Item_0",
          position: { x: 200, y: -50 },
          size: 30,
          value: 1,
        },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "transform",
      currentPath: "transform",
      clonedElementIds: ["Good_Item_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(model2, vs, [instance], 1, 1, COLOR);
    const ni = r.nextInstances.find((i) => i.id === "inst_0");
    expect(ni?.currentElementId).toBe("store");
  });
});

describe("EXECUTION_TEMPLATES: exec-round-robin", () => {
  const gEl = gen(["Request"]);
  const reqEl = obj("Request");
  const rrEl = roundRobin();
  const w1 = coll("worker1");
  const w2 = coll("worker2");
  const w3 = coll("worker3");

  const rrModel = makeModel(
    [gEl, reqEl, rrEl, w1, w2, w3],
    [
      rel("gen", "round_robin"),
      rel("round_robin", "worker1"),
      rel("round_robin", "worker2"),
      rel("round_robin", "worker3"),
    ],
  );
  const rrVS = makeViewState({
    gen: { x: 0, y: 0 },
    Request: { x: 0, y: 80, size: 40 },
    round_robin: { x: 100, y: 0 },
    worker1: { x: 200, y: -80 },
    worker2: { x: 200, y: 0 },
    worker3: { x: 200, y: 80 },
  });

  it("gen spawns Request_0 into round_robin", () => {
    const r = computeExecutionStep(rrModel, rrVS, [], 0, 0, COLOR);
    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentElementId).toBe("round_robin");
    expect(r.delta.addElements[0].element.id).toBe("Request_0");
  });

  it("inst_0 at round_robin routes to worker1 (idx 0 % 3 = 0)", () => {
    const vs: ViewState = {
      ...rrVS,
      positions: {
        ...rrVS.positions,
        "round_robin.Request_0": {
          id: "Request_0",
          position: { x: 100, y: 0 },
          size: 30,
          value: 1,
        },
      },
    };
    const r = computeExecutionStep(
      rrModel,
      vs,
      [
        {
          id: "inst_0",
          currentElementId: "round_robin",
          currentPath: "round_robin",
          clonedElementIds: ["Request_0"],
          clonedRelationshipIds: [],
        },
      ],
      1,
      1,
      COLOR,
    );
    expect(
      r.nextInstances.find((i) => i.id === "inst_0")?.currentElementId,
    ).toBe("worker1");
  });

  it("inst_1 at round_robin routes to worker2 (idx 1 % 3 = 1)", () => {
    const vs: ViewState = {
      ...rrVS,
      positions: {
        ...rrVS.positions,
        "round_robin.Request_1": {
          id: "Request_1",
          position: { x: 100, y: 0 },
          size: 30,
          value: 1,
        },
      },
    };
    const r = computeExecutionStep(
      rrModel,
      vs,
      [
        {
          id: "inst_1",
          currentElementId: "round_robin",
          currentPath: "round_robin",
          clonedElementIds: ["Request_1"],
          clonedRelationshipIds: [],
        },
      ],
      1,
      1,
      COLOR,
    );
    expect(
      r.nextInstances.find((i) => i.id === "inst_1")?.currentElementId,
    ).toBe("worker2");
  });

  it("inst_2 at round_robin routes to worker3 (idx 2 % 3 = 2)", () => {
    const vs: ViewState = {
      ...rrVS,
      positions: {
        ...rrVS.positions,
        "round_robin.Request_2": {
          id: "Request_2",
          position: { x: 100, y: 0 },
          size: 30,
          value: 1,
        },
      },
    };
    const r = computeExecutionStep(
      rrModel,
      vs,
      [
        {
          id: "inst_2",
          currentElementId: "round_robin",
          currentPath: "round_robin",
          clonedElementIds: ["Request_2"],
          clonedRelationshipIds: [],
        },
      ],
      1,
      1,
      COLOR,
    );
    expect(
      r.nextInstances.find((i) => i.id === "inst_2")?.currentElementId,
    ).toBe("worker3");
  });

  it("inst_3 wraps back to worker1 (idx 3 % 3 = 0)", () => {
    const vs: ViewState = {
      ...rrVS,
      positions: {
        ...rrVS.positions,
        "round_robin.Request_3": {
          id: "Request_3",
          position: { x: 100, y: 0 },
          size: 30,
          value: 1,
        },
      },
    };
    const r = computeExecutionStep(
      rrModel,
      vs,
      [
        {
          id: "inst_3",
          currentElementId: "round_robin",
          currentPath: "round_robin",
          clonedElementIds: ["Request_3"],
          clonedRelationshipIds: [],
        },
      ],
      1,
      1,
      COLOR,
    );
    expect(
      r.nextInstances.find((i) => i.id === "inst_3")?.currentElementId,
    ).toBe("worker1");
  });
});

describe("EXECUTION_TEMPLATES: exec-decision-tree", () => {
  const sCondEl = state("s");
  const oCondEl = obj("o");
  const gEl = gen(["obj"]);
  const objEl = obj("obj");
  const rootEl = choice("root", []);
  const branch1El = choice("branch1", ["s"]);
  const branch2El = choice("branch2", ["o"]);
  const leaf1El = obj("leaf1");
  const leaf2El = obj("leaf2");
  const leaf3El = obj("leaf3");
  const leaf4El = obj("leaf4");

  const treeModel = makeModel(
    [
      gEl,
      objEl,
      rootEl,
      sCondEl,
      oCondEl,
      branch1El,
      branch2El,
      leaf1El,
      leaf2El,
      leaf3El,
      leaf4El,
    ],
    [
      rel("gen", "root"),
      lrel("root", "yes", "branch1"),
      lrel("root", "no", "branch2"),
      lrel("branch1", "yes", "leaf1"),
      lrel("branch1", "no", "leaf2"),
      lrel("branch2", "yes", "leaf3"),
      lrel("branch2", "no", "leaf4"),
    ],
  );
  const treeVS = makeViewState({
    gen: { x: 0, y: 0 },
    obj: { x: 0, y: 80, size: 40 },
    root: { x: 100, y: 0 },
    s: { x: 0, y: 120, size: 40 },
    o: { x: 0, y: 160, size: 40 },
    branch1: { x: 200, y: -80 },
    branch2: { x: 200, y: 80 },
    leaf1: { x: 300, y: -120 },
    leaf2: { x: 300, y: -40 },
    leaf3: { x: 300, y: 40 },
    leaf4: { x: 300, y: 120 },
  });

  it("root<> (no condition children) always routes to branch1 via --yes--", () => {
    const vs: ViewState = {
      ...treeVS,
      positions: {
        ...treeVS.positions,
        "root.obj_0": {
          id: "obj_0",
          position: { x: 100, y: 0 },
          size: 30,
          value: 1,
        },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "root",
      currentPath: "root",
      clonedElementIds: ["obj_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(treeModel, vs, [instance], 1, 1, COLOR);
    expect(
      r.nextInstances.find((i) => i.id === "inst_0")?.currentElementId,
    ).toBe("branch1");
  });

  it("branch1<s||>: obj_0 (object) fails state type check → no → leaf2", () => {
    const objClone = obj("obj_0");
    const model2 = {
      ...treeModel,
      elements: { ...treeModel.elements, obj_0: objClone },
    };
    const vs: ViewState = {
      ...treeVS,
      positions: {
        ...treeVS.positions,
        "branch1.obj_0": {
          id: "obj_0",
          position: { x: 200, y: -80 },
          size: 30,
          value: 1,
        },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "branch1",
      currentPath: "branch1",
      clonedElementIds: ["obj_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(model2, vs, [instance], 1, 1, COLOR);
    expect(
      r.nextInstances.find((i) => i.id === "inst_0")?.currentElementId,
    ).toBe("leaf2");
  });

  it("branch1<s||>: s_0 (state) matches state condition → yes → leaf1", () => {
    const sClone = state("s_0");
    const model2 = {
      ...treeModel,
      elements: { ...treeModel.elements, s_0: sClone },
    };
    const vs: ViewState = {
      ...treeVS,
      positions: {
        ...treeVS.positions,
        "branch1.s_0": {
          id: "s_0",
          position: { x: 200, y: -80 },
          size: 30,
          value: 1,
        },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "branch1",
      currentPath: "branch1",
      clonedElementIds: ["s_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(model2, vs, [instance], 1, 1, COLOR);
    expect(
      r.nextInstances.find((i) => i.id === "inst_0")?.currentElementId,
    ).toBe("leaf1");
  });

  it("branch2<o{}>: obj_0 matches via regex /o/.test('obj') → yes → leaf3", () => {
    const objClone = obj("obj_0");
    const model2 = {
      ...treeModel,
      elements: { ...treeModel.elements, obj_0: objClone },
    };
    const vs: ViewState = {
      ...treeVS,
      positions: {
        ...treeVS.positions,
        "branch2.obj_0": {
          id: "obj_0",
          position: { x: 200, y: 80 },
          size: 30,
          value: 1,
        },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "branch2",
      currentPath: "branch2",
      clonedElementIds: ["obj_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(model2, vs, [instance], 1, 1, COLOR);
    expect(
      r.nextInstances.find((i) => i.id === "inst_0")?.currentElementId,
    ).toBe("leaf3");
  });

  it("branch2<o{}>: xyz_0 (object, baseName xyz) does not match /o/ → no → leaf4", () => {
    const xyzClone = obj("xyz_0");
    const model2 = {
      ...treeModel,
      elements: { ...treeModel.elements, xyz_0: xyzClone },
    };
    const vs: ViewState = {
      ...treeVS,
      positions: {
        ...treeVS.positions,
        "branch2.xyz_0": {
          id: "xyz_0",
          position: { x: 200, y: 80 },
          size: 30,
          value: 1,
        },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "branch2",
      currentPath: "branch2",
      clonedElementIds: ["xyz_0"],
      clonedRelationshipIds: [],
    };
    const r = computeExecutionStep(model2, vs, [instance], 1, 1, COLOR);
    expect(
      r.nextInstances.find((i) => i.id === "inst_0")?.currentElementId,
    ).toBe("leaf4");
  });
});

describe("EXECUTION_TEMPLATES: exec-connector", () => {
  const genA = (() => {
    const el = createElement("gen_a", "function");
    el.childIds = ["A"];
    return el;
  })();
  const genB = (() => {
    const el = createElement("gen_b", "function");
    el.childIds = ["B"];
    return el;
  })();
  const genC = (() => {
    const el = createElement("gen_c", "function");
    el.childIds = ["C"];
    return el;
  })();
  const genD = (() => {
    const el = createElement("gen_d", "function");
    el.childIds = ["D"];
    return el;
  })();
  const aEl = obj("A"),
    bEl = obj("B"),
    cEl2 = obj("C"),
    dEl = obj("D");
  const connEl = createElement("connector", "function");
  const mergedEl = coll("merged");

  const connModel = makeModel(
    [genA, genB, genC, genD, aEl, bEl, cEl2, dEl, connEl, mergedEl],
    [
      rel("gen_a", "connector"),
      rel("gen_b", "connector"),
      rel("gen_c", "connector"),
      rel("gen_d", "connector"),
      rel("connector", "merged"),
    ],
  );
  const connVS = makeViewState({
    gen_a: { x: 0, y: -90 },
    gen_b: { x: 0, y: -30 },
    gen_c: { x: 0, y: 30 },
    gen_d: { x: 0, y: 90 },
    A: { x: 0, y: -60, size: 40 },
    B: { x: 0, y: -20, size: 40 },
    C: { x: 0, y: 20, size: 40 },
    D: { x: 0, y: 60, size: 40 },
    connector: { x: 150, y: 0 },
    merged: { x: 300, y: 0 },
  });

  it("all 4 gens spawn their tokens at connector on tick 0", () => {
    const r = computeExecutionStep(connModel, connVS, [], 0, 0, COLOR);
    expect(r.nextInstances).toHaveLength(4);
    expect(
      r.nextInstances.every((i) => i.currentElementId === "connector"),
    ).toBe(true);
  });

  it("4 tokens at connector merge into 1 instance at merged carrying all 4 element IDs", () => {
    const a0 = obj("A_0"),
      b0 = obj("B_1"),
      c0 = obj("C_2"),
      d0 = obj("D_3");
    const model2 = {
      ...connModel,
      elements: { ...connModel.elements, A_0: a0, B_1: b0, C_2: c0, D_3: d0 },
    };
    const vs: ViewState = {
      ...connVS,
      positions: {
        ...connVS.positions,
        "connector.A_0": {
          id: "A_0",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
        "connector.B_1": {
          id: "B_1",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
        "connector.C_2": {
          id: "C_2",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
        "connector.D_3": {
          id: "D_3",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
      },
    };
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["A_0"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_1",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["B_1"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_2",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["C_2"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_3",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["D_3"],
        clonedRelationshipIds: [],
      },
    ];
    const r = computeExecutionStep(model2, vs, instances, 1, 4, COLOR);

    const mergedInsts = r.nextInstances.filter(
      (i) => i.currentElementId === "merged",
    );
    expect(mergedInsts).toHaveLength(1);
    expect(mergedInsts[0].clonedElementIds).toEqual(
      expect.arrayContaining(["A_0", "B_1", "C_2", "D_3"]),
    );
  });

  it("4-way merge creates a 4-element loop chain (A→B→C→D→A)", () => {
    const a0 = obj("A_0"),
      b0 = obj("B_1"),
      c0 = obj("C_2"),
      d0 = obj("D_3");
    const model2 = {
      ...connModel,
      elements: { ...connModel.elements, A_0: a0, B_1: b0, C_2: c0, D_3: d0 },
    };
    const vs: ViewState = {
      ...connVS,
      positions: {
        ...connVS.positions,
        "connector.A_0": {
          id: "A_0",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
        "connector.B_1": {
          id: "B_1",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
        "connector.C_2": {
          id: "C_2",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
        "connector.D_3": {
          id: "D_3",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
      },
    };
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["A_0"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_1",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["B_1"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_2",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["C_2"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_3",
        currentElementId: "connector",
        currentPath: "connector",
        clonedElementIds: ["D_3"],
        clonedRelationshipIds: [],
      },
    ];
    const r = computeExecutionStep(model2, vs, instances, 1, 4, COLOR);
    expect(r.delta.addRelationships).toHaveLength(4);
    const srcs = r.delta.addRelationships.map((r2) => r2.source).sort();
    expect(srcs).toEqual(["A_0", "B_1", "C_2", "D_3"]);
  });
});

describe("EXECUTION_TEMPLATES: exec-disconnector", () => {
  const xEl = obj("x"),
    yEl = obj("y"),
    zEl = obj("z");
  const xyRel = createRelationship("x-->y", "x", "y", "-->");
  const yzRel = createRelationship("y-->z", "y", "z", "-->");
  const zxRel = createRelationship("z-->x", "z", "x", "-->");
  const gEl = gen(["x", "y", "z"]);
  const discEl = createElement("disconnector", "function");
  const outEl = coll("out");

  const discModel: DiagramModel = (() => {
    const rootElem = createElement("root", "object");
    rootElem.childIds = ["gen", "x", "y", "z", "disconnector", "out"];
    return {
      root: rootElem,
      elements: {
        gen: gEl,
        x: xEl,
        y: yEl,
        z: zEl,
        disconnector: discEl,
        out: outEl,
      },
      relationships: {
        "gen-->disconnector": rel("gen", "disconnector"),
        "disconnector-->out": rel("disconnector", "out"),
        "x-->y": xyRel,
        "y-->z": yzRel,
        "z-->x": zxRel,
      },
      metadata: { version: "1.0.0", created: "", modified: "" },
    };
  })();
  const discVS = makeViewState({
    gen: { x: 0, y: 0 },
    x: { x: 0, y: 60, size: 40 },
    y: { x: 0, y: 100, size: 40 },
    z: { x: 0, y: 140, size: 40 },
    disconnector: { x: 150, y: 0 },
    out: { x: 300, y: 0 },
  });

  it("gen produces 1 instance carrying x_0/y_0/z_0 with 3 cloned relationships into disconnector", () => {
    const r = computeExecutionStep(discModel, discVS, [], 0, 0, COLOR);
    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentElementId).toBe("disconnector");
    const addedIds = r.delta.addElements.map((e) => e.element.id);
    expect(addedIds).toContain("x_0");
    expect(addedIds).toContain("y_0");
    expect(addedIds).toContain("z_0");
    expect(r.nextInstances[0].clonedRelationshipIds).toHaveLength(3);
  });

  it("disconnector splits triangle token into 3 independent tokens at out, removes all 3 rels", () => {
    const x0 = obj("x_0"),
      y0 = obj("y_0"),
      z0 = obj("z_0");
    const xy0 = createRelationship("x_0-->y_0", "x_0", "y_0", "-->");
    const yz0 = createRelationship("y_0-->z_0", "y_0", "z_0", "-->");
    const zx0 = createRelationship("z_0-->x_0", "z_0", "x_0", "-->");
    const model2: DiagramModel = {
      ...discModel,
      elements: { ...discModel.elements, x_0: x0, y_0: y0, z_0: z0 },
      relationships: {
        ...discModel.relationships,
        "x_0-->y_0": xy0,
        "y_0-->z_0": yz0,
        "z_0-->x_0": zx0,
      },
    };
    const vs: ViewState = {
      ...discVS,
      positions: {
        ...discVS.positions,
        "disconnector.x_0": {
          id: "x_0",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
        "disconnector.y_0": {
          id: "y_0",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
        "disconnector.z_0": {
          id: "z_0",
          position: { x: 150, y: 0 },
          size: 30,
          value: 1,
        },
      },
    };
    const instance: TokenInstance = {
      id: "inst_0",
      currentElementId: "disconnector",
      currentPath: "disconnector",
      clonedElementIds: ["x_0", "y_0", "z_0"],
      clonedRelationshipIds: ["x_0-->y_0", "y_0-->z_0", "z_0-->x_0"],
    };
    const r = computeExecutionStep(model2, vs, [instance], 1, 1, COLOR);

    const atOut = r.nextInstances.filter((i) => i.currentElementId === "out");
    expect(atOut).toHaveLength(3);
    expect(atOut.every((i) => i.clonedRelationshipIds.length === 0)).toBe(true);
    expect(r.delta.removeRelationshipIds).toContain("x_0-->y_0");
    expect(r.delta.removeRelationshipIds).toContain("y_0-->z_0");
    expect(r.delta.removeRelationshipIds).toContain("z_0-->x_0");
  });
});

describe("EXECUTION_TEMPLATES: exec-multiplier-duplicator", () => {
  const gEl = gen(["Packet"]);
  const packetEl = obj("Packet");
  const mult3El = multiplier("multiplier_3");
  const copiesEl = coll("copies");
  const src2El = fn("source2");
  const dupEl = createElement("duplicator", "function");
  const branchAEl = coll("branch_a");
  const branchBEl = coll("branch_b");

  const mdModel = makeModel(
    [gEl, packetEl, mult3El, copiesEl, src2El, dupEl, branchAEl, branchBEl],
    [
      rel("gen", "multiplier_3"),
      rel("multiplier_3", "copies"),
      rel("gen", "source2"),
      rel("source2", "duplicator"),
      rel("duplicator", "branch_a"),
      rel("duplicator", "branch_b"),
    ],
  );
  const mdVS = makeViewState({
    gen: { x: 0, y: 0 },
    Packet: { x: 0, y: 80, size: 40 },
    multiplier_3: { x: 100, y: -80 },
    copies: { x: 200, y: -80 },
    source2: { x: 100, y: 80 },
    duplicator: { x: 200, y: 80 },
    branch_a: { x: 300, y: 40 },
    branch_b: { x: 300, y: 120 },
  });

  it("gen with nextInstanceId=0 routes Packet_0 to multiplier_3 (0%2=0)", () => {
    const r = computeExecutionStep(mdModel, mdVS, [], 0, 0, COLOR);
    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentElementId).toBe("multiplier_3");
    expect(r.delta.addElements[0].element.id).toBe("Packet_0");
  });

  it("gen with nextInstanceId=1 routes Packet_1 to source2 (1%2=1)", () => {
    const r = computeExecutionStep(mdModel, mdVS, [], 1, 1, COLOR);
    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentElementId).toBe("source2");
    expect(r.delta.addElements[0].element.id).toBe("Packet_1");
  });

  it("multiplier_3 sends 3 independent copies of Packet_0 to copies", () => {
    const p0 = obj("Packet_0");
    const model2 = {
      ...mdModel,
      elements: { ...mdModel.elements, Packet_0: p0 },
    };
    const vs: ViewState = {
      ...mdVS,
      positions: {
        ...mdVS.positions,
        "multiplier_3.Packet_0": {
          id: "Packet_0",
          position: { x: 100, y: -80 },
          size: 30,
          value: 1,
        },
      },
    };
    const r = computeExecutionStep(
      model2,
      vs,
      [
        {
          id: "inst_0",
          currentElementId: "multiplier_3",
          currentPath: "multiplier_3",
          clonedElementIds: ["Packet_0"],
          clonedRelationshipIds: [],
        },
      ],
      1,
      1,
      COLOR,
    );
    const atCopies = r.nextInstances.filter(
      (i) => i.currentElementId === "copies",
    );
    expect(atCopies).toHaveLength(3);
  });

  it("duplicator broadcasts Packet_0 to both branch_a and branch_b", () => {
    const p0 = obj("Packet_0");
    const model2 = {
      ...mdModel,
      elements: { ...mdModel.elements, Packet_0: p0 },
    };
    const vs: ViewState = {
      ...mdVS,
      positions: {
        ...mdVS.positions,
        "duplicator.Packet_0": {
          id: "Packet_0",
          position: { x: 200, y: 80 },
          size: 30,
          value: 1,
        },
      },
    };
    const r = computeExecutionStep(
      model2,
      vs,
      [
        {
          id: "inst_0",
          currentElementId: "duplicator",
          currentPath: "duplicator",
          clonedElementIds: ["Packet_0"],
          clonedRelationshipIds: [],
        },
      ],
      1,
      1,
      COLOR,
    );

    const dests = r.nextInstances
      .filter(
        (i) =>
          i.currentElementId === "branch_a" ||
          i.currentElementId === "branch_b",
      )
      .map((i) => i.currentElementId)
      .sort();
    expect(dests).toEqual(["branch_a", "branch_b"]);
  });
});

describe("EXECUTION_TEMPLATES: exec-deduplicator-throttler", () => {
  const gEl = gen(["Packet"]);
  const packetEl = obj("Packet");
  const mult4El = multiplier("multiplier_4");
  const pipeEl = coll("pipe");
  const dedupEl = createElement("deduplicator", "function");
  const uniqueEl = coll("unique");
  const throt3El = multiplier("throttler_3");
  const sparseEl = coll("sparse");

  const dtModel = makeModel(
    [gEl, packetEl, mult4El, pipeEl, dedupEl, uniqueEl, throt3El, sparseEl],
    [
      rel("gen", "multiplier_4"),
      rel("multiplier_4", "pipe"),
      rel("pipe", "deduplicator"),
      rel("deduplicator", "unique"),
      rel("gen", "throttler_3"),
      rel("throttler_3", "sparse"),
    ],
  );
  const dtVS = makeViewState({
    gen: { x: 0, y: 0 },
    Packet: { x: 0, y: 80, size: 40 },
    multiplier_4: { x: 100, y: -60 },
    pipe: { x: 200, y: -60 },
    deduplicator: { x: 300, y: -60 },
    unique: { x: 400, y: -60 },
    throttler_3: { x: 100, y: 60 },
    sparse: { x: 200, y: 60 },
  });

  it("gen with nextInstanceId=0 routes Packet_0 to multiplier_4 (0%2=0)", () => {
    const r = computeExecutionStep(dtModel, dtVS, [], 0, 0, COLOR);
    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentElementId).toBe("multiplier_4");
  });

  it("gen with nextInstanceId=1 routes Packet_1 to throttler_3 (1%2=1)", () => {
    const r = computeExecutionStep(dtModel, dtVS, [], 1, 1, COLOR);
    expect(r.nextInstances).toHaveLength(1);
    expect(r.nextInstances[0].currentElementId).toBe("throttler_3");
  });

  it("multiplier_4 sends 4 copies of Packet_0 to pipe", () => {
    const p0 = obj("Packet_0");
    const model2 = {
      ...dtModel,
      elements: { ...dtModel.elements, Packet_0: p0 },
    };
    const vs: ViewState = {
      ...dtVS,
      positions: {
        ...dtVS.positions,
        "multiplier_4.Packet_0": {
          id: "Packet_0",
          position: { x: 100, y: -60 },
          size: 30,
          value: 1,
        },
      },
    };
    const r = computeExecutionStep(
      model2,
      vs,
      [
        {
          id: "inst_0",
          currentElementId: "multiplier_4",
          currentPath: "multiplier_4",
          clonedElementIds: ["Packet_0"],
          clonedRelationshipIds: [],
        },
      ],
      1,
      1,
      COLOR,
    );
    expect(
      r.nextInstances.filter((i) => i.currentElementId === "pipe"),
    ).toHaveLength(4);
  });

  it("deduplicator: 4 same-baseName Packet tokens → only 1 passes to unique, 3 are dropped", () => {
    const p0 = obj("Packet_0"),
      p1 = obj("Packet_1"),
      p2 = obj("Packet_2"),
      p3 = obj("Packet_3");
    const model2 = {
      ...dtModel,
      elements: {
        ...dtModel.elements,
        Packet_0: p0,
        Packet_1: p1,
        Packet_2: p2,
        Packet_3: p3,
      },
    };
    const vs: ViewState = {
      ...dtVS,
      positions: {
        ...dtVS.positions,
        "deduplicator.Packet_0": {
          id: "Packet_0",
          position: { x: 300, y: -60 },
          size: 30,
          value: 1,
        },
        "deduplicator.Packet_1": {
          id: "Packet_1",
          position: { x: 300, y: -60 },
          size: 30,
          value: 1,
        },
        "deduplicator.Packet_2": {
          id: "Packet_2",
          position: { x: 300, y: -60 },
          size: 30,
          value: 1,
        },
        "deduplicator.Packet_3": {
          id: "Packet_3",
          position: { x: 300, y: -60 },
          size: 30,
          value: 1,
        },
      },
    };
    const instances: TokenInstance[] = [
      {
        id: "inst_0",
        currentElementId: "deduplicator",
        currentPath: "deduplicator",
        clonedElementIds: ["Packet_0"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_1",
        currentElementId: "deduplicator",
        currentPath: "deduplicator",
        clonedElementIds: ["Packet_1"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_2",
        currentElementId: "deduplicator",
        currentPath: "deduplicator",
        clonedElementIds: ["Packet_2"],
        clonedRelationshipIds: [],
      },
      {
        id: "inst_3",
        currentElementId: "deduplicator",
        currentPath: "deduplicator",
        clonedElementIds: ["Packet_3"],
        clonedRelationshipIds: [],
      },
    ];
    const r = computeExecutionStep(model2, vs, instances, 1, 4, COLOR);
    expect(
      r.nextInstances.filter((i) => i.currentElementId === "unique"),
    ).toHaveLength(1);
    const droppedIds = r.delta.removeElements.map((e) => e.elementId);
    expect(droppedIds.filter((id) => id.startsWith("Packet_"))).toHaveLength(3);
  });

  it("throttler_3 forwards to sparse when tickCount % 3 === 0", () => {
    const p0 = obj("Packet_0");
    const model2 = {
      ...dtModel,
      elements: { ...dtModel.elements, Packet_0: p0 },
    };
    const vs: ViewState = {
      ...dtVS,
      positions: {
        ...dtVS.positions,
        "throttler_3.Packet_0": {
          id: "Packet_0",
          position: { x: 100, y: 60 },
          size: 30,
          value: 1,
        },
      },
    };
    const inst: TokenInstance = {
      id: "inst_0",
      currentElementId: "throttler_3",
      currentPath: "throttler_3",
      clonedElementIds: ["Packet_0"],
      clonedRelationshipIds: [],
    };
    const rFwd = computeExecutionStep(model2, vs, [inst], 0, 1, COLOR);
    expect(
      rFwd.nextInstances.find((i) => i.id === "inst_0")?.currentElementId,
    ).toBe("sparse");

    const rDrop = computeExecutionStep(model2, vs, [inst], 1, 1, COLOR);
    expect(rDrop.nextInstances.find((i) => i.id === "inst_0")).toBeUndefined();
    expect(
      rDrop.delta.removeElements.some((e) => e.elementId === "Packet_0"),
    ).toBe(true);
  });
});
