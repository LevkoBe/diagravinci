import { describe, it, expect } from "vitest";
import { computeExecutionStep } from "../../application/ExecutionEngine";
import type { TokenInstance } from "../../application/store/executionSlice";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";
import { createElement } from "../../domain/models/Element";
import { createRelationship } from "../../domain/models/Relationship";
import { createEmptyViewState } from "../../domain/models/ViewState";

// ─── helpers ────────────────────────────────────────────────────────────────

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
    vs.positions[id] = { id, position: { x: p.x, y: p.y }, size: p.size ?? 60, value: 1 };
  }
  return vs;
}

// ── Element constructors ────────────────────────────────────────────────────

/** Creates a `gen` function element (spontaneous generator). */
function gen(childIds: string[] = []) {
  const el = createElement("gen", "function");
  el.childIds = childIds;
  return el;
}

/** Creates a `round_robin` function element (incoming round-robin router). */
function roundRobin() {
  return createElement("round_robin", "function");
}

/** Creates a regular (trigger-based) function element. */
function fn(id: string, childIds: string[] = []) {
  const el = createElement(id, "function");
  el.childIds = childIds;
  return el;
}

function obj(id: string)    { return createElement(id, "object"); }
function coll(id: string)   { return createElement(id, "collection"); }
function state(id: string)  { return createElement(id, "state"); }
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

/** Solid arrow relationship (flow-compatible). */
function rel(source: string, target: string) {
  return createRelationship(`${source}-->${target}`, source, target, "-->");
}
/** Dotted flow relationship. */
function drel(source: string, target: string) {
  return createRelationship(`${source}..>${target}`, source, target, "..>");
}
/** Inheritance — execution must NOT follow these. */
function irel(source: string, target: string) {
  return createRelationship(`${source}--|>${target}`, source, target, "--|>");
}
/** Labelled solid-arrow relationship. */
function lrel(source: string, label: string, target: string) {
  return createRelationship(
    `${source}--${label}-->${target}`, source, target, "-->", label,
  );
}

const COLOR = "#f97316";

// ─── gen: spontaneous generation ─────────────────────────────────────────────

describe("computeExecutionStep — gen (spontaneous generation)", () => {
  it("gen generates cloned children nested inside the target on every tick", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const model = makeModel([g, child, mid], [drel("gen", "mid")]);
    const vs = makeViewState({ gen: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, child: { x: 0, y: 50 } });

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
    const vs = makeViewState({ gen: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, child: { x: 0, y: 50 } });

    // Should generate on tick 0, 1, and 2
    expect(computeExecutionStep(model, vs, [], 0, 0, COLOR).delta.addElements).toHaveLength(1);
    expect(computeExecutionStep(model, vs, [], 1, 0, COLOR).delta.addElements).toHaveLength(1);
    expect(computeExecutionStep(model, vs, [], 2, 0, COLOR).delta.addElements).toHaveLength(1);
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
    const vs = makeViewState({ gen: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, child: { x: 0, y: 50 } });

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
    const vs = makeViewState({ gen: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, child: { x: 0, y: 50 }, gc: { x: 0, y: 80 } });

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
    const vs = makeViewState({ gen: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, child: { x: 0, y: 50 } });

    const r = computeExecutionStep(model, vs, [], 0, 42, COLOR);
    expect(r.nextInstanceId).toBe(43);
    expect(r.delta.addElements[0].element.id).toBe("child_42");
  });

  it("TokenInstance carries correct currentPath after gen generation", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const model = makeModel([g, child, mid], [drel("gen", "mid")]);
    const vs = makeViewState({ gen: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, child: { x: 0, y: 50 } });

    const result = computeExecutionStep(model, vs, [], 0, 0, COLOR);
    expect(result.nextInstances[0].currentElementId).toBe("mid");
    expect(result.nextInstances[0].currentPath).toBe("mid");
  });

  it("gen absorbs tokens that arrive at it (prevents feedback loops)", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const model = makeModel([g, child], []);
    const vs = makeViewState({ gen: { x: 0, y: 0 }, "gen.child_0": { x: 0, y: 30 } });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "gen", currentPath: "gen",
      clonedElementIds: ["child_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    // The arriving instance should be absorbed (clones removed, instance dropped)
    expect(result.delta.removeElements.some((r) => r.elementId === "child_0")).toBe(true);
    // gen still generates a NEW instance from its template
    expect(result.delta.addElements).toHaveLength(0); // no outgoing, so gen can't send
  });
});

