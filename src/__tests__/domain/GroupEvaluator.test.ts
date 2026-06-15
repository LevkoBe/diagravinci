import { describe, it, expect } from "vitest";
import { matchesExpr, isA, matchesGroup } from "../../domain/selector/GroupEvaluator";
import { parseGroupExpr } from "../../domain/selector/GroupExprParser";
import type { Group } from "../../domain/models/Selector";
import type { Element } from "../../domain/models/Element";
import { createElement } from "../../domain/models/Element";

function el(id: string, type: Element["type"], childIds: string[] = []): Element {
  const e = createElement(id, type);
  e.childIds = childIds;
  return e;
}

function elements(...els: Element[]): Record<string, Element> {
  return Object.fromEntries(els.map((e) => [e.id, e]));
}

function matches(rule: string, path: string, type: string, elems: Record<string, Element> = {}, groups: Group[] = []): boolean {
  return matchesExpr(parseGroupExpr(rule), path, type, elems, groups);
}

describe("matchesExpr — type matching", () => {
  it("matches object type", () => {
    expect(matches("{}",   "user", "object")).toBe(true);
    expect(matches("{}",   "user", "collection")).toBe(false);
  });

  it("matches collection type", () => {
    expect(matches("[]",   "items", "collection")).toBe(true);
    expect(matches("[]",   "items", "object")).toBe(false);
  });

  it("matches function type", () => {
    expect(matches("()",   "fn", "function")).toBe(true);
  });

  it("matches state type", () => {
    expect(matches("||",   "s", "state")).toBe(true);
  });

  it("matches choice type", () => {
    expect(matches("<>",   "c", "choice")).toBe(true);
  });

  it("matches flow type", () => {
    expect(matches(">>",   "f", "flow")).toBe(true);
  });

  it("? type wildcard matches any type", () => {
    expect(matches("user?", "user", "object")).toBe(true);
    expect(matches("user?", "user", "collection")).toBe(true);
    expect(matches("user?", "user", "state")).toBe(true);
  });
});

describe("matchesExpr — name matching", () => {
  it("literal name matches exactly", () => {
    expect(matches("user{}", "user", "object")).toBe(true);
    expect(matches("user{}", "admin", "object")).toBe(false);
  });

  it("regex name matches pattern", () => {
    expect(matches("'.*Service'{}",  "UserService",  "object")).toBe(true);
    expect(matches("'.*Service'{}",  "UserRepo",     "object")).toBe(false);
  });

  it("? name wildcard matches any name", () => {
    expect(matches("?{}",  "anything",  "object")).toBe(true);
    expect(matches("?{}",  "something", "object")).toBe(true);
  });

  it("no name (omitted) defaults to any-name", () => {
    expect(matches("{}",   "x",         "object")).toBe(true);
    expect(matches("{}",   "y",         "object")).toBe(true);
  });

  it("uses last path segment for name match", () => {
    expect(matches("user{}", "parent.user", "object")).toBe(true);
    expect(matches("user{}", "parent.admin", "object")).toBe(false);
  });
});

describe("matchesExpr — children constraints", () => {
  it("required child must be present", () => {
    const parent = el("user", "object", ["name"]);
    const child  = el("name", "object");
    const elems  = elements(parent, child);
    expect(matches("user{name{}}",  "user", "object",  elems)).toBe(true);
    expect(matches("user{email{}}", "user", "object",  elems)).toBe(false);
  });

  it("all required children must match (AND)", () => {
    const parent = el("user", "object", ["name", "email"]);
    const elems  = elements(parent, el("name", "object"), el("email", "object"));
    expect(matches("user{name{} email{}}",  "user", "object", elems)).toBe(true);
    expect(matches("user{name{} phone{}}",  "user", "object", elems)).toBe(false);
  });

  it("{??} requires at least one child of any type", () => {
    const parent  = el("x", "object", ["child"]);
    const noChild = el("y", "object");
    const elems   = elements(parent, el("child", "object"), noChild);
    expect(matches("?{??}", "x", "object", elems)).toBe(true);
    expect(matches("?{??}", "y", "object", elems)).toBe(false);
  });
});

