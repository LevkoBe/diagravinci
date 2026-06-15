import { describe, it, expect } from "vitest";
import type { Group } from "../../domain/models/Selector";
import {
  generateGroupLine,
  upsertGroupInCode,
  removeGroupFromCode,
  upsertSessionModeInCode,
} from "../../presentation/utils/selectorCodeUtils";

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "services",
    label: "Services",
    color: "#ff0000",
    rule: "'.*Service'?",
    ...overrides,
  };
}

describe("generateGroupLine", () => {
  it("emits !group with id, color, and rule", () => {
    const line = generateGroupLine(makeGroup());
    expect(line).toContain("!group");
    expect(line).toContain("id=services");
    expect(line).toContain("color=#ff0000");
    expect(line).toContain("rule='.*Service'?");
  });

  it("emits label when it differs from id", () => {
    const line = generateGroupLine(makeGroup({ label: "My Services" }));
    expect(line).toContain('label="My Services"');
  });

  it("omits label when it equals id", () => {
    const line = generateGroupLine(makeGroup({ id: "services", label: "services" }));
    expect(line).not.toContain("label=");
  });

  it("omits rule field when rule is empty", () => {
    const line = generateGroupLine(makeGroup({ rule: "" }));
    expect(line).not.toContain("rule=");
  });
});

describe("upsertGroupInCode", () => {
  it("prepends group line when not present", () => {
    const result = upsertGroupInCode(makeGroup(), "a{}\n");
    expect(result).toMatch(/^!group/);
    expect(result).toContain("a{}");
  });

  it("replaces existing !group line with same id", () => {
    const original = "!group  id=services  color=#000  rule=old\na{}\n";
    const result = upsertGroupInCode(makeGroup({ rule: "new" }), original);
    expect(result).toContain("rule=new");
    expect(result).not.toContain("rule=old");
    expect(result.match(/!group/g)?.length).toBe(1);
  });

  it("does not affect groups with different ids", () => {
    const original = "!group  id=other  color=#000  rule=keep\n";
    const result = upsertGroupInCode(makeGroup(), original);
    expect(result).toContain("id=other");
    expect(result).toContain("id=services");
  });
});

describe("removeGroupFromCode", () => {
  it("removes the !group line with matching id", () => {
    const code = "!group  id=services  color=#f00\na{}\n";
    const result = removeGroupFromCode("services", code);
    expect(result).not.toContain("!group  id=services");
    expect(result).toContain("a{}");
  });

  it("does nothing when id not present", () => {
    const code = "a{}\n";
    expect(removeGroupFromCode("missing", code)).toBe("a{}\n");
  });
});

describe("upsertSessionModeInCode", () => {
  it("creates a new session line when the session does not exist", () => {
    const result = upsertSessionModeInCode("default", "s1", "color", "a{}\n");
    expect(result).toContain("!session");
    expect(result).toContain("id=default");
    expect(result).toContain("groups=s1:color");
  });

  it("is a no-op when mode=off and session does not exist", () => {
    const code = "a{}\n";
    expect(upsertSessionModeInCode("default", "s1", "off", code)).toBe(code);
  });

  it("adds a new group entry to an existing session line", () => {
    const code = "!session  id=default  label=Default  groups=s1:color\n";
    const result = upsertSessionModeInCode("default", "s2", "dim", code);
    expect(result).toContain("s1:color");
    expect(result).toContain("s2:dim");
  });

  it("updates an existing group entry in a session line", () => {
    const code = "!session  id=default  label=Default  groups=s1:color\n";
    const result = upsertSessionModeInCode("default", "s1", "hide", code);
    expect(result).toContain("s1:hide");
    expect(result).not.toContain("s1:color");
  });

  it("removes a group entry when mode=off, keeping others", () => {
    const code = "!session  id=default  label=Default  groups=s1:color,s2:dim\n";
    const result = upsertSessionModeInCode("default", "s1", "off", code);
    expect(result).not.toContain("s1:");
    expect(result).toContain("s2:dim");
  });

  it("removes the groups= field entirely when the last entry is turned off", () => {
    const code = "!session  id=default  label=Default  groups=s1:color\n";
    const result = upsertSessionModeInCode("default", "s1", "off", code);
    expect(result).not.toContain("groups=");
  });

  it("migrates old selectors= key to groups= when updating", () => {
    const code = "!session  id=default  label=Default  selectors=s1:color\n";
    const result = upsertSessionModeInCode("default", "s2", "dim", code);
    expect(result).toContain("s1:color");
    expect(result).toContain("s2:dim");
    expect(result).toContain("groups=");
  });

  it("only affects the matching session, not others", () => {
    const code =
      "!session  id=default  label=Default  groups=s1:color\n" +
      "!session  id=remote  label=Remote  groups=s1:dim\n";
    const result = upsertSessionModeInCode("default", "s1", "hide", code);
    expect(result).toContain("s1:hide");
    expect(result).toContain("!session  id=remote  label=Remote  groups=s1:dim");
  });
});
