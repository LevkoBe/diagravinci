import { describe, it, expect } from "vitest";
import {
  matchesAtom,
  evaluateSelector,
} from "../../domain/selector/SelectorEvaluator";
import type { Selector, SelectorAtom } from "../../domain/models/Selector";

function makeAtom(path: string, types: string[] = []): SelectorAtom {
  return {
    id: "test",
    path,
    types: types as SelectorAtom["types"],
    meta: { kind: "raw" },
  };
}

function makeSelector(atoms: SelectorAtom[], combiner = ""): Selector {
  return { atoms, combiner };
}

describe("matchesAtom", () => {
  it("returns true when path matches regex and types is empty", () => {
    expect(matchesAtom(makeAtom("a\\.b"), "a.b", "object")).toBe(true);
  });

  it("returns false when path does not match regex", () => {
    expect(matchesAtom(makeAtom("^x$"), "a.b", "object")).toBe(false);
  });

  it("empty path acts as wildcard (.*)", () => {
    expect(matchesAtom(makeAtom(""), "anything.here", "object")).toBe(true);
  });

  it("* path acts as wildcard", () => {
    expect(matchesAtom(makeAtom("*"), "a.b.c", "state")).toBe(true);
  });

  it("matches type when atom.types is specified", () => {
    expect(matchesAtom(makeAtom(".*", ["object"]), "a", "object")).toBe(true);
  });

  it("rejects wrong type", () => {
    expect(matchesAtom(makeAtom(".*", ["state"]), "a", "object")).toBe(false);
  });

  it("accepts any of multiple types", () => {
    expect(matchesAtom(makeAtom(".*", ["object", "state"]), "a", "state")).toBe(
      true,
    );
  });

  it("returns false for invalid regex", () => {
    expect(matchesAtom(makeAtom("[invalid"), "a", "object")).toBe(false);
  });
});

describe("evaluateSelector", () => {
  it("returns true when selector has no atoms", () => {
    expect(evaluateSelector(makeSelector([]), "a.b", "object")).toBe(true);
  });

  it("single atom match returns true", () => {
    const sel = makeSelector([makeAtom("a")]);
    expect(evaluateSelector(sel, "a", "object")).toBe(true);
  });

  it("single atom no match returns false", () => {
    const sel = makeSelector([makeAtom("^b$")]);
    expect(evaluateSelector(sel, "a", "object")).toBe(false);
  });

  it("two atoms with default OR combiner: one match => true", () => {
    const sel = makeSelector([makeAtom("^a$"), makeAtom("^b$")]);
    expect(evaluateSelector(sel, "a", "object")).toBe(true);
    expect(evaluateSelector(sel, "b", "object")).toBe(true);
    expect(evaluateSelector(sel, "c", "object")).toBe(false);
  });

  describe("boolean combiners", () => {
    it("AND: both true => true", () => {
      const sel = makeSelector([makeAtom("a"), makeAtom("b")], "1 and 2");
      expect(evaluateSelector(sel, "ab", "object")).toBe(true);
    });

    it("AND: one false => false", () => {
      const sel = makeSelector([makeAtom("^a$"), makeAtom("^b$")], "1 and 2");
      expect(evaluateSelector(sel, "a", "object")).toBe(false);
    });

    it("OR: one true => true", () => {
      const sel = makeSelector([makeAtom("^a$"), makeAtom("^b$")], "1 or 2");
      expect(evaluateSelector(sel, "a", "object")).toBe(true);
    });

    it("NOT: negates result", () => {
      const sel = makeSelector([makeAtom("^a$")], "not 1");
      expect(evaluateSelector(sel, "a", "object")).toBe(false);
      expect(evaluateSelector(sel, "b", "object")).toBe(true);
    });

    it("XOR: true xor false => true", () => {
      const sel = makeSelector([makeAtom("^a$"), makeAtom("^b$")], "1 xor 2");
      expect(evaluateSelector(sel, "a", "object")).toBe(true);
    });

    it("XOR: both true => false", () => {
      const sel = makeSelector([makeAtom("a"), makeAtom("b")], "1 xor 2");
      expect(evaluateSelector(sel, "ab", "object")).toBe(false);
    });
  });
});
