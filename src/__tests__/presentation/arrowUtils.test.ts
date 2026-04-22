import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Konva from "konva";
import {
  parseEndSpec,
  isDashed,
  decorationInset,
  createDecoration,
  screenToWorld,
  computeRelPoints,
} from "../../presentation/components/rendering/relationships/arrowUtils";
import type { RelationshipType } from "../../infrastructure/parser/Token";
import { KonvaTestHelper } from "../utils";

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
  const solidTypes: RelationshipType[] = [
    "-->",
    "--|>",
    "<--",
    "<|--",
    "o--",
    "*--",
    "--o",
    "--*",
    "--",
  ];

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

describe("createDecoration", () => {
  it("returns a Konva.Line for arrow", () => {
    const shape = createDecoration(
      "arrow",
      false,
      100,
      100,
      1,
      0,
      "#000",
      1.5,
      1,
    );
    expect(shape).toBeInstanceOf(Konva.Line);
  });

  it("returns a Konva.Line for triangle (unfilled)", () => {
    const shape = createDecoration(
      "triangle",
      false,
      100,
      100,
      1,
      0,
      "#000",
      1.5,
      1,
    );
    expect(shape).toBeInstanceOf(Konva.Line);
  });

  it("returns a filled Konva.Line for triangle (filled)", () => {
    const shape = createDecoration(
      "triangle",
      true,
      100,
      100,
      1,
      0,
      "#f00",
      1.5,
      1,
    ) as Konva.Line;
    expect(shape).toBeInstanceOf(Konva.Line);
    expect(shape.fill()).toBe("#f00");
  });

  it("returns a Konva.Line for diamond (unfilled)", () => {
    const shape = createDecoration(
      "diamond",
      false,
      100,
      100,
      1,
      0,
      "#000",
      1.5,
      1,
    );
    expect(shape).toBeInstanceOf(Konva.Line);
  });

  it("returns a filled Konva.Line for diamond (filled)", () => {
    const shape = createDecoration(
      "diamond",
      true,
      100,
      100,
      1,
      0,
      "#0f0",
      1.5,
      1,
    ) as Konva.Line;
    expect(shape?.fill()).toBe("#0f0");
  });

  it("returns a Konva.Circle for circle", () => {
    const shape = createDecoration(
      "circle",
      false,
      100,
      100,
      1,
      0,
      "#000",
      1.5,
      1,
    );
    expect(shape).toBeInstanceOf(Konva.Circle);
  });

  it("returns null for none", () => {
    expect(
      createDecoration("none", false, 0, 0, 1, 0, "#000", 1.5, 1),
    ).toBeNull();
  });
});

describe("screenToWorld", () => {
  let helper: KonvaTestHelper;

  beforeEach(() => {
    helper = new KonvaTestHelper();
    helper.createStage();
  });

  afterEach(() => {
    helper.cleanup();
  });

  it("converts screen position to world position at default scale", () => {
    const stage = helper.getStage();
    const result = screenToWorld({ x: 100, y: 200 }, stage);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(200);
  });

  it("accounts for stage offset", () => {
    const stage = helper.getStage();
    stage.position({ x: 50, y: 50 });
    const result = screenToWorld({ x: 150, y: 150 }, stage);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(100);
  });

  it("accounts for stage scale", () => {
    const stage = helper.getStage();
    stage.scale({ x: 2, y: 2 });
    const result = screenToWorld({ x: 100, y: 100 }, stage);
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(50);
  });
});

describe("decorationInset", () => {
  it("returns 8 for arrow at zoom=1", () => {
    expect(decorationInset("arrow", 1)).toBe(8);
  });

  it("returns 12 for triangle at zoom=1", () => {
    expect(decorationInset("triangle", 1)).toBe(12);
  });

  it("returns 20 for diamond at zoom=1", () => {
    expect(decorationInset("diamond", 1)).toBe(20);
  });

  it("returns 10 for circle at zoom=1", () => {
    expect(decorationInset("circle", 1)).toBe(10);
  });

  it("returns 0 for none", () => {
    expect(decorationInset("none", 1)).toBe(0);
  });

  it("scales inset down at higher zoom", () => {
    expect(decorationInset("arrow", 2)).toBe(4);
    expect(decorationInset("triangle", 4)).toBe(3);
  });
});

describe("computeRelPoints", () => {
  it("returns null points when source and target are at the same position", () => {
    const result = computeRelPoints(100, 100, 0, 100, 100, 0, "-->", 1);
    expect(result.points).toBeNull();
  });

  it("returns a 4-element points array for normal positions", () => {
    const result = computeRelPoints(0, 0, 0, 100, 0, 0, "-->", 1);
    expect(result.points).toHaveLength(4);
  });

  it("returns correct normal vector for horizontal line", () => {
    const result = computeRelPoints(0, 0, 0, 100, 0, 0, "-->", 1);
    expect(result.nx).toBeCloseTo(1);
    expect(result.ny).toBeCloseTo(0);
  });

  it("computes edge exit points accounting for node radii", () => {
    const result = computeRelPoints(0, 0, 60, 100, 0, 60, "-->", 1);
    expect(result.ex1).toBeCloseTo(30);
    expect(result.ex2).toBeCloseTo(70);
  });

  it("pulls line endpoints inward by decoration inset (zoom=1)", () => {
    const result = computeRelPoints(0, 0, 60, 100, 0, 60, "-->", 1);
    expect(result.points![0]).toBeCloseTo(30);
    expect(result.points![2]).toBeCloseTo(62);
  });

  it("scales decoration insets with zoom — higher zoom reduces world-unit inset", () => {
    const result = computeRelPoints(0, 0, 60, 100, 0, 60, "-->", 2);
    expect(result.points![2]).toBeCloseTo(66);
  });

  it("applies insets on both ends for bidirectional decorations (<|--)", () => {
    const result = computeRelPoints(0, 0, 60, 100, 0, 60, "<|--", 1);
    expect(result.points![0]).toBeCloseTo(42);
    expect(result.points![2]).toBeCloseTo(70);
  });
});
