import { describe, it, expect } from "vitest";
import {
  matchesAtom,
  evaluateSelector,
} from "../../domain/selector/SelectorEvaluator";
import type { SelectorAtom } from "../../domain/models/Selector";

function makeAtom(id: string, pathPattern: string, types: string[] = []): SelectorAtom {
  if (types.length === 0) return { id, patterns: { all: pathPattern } };
  const patterns: Record<string, string> = {};
  for (const t of types) patterns[t] = pathPattern;
  return { id, patterns };
}

describe("matchesAtom", () => {
  it("returns true when path matches regex", () => {
    expect(matchesAtom(makeAtom("t", "a\\.b"), "a.b", "object")).toBe(true);
  });

  it("returns false when path does not match regex", () => {
    expect(matchesAtom(makeAtom("t", "^x$"), "a.b", "object")).toBe(false);
  });

  it("empty pattern acts as wildcard", () => {
    expect(matchesAtom(makeAtom("t", ""), "anything.here", "object")).toBe(true);
  });

  it("'.*' matches any path", () => {
    expect(matchesAtom(makeAtom("t", ".*"), "a.b.c", "state")).toBe(true);
  });

  it("matches type when type pattern key is specified", () => {
    expect(matchesAtom(makeAtom("t", ".*", ["object"]), "a", "object")).toBe(true);
  });

  it("rejects wrong element type", () => {
    expect(matchesAtom(makeAtom("t", ".*", ["state"]), "a", "object")).toBe(false);
  });

  it("accepts any of multiple types", () => {
    expect(matchesAtom(makeAtom("t", ".*", ["object", "state"]), "a", "state")).toBe(true);
  });

  it("returns false for invalid regex", () => {
    expect(matchesAtom(makeAtom("t", "[invalid"), "a", "object")).toBe(false);
  });

  it("regex is unanchored: substring match succeeds", () => {
    expect(matchesAtom(makeAtom("t", "foo"), "prefix.foo.suffix", "object")).toBe(true);
    expect(matchesAtom(makeAtom("t", "foo"), "foobar", "object")).toBe(true);
  });

  it("anchored pattern ^...$ matches full path only", () => {
    expect(matchesAtom(makeAtom("t", "^a\\.b$"), "a.b", "object")).toBe(true);
    expect(matchesAtom(makeAtom("t", "^a\\.b$"), "x.a.b", "object")).toBe(false);
    expect(matchesAtom(makeAtom("t", "^a\\.b$"), "a.b.c", "object")).toBe(false);
  });

  it("regex is case-sensitive by default", () => {
    expect(matchesAtom(makeAtom("t", "foo"), "Foo", "object")).toBe(false);
    expect(matchesAtom(makeAtom("t", "foo"), "foo", "object")).toBe(true);
  });

  it("dot in regex matches any character", () => {
    expect(matchesAtom(makeAtom("t", "a.b"), "a.b", "object")).toBe(true);
    expect(matchesAtom(makeAtom("t", "a.b"), "axb", "object")).toBe(true);
    expect(matchesAtom(makeAtom("t", "a\\.b"), "axb", "object")).toBe(false);
  });

  it("type filtering combined with path matching", () => {
    const atom = makeAtom("t", "^svc$", ["function"]);
    expect(matchesAtom(atom, "svc", "function")).toBe(true);
    expect(matchesAtom(atom, "svc", "object")).toBe(false);
    expect(matchesAtom(atom, "other", "function")).toBe(false);
  });

  it("_name suffix matches last path segment", () => {
    const atom: SelectorAtom = { id: "t", patterns: { "all_name": "svc" } };
    expect(matchesAtom(atom, "a.b.svc", "object")).toBe(true);
    expect(matchesAtom(atom, "a.b.other", "object")).toBe(false);
  });

  it("_level suffix matches exact depth", () => {
    const atom: SelectorAtom = { id: "t", patterns: { "all_level": "2" } };
    expect(matchesAtom(atom, "a.b", "object")).toBe(true);
    expect(matchesAtom(atom, "a", "object")).toBe(false);
    expect(matchesAtom(atom, "a.b.c", "object")).toBe(false);
  });

  it("_level range matches inclusive depth range", () => {
    const atom: SelectorAtom = { id: "t", patterns: { "all_level": "2-4" } };
    expect(matchesAtom(atom, "a.b", "object")).toBe(true);
    expect(matchesAtom(atom, "a.b.c.d", "object")).toBe(true);
    expect(matchesAtom(atom, "a", "object")).toBe(false);
    expect(matchesAtom(atom, "a.b.c.d.e", "object")).toBe(false);
  });
});

