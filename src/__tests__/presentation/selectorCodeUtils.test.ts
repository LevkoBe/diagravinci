import { describe, it, expect } from "vitest";
import type { Rule, Selector } from "../../domain/models/Selector";
import {
  generateRuleLine,
  generateSelectorLine,
  upsertRuleInCode,
  removeRuleFromCode,
  upsertSelectorInCode,
  removeSelectorFromCode,
} from "../../presentation/utils/selectorCodeUtils";

function makeSelector(overrides: Partial<Selector> = {}): Selector {
  return {
    id: "p1",
    label: "p1",
    color: "#ff0000",
    mode: "color",
    expression: "royals",
    ...overrides,
  };
}

describe("generateRuleLine", () => {
  it("formats id and pattern with double-space separators", () => {
    const rule: Rule = { id: "fn", patterns: { function_name: ".*" } };
    expect(generateRuleLine(rule)).toBe("!rule  id=fn  function_name=.*");
  });

  it("quotes pattern values containing spaces", () => {
    const rule: Rule = { id: "a", patterns: { all_name: "has spaces" } };
    expect(generateRuleLine(rule)).toContain('"has spaces"');
  });

  it("handles multiple pattern entries", () => {
    const rule: Rule = { id: "multi", patterns: { object_name: "Foo", function_name: "bar" } };
    const line = generateRuleLine(rule);
    expect(line).toContain("object_name=Foo");
    expect(line).toContain("function_name=bar");
  });
});

describe("generateSelectorLine", () => {
  it("includes name, color, mode, and expression", () => {
    const line = generateSelectorLine(makeSelector());
    expect(line).toContain("!selector");
    expect(line).toContain("name=p1");
    expect(line).toContain("color=#ff0000");
    expect(line).toContain("mode=color");
    expect(line).toContain("expression=royals");
  });

  it("omits expression when expression is empty string", () => {
    const line = generateSelectorLine(makeSelector({ expression: "" }));
    expect(line).not.toContain("expression");
  });

  it("quotes expression value that contains spaces", () => {
    const line = generateSelectorLine(makeSelector({ expression: "a b" }));
    expect(line).toContain('expression="a b"');
  });

  it("uses selector.label as the name field and quotes labels with special chars", () => {
    const lineSpace = generateSelectorLine(makeSelector({ label: "My Label" }));
    expect(lineSpace).toContain('name="My Label"');
    const lineSpecial = generateSelectorLine(makeSelector({ label: "foo?" }));
    expect(lineSpecial).toContain('name="foo?"');
    const lineClean = generateSelectorLine(makeSelector({ label: "my_label" }));
    expect(lineClean).toContain("name=my_label");
    expect(lineClean).not.toContain('"');
  });

  it("supports hide, dim, and off modes", () => {
    expect(generateSelectorLine(makeSelector({ mode: "hide" }))).toContain("mode=hide");
    expect(generateSelectorLine(makeSelector({ mode: "dim" }))).toContain("mode=dim");
    expect(generateSelectorLine(makeSelector({ mode: "off" }))).toContain("mode=off");
  });
});

describe("upsertRuleInCode", () => {
  it("prepends rule line when not present in code", () => {
    const result = upsertRuleInCode({ id: "a", patterns: { object_name: "X" } }, "a{}\n");
    expect(result).toMatch(/^!rule {2}id=a/);
    expect(result).toContain("a{}");
  });

  it("replaces existing !rule line with same id", () => {
    const original = "!rule  id=a  object_name=Old\na{}\n";
    const result = upsertRuleInCode({ id: "a", patterns: { object_name: "New" } }, original);
    expect(result).toContain("object_name=New");
    expect(result).not.toContain("object_name=Old");
  });

  it("replaces existing !atom line (migration compat) with same id", () => {
    const original = "!atom  id=a  object_name=Old\na{}\n";
    const result = upsertRuleInCode({ id: "a", patterns: { object_name: "New" } }, original);
    expect(result).toContain("object_name=New");
    expect(result).not.toContain("object_name=Old");
  });

  it("does not affect other rule lines", () => {
    const original = "!rule  id=b  object_name=Keep\n!rule  id=a  object_name=Old\n";
    const result = upsertRuleInCode({ id: "a", patterns: { object_name: "New" } }, original);
    expect(result).toContain("!rule  id=b  object_name=Keep");
  });

  it("only replaces exact id match, not a prefix match", () => {
    const original = "!rule  id=abc  object_name=Keep\n";
    const result = upsertRuleInCode({ id: "a", patterns: { object_name: "New" } }, original);
    expect(result).toContain("!rule  id=abc  object_name=Keep");
  });
});

