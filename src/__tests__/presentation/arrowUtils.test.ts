import { describe, it, expect } from "vitest";
import {
  parseEndSpec,
  isDashed,
  decorationInset,
} from "../../presentation/components/rendering/relationships/arrowUtils";
import type { RelationshipType } from "../../infrastructure/parser/Token";

describe("parseEndSpec", () => {
  it("parses --> as none->arrow", () => {
    const spec = parseEndSpec("-->");
    expect(spec.source).toBe("none");
    expect(spec.target).toBe("arrow");
    expect(spec.sourceFilled).toBe(false);
    expect(spec.targetFilled).toBe(false);
  });

  it("parses --|> as none->triangle", () => {
    const spec = parseEndSpec("--|>");
    expect(spec.target).toBe("triangle");
    expect(spec.targetFilled).toBe(false);
  });

  it("parses *-- as filled-diamond->none", () => {
    const spec = parseEndSpec("*--");
    expect(spec.source).toBe("diamond");
    expect(spec.sourceFilled).toBe(true);
    expect(spec.target).toBe("none");
  });

  it("parses o-- as circle->none", () => {
    const spec = parseEndSpec("o--");
    expect(spec.source).toBe("circle");
    expect(spec.target).toBe("none");
  });

  it("parses <-- as arrow->none", () => {
    const spec = parseEndSpec("<--");
    expect(spec.source).toBe("arrow");
    expect(spec.target).toBe("none");
  });

  it("parses -- as none->none", () => {
    const spec = parseEndSpec("--");
    expect(spec.source).toBe("none");
    expect(spec.target).toBe("none");
  });

  it("parses --* as none->filled-diamond", () => {
    const spec = parseEndSpec("--*");
    expect(spec.target).toBe("diamond");
    expect(spec.targetFilled).toBe(true);
  });
});

describe("isDashed", () => {
  const dashedTypes: RelationshipType[] = ["..>", "..|>", "<..", "<|..", ".."];
  const solidTypes: RelationshipType[] = ["-->", "--|>", "<--", "<|--", "o--", "*--", "--o", "--*", "--"];

  for (const t of dashedTypes) {
    it(`returns true for ${t}`, () => {
      expect(isDashed(t)).toBe(true);
    });
  }

  for (const t of solidTypes) {
    it(`returns false for ${t}`, () => {
      expect(isDashed(t)).toBe(false);
    });
  }
});

describe("decorationInset", () => {
  it("returns 8 for arrow", () => {
    expect(decorationInset("arrow")).toBe(8);
  });

  it("returns 12 for triangle", () => {
    expect(decorationInset("triangle")).toBe(12);
  });

  it("returns 20 for diamond", () => {
    expect(decorationInset("diamond")).toBe(20);
  });

  it("returns 10 for circle", () => {
    expect(decorationInset("circle")).toBe(10);
  });

  it("returns 0 for none", () => {
    expect(decorationInset("none")).toBe(0);
  });
});
