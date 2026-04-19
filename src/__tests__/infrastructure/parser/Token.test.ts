import { describe, it, expect } from "vitest";
import {
  createToken,
  isRelationshipType,
  defaultRelationshipType,
  isOpeningWrapper,
  defaultOpeningWrapper,
  RELATIONSHIPS,
  PARTIAL_RELATIONSHIPS,
  OPENING_WRAPPERS,
} from "../../../infrastructure/parser/Token";

describe("createToken", () => {
  it("creates a token with type, value, line, column", () => {
    const t = createToken("IDENTIFIER", "foo", 1, 3);
    expect(t.type).toBe("IDENTIFIER");
    expect(t.value).toBe("foo");
    expect(t.line).toBe(1);
    expect(t.column).toBe(3);
    expect(t.kind).toBe("x");
  });

  it("assigns kind '!' for DIRECTIVE type", () => {
    expect(createToken("DIRECTIVE", "selector name=warn", 1, 1).kind).toBe("!");
  });

  it("assigns kind '-' for partial relationship types (.., --)", () => {
    for (const type of PARTIAL_RELATIONSHIPS) {
      expect(createToken(type, type, 1, 1).kind).toBe("-");
    }
  });

  it("assigns kind '>' for full flow relationship types (-->, ..>, etc.)", () => {
    for (const type of RELATIONSHIPS) {
      const kind = createToken(type, type, 1, 1).kind;
      expect(kind).toBe(">");
    }
  });

  it("assigns kind '{' for standard opening wrappers ({, [, (, <)", () => {
    for (const type of ["{", "[", "(", "<"] as const) {
      expect(createToken(type, type, 1, 1).kind).toBe("{");
    }
  });

  it("assigns kind '}' for double-sided wrappers (> and |)", () => {
    expect(createToken(">", ">", 1, 1).kind).toBe("}");
    expect(createToken("|", "|", 1, 1).kind).toBe("}");
  });

  it("assigns kind '}' for closing wrappers (], ), >)", () => {
    for (const type of ["}", "]", ")", "|"] as const) {
      expect(createToken(type, type, 1, 1).kind).toBe("}");
    }
  });

  it("assigns kind 'x' for IDENTIFIER", () => {
    expect(createToken("IDENTIFIER", "foo", 1, 1).kind).toBe("x");
  });
});

describe("isRelationshipType", () => {
  it("returns true for all RELATIONSHIPS", () => {
    for (const r of RELATIONSHIPS) {
      expect(isRelationshipType(r)).toBe(true);
    }
  });

  it("returns true for all PARTIAL_RELATIONSHIPS", () => {
    for (const r of PARTIAL_RELATIONSHIPS) {
      expect(isRelationshipType(r)).toBe(true);
    }
  });

  it("returns false for non-relationship strings", () => {
    expect(isRelationshipType("foo")).toBe(false);
    expect(isRelationshipType("{")).toBe(false);
    expect(isRelationshipType("")).toBe(false);
    expect(isRelationshipType(undefined)).toBe(false);
    expect(isRelationshipType(42)).toBe(false);
  });
});

describe("defaultRelationshipType", () => {
  it("returns the type when it is a valid relationship", () => {
    expect(defaultRelationshipType("-->")).toBe("-->");
    expect(defaultRelationshipType("..>")).toBe("..>");
    expect(defaultRelationshipType("..")).toBe("..");
  });

  it("falls back to '-->' for unrecognised type", () => {
    expect(defaultRelationshipType("IDENTIFIER")).toBe("-->");
    expect(defaultRelationshipType(undefined)).toBe("-->");
    expect(defaultRelationshipType("{")).toBe("-->");
  });
});

describe("isOpeningWrapper", () => {
  it("returns true for all OPENING_WRAPPERS", () => {
    for (const w of OPENING_WRAPPERS) {
      expect(isOpeningWrapper(w)).toBe(true);
    }
  });

  it("returns false for closing wrappers and other strings", () => {
    expect(isOpeningWrapper("}")).toBe(false);
    expect(isOpeningWrapper("]")).toBe(false);
    expect(isOpeningWrapper("foo")).toBe(false);
    expect(isOpeningWrapper(undefined)).toBe(false);
  });
});

describe("defaultOpeningWrapper", () => {
  it("returns the type when it is a valid opening wrapper", () => {
    for (const w of OPENING_WRAPPERS) {
      expect(defaultOpeningWrapper(w)).toBe(w);
    }
  });

  it("falls back to '{' for unrecognised type", () => {
    expect(defaultOpeningWrapper("IDENTIFIER")).toBe("{");
    expect(defaultOpeningWrapper(undefined)).toBe("{");
    expect(defaultOpeningWrapper("}")).toBe("{");
  });
});