describe("evaluateSelector", () => {
  it("returns false when combiner is empty (flag-only mode)", () => {
    expect(evaluateSelector({ combiner: "" }, "a.b", "object", [])).toBe(false);
  });

  it("single atom match returns true", () => {
    const atoms = [makeAtom("1", "a")];
    expect(evaluateSelector({ combiner: "1" }, "a", "object", atoms)).toBe(true);
  });

  it("single atom no match returns false", () => {
    const atoms = [makeAtom("1", "^b$")];
    expect(evaluateSelector({ combiner: "1" }, "a", "object", atoms)).toBe(false);
  });

  it("OR combiner: one match => true", () => {
    const atoms = [makeAtom("1", "^a$"), makeAtom("2", "^b$")];
    expect(evaluateSelector({ combiner: "1 + 2" }, "a", "object", atoms)).toBe(true);
    expect(evaluateSelector({ combiner: "1 + 2" }, "b", "object", atoms)).toBe(true);
    expect(evaluateSelector({ combiner: "1 + 2" }, "c", "object", atoms)).toBe(false);
  });

  it("atom can be referenced by name", () => {
    const atoms = [{ id: "1", name: "myAtom", patterns: { all: "^a$" } }];
    expect(evaluateSelector({ combiner: "myAtom" }, "a", "object", atoms)).toBe(true);
    expect(evaluateSelector({ combiner: "myAtom" }, "b", "object", atoms)).toBe(false);
  });

  describe("boolean combiners", () => {
    it("AND (&): both true => true", () => {
      const atoms = [makeAtom("1", "a"), makeAtom("2", "b")];
      expect(evaluateSelector({ combiner: "1 & 2" }, "ab", "object", atoms)).toBe(true);
    });

    it("AND (&): one false => false", () => {
      const atoms = [makeAtom("1", "^a$"), makeAtom("2", "^b$")];
      expect(evaluateSelector({ combiner: "1 & 2" }, "a", "object", atoms)).toBe(false);
    });

    it("OR (+): one true => true", () => {
      const atoms = [makeAtom("1", "^a$"), makeAtom("2", "^b$")];
      expect(evaluateSelector({ combiner: "1 + 2" }, "a", "object", atoms)).toBe(true);
    });

    it("NOT (-): negates result", () => {
      const atoms = [makeAtom("1", "^a$")];
      expect(evaluateSelector({ combiner: "-1" }, "a", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "-1" }, "b", "object", atoms)).toBe(true);
    });

    it("XOR via (1 & -2) + (-1 & 2): true xor false => true", () => {
      const atoms = [makeAtom("1", "^a$"), makeAtom("2", "^b$")];
      expect(evaluateSelector({ combiner: "(1 & -2) + (-1 & 2)" }, "a", "object", atoms)).toBe(true);
    });

    it("XOR via (1 & -2) + (-1 & 2): both true => false", () => {
      const atoms = [makeAtom("1", "a"), makeAtom("2", "b")];
      expect(evaluateSelector({ combiner: "(1 & -2) + (-1 & 2)" }, "ab", "object", atoms)).toBe(false);
    });
  });

  describe("edge cases in combiner parsing", () => {
    it("unmatched closing paren does not throw and short-circuits to false", () => {
      const atoms = [makeAtom("1", "^a$")];
      expect(() => evaluateSelector({ combiner: "1 & )" }, "a", "object", atoms)).not.toThrow();
      expect(evaluateSelector({ combiner: "1 & )" }, "a", "object", atoms)).toBe(false);
    });
  });

  describe("complex combiner expressions", () => {
    it("(1 & 2) + 3: short-circuit inside parens does not break outer or", () => {
      const atoms = [makeAtom("1", "a"), makeAtom("2", "b"), makeAtom("3", "c")];
      expect(evaluateSelector({ combiner: "(1 & 2) + 3" }, "bc", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "(1 & 2) + 3" }, "c", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "(1 & 2) + 3" }, "ab", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "(1 & 2) + 3" }, "x", "object", atoms)).toBe(false);
    });

    it("1 & (2 + 3): atom1 must be true, plus at least one of atom2/atom3", () => {
      const atoms = [makeAtom("1", "a"), makeAtom("2", "b"), makeAtom("3", "c")];
      expect(evaluateSelector({ combiner: "1 & (2 + 3)" }, "b", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "1 & (2 + 3)" }, "ab", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "1 & (2 + 3)" }, "ac", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "1 & (2 + 3)" }, "a", "object", atoms)).toBe(false);
    });

    it("1 & -2: true when 1 matches and 2 does not", () => {
      const atoms = [makeAtom("1", "^a$"), makeAtom("2", "^b$")];
      expect(evaluateSelector({ combiner: "1 & -2" }, "a", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "1 & -2" }, "b", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "1 & -2" }, "ab", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "1 & -2" }, "x", "object", atoms)).toBe(false);
    });

    it("-1 & 2: not has higher precedence than and", () => {
      const atoms = [makeAtom("1", "^a$"), makeAtom("2", "^b$")];
      expect(evaluateSelector({ combiner: "-1 & 2" }, "b", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "-1 & 2" }, "a", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "-1 & 2" }, "ab", "object", atoms)).toBe(false);
    });

    it("--1: double negation equals 1", () => {
      const atoms = [makeAtom("1", "^a$")];
      expect(evaluateSelector({ combiner: "--1" }, "a", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "--1" }, "b", "object", atoms)).toBe(false);
    });

    it("-(1 + 2): true only when both are false", () => {
      const atoms = [makeAtom("1", "a"), makeAtom("2", "b")];
      expect(evaluateSelector({ combiner: "-(1 + 2)" }, "x", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "-(1 + 2)" }, "a", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "-(1 + 2)" }, "b", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "-(1 + 2)" }, "ab", "object", atoms)).toBe(false);
    });

    it("1 & 2 & 3: all must match", () => {
      const atoms = [makeAtom("1", "a"), makeAtom("2", "b"), makeAtom("3", "c")];
      expect(evaluateSelector({ combiner: "1 & 2 & 3" }, "abc", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "1 & 2 & 3" }, "ab", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "1 & 2 & 3" }, "ac", "object", atoms)).toBe(false);
    });

    it("1 + 2 + 3: any match suffices", () => {
      const atoms = [makeAtom("1", "^a$"), makeAtom("2", "^b$"), makeAtom("3", "^c$")];
      expect(evaluateSelector({ combiner: "1 + 2 + 3" }, "a", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "1 + 2 + 3" }, "b", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "1 + 2 + 3" }, "c", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "1 + 2 + 3" }, "x", "object", atoms)).toBe(false);
    });

    it("(1 + 2) & (3 + 4): nested groups", () => {
      const atoms = [makeAtom("1", "a"), makeAtom("2", "b"), makeAtom("3", "c"), makeAtom("4", "d")];
      expect(evaluateSelector({ combiner: "(1 + 2) & (3 + 4)" }, "ac", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "(1 + 2) & (3 + 4)" }, "bd", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "(1 + 2) & (3 + 4)" }, "a", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "(1 + 2) & (3 + 4)" }, "c", "object", atoms)).toBe(false);
    });

    it("explicit parentheses override precedence", () => {
      const atoms = [makeAtom("1", "a"), makeAtom("2", "b"), makeAtom("3", "c")];
      // (1 + 2) & 3 vs 1 + (2 & 3)
      expect(evaluateSelector({ combiner: "(1 + 2) & 3" }, "c", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "1 + (2 & 3)" }, "c", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "(1 + 2) & 3" }, "bc", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "1 + (2 & 3)" }, "bc", "object", atoms)).toBe(true);
      expect(evaluateSelector({ combiner: "(1 + 2) & 3" }, "a", "object", atoms)).toBe(false);
      expect(evaluateSelector({ combiner: "1 + (2 & 3)" }, "a", "object", atoms)).toBe(true);
    });
  });
});
