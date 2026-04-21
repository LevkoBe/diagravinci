import { describe, it, expect } from "vitest";
import type { SelectorAtom } from "../../domain/models/Selector";
import type { FilterPreset } from "../../domain/models/Selector";
import {
  generateAtomLine,
  generateSelectorLine,
  upsertAtomInCode,
  removeAtomFromCode,
  upsertPresetInCode,
  removePresetFromCode,
} from "../../presentation/utils/selectorCodeUtils";

function makePreset(overrides: Partial<FilterPreset> = {}): FilterPreset {
  return {
    id: "p1",
    label: "Preset One",
    color: "#ff0000",
    mode: "color",
    isActive: true,
    selector: { combiner: "myAtom" },
    ...overrides,
  };
}

describe("generateAtomLine", () => {
  it("formats id and pattern with double-space separators", () => {
    const atom: SelectorAtom = { id: "fn", patterns: { function_name: ".*" } };
    expect(generateAtomLine(atom)).toBe("!atom  id=fn  function_name=.*");
  });

  it("includes name field when present", () => {
    const atom: SelectorAtom = {
      id: "x",
      name: "myAtom",
      patterns: { object_name: "Svc" },
    };
    expect(generateAtomLine(atom)).toBe("!atom  id=x  name=myAtom  object_name=Svc");
  });

  it("quotes pattern values containing spaces", () => {
    const atom: SelectorAtom = { id: "a", patterns: { all_name: "has spaces" } };
    expect(generateAtomLine(atom)).toContain('"has spaces"');
  });

  it("handles multiple pattern entries", () => {
    const atom: SelectorAtom = {
      id: "multi",
      patterns: { object_name: "Foo", function_name: "bar" },
    };
    const line = generateAtomLine(atom);
    expect(line).toContain("object_name=Foo");
    expect(line).toContain("function_name=bar");
  });
});

describe("generateSelectorLine", () => {
  it("includes name, color, mode, and combiner", () => {
    const line = generateSelectorLine(makePreset());
    expect(line).toContain("!selector");
    expect(line).toContain("name=p1");
    expect(line).toContain("color=#ff0000");
    expect(line).toContain("mode=color");
    expect(line).toContain("combiner=myAtom");
  });

  it("omits combiner when selector.combiner is empty string", () => {
    const line = generateSelectorLine(makePreset({ selector: { combiner: "" } }));
    expect(line).not.toContain("combiner");
  });

  it("quotes combiner value that contains spaces", () => {
    const line = generateSelectorLine(makePreset({ selector: { combiner: "a b" } }));
    expect(line).toContain('combiner="a b"');
  });

  it("uses preset.id as the name field, not preset.label", () => {
    const line = generateSelectorLine(makePreset({ id: "myId", label: "My Label" }));
    expect(line).toContain("name=myId");
    expect(line).not.toContain("My Label");
  });

  it("supports hide and dim modes", () => {
    expect(generateSelectorLine(makePreset({ mode: "hide" }))).toContain("mode=hide");
    expect(generateSelectorLine(makePreset({ mode: "dim" }))).toContain("mode=dim");
  });
});

describe("upsertAtomInCode", () => {
  it("prepends atom line when not present in code", () => {
    const result = upsertAtomInCode({ id: "a", patterns: { object_name: "X" } }, "a{}\n");
    expect(result).toMatch(/^!atom {2}id=a/);
    expect(result).toContain("a{}");
  });

  it("replaces existing atom line with same id", () => {
    const original = "!atom  id=a  object_name=Old\na{}\n";
    const result = upsertAtomInCode({ id: "a", patterns: { object_name: "New" } }, original);
    expect(result).toContain("object_name=New");
    expect(result).not.toContain("object_name=Old");
  });

  it("does not affect other atom lines", () => {
    const original = "!atom  id=b  object_name=Keep\n!atom  id=a  object_name=Old\n";
    const result = upsertAtomInCode({ id: "a", patterns: { object_name: "New" } }, original);
    expect(result).toContain("!atom  id=b  object_name=Keep");
  });

  it("only replaces exact id match, not a prefix match", () => {
    const original = "!atom  id=abc  object_name=Keep\n";
    const result = upsertAtomInCode({ id: "a", patterns: { object_name: "New" } }, original);
    expect(result).toContain("!atom  id=abc  object_name=Keep");
  });
});

describe("removeAtomFromCode", () => {
  it("removes the atom line with matching id", () => {
    const code = "!atom  id=fn  function_name=.*\na{}\n";
    const result = removeAtomFromCode("fn", code);
    expect(result).not.toContain("!atom  id=fn");
    expect(result).toContain("a{}");
  });

  it("does nothing when id is not present", () => {
    const code = "a{}\n";
    expect(removeAtomFromCode("missing", code)).toBe("a{}\n");
  });

  it("does not remove atom with id that is only a prefix", () => {
    const code = "!atom  id=abc  object_name=X\n";
    const result = removeAtomFromCode("a", code);
    expect(result).toContain("!atom  id=abc");
  });

  it("only removes the matching line, leaving others intact", () => {
    const code = "!atom  id=a  object_name=X\n!atom  id=b  function_name=Y\n";
    const result = removeAtomFromCode("a", code);
    expect(result).not.toContain("id=a");
    expect(result).toContain("!atom  id=b");
  });
});

describe("upsertPresetInCode", () => {
  it("prepends selector line when not present", () => {
    const result = upsertPresetInCode(makePreset(), "a{}\n");
    expect(result).toMatch(/^!selector/);
    expect(result).toContain("a{}");
  });

  it("replaces existing selector line with same id", () => {
    const original = "!selector  name=p1  color=#000  mode=hide  combiner=old\na{}\n";
    const result = upsertPresetInCode(makePreset({ selector: { combiner: "new" } }), original);
    expect(result).toContain("combiner=new");
    expect(result).not.toContain("combiner=old");
    expect(result.match(/!selector/g)?.length).toBe(1);
  });

  it("does not affect selectors with different ids", () => {
    const original = "!selector  name=other  color=#000  mode=color\n";
    const result = upsertPresetInCode(makePreset({ id: "p1" }), original);
    expect(result).toContain("name=other");
    expect(result).toContain("name=p1");
  });
});

describe("removePresetFromCode", () => {
  it("removes selector line with matching id", () => {
    const code = "!selector  name=p1  color=#ff0000  mode=color\na{}\n";
    const result = removePresetFromCode("p1", code);
    expect(result).not.toContain("!selector  name=p1");
    expect(result).toContain("a{}");
  });

  it("does nothing when id not present", () => {
    const code = "a{}\n";
    expect(removePresetFromCode("missing", code)).toBe("a{}\n");
  });

  it("does not remove selectors with a different id", () => {
    const code = "!selector  name=p1  color=#f00  mode=color\n!selector  name=p2  color=#0f0  mode=hide\n";
    const result = removePresetFromCode("p1", code);
    expect(result).not.toContain("name=p1");
    expect(result).toContain("name=p2");
  });

  it("only removes exact id match, not a prefix match", () => {
    const code = "!selector  name=p10  color=#f00  mode=color\n";
    const result = removePresetFromCode("p1", code);
    expect(result).toContain("name=p10");
  });
});