describe("matchesExpr — boolean operators", () => {
  it("OR: matches if either branch matches", () => {
    expect(matches("user{}/items[]", "user",  "object")).toBe(true);
    expect(matches("user{}/items[]", "items", "collection")).toBe(true);
    expect(matches("user{}/items[]", "other", "state")).toBe(false);
  });

  it("AND: matches only if both branches match", () => {
    expect(matches("?{}&'.*Service'{}",  "UserService", "object")).toBe(true);
    expect(matches("?{}&'.*Service'{}",  "UserRepo",    "object")).toBe(false);
  });

  it("NOT: inverts the match", () => {
    expect(matches("-user{}",  "user",  "object")).toBe(false);
    expect(matches("-user{}",  "admin", "object")).toBe(true);
  });
});

describe("matchesExpr — $level", () => {
  it("matches depth equal to level", () => {
    expect(matches("$level=2",   "a.b",     "object")).toBe(true);
    expect(matches("$level=2",   "a.b.c",   "object")).toBe(false);
  });

  it("matches depth within range", () => {
    expect(matches("$level=2-4",  "a.b",     "object")).toBe(true);
    expect(matches("$level=2-4",  "a.b.c",   "object")).toBe(true);
    expect(matches("$level=2-4",  "a.b.c.d", "object")).toBe(true);
    expect(matches("$level=2-4",  "a",       "object")).toBe(false);
    expect(matches("$level=2-4",  "a.b.c.d.e", "object")).toBe(false);
  });
});

describe("matchesExpr — $ref", () => {
  it("resolves group references", () => {
    const groups: Group[] = [
      { id: "services", label: "Services", rule: "'.*Service'{}", color: "#fff" },
    ];
    expect(matchesExpr(parseGroupExpr("$services"), "UserService", "object", {}, groups)).toBe(true);
    expect(matchesExpr(parseGroupExpr("$services"), "UserRepo",    "object", {}, groups)).toBe(false);
  });

  it("returns false for unknown group ref", () => {
    expect(matchesExpr(parseGroupExpr("$unknown"), "x", "object", {}, [])).toBe(false);
  });
});

describe("matchesGroup", () => {
  it("evaluates the rule expression", () => {
    const group: Group = { id: "g", label: "G", rule: "user{}", color: "#fff" };
    expect(matchesGroup(group, "user",  "object", {}, [])).toBe(true);
    expect(matchesGroup(group, "admin", "object", {}, [])).toBe(false);
  });

  it("returns false for an empty rule", () => {
    const group: Group = { id: "g", label: "G", rule: "", color: "#fff" };
    expect(matchesGroup(group, "a", "object", {}, [])).toBe(false);
  });
});

describe("isA — structural subsumption", () => {
  it("any-name any-type general subsumes everything", () => {
    expect(isA(parseGroupExpr("user{}"),  parseGroupExpr("??"))).toBe(true);
    expect(isA(parseGroupExpr("?[]"),     parseGroupExpr("??"))).toBe(true);
  });

  it("same type: specific literal name is subsumed by any-name general", () => {
    expect(isA(parseGroupExpr("user{}"),  parseGroupExpr("?{}"))).toBe(true);
  });

  it("type mismatch: not subsumed", () => {
    expect(isA(parseGroupExpr("user{}"),  parseGroupExpr("user[]"))).toBe(false);
  });

  it("same literal name: subsumed by same name", () => {
    expect(isA(parseGroupExpr("user{}"),  parseGroupExpr("user{}"))).toBe(true);
  });

  it("different literal names: not subsumed", () => {
    expect(isA(parseGroupExpr("user{}"),  parseGroupExpr("admin{}"))).toBe(false);
  });

  it("regex general: conservative false (undecidable)", () => {
    expect(isA(parseGroupExpr("user{}"),  parseGroupExpr("'.*'{}") )).toBe(false);
  });

  it("children: specific with more children subsumed by general with fewer", () => {
    // user{name email} isA user{name} → true (specific has all of general's children)
    expect(isA(parseGroupExpr("user{name{} email{}}"), parseGroupExpr("user{name{}}"))).toBe(true);
  });

  it("children: general requires child that specific lacks → not subsumed", () => {
    expect(isA(parseGroupExpr("user{name{}}"), parseGroupExpr("user{name{} email{}}"))).toBe(false);
  });

  it("OR specific: both branches must be subsumed by general", () => {
    expect(isA(parseGroupExpr("user{}/admin{}"), parseGroupExpr("?{}"))).toBe(true);
    expect(isA(parseGroupExpr("user{}/items[]"), parseGroupExpr("?{}"))).toBe(false);
  });
});
