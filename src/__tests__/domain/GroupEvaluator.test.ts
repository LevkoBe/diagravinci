import { describe, it, expect, beforeAll } from "vitest";
import { matchesGroup } from "../../domain/selector/GroupEvaluator";
import type { Group } from "../../domain/models/Selector";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";

function parse(code: string) {
  return new Parser(new Lexer(code).tokenize()).parse();
}

function grp(rule: string): Group {
  return { id: "g", regex: rule, color: "#fff" };
}

describe("matchesGroup — type wrapper matching", () => {
  it("matches object type wrapper", () => {
    expect(matchesGroup(grp(".*{}"), "user{}")).toBe(true);
    expect(matchesGroup(grp(".*{}"), "user[]")).toBe(false);
  });

  it("matches collection type wrapper", () => {
    expect(matchesGroup(grp(".*[]"), "items[]")).toBe(true);
    expect(matchesGroup(grp(".*[]"), "items{}")).toBe(false);
  });

  it("matches function type wrapper", () => {
    expect(matchesGroup(grp(".*()"), "fn()")).toBe(true);
    expect(matchesGroup(grp(".*()"), "fn{}")).toBe(false);
  });

  it("matches state type wrapper", () => {
    expect(matchesGroup(grp(".*\\|\\|"), "active||")).toBe(true);
    expect(matchesGroup(grp(".*\\|\\|"), "active{}")).toBe(false);
  });

  it("matches choice type wrapper with <> literally", () => {
    expect(matchesGroup(grp("gate<>"), "gate<>")).toBe(true);
    expect(matchesGroup(grp("gate<>"), "gate{}")).toBe(false);
  });

  it("matches flow type wrapper with >> literally", () => {
    expect(matchesGroup(grp("data>>"), "data>>")).toBe(true);
    expect(matchesGroup(grp("data>>"), "data{}")).toBe(false);
  });
});

describe("matchesGroup — name matching in paths", () => {
  it("matches exact name", () => {
    expect(matchesGroup(grp("user{}"), "user{}")).toBe(true);
    expect(matchesGroup(grp("user{}"), "admin{}")).toBe(false);
  });

  it("matches regex name pattern", () => {
    expect(matchesGroup(grp(".*Service{}"), "UserService{}")).toBe(true);
    expect(matchesGroup(grp(".*Service{}"), "UserRepo{}")).toBe(false);
  });

  it("matches .* for any name", () => {
    expect(matchesGroup(grp(".*{}"), "anything{}")).toBe(true);
    expect(matchesGroup(grp(".*{}"), "something{}")).toBe(true);
  });
});

describe("matchesGroup — path matching", () => {
  it("matches element at root", () => {
    expect(matchesGroup(grp("user{}"), "user{}")).toBe(true);
  });

  it("matches element at any depth when unanchored", () => {
    expect(matchesGroup(grp(".*user{}.*"), "game{}.user{}")).toBe(true);
    expect(matchesGroup(grp(".*user{}.*"), "a{}.b{}.user{}")).toBe(true);
  });

  it("path regex works: anchor to last segment", () => {
    // Rule matches paths ending with player{}
    expect(matchesGroup(grp("(^|.*\\.)player\\{\\}$"), "player{}")).toBe(true);
    expect(matchesGroup(grp("(^|.*\\.)player\\{\\}$"), "game{}.player{}")).toBe(true);
    expect(matchesGroup(grp("(^|.*\\.)player\\{\\}$"), "game{}.player{}.child{}")).toBe(false);
  });

  it("dot in path is matched by \\. in rule", () => {
    expect(matchesGroup(grp("game{}\\.player{}"), "game{}.player{}")).toBe(true);
    expect(matchesGroup(grp("game{}\\.player{}"), "gameXplayer{}")).toBe(false);
  });

  it("matches children with path prefix", () => {
    expect(matchesGroup(grp("game{}\\..*"), "game{}.player{}")).toBe(true);
    expect(matchesGroup(grp("game{}\\..*"), "game{}.world{}")).toBe(true);
    expect(matchesGroup(grp("game{}\\..*"), "other{}.player{}")).toBe(false);
  });
});

