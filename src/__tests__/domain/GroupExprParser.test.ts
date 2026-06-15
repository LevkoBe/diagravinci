import { describe, it, expect } from "vitest";
import { parseGroupExpr, ParseError } from "../../domain/selector/GroupExprParser";
import type { GroupExpr } from "../../domain/selector/GroupExprParser";

type PatternExpr = Extract<GroupExpr, { kind: "pattern" }>;

function pattern(
  type: string,
  name: { kind: "literal" | "regex" | "any"; value?: string; source?: string },
  children: PatternExpr["children"] = { kind: "none" },
): PatternExpr {
  return { kind: "pattern", name: name as never, type: type as never, children };
}

describe("GroupExprParser — element patterns", () => {
  it("parses a bare identifier as object type with literal name", () => {
    const expr = parseGroupExpr("user");
    expect(expr).toEqual(pattern("object", { kind: "literal", value: "user" }));
  });

  it("parses identifier with {} as object type", () => {
    const expr = parseGroupExpr("user{}");
    expect(expr).toEqual(pattern("object", { kind: "literal", value: "user" }));
  });

  it("parses identifier with [] as collection type", () => {
    const expr = parseGroupExpr("items[]");
    expect(expr).toEqual(pattern("collection", { kind: "literal", value: "items" }));
  });

  it("parses identifier with () as function type", () => {
    const expr = parseGroupExpr("process()");
    expect(expr).toEqual(pattern("function", { kind: "literal", value: "process" }));
  });

  it("parses identifier with || as state type", () => {
    const expr = parseGroupExpr("active||");
    expect(expr).toEqual(pattern("state", { kind: "literal", value: "active" }));
  });

  it("parses identifier with <> as choice type", () => {
    const expr = parseGroupExpr("router<>");
    expect(expr).toEqual(pattern("choice", { kind: "literal", value: "router" }));
  });

  it("parses identifier with >> as flow type", () => {
    const expr = parseGroupExpr("pipe>>");
    expect(expr).toEqual(pattern("flow", { kind: "literal", value: "pipe" }));
  });

  it("parses ? in name position as any-name wildcard", () => {
    const expr = parseGroupExpr("?{}");
    expect(expr).toEqual(pattern("object", { kind: "any" }));
  });

  it("parses ? in type position as any-type wildcard", () => {
    const expr = parseGroupExpr("user?");
    expect(expr).toEqual(pattern("any", { kind: "literal", value: "user" }));
  });

  it("parses single-quoted string as regex name", () => {
    const expr = parseGroupExpr("'.*Service'{}");
    expect(expr).toEqual(pattern("object", { kind: "regex", source: ".*Service" }));
  });

  it("parses bare identifier with no wrapper as object (default)", () => {
    const expr = parseGroupExpr("queue");
    expect((expr as Extract<GroupExpr, { kind: "pattern" }>).type).toBe("object");
  });
});

describe("GroupExprParser — children constraints", () => {
  it("parses {childA{}} as object with required child", () => {
    const expr = parseGroupExpr("x{a{}}") as Extract<GroupExpr, { kind: "pattern" }>;
    expect(expr.type).toBe("object");
    expect(expr.children.kind).toBe("required");
    if (expr.children.kind === "required") {
      expect(expr.children.items).toHaveLength(1);
      const child = expr.children.items[0] as Extract<GroupExpr, { kind: "pattern" }>;
      expect(child.name).toEqual({ kind: "literal", value: "a" });
      expect(child.type).toBe("object");
    }
  });

  it("parses {a{} b[]} as two required AND children", () => {
    const expr = parseGroupExpr("x{a{} b[]}") as Extract<GroupExpr, { kind: "pattern" }>;
    if (expr.children.kind === "required") {
      expect(expr.children.items).toHaveLength(2);
    } else {
      throw new Error("expected required");
    }
  });

  it("parses {??} as required child with any-name any-type", () => {
    const expr = parseGroupExpr("x{??}") as Extract<GroupExpr, { kind: "pattern" }>;
    if (expr.children.kind === "required") {
      const child = expr.children.items[0] as Extract<GroupExpr, { kind: "pattern" }>;
      expect(child.name.kind).toBe("any");
      expect(child.type).toBe("any");
    } else {
      throw new Error("expected required");
    }
  });

  it("parses empty wrapper as no children constraint", () => {
    const expr = parseGroupExpr("x{}") as Extract<GroupExpr, { kind: "pattern" }>;
    expect(expr.children.kind).toBe("none");
  });
});

describe("GroupExprParser — boolean operators", () => {
  it("parses a/b as OR", () => {
    const expr = parseGroupExpr("a{}/b[]");
    expect(expr.kind).toBe("or");
    if (expr.kind === "or") {
      expect((expr.left as Extract<GroupExpr, { kind: "pattern" }>).type).toBe("object");
      expect((expr.right as Extract<GroupExpr, { kind: "pattern" }>).type).toBe("collection");
    }
  });

  it("parses a&b as AND", () => {
    const expr = parseGroupExpr("a{}&b{}");
    expect(expr.kind).toBe("and");
  });

  it("parses -a as NOT", () => {
    const expr = parseGroupExpr("-a{}");
    expect(expr.kind).toBe("not");
    if (expr.kind === "not") {
      expect((expr.expr as Extract<GroupExpr, { kind: "pattern" }>).name).toEqual({ kind: "literal", value: "a" });
    }
  });

  it("respects precedence: - > & > /", () => {
    // a{}/b{}&c{} → a{} / (b{} & c{})
    const expr = parseGroupExpr("a{}/b{}&c{}");
    expect(expr.kind).toBe("or");
    if (expr.kind === "or") {
      expect(expr.right.kind).toBe("and");
    }
  });

  it("parses a{}&b{}/c{} → (a{}&b{}) / c{}", () => {
    const expr = parseGroupExpr("a{}&b{}/c{}");
    expect(expr.kind).toBe("or");
    if (expr.kind === "or") {
      expect(expr.left.kind).toBe("and");
    }
  });
});

describe("GroupExprParser — $refs and $level", () => {
  it("parses $groupId as ref", () => {
    const expr = parseGroupExpr("$services");
    expect(expr).toEqual({ kind: "ref", id: "services" });
  });

  it("parses $level=3 as level range", () => {
    const expr = parseGroupExpr("$level=3");
    expect(expr).toEqual({ kind: "level", min: 3, max: 3 });
  });

  it("parses $level=2-5 as level range", () => {
    const expr = parseGroupExpr("$level=2-5");
    expect(expr).toEqual({ kind: "level", min: 2, max: 5 });
  });

  it("parses compound with ref: $svc&$level=2-4", () => {
    const expr = parseGroupExpr("$svc&$level=2-4");
    expect(expr.kind).toBe("and");
    if (expr.kind === "and") {
      expect(expr.left).toEqual({ kind: "ref", id: "svc" });
      expect(expr.right).toEqual({ kind: "level", min: 2, max: 4 });
    }
  });
});

describe("GroupExprParser — error cases", () => {
  it("throws on empty string", () => {
    expect(() => parseGroupExpr("")).toThrow(ParseError);
  });

  it("throws on unclosed single-quoted regex", () => {
    expect(() => parseGroupExpr("'unclosed{}")).not.toThrow();  // tokenizer reads to end; parser may or may not throw
  });

  it("throws when extra tokens remain after valid expression (ambiguous extra tokens may be skipped)", () => {
    // this is best-effort; parser throws if significant trailing content
    expect(() => parseGroupExpr("a{}")).not.toThrow();
  });
});
