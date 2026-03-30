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

  it("regex is unanchored: substring match succeeds", () => {
    expect(matchesAtom(makeAtom("foo"), "prefix.foo.suffix", "object")).toBe(
      true,
    );
    expect(matchesAtom(makeAtom("foo"), "foobar", "object")).toBe(true);
  });

  it("anchored pattern ^...$ matches full path only", () => {
    expect(matchesAtom(makeAtom("^a\\.b$"), "a.b", "object")).toBe(true);
    expect(matchesAtom(makeAtom("^a\\.b$"), "x.a.b", "object")).toBe(false);
    expect(matchesAtom(makeAtom("^a\\.b$"), "a.b.c", "object")).toBe(false);
  });

  it("regex is case-sensitive by default", () => {
    expect(matchesAtom(makeAtom("foo"), "Foo", "object")).toBe(false);
    expect(matchesAtom(makeAtom("foo"), "foo", "object")).toBe(true);
  });

  it("dot in regex matches any character", () => {
    expect(matchesAtom(makeAtom("a.b"), "a.b", "object")).toBe(true);
    expect(matchesAtom(makeAtom("a.b"), "axb", "object")).toBe(true);

    expect(matchesAtom(makeAtom("a\\.b"), "axb", "object")).toBe(false);
  });

  it("type filtering combined with path matching", () => {
    const atom = makeAtom("^svc$", ["function"]);
    expect(matchesAtom(atom, "svc", "function")).toBe(true);
    expect(matchesAtom(atom, "svc", "object")).toBe(false);
    expect(matchesAtom(atom, "other", "function")).toBe(false);
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

  describe("complex combiner expressions", () => {
    it("(1 and 2) or 3: short-circuit inside parens must not break outer or", () => {
      const sel = makeSelector(
        [makeAtom("a"), makeAtom("b"), makeAtom("c")],
        "(1 and 2) or 3",
      );

      expect(evaluateSelector(sel, "bc", "object")).toBe(true);

      expect(evaluateSelector(sel, "c", "object")).toBe(true);

      expect(evaluateSelector(sel, "ab", "object")).toBe(true);

      expect(evaluateSelector(sel, "x", "object")).toBe(false);
    });

    it("1 and (2 or 3): atom1 must be true, plus at least one of atom2/atom3", () => {
      const sel = makeSelector(
        [makeAtom("a"), makeAtom("b"), makeAtom("c")],
        "1 and (2 or 3)",
      );
      expect(evaluateSelector(sel, "b", "object")).toBe(false);
      expect(evaluateSelector(sel, "ab", "object")).toBe(true);
      expect(evaluateSelector(sel, "ac", "object")).toBe(true);
      expect(evaluateSelector(sel, "a", "object")).toBe(false);
    });

    it("1 and not 2: true when 1 matches and 2 does not", () => {
      const sel = makeSelector(
        [makeAtom("^a$"), makeAtom("^b$")],
        "1 and not 2",
      );
      expect(evaluateSelector(sel, "a", "object")).toBe(true);
      expect(evaluateSelector(sel, "b", "object")).toBe(false);
      expect(evaluateSelector(sel, "ab", "object")).toBe(false);
      expect(evaluateSelector(sel, "x", "object")).toBe(false);
    });

    it("not 1 and 2: applies not before and", () => {
      const sel = makeSelector(
        [makeAtom("^a$"), makeAtom("^b$")],
        "not 1 and 2",
      );

      expect(evaluateSelector(sel, "b", "object")).toBe(true);
      expect(evaluateSelector(sel, "a", "object")).toBe(false);
      expect(evaluateSelector(sel, "ab", "object")).toBe(false);
    });

    it("not not 1: double negation equals 1", () => {
      const sel = makeSelector([makeAtom("^a$")], "not not 1");
      expect(evaluateSelector(sel, "a", "object")).toBe(true);
      expect(evaluateSelector(sel, "b", "object")).toBe(false);
    });

    it("not (1 or 2): true only when both are false", () => {
      const sel = makeSelector([makeAtom("a"), makeAtom("b")], "not (1 or 2)");
      expect(evaluateSelector(sel, "x", "object")).toBe(true);
      expect(evaluateSelector(sel, "a", "object")).toBe(false);
      expect(evaluateSelector(sel, "b", "object")).toBe(false);
      expect(evaluateSelector(sel, "ab", "object")).toBe(false);
    });

    it("1 and 2 and 3: all must match", () => {
      const sel = makeSelector(
        [makeAtom("a"), makeAtom("b"), makeAtom("c")],
        "1 and 2 and 3",
      );
      expect(evaluateSelector(sel, "abc", "object")).toBe(true);
      expect(evaluateSelector(sel, "ab", "object")).toBe(false);
      expect(evaluateSelector(sel, "ac", "object")).toBe(false);
    });

    it("1 or 2 or 3: any match suffices", () => {
      const sel = makeSelector(
        [makeAtom("^a$"), makeAtom("^b$"), makeAtom("^c$")],
        "1 or 2 or 3",
      );
      expect(evaluateSelector(sel, "a", "object")).toBe(true);
      expect(evaluateSelector(sel, "b", "object")).toBe(true);
      expect(evaluateSelector(sel, "c", "object")).toBe(true);
      expect(evaluateSelector(sel, "x", "object")).toBe(false);
    });

    it("(1 or 2) and (3 or 4): nested groups", () => {
      const sel = makeSelector(
        [makeAtom("a"), makeAtom("b"), makeAtom("c"), makeAtom("d")],
        "(1 or 2) and (3 or 4)",
      );
      expect(evaluateSelector(sel, "ac", "object")).toBe(true);
      expect(evaluateSelector(sel, "bd", "object")).toBe(true);
      expect(evaluateSelector(sel, "a", "object")).toBe(false);
      expect(evaluateSelector(sel, "c", "object")).toBe(false);
    });

    it("explicit parentheses override precedence", () => {
      const selOr = makeSelector(
        [makeAtom("a"), makeAtom("b"), makeAtom("c")],
        "(1 or 2) and 3",
      );
      const selAnd = makeSelector(
        [makeAtom("a"), makeAtom("b"), makeAtom("c")],
        "1 or (2 and 3)",
      );

      expect(evaluateSelector(selOr, "c", "object")).toBe(false);
      expect(evaluateSelector(selAnd, "c", "object")).toBe(false);

      expect(evaluateSelector(selOr, "bc", "object")).toBe(true);
      expect(evaluateSelector(selAnd, "bc", "object")).toBe(true);

      expect(evaluateSelector(selOr, "a", "object")).toBe(false);
      expect(evaluateSelector(selAnd, "a", "object")).toBe(true);
    });
  });
});
