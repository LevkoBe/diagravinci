import { describe, it, expect } from "vitest";
import {
  computeExecutionStep,
  applyDeltaToModel,
} from "../../application/ExecutionEngine";
import type { TokenInstance } from "../../application/store/executionSlice";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import CircularLayout from "../../domain/layout/CircularLayout";
import { ExecuteLayout } from "../../domain/layout/ExecuteLayout";

const COLOR = "#f97316";

function parseAndLayout(code: string): {
  model: DiagramModel;
  viewState: ViewState;
} {
  const tokens = new Lexer(code).tokenize();
  const model = new Parser(tokens).parse();
  const viewState = new CircularLayout().apply(model, {
    width: 1000,
    height: 1000,
  });
  return { model, viewState };
}

function execSeq(code: string, expected: string[]): void {
  const { model, viewState } = parseAndLayout(code);
  let currentModel = model;
  let currentVS = viewState;
  let instances: TokenInstance[] = [];
  let instanceId = 0;
  let trackedId: string | null = null;

  for (let tick = 0; tick < expected.length; tick++) {
    const result = computeExecutionStep(
      currentModel,
      currentVS,
      instances,
      tick,
      instanceId,
      COLOR,
    );
    currentModel = applyDeltaToModel(currentModel, result.delta);
    currentVS = new ExecuteLayout().apply(
      currentModel,
      { width: 1000, height: 1000 },
      currentVS,
    );
    instances = result.nextInstances;
    instanceId = result.nextInstanceId;

    if (trackedId === null) {
      const first = instances.find((i) => i.currentPath === expected[tick]);
      expect(
        first,
        `tick ${tick}: no instance at "${expected[tick]}"`,
      ).toBeDefined();
      trackedId = first!.id;
    } else {
      const tracked = instances.find((i) => i.id === trackedId);
      expect(tracked, `tick ${tick}: tracked token lost`).toBeDefined();
      expect(tracked!.currentPath).toBe(expected[tick]);
    }
  }
}

describe("exec: `a() b(c()) d(e(f() g() h())) g() gen(x) ..> a ..> b.c ..> d.e ..> g ..> b ..> d.e.f ..> d.e.g ..> d.e.h`", () => {
  it("token follows the full flow chain", () => {
    execSeq(
      "a() b(c()) d(e(f() g() h())) g() gen(x) ..> a ..> b.c ..> d.e ..> g ..> b ..> d.e.f ..> d.e.g ..> d.e.h",
      [
        "a()",
        "b().c()",
        "d().e()",
        "d().e().f()",
        "d().e().g()",
        "d().e().h()",
        "g()",
        "b()",
        "d().e().f()",
        "d().e().g()",
        "d().e().h()",
      ],
    );
  });
});

describe("exec: `gen(x) ..> a() ..> b(c() ..> d()) ..> e(f(g() ..> h())) ..> c`", () => {
  it("token follows top-level chain; c resolves to b.c", () => {
    execSeq("gen(x) ..> a() ..> b(c ..> d) ..> e(f(g ..> h)) ..> c", [
      "a()",
      "b()",
      "b().c{}",
      "b().d{}",
      "e()",
      "e().f()",
      "e().f().g{}",
      "e().f().h{}",
      "b().c{}",
      "b().d{}",
    ]);
  });
});

describe("exec: `a(o{b}) b() c() gen(x) ..> a ..> c ..> b ..> a.o.b`", () => {
  it("token follows flow chain; a.o.b path resolves correctly", () => {
    execSeq("a(o{b}) b() c() gen(x) ..> a ..> c ..> b ..> a.o.b", [
      "a()",
      "c()",
      "b()",
      "a().o{}.b()",
    ]);
  });
});

describe("exec: `c(b) gen(x) ..> a() ..> b() ..> c.b`", () => {
  it("token follows flow chain; c.b path resolves correctly", () => {
    execSeq("c(b) gen(x) ..> a() ..> b() ..> c.b", ["a()", "b()", "c().b()"]);
  });
});