// ─── regular function: trigger-based ─────────────────────────────────────────

describe("computeExecutionStep — regular function (trigger-based)", () => {
  it("regular function does NOT spontaneously generate", () => {
    const child = obj("child");
    const f = fn("transformer", ["child"]);
    const mid = coll("mid");
    const model = makeModel([f, child, mid], [rel("transformer", "mid")]);
    const vs = makeViewState({ transformer: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, child: { x: 0, y: 50 } });

    // No instances — transformer should NOT generate anything
    const result = computeExecutionStep(model, vs, [], 0, 0, COLOR);
    expect(result.delta.addElements).toHaveLength(0);
    expect(result.nextInstances).toHaveLength(0);
  });

  it("regular function with template children: consumes incoming token and produces template children", () => {
    const tmpl = obj("tmpl");
    const f = fn("transformer", ["tmpl"]);
    const src = coll("src");
    const dst = coll("dst");
    const incoming = obj("incoming_0");
    const model = makeModel([f, tmpl, src, dst, incoming], [rel("transformer", "dst")]);
    const vs = makeViewState({
      transformer: { x: 100, y: 0 }, dst: { x: 200, y: 0 },
      "transformer.incoming_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "transformer", currentPath: "transformer",
      clonedElementIds: ["incoming_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    // Incoming token is consumed
    expect(result.delta.removeElements.some((r) => r.elementId === "incoming_0")).toBe(true);
    // Template children are produced at dst
    expect(result.delta.addElements).toHaveLength(1);
    expect(result.delta.addElements[0].element.id).toBe("tmpl_1");
    expect(result.delta.addElements[0].parentElementId).toBe("dst");
    // New instance is at dst
    expect(result.nextInstances).toHaveLength(1);
    expect(result.nextInstances[0].currentElementId).toBe("dst");
  });

  it("regular function without template children passes incoming token through", () => {
    const f = fn("passthrough");
    const src = coll("src");
    const dst = coll("dst");
    const incoming = obj("incoming_0");
    const model = makeModel([f, src, dst, incoming], [rel("passthrough", "dst")]);
    const vs = makeViewState({
      passthrough: { x: 100, y: 0 }, dst: { x: 200, y: 0 },
      "passthrough.incoming_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "passthrough", currentPath: "passthrough",
      clonedElementIds: ["incoming_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    // Token moved to dst (not removed)
    expect(result.delta.removeElements).toHaveLength(0);
    expect(result.delta.moveElements).toHaveLength(1);
    expect(result.delta.moveElements[0].elementId).toBe("incoming_0");
    expect(result.delta.moveElements[0].toParentId).toBe("dst");
  });
});

// ─── round_robin routing ─────────────────────────────────────────────────────

describe("computeExecutionStep — round_robin routing", () => {
  it("round_robin distributes incoming tokens round-robin across outgoing targets", () => {
    const rr = roundRobin();
    const one = coll("one");
    const two = coll("two");
    const token0 = obj("token_0");
    const token1 = obj("token_1");
    const model = makeModel([rr, one, two, token0, token1], [
      rel("round_robin", "one"),
      rel("round_robin", "two"),
    ]);
    const vs = makeViewState({
      round_robin: { x: 100, y: 0 },
      one: { x: 200, y: -50 }, two: { x: 200, y: 50 },
      "round_robin.token_0": { x: 100, y: 0 },
      "round_robin.token_1": { x: 100, y: 0 },
    });

    // inst_0 trailing digit 0 → targets[0 % 2] = "one"
    // inst_1 trailing digit 1 → targets[1 % 2] = "two"
    const inst0: TokenInstance = {
      id: "i0", currentElementId: "round_robin", currentPath: "round_robin",
      clonedElementIds: ["token_0"], clonedRelationshipIds: [],
    };
    const inst1: TokenInstance = {
      id: "i1", currentElementId: "round_robin", currentPath: "round_robin",
      clonedElementIds: ["token_1"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [inst0, inst1], 1, 2, COLOR);
    const destinations = result.nextInstances.map((i) => i.currentElementId);
    expect(destinations).toContain("one");
    expect(destinations).toContain("two");
    // Tokens are moved, not added/removed
    expect(result.delta.addElements).toHaveLength(0);
    expect(result.delta.removeElements).toHaveLength(0);
  });
});

// ─── object absorbs ──────────────────────────────────────────────────────────

describe("computeExecutionStep — object absorbs", () => {
  it("{} object absorbs all incoming tokens — clones are removed, instance dropped", () => {
    const g = gen(["child"]);
    const child = obj("child");
    const sink = obj("sink");
    const model = makeModel([g, child, sink], [drel("gen", "sink")]);
    const vs = makeViewState({
      gen: { x: 0, y: 0 }, sink: { x: 100, y: 0 }, "sink.child_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "sink", currentPath: "sink",
      clonedElementIds: ["child_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    // The original instance's clone is absorbed (removed)
    expect(result.delta.removeElements.some((r) => r.elementId === "child_0")).toBe(true);
    // gen simultaneously generates a fresh child_1 at sink (separate concern)
    expect(result.delta.addElements).toHaveLength(1);
  });
});

// ─── collection and state accumulate ─────────────────────────────────────────

describe("computeExecutionStep — collection and state accumulate at dead ends", () => {
  it("collection [] at dead end keeps instance alive", () => {
    const supplier = fn("supplier", ["child"]);
    const child = obj("child");
    const q = coll("q");
    const model = makeModel([supplier, child, q], [drel("supplier", "q")]);
    const vs = makeViewState({ supplier: { x: 0, y: 0 }, q: { x: 100, y: 0 }, "q.child_0": { x: 100, y: 0 } });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "q", currentPath: "q",
      clonedElementIds: ["child_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances.some((i) => i.currentElementId === "q")).toBe(true);
    expect(result.delta.removeElements).toHaveLength(0);
  });

  it("state || at dead end keeps instance alive", () => {
    const supplier = fn("supplier", ["child"]);
    const child = obj("child");
    const s = state("s");
    const model = makeModel([supplier, child, s], [drel("supplier", "s")]);
    const vs = makeViewState({ supplier: { x: 0, y: 0 }, s: { x: 100, y: 0 }, "s.child_0": { x: 100, y: 0 } });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "s", currentPath: "s",
      clonedElementIds: ["child_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances.some((i) => i.currentElementId === "s")).toBe(true);
    expect(result.delta.removeElements).toHaveLength(0);
  });
});

// ─── flow type filtering ──────────────────────────────────────────────────────

describe("computeExecutionStep — flow type filtering", () => {
  it("flow with no template children passes all token types", () => {
    const f = flow("f");  // no template children
    const dst = coll("dst");
    const token = obj("token_0");
    const model = makeModel([f, dst, token], [rel("f", "dst")]);
    const vs = makeViewState({
      f: { x: 0, y: 0 }, dst: { x: 100, y: 0 }, "f.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "f", currentPath: "f",
      clonedElementIds: ["token_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.delta.moveElements).toHaveLength(1);
    expect(result.delta.removeElements).toHaveLength(0);
  });

  it("flow passes tokens whose type matches a template child type", () => {
    const tmplChild = state("cond");   // template child: state type
    const f = flow("f", ["cond"]);     // flow accepts state type
    const dst = coll("dst");
    const token = state("token_0");    // type "state" — matches
    const model = makeModel([f, tmplChild, dst, token], [rel("f", "dst")]);
    const vs = makeViewState({
      f: { x: 0, y: 0 }, dst: { x: 100, y: 0 }, "f.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "f", currentPath: "f",
      clonedElementIds: ["token_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.delta.moveElements).toHaveLength(1);
    expect(result.delta.removeElements).toHaveLength(0);
  });

  it("flow drops tokens whose type does NOT match template child types", () => {
    const tmplChild = state("cond");   // template child: state type
    const f = flow("f", ["cond"]);     // flow accepts state type only
    const dst = coll("dst");
    const token = obj("token_0");      // type "object" — does NOT match
    const model = makeModel([f, tmplChild, dst, token], [rel("f", "dst")]);
    const vs = makeViewState({
      f: { x: 0, y: 0 }, dst: { x: 100, y: 0 }, "f.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "f", currentPath: "f",
      clonedElementIds: ["token_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    // Token is dropped — removed, not moved
    expect(result.delta.removeElements.some((r) => r.elementId === "token_0")).toBe(true);
    expect(result.delta.moveElements).toHaveLength(0);
    expect(result.nextInstances).toHaveLength(0);
  });

  it("flow at dead end consumes regardless of type filter", () => {
    const f = flow("f");
    const token = obj("token_0");
    const model = makeModel([f, token], []);
    const vs = makeViewState({ f: { x: 0, y: 0 }, "f.token_0": { x: 0, y: 0 } });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "f", currentPath: "f",
      clonedElementIds: ["token_0"], clonedRelationshipIds: ["rel_0"],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances).toHaveLength(0);
    expect(result.delta.removeElements[0].elementId).toBe("token_0");
    expect(result.delta.removeRelationshipIds).toContain("rel_0");
  });
});

// ─── collection type filtering ────────────────────────────────────────────────

describe("computeExecutionStep — collection type filtering", () => {
  it("collection with no template children accepts any token type", () => {
    const q = coll("q");
    const dst = coll("dst");
    const token = state("token_0");
    const model = makeModel([q, dst, token], [rel("q", "dst")]);
    const vs = makeViewState({
      q: { x: 0, y: 0 }, dst: { x: 100, y: 0 }, "q.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "q", currentPath: "q",
      clonedElementIds: ["token_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.delta.moveElements).toHaveLength(1);
    expect(result.delta.removeElements).toHaveLength(0);
  });

  it("collection with template children drops tokens of the wrong type", () => {
    const tmplChild = state("cond");
    const q = coll("q");
    q.childIds = ["cond"];
    const dst = coll("dst");
    const token = obj("token_0");    // type "object" — doesn't match "state"
    const model = makeModel([q, tmplChild, dst, token], [rel("q", "dst")]);
    const vs = makeViewState({
      q: { x: 0, y: 0 }, dst: { x: 100, y: 0 }, "q.token_0": { x: 0, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "q", currentPath: "q",
      clonedElementIds: ["token_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.delta.removeElements.some((r) => r.elementId === "token_0")).toBe(true);
    expect(result.delta.moveElements).toHaveLength(0);
  });
});

// ─── propagation forwarding ───────────────────────────────────────────────────

describe("computeExecutionStep — propagation forwarding", () => {
  it("moves instance to next outgoing dotted target", () => {
    const supplier = fn("supplier", ["child"]);
    const child = obj("child");
    const mid = coll("mid");
    const end = state("end");
    const model = makeModel([supplier, child, mid, end], [drel("supplier", "mid"), drel("mid", "end")]);
    const vs = makeViewState({
      supplier: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, end: { x: 200, y: 0 },
      child: { x: 0, y: 50 }, "mid.child_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "mid", currentPath: "mid",
      clonedElementIds: ["child_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    expect(result.nextInstances.some((i) => i.currentElementId === "end")).toBe(true);

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
    const model = makeModel([supplier, child, mid, end], [drel("supplier", "mid"), irel("mid", "end")]);
    const vs = makeViewState({
      supplier: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, end: { x: 200, y: 0 },
      "mid.child_0": { x: 100, y: 0 },
    });

    const instance: TokenInstance = {
      id: "inst_0", currentElementId: "mid", currentPath: "mid",
      clonedElementIds: ["child_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [instance], 1, 1, COLOR);
    // mid is collection at dead end (inheritance not followed)
    expect(result.nextInstances.some((i) => i.currentElementId === "mid")).toBe(true);
    expect(result.delta.moveElements).toHaveLength(0);
  });
});

// ─── combined generation + propagation ────────────────────────────────────────

describe("computeExecutionStep — combined generation + propagation", () => {
  it("propagates existing AND gen generates new in the same tick", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const end = state("end");
    const model = makeModel([g, child, mid, end], [drel("gen", "mid"), drel("mid", "end")]);
    const vs = makeViewState({
      gen: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, end: { x: 200, y: 0 },
      child: { x: 0, y: 50 }, "mid.child_0": { x: 100, y: 0 },
    });

    const existing: TokenInstance = {
      id: "inst_0", currentElementId: "mid", currentPath: "mid",
      clonedElementIds: ["child_0"], clonedRelationshipIds: [],
    };

    const result = computeExecutionStep(model, vs, [existing], 1, 1, COLOR);

    // Existing instance moves from mid → end
    expect(result.nextInstances.some((i) => i.currentElementId === "end")).toBe(true);
    // gen generates a new instance at mid
    expect(result.delta.addElements.some((e) => e.element.id === "child_1")).toBe(true);
    expect(result.nextInstances.some((i) => i.currentElementId === "mid")).toBe(true);
  });
});

// ─── edge cases ───────────────────────────────────────────────────────────────

describe("computeExecutionStep — edge cases", () => {
  it("returns empty delta when nothing to do", () => {
    const g = gen();  // no template children → no generation
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
    const model = makeModel([supplier, child, mid, end], [drel("supplier", "mid"), drel("mid", "end")]);
    const vs = makeViewState({
      supplier: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, end: { x: 200, y: 0 },
      "mid.child_0": { x: 100, y: 0 },
    });
    const original: TokenInstance[] = [{
      id: "inst_0", currentElementId: "mid", currentPath: "mid",
      clonedElementIds: ["child_0"], clonedRelationshipIds: [],
    }];
    const snapshot = JSON.stringify(original);
    computeExecutionStep(model, vs, original, 1, 1, COLOR);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it("uses nextInstanceId as clone suffix", () => {
    const child = obj("child");
    const g = gen(["child"]);
    const mid = coll("mid");
    const model = makeModel([g, child, mid], [drel("gen", "mid")]);
    const vs = makeViewState({ gen: { x: 0, y: 0 }, mid: { x: 100, y: 0 }, child: { x: 0, y: 50 } });

    const r = computeExecutionStep(model, vs, [], 0, 99, COLOR);
    expect(r.delta.addElements[0].element.id).toBe("child_99");
  });
});

// ─── choice routing ───────────────────────────────────────────────────────────

describe("computeExecutionStep — choice routing", () => {
  it("routes to yes branch when clone type AND base name match a child selector", () => {
    // Child selector "cond" (type=state, pattern="cond").
    // Token "cond_0" has baseName "cond" and type "state" → both match → yes.
    const cond   = state("cond");
    const ch     = choice("ch", ["cond"]);
    const yes_el = coll("yes_dest");
    const no_el  = coll("no_dest");
    const clone  = state("cond_0");   // baseName "cond" matches pattern "cond", type "state" matches
    const model  = makeModel(
      [cond, ch, yes_el, no_el, clone],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      cond: { x: 0, y: 0 }, ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 }, no_dest: { x: 200, y: 50 },
      "ch.cond_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [{
      id: "inst_0", currentElementId: "ch", currentPath: "ch",
      clonedElementIds: ["cond_0"], clonedRelationshipIds: [],
    }];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    expect(moved?.currentElementId).toBe("yes_dest");
  });

  it("routes to no branch when clone type matches but name does NOT match selector", () => {
    // Child selector "cond" (type=state, pattern="cond").
    // Token "other_0" has baseName "other" — type matches but name doesn't → no.
    const cond   = state("cond");
    const ch     = choice("ch", ["cond"]);
    const yes_el = coll("yes_dest");
    const no_el  = coll("no_dest");
    const clone  = state("other_0");  // type "state" matches, but baseName "other" ≠ "cond"
    const model  = makeModel(
      [cond, ch, yes_el, no_el, clone],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      cond: { x: 0, y: 0 }, ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 }, no_dest: { x: 200, y: 50 },
      "ch.other_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [{
      id: "inst_0", currentElementId: "ch", currentPath: "ch",
      clonedElementIds: ["other_0"], clonedRelationshipIds: [],
    }];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    expect(moved?.currentElementId).toBe("no_dest");
  });

  it("routes to no branch when clone type does NOT match condition types", () => {
    const cond   = state("cond");
    const ch     = choice("ch", ["cond"]);
    const yes_el = coll("yes_dest");
    const no_el  = coll("no_dest");
    const clone  = obj("clone_0");    // type "object" — does NOT match state
    const model  = makeModel(
      [cond, ch, yes_el, no_el, clone],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      cond: { x: 0, y: 0 }, ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 }, no_dest: { x: 200, y: 50 },
      "ch.clone_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [{
      id: "inst_0", currentElementId: "ch", currentPath: "ch",
      clonedElementIds: ["clone_0"], clonedRelationshipIds: [],
    }];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    expect(moved?.currentElementId).toBe("no_dest");
  });

  it("always routes to yes branch when choice has no condition children", () => {
    const ch     = choice("ch", []);
    const yes_el = coll("yes_dest");
    const no_el  = coll("no_dest");
    const clone  = obj("clone_0");
    const model  = makeModel(
      [ch, yes_el, no_el, clone],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 }, no_dest: { x: 200, y: 50 },
      "ch.clone_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [{
      id: "inst_0", currentElementId: "ch", currentPath: "ch",
      clonedElementIds: ["clone_0"], clonedRelationshipIds: [],
    }];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    expect(moved?.currentElementId).toBe("yes_dest");
  });

  it("falls back to positional ordering when outgoing have no labels", () => {
    const cond   = state("cond");
    const ch     = choice("ch", ["cond"]);
    const first  = coll("first");
    const second = coll("second");
    const clone  = obj("clone_0");    // object — does not match state condition
    const model  = makeModel(
      [cond, ch, first, second, clone],
      [
        createRelationship("ch-->first",  "ch", "first",  "-->"),
        createRelationship("ch-->second", "ch", "second", "-->"),
      ],
    );
    const vs = makeViewState({
      cond: { x: 0, y: 0 }, ch: { x: 100, y: 0 },
      first: { x: 200, y: -50 }, second: { x: 200, y: 50 },
      "ch.clone_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [{
      id: "inst_0", currentElementId: "ch", currentPath: "ch",
      clonedElementIds: ["clone_0"], clonedRelationshipIds: [],
    }];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    expect(moved?.currentElementId).toBe("second");  // condition not met → no → targets[1]
  });

  it("ignores execution clones in choice childIds when evaluating condition (regression)", () => {
    // Regression: applyDeltaToModel adds the clone to the choice's childIds.
    // Without the allCloneIds filter, conditionTypes would include the clone's
    // own type ("object"), making the condition always match → always yes (wrong).
    const cond  = state("cond");
    const clone = obj("clone_0");
    const ch    = choice("ch", ["cond", "clone_0"]); // clone_0 pollutes childIds
    const yes_el = coll("yes_dest");
    const no_el  = coll("no_dest");
    const model = makeModel(
      [cond, clone, ch, yes_el, no_el],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      cond: { x: 0, y: 0 }, ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 }, no_dest: { x: 200, y: 50 },
      "ch.clone_0": { x: 100, y: 0 },
    });
    const instances: TokenInstance[] = [{
      id: "inst_0", currentElementId: "ch", currentPath: "ch",
      clonedElementIds: ["clone_0"], clonedRelationshipIds: [],
    }];

    const result = computeExecutionStep(model, vs, instances, 1, 1, COLOR);
    const moved = result.nextInstances.find((i) => i.id === "inst_0");
    // clone_0 is "object", condition is "state" → NOT met → no_dest
    expect(moved?.currentElementId).toBe("no_dest");
  });

  it("routes by name regex when choice child has a specific (non-anonymous) name", () => {
    const namedCond = state("alpha");   // condition: type=state, name regex="alpha"
    const ch = choice("ch", ["alpha"]);
    const yes_el = coll("yes_dest");
    const no_el  = coll("no_dest");
    const matchingClone = state("alpha_0");   // base name "alpha" matches regex "alpha"
    const nonMatchingClone = state("beta_0"); // base name "beta" doesn't match "alpha"
    const model = makeModel(
      [namedCond, ch, yes_el, no_el, matchingClone, nonMatchingClone],
      [lrel("ch", "yes", "yes_dest"), lrel("ch", "no", "no_dest")],
    );
    const vs = makeViewState({
      alpha: { x: 0, y: 0 }, ch: { x: 100, y: 0 },
      yes_dest: { x: 200, y: -50 }, no_dest: { x: 200, y: 50 },
      "ch.alpha_0": { x: 100, y: 0 },
      "ch.beta_0": { x: 100, y: 10 },
    });

    // alpha_0 (type=state, baseName="alpha") → matches selector → yes
    const instAlpha: TokenInstance = {
      id: "inst_0", currentElementId: "ch", currentPath: "ch",
      clonedElementIds: ["alpha_0"], clonedRelationshipIds: [],
    };
    const rAlpha = computeExecutionStep(model, vs, [instAlpha], 1, 1, COLOR);
    expect(rAlpha.nextInstances[0].currentElementId).toBe("yes_dest");

    // beta_0 (type=state but baseName="beta") → type matches but name doesn't → no
    const instBeta: TokenInstance = {
      id: "inst_1", currentElementId: "ch", currentPath: "ch",
      clonedElementIds: ["beta_0"], clonedRelationshipIds: [],
    };
    const rBeta = computeExecutionStep(model, vs, [instBeta], 1, 2, COLOR);
    expect(rBeta.nextInstances[0].currentElementId).toBe("no_dest");
  });
});