describe("matchesGroup — regex alternation", () => {
  it("| for OR", () => {
    expect(matchesGroup(grp("user{}|items[]"), "user{}")).toBe(true);
    expect(matchesGroup(grp("user{}|items[]"), "items[]")).toBe(true);
    expect(matchesGroup(grp("user{}|items[]"), "other{}")).toBe(false);
  });
});

describe("matchesGroup — compileRule auto-escaping", () => {
  it("auto-escapes {} so user can write player{} without manual escape", () => {
    // user writes "player{}" in the rule; compileRule makes it "player\{\}"
    expect(matchesGroup(grp("player{}"), "player{}")).toBe(true);
    expect(matchesGroup(grp("player{}"), "player[]")).toBe(false);
  });

  it("auto-escapes [] for collection type", () => {
    expect(matchesGroup(grp("items[]"), "items[]")).toBe(true);
    expect(matchesGroup(grp("items[]"), "items{}")).toBe(false);
  });

  it("auto-escapes () for function type", () => {
    expect(matchesGroup(grp("process()"), "process()")).toBe(true);
    expect(matchesGroup(grp("process()"), "process{}")).toBe(false);
  });

  it("auto-escapes || for state type", () => {
    expect(matchesGroup(grp("login||"), "login||")).toBe(true);
    expect(matchesGroup(grp("login||"), "login{}")).toBe(false);
  });

  it("non-empty () in rule is preserved as regex group", () => {
    // (a|b) is a capturing group matching 'a' or 'b'
    expect(matchesGroup(grp("(get|set){}"), "get{}")).toBe(true);
    expect(matchesGroup(grp("(get|set){}"), "set{}")).toBe(true);
    expect(matchesGroup(grp("(get|set){}"), "put{}")).toBe(false);
  });
});

describe("matchesGroup — empty / invalid rule", () => {
  it("returns false for empty rule", () => {
    expect(matchesGroup(grp(""), "user{}")).toBe(false);
  });

  it("returns false for invalid regex without throwing", () => {
    expect(matchesGroup(grp("[invalid"), "user{}")).toBe(false);
  });
});