describe("removeRuleFromCode", () => {
  it("removes the !rule line with matching id", () => {
    const code = "!rule  id=fn  function_name=.*\na{}\n";
    const result = removeRuleFromCode("fn", code);
    expect(result).not.toContain("!rule  id=fn");
    expect(result).toContain("a{}");
  });

  it("removes the legacy !atom line with matching id", () => {
    const code = "!atom  id=fn  function_name=.*\na{}\n";
    const result = removeRuleFromCode("fn", code);
    expect(result).not.toContain("id=fn");
    expect(result).toContain("a{}");
  });

  it("does nothing when id is not present", () => {
    const code = "a{}\n";
    expect(removeRuleFromCode("missing", code)).toBe("a{}\n");
  });

  it("only removes the matching line, leaving others intact", () => {
    const code = "!rule  id=a  object_name=X\n!rule  id=b  function_name=Y\n";
    const result = removeRuleFromCode("a", code);
    expect(result).not.toContain("id=a  ");
    expect(result).toContain("!rule  id=b");
  });
});

describe("upsertSelectorInCode", () => {
  it("prepends selector line when not present", () => {
    const result = upsertSelectorInCode(makeSelector(), "a{}\n");
    expect(result).toMatch(/^!selector/);
    expect(result).toContain("a{}");
  });

  it("replaces existing selector line with matching label (name=)", () => {
    const original = "!selector  name=p1  color=#000  mode=hide  expression=old\na{}\n";
    const result = upsertSelectorInCode(makeSelector({ expression: "new" }), original);
    expect(result).toContain("expression=new");
    expect(result).not.toContain("expression=old");
    expect(result.match(/!selector/g)?.length).toBe(1);
  });

  it("renames the selector line when oldLabel differs from new label", () => {
    const original = "!selector  name=old  color=#000  mode=color\na{}\n";
    const result = upsertSelectorInCode(makeSelector({ label: "new" }), original, "old");
    expect(result).toContain("name=new");
    expect(result).not.toContain("name=old");
    expect(result.match(/!selector/g)?.length).toBe(1);
  });

  it("does not affect selectors with different labels", () => {
    const original = "!selector  name=other  color=#000  mode=color\n";
    const result = upsertSelectorInCode(makeSelector({ label: "p1" }), original);
    expect(result).toContain("name=other");
    expect(result).toContain("name=p1");
  });
});

describe("removeSelectorFromCode", () => {
  it("removes selector line with matching id", () => {
    const code = "!selector  name=p1  color=#ff0000  mode=color\na{}\n";
    const result = removeSelectorFromCode("p1", code);
    expect(result).not.toContain("!selector  name=p1");
    expect(result).toContain("a{}");
  });

  it("does nothing when id not present", () => {
    const code = "a{}\n";
    expect(removeSelectorFromCode("missing", code)).toBe("a{}\n");
  });

  it("does not remove selectors with a different id", () => {
    const code = "!selector  name=p1  color=#f00  mode=color\n!selector  name=p2  color=#0f0  mode=hide\n";
    const result = removeSelectorFromCode("p1", code);
    expect(result).not.toContain("name=p1");
    expect(result).toContain("name=p2");
  });
});
