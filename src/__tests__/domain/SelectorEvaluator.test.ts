import { describe, it, expect } from "vitest";
import { matchesRule, evaluateSelector } from "../../domain/selector/SelectorEvaluator";
import type { Rule } from "../../domain/models/Selector";

function makeRule(id: string, pathPattern: string, types: string[] = []): Rule {
  if (types.length === 0) return { id, patterns: { all: pathPattern } };
  const patterns: Record<string, string> = {};
  for (const t of types) patterns[t] = pathPattern;
  return { id, patterns };
}

describe("matchesRule", () => {
  it("returns true when path matches regex", () => {
    expect(matchesRule(makeRule("t", "a\\.b"), "a.b", "object")).toBe(true);
  });

  it("returns false when path does not match regex", () => {
    expect(matchesRule(makeRule("t", "^x$"), "a.b", "object")).toBe(false);
  });

  it("empty pattern acts as wildcard", () => {
    expect(matchesRule(makeRule("t", ""), "anything.here", "object")).toBe(true);
  });

  it("'.*' matches any path", () => {
    expect(matchesRule(makeRule("t", ".*"), "a.b.c", "state")).toBe(true);
  });

  it("matches type when type pattern key is specified", () => {
    expect(matchesRule(makeRule("t", ".*", ["object"]), "a", "object")).toBe(true);
  });

  it("rejects wrong element type", () => {
    expect(matchesRule(makeRule("t", ".*", ["state"]), "a", "object")).toBe(false);
  });

  it("accepts any of multiple types", () => {
    expect(matchesRule(makeRule("t", ".*", ["object", "state"]), "a", "state")).toBe(true);
  });

  it("returns false for invalid regex", () => {
    expect(matchesRule(makeRule("t", "[invalid"), "a", "object")).toBe(false);
  });

  it("regex is unanchored: substring match succeeds", () => {
    expect(matchesRule(makeRule("t", "foo"), "prefix.foo.suffix", "object")).toBe(true);
    expect(matchesRule(makeRule("t", "foo"), "foobar", "object")).toBe(true);
  });

  it("anchored pattern ^...$ matches full path only", () => {
    expect(matchesRule(makeRule("t", "^a\\.b$"), "a.b", "object")).toBe(true);
    expect(matchesRule(makeRule("t", "^a\\.b$"), "x.a.b", "object")).toBe(false);
    expect(matchesRule(makeRule("t", "^a\\.b$"), "a.b.c", "object")).toBe(false);
  });

  it("regex is case-sensitive by default", () => {
    expect(matchesRule(makeRule("t", "foo"), "Foo", "object")).toBe(false);
    expect(matchesRule(makeRule("t", "foo"), "foo", "object")).toBe(true);
  });

  it("dot in regex matches any character", () => {
    expect(matchesRule(makeRule("t", "a.b"), "a.b", "object")).toBe(true);
    expect(matchesRule(makeRule("t", "a.b"), "axb", "object")).toBe(true);
    expect(matchesRule(makeRule("t", "a\\.b"), "axb", "object")).toBe(false);
  });

  it("type filtering combined with path matching", () => {
    const rule = makeRule("t", "^svc$", ["function"]);
    expect(matchesRule(rule, "svc", "function")).toBe(true);
    expect(matchesRule(rule, "svc", "object")).toBe(false);
    expect(matchesRule(rule, "other", "function")).toBe(false);
  });

  it("_name suffix matches last path segment (regex)", () => {
    const rule: Rule = { id: "t", patterns: { all_name: "svc" } };
    expect(matchesRule(rule, "a.b.svc", "object")).toBe(true);
    expect(matchesRule(rule, "a.b.other", "object")).toBe(false);
  });

  it("_name suffix with c: prefix does substring contains match", () => {
    const rule: Rule = { id: "t", patterns: { all_name: "c:svc" } };
    expect(matchesRule(rule, "a.b.mysvcthing", "object")).toBe(true);
    expect(matchesRule(rule, "a.b.other", "object")).toBe(false);
  });

  it("_level suffix matches exact depth", () => {
    const rule: Rule = { id: "t", patterns: { all_level: "2" } };
    expect(matchesRule(rule, "a.b", "object")).toBe(true);
    expect(matchesRule(rule, "a", "object")).toBe(false);
    expect(matchesRule(rule, "a.b.c", "object")).toBe(false);
  });

  it("_level range matches inclusive depth range", () => {
    const rule: Rule = { id: "t", patterns: { all_level: "2-4" } };
    expect(matchesRule(rule, "a.b", "object")).toBe(true);
    expect(matchesRule(rule, "a.b.c.d", "object")).toBe(true);
    expect(matchesRule(rule, "a", "object")).toBe(false);
    expect(matchesRule(rule, "a.b.c.d.e", "object")).toBe(false);
  });
});