describe("matchesGroup — compose expressions", () => {
  const ga: Group = { id: "a", regex: "game{}\\..*", color: "#f00" };
  const gb: Group = { id: "b", regex: ".*Service{}", color: "#00f" };
  const gc: Group = { id: "c", regex: ".*Player{}", color: "#0a0" };

  it("& (AND): matches intersection of two groups", () => {
    const gd: Group = { id: "d", regex: "", compose: "a&b", color: "#fff" };
    const groups = [ga, gb, gd];
    expect(matchesGroup(gd, "game{}.UserService{}", groups)).toBe(true);
    expect(matchesGroup(gd, "other{}.UserService{}", groups)).toBe(false);
    expect(matchesGroup(gd, "game{}.Player{}", groups)).toBe(false);
  });

  it(", (comma) is alias for &", () => {
    const gd: Group = { id: "d", regex: "", compose: "a,b", color: "#fff" };
    const groups = [ga, gb, gd];
    expect(matchesGroup(gd, "game{}.UserService{}", groups)).toBe(true);
    expect(matchesGroup(gd, "other{}.UserService{}", groups)).toBe(false);
  });

  it("| (OR): matches union of two groups", () => {
    const gd: Group = { id: "d", regex: "", compose: "b|c", color: "#fff" };
    const groups = [gb, gc, gd];
    expect(matchesGroup(gd, "UserService{}", groups)).toBe(true);   // matches b
    expect(matchesGroup(gd, "game{}.Player{}", groups)).toBe(true); // matches c
    expect(matchesGroup(gd, "UserRepo{}", groups)).toBe(false);     // matches neither
    expect(matchesGroup(gd, "other{}", groups)).toBe(false);
  });

  it("- (AND NOT): matches difference", () => {
    // d matches anything in group a but NOT in group b
    const gd: Group = { id: "d", regex: "", compose: "a-b", color: "#fff" };
    const groups = [ga, gb, gd];
    expect(matchesGroup(gd, "game{}.Player{}", groups)).toBe(true);
    expect(matchesGroup(gd, "game{}.UserService{}", groups)).toBe(false);
    expect(matchesGroup(gd, "other{}.UserService{}", groups)).toBe(false);
  });

  it("operator precedence: & binds tighter than |", () => {
    // "a|b&c" should parse as "a|(b&c)"
    const gd: Group = { id: "d", regex: "", compose: "a|b&c", color: "#fff" };
    // gb: .*Service{}, gc: .*Player{}
    const groups = [ga, gb, gc, gd];
    // Matches group a (game{}..*) directly
    expect(matchesGroup(gd, "game{}.Anything{}", groups)).toBe(true);
    // Matches b&c: must match both .*Service{} AND .*Player{} — impossible for one path
    expect(matchesGroup(gd, "UserService{}", groups)).toBe(false);
  });

  it("parentheses override precedence", () => {
    // "(a|b)&c" — must match (a OR b) AND c
    const gd: Group = { id: "d", regex: "", compose: "(a|b)&c", color: "#fff" };
    const groups = [ga, gb, gc, gd];
    // game{}.SomePlayer{}: matches a (game{}.*) AND c (.*Player{})
    expect(matchesGroup(gd, "game{}.SomePlayer{}", groups)).toBe(true);
    // game{}.UserService{}: matches a AND b but NOT c
    expect(matchesGroup(gd, "game{}.UserService{}", groups)).toBe(false);
    // OtherPlayer{}: matches c but not a; "a|b" → matches b? no, .*Service{} doesn't match OtherPlayer
    expect(matchesGroup(gd, "OtherPlayer{}", groups)).toBe(false);
  });

  it("regex + compose: both must pass", () => {
    const gd: Group = { id: "d", regex: ".*User.*", compose: "a", color: "#fff" };
    const groups = [ga, gd];
    expect(matchesGroup(gd, "game{}.UserService{}", groups)).toBe(true);
    expect(matchesGroup(gd, "game{}.Player{}", groups)).toBe(false); // regex fails
    expect(matchesGroup(gd, "other{}.UserService{}", groups)).toBe(false); // compose fails
  });

  it("returns false for unknown group id in compose", () => {
    const gd: Group = { id: "d", regex: "", compose: "missing", color: "#fff" };
    expect(matchesGroup(gd, "anything{}", [])).toBe(false);
  });

  it("returns false when group has neither regex nor compose", () => {
    const gd: Group = { id: "d", regex: "", color: "#fff" };
    expect(matchesGroup(gd, "user{}", [])).toBe(false);
  });

  it("cycle guard: self-composing group does not infinite-loop", () => {
    const gd: Group = { id: "d", regex: ".*{}", compose: "d", color: "#fff" };
    // regex matches but self-compose hits cycle guard (returns false) → overall false
    expect(matchesGroup(gd, "user{}", [gd])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration tests: parse real .dg code then verify compose group matching
//
// Diagram: elements a, b, ab, c (all become root-level objects a{}, b{}, ab{}, c{})
// group a  regex=a  → matches any path containing "a" → a{}, ab{}
// group b  regex=b  → matches any path containing "b" → b{}, ab{}
// ---------------------------------------------------------------------------
describe("matchesGroup — compose integration (parsed from .dg)", () => {
  const BASE_CODE = [
    "!group  id=a  color=#111  regex=a",
    "!group  id=b  color=#999  regex=b",
    "a  b  ab  c",
  ].join("\n");

  // root-level paths are just the type-embedded IDs
  const ALL_PATHS = ["a{}", "b{}", "ab{}", "c{}"];

  let baseGroups: Group[];

  beforeAll(() => {
    baseGroups = parse(BASE_CODE).groups ?? [];
  });

  function matched(g: Group, extraGroups: Group[] = []): string[] {
    const allGroups = [...baseGroups, ...extraGroups];
    return ALL_PATHS.filter((p) => matchesGroup(g, p, allGroups));
  }

  it("sanity: group a matches a{} and ab{}", () => {
    const ga = baseGroups.find((g) => g.id === "a")!;
    expect(matched(ga)).toEqual(["a{}", "ab{}"]);
  });

  it("sanity: group b matches b{} and ab{}", () => {
    const gb = baseGroups.find((g) => g.id === "b")!;
    expect(matched(gb)).toEqual(["b{}", "ab{}"]);
  });

  it("compose=a&b — intersection, matches only ab{}", () => {
    const gc: Group = { id: "c", regex: "", compose: "a&b", color: "#fff" };
    expect(matched(gc, [gc])).toEqual(["ab{}"]);
  });

  it("compose=a,b — comma is alias for &, same as a&b", () => {
    const gc: Group = { id: "c", regex: "", compose: "a,b", color: "#fff" };
    expect(matched(gc, [gc])).toEqual(["ab{}"]);
  });

  it("compose=a|b — union, matches a{}, b{}, ab{}", () => {
    const gc: Group = { id: "c", regex: "", compose: "a|b", color: "#fff" };
    expect(matched(gc, [gc])).toEqual(["a{}", "b{}", "ab{}"]);
  });

  it("compose=(a&b)|b — simplifies to group b: matches b{}, ab{}", () => {
    const gc: Group = { id: "c", regex: "", compose: "(a&b)|b", color: "#fff" };
    expect(matched(gc, [gc])).toEqual(["b{}", "ab{}"]);
  });

  it("compose=(a&b)|a — simplifies to group a: matches a{}, ab{}", () => {
    const gc: Group = { id: "c", regex: "", compose: "(a&b)|a", color: "#fff" };
    expect(matched(gc, [gc])).toEqual(["a{}", "ab{}"]);
  });

  it("compose=a-b — difference: elements in a but not b, matches only a{}", () => {
    const gc: Group = { id: "c", regex: "", compose: "a-b", color: "#fff" };
    expect(matched(gc, [gc])).toEqual(["a{}"]);
  });

  it("compose=b-a — difference: elements in b but not a, matches only b{}", () => {
    const gc: Group = { id: "c", regex: "", compose: "b-a", color: "#fff" };
    expect(matched(gc, [gc])).toEqual(["b{}"]);
  });

  it("compose=a|b parsed from !group directive round-trips correctly", () => {
    const code = BASE_CODE + "\n!group  id=c  color=#fff  compose=a|b";
    const model = parse(code);
    const allGroups = model.groups ?? [];
    const gc = allGroups.find((g) => g.id === "c")!;
    expect(gc.compose).toBe("a|b");
    expect(ALL_PATHS.filter((p) => matchesGroup(gc, p, allGroups)))
      .toEqual(["a{}", "b{}", "ab{}"]);
  });

  it("rule= backward compat: parsed group still works in compose", () => {
    const code = [
      "!group  id=a  color=#111  rule=a",
      "!group  id=b  color=#999  rule=b",
      "!group  id=c  color=#fff  compose=a&b",
      "a  b  ab  c",
    ].join("\n");
    const model = parse(code);
    const allGroups = model.groups ?? [];
    const gc = allGroups.find((g) => g.id === "c")!;
    expect(ALL_PATHS.filter((p) => matchesGroup(gc, p, allGroups)))
      .toEqual(["ab{}"]);
  });
});