describe("evaluateSelector", () => {
  it("returns false when formula is empty (flag-only mode)", () => {
    expect(evaluateSelector("", "a.b", "object", [])).toBe(false);
  });

  it("single rule match returns true", () => {
    const rules = [makeRule("r1", "a")];
    expect(evaluateSelector("r1", "a", "object", rules)).toBe(true);
  });

  it("single rule no match returns false", () => {
    const rules = [makeRule("r1", "^b$")];
    expect(evaluateSelector("r1", "a", "object", rules)).toBe(false);
  });

  it("OR with | operator: one match => true", () => {
    const rules = [makeRule("r1", "^a$"), makeRule("r2", "^b$")];
    expect(evaluateSelector("r1 | r2", "a", "object", rules)).toBe(true);
    expect(evaluateSelector("r1 | r2", "b", "object", rules)).toBe(true);
    expect(evaluateSelector("r1 | r2", "c", "object", rules)).toBe(false);
  });

  it("OR with legacy + operator: one match => true (backward compat)", () => {
    const rules = [makeRule("r1", "^a$"), makeRule("r2", "^b$")];
    expect(evaluateSelector("r1 + r2", "a", "object", rules)).toBe(true);
    expect(evaluateSelector("r1 + r2", "b", "object", rules)).toBe(true);
    expect(evaluateSelector("r1 + r2", "c", "object", rules)).toBe(false);
  });

  describe("boolean formulas", () => {
    it("AND (&): both true => true", () => {
      const rules = [makeRule("r1", "a"), makeRule("r2", "b")];
      expect(evaluateSelector("r1 & r2", "ab", "object", rules)).toBe(true);
    });

    it("AND (&): one false => false", () => {
      const rules = [makeRule("r1", "^a$"), makeRule("r2", "^b$")];
      expect(evaluateSelector("r1 & r2", "a", "object", rules)).toBe(false);
    });

    it("NOT (-): negates result", () => {
      const rules = [makeRule("r1", "^a$")];
      expect(evaluateSelector("-r1", "a", "object", rules)).toBe(false);
      expect(evaluateSelector("-r1", "b", "object", rules)).toBe(true);
    });

    it("XOR via (r1 & -r2) | (-r1 & r2): true xor false => true", () => {
      const rules = [makeRule("r1", "^a$"), makeRule("r2", "^b$")];
      expect(evaluateSelector("(r1 & -r2) | (-r1 & r2)", "a", "object", rules)).toBe(true);
    });

    it("XOR via (r1 & -r2) | (-r1 & r2): both true => false", () => {
      const rules = [makeRule("r1", "a"), makeRule("r2", "b")];
      expect(evaluateSelector("(r1 & -r2) | (-r1 & r2)", "ab", "object", rules)).toBe(false);
    });
  });

  describe("edge cases in formula parsing", () => {
    it("unmatched closing paren does not throw and short-circuits to false", () => {
      const rules = [makeRule("r1", "^a$")];
      expect(() => evaluateSelector("r1 & )", "a", "object", rules)).not.toThrow();
      expect(evaluateSelector("r1 & )", "a", "object", rules)).toBe(false);
    });
  });

  describe("complex formula expressions", () => {
    it("(r1 & r2) | r3: short-circuit inside parens does not break outer or", () => {
      const rules = [makeRule("r1", "a"), makeRule("r2", "b"), makeRule("r3", "c")];
      expect(evaluateSelector("(r1 & r2) | r3", "bc", "object", rules)).toBe(true);
      expect(evaluateSelector("(r1 & r2) | r3", "c", "object", rules)).toBe(true);
      expect(evaluateSelector("(r1 & r2) | r3", "ab", "object", rules)).toBe(true);
      expect(evaluateSelector("(r1 & r2) | r3", "x", "object", rules)).toBe(false);
    });

    it("r1 & (r2 | r3): rule1 must be true, plus at least one of r2/r3", () => {
      const rules = [makeRule("r1", "a"), makeRule("r2", "b"), makeRule("r3", "c")];
      expect(evaluateSelector("r1 & (r2 | r3)", "b", "object", rules)).toBe(false);
      expect(evaluateSelector("r1 & (r2 | r3)", "ab", "object", rules)).toBe(true);
      expect(evaluateSelector("r1 & (r2 | r3)", "ac", "object", rules)).toBe(true);
      expect(evaluateSelector("r1 & (r2 | r3)", "a", "object", rules)).toBe(false);
    });

    it("r1 & -r2: true when r1 matches and r2 does not", () => {
      const rules = [makeRule("r1", "^a$"), makeRule("r2", "^b$")];
      expect(evaluateSelector("r1 & -r2", "a", "object", rules)).toBe(true);
      expect(evaluateSelector("r1 & -r2", "b", "object", rules)).toBe(false);
      expect(evaluateSelector("r1 & -r2", "ab", "object", rules)).toBe(false);
      expect(evaluateSelector("r1 & -r2", "x", "object", rules)).toBe(false);
    });

    it("--r1: double negation equals r1", () => {
      const rules = [makeRule("r1", "^a$")];
      expect(evaluateSelector("--r1", "a", "object", rules)).toBe(true);
      expect(evaluateSelector("--r1", "b", "object", rules)).toBe(false);
    });

    it("-(r1 | r2): true only when both are false", () => {
      const rules = [makeRule("r1", "a"), makeRule("r2", "b")];
      expect(evaluateSelector("-(r1 | r2)", "x", "object", rules)).toBe(true);
      expect(evaluateSelector("-(r1 | r2)", "a", "object", rules)).toBe(false);
      expect(evaluateSelector("-(r1 | r2)", "b", "object", rules)).toBe(false);
      expect(evaluateSelector("-(r1 | r2)", "ab", "object", rules)).toBe(false);
    });

    it("r1 & r2 & r3: all must match", () => {
      const rules = [makeRule("r1", "a"), makeRule("r2", "b"), makeRule("r3", "c")];
      expect(evaluateSelector("r1 & r2 & r3", "abc", "object", rules)).toBe(true);
      expect(evaluateSelector("r1 & r2 & r3", "ab", "object", rules)).toBe(false);
      expect(evaluateSelector("r1 & r2 & r3", "ac", "object", rules)).toBe(false);
    });

    it("r1 | r2 | r3: any match suffices", () => {
      const rules = [makeRule("r1", "^a$"), makeRule("r2", "^b$"), makeRule("r3", "^c$")];
      expect(evaluateSelector("r1 | r2 | r3", "a", "object", rules)).toBe(true);
      expect(evaluateSelector("r1 | r2 | r3", "b", "object", rules)).toBe(true);
      expect(evaluateSelector("r1 | r2 | r3", "c", "object", rules)).toBe(true);
      expect(evaluateSelector("r1 | r2 | r3", "x", "object", rules)).toBe(false);
    });

    it("(r1 | r2) & (r3 | r4): nested groups", () => {
      const rules = [makeRule("r1", "a"), makeRule("r2", "b"), makeRule("r3", "c"), makeRule("r4", "d")];
      expect(evaluateSelector("(r1 | r2) & (r3 | r4)", "ac", "object", rules)).toBe(true);
      expect(evaluateSelector("(r1 | r2) & (r3 | r4)", "bd", "object", rules)).toBe(true);
      expect(evaluateSelector("(r1 | r2) & (r3 | r4)", "a", "object", rules)).toBe(false);
      expect(evaluateSelector("(r1 | r2) & (r3 | r4)", "c", "object", rules)).toBe(false);
    });

    it("explicit parentheses override precedence", () => {
      const rules = [makeRule("r1", "a"), makeRule("r2", "b"), makeRule("r3", "c")];
      expect(evaluateSelector("(r1 | r2) & r3", "c", "object", rules)).toBe(false);
      expect(evaluateSelector("r1 | (r2 & r3)", "c", "object", rules)).toBe(false);
      expect(evaluateSelector("(r1 | r2) & r3", "bc", "object", rules)).toBe(true);
      expect(evaluateSelector("r1 | (r2 & r3)", "bc", "object", rules)).toBe(true);
      expect(evaluateSelector("(r1 | r2) & r3", "a", "object", rules)).toBe(false);
      expect(evaluateSelector("r1 | (r2 & r3)", "a", "object", rules)).toBe(true);
    });
  });
});
