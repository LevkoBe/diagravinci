import { describe, it, expect } from "vitest";
import CircularLayout from "../../domain/layout/CircularLayout";
import type { ViewState } from "../../domain/models/ViewState";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";

describe("CircularLayout", () => {
  const createViewState = (input: string): ViewState => {
    const tokens = new Lexer(input).tokenize();
    const model = new Parser(tokens).parse();
    const layout = new CircularLayout();
    return layout.apply(model, { width: 800, height: 600 });
  };

  it("should position single element at canvas center", () => {
    const viewState = createViewState("a");
    expect(Object.keys(viewState.positions)).toHaveLength(1);
    const posA = viewState.positions["a"];
    expect(posA).toBeDefined();
    expect(posA.position.x).toBe(400);
    expect(posA.position.y).toBe(300);
    expect(posA.isRecursive).toBeFalsy();
  });

  it("should position siblings in circle around center", () => {
    const viewState = createViewState("a b c");
    expect(Object.keys(viewState.positions)).toHaveLength(3);
    const centerX = 400;
    const centerY = 300;

    const distA = Math.sqrt(
      Math.pow(viewState.positions["a"].position.x - centerX, 2) +
        Math.pow(viewState.positions["a"].position.y - centerY, 2),
    );
    const distB = Math.sqrt(
      Math.pow(viewState.positions["b"].position.x - centerX, 2) +
        Math.pow(viewState.positions["b"].position.y - centerY, 2),
    );
    const distC = Math.sqrt(
      Math.pow(viewState.positions["c"].position.x - centerX, 2) +
        Math.pow(viewState.positions["c"].position.y - centerY, 2),
    );

    expect(Math.abs(distA - distB)).toBeLessThan(0.1);
    expect(Math.abs(distB - distC)).toBeLessThan(0.1);
  });

  it("should assign larger size to elements with more children", () => {
    const viewState = createViewState("a{b c d} e");
    const sizeA = viewState.positions["a"].size;
    const sizeE = viewState.positions["e"].size;
    expect(sizeA).toBeGreaterThan(sizeE);
  });

  it("should handle nested elements with proper positioning", () => {
    const viewState = createViewState("a{b c}");
    expect(Object.keys(viewState.positions)).toHaveLength(3);
    expect(viewState.positions["a"]).toBeDefined();
    expect(viewState.positions["a.b"]).toBeDefined();
    expect(viewState.positions["a.c"]).toBeDefined();
    expect(viewState.positions["a.b"].isRecursive).toBeFalsy();
    expect(viewState.positions["a.c"].isRecursive).toBeFalsy();
  });

  it("should mark direct recursion as isRecursive", () => {
    const viewState = createViewState("a{a}");
    expect(Object.keys(viewState.positions)).toHaveLength(2);
    expect(viewState.positions["a"].isRecursive).toBeFalsy();
    expect(viewState.positions["a.a"].isRecursive).toBe(true);
  });

  it("should handle deep self-nesting: a{a{a{a{a}}}}", () => {
    const viewState = createViewState("a{a{a{a{a}}}}");
    expect(Object.keys(viewState.positions)).toHaveLength(2);
    expect(viewState.positions["a"].isRecursive).toBeFalsy();
    expect(viewState.positions["a.a"].isRecursive).toBe(true);
  });

  it("should handle complex nesting with recursion: a{a b c} b[a]", () => {
    const viewState = createViewState("a{a b c} b[a]");
    expect(Object.keys(viewState.positions).length).toBe(10);

    const posA = viewState.positions["a"];
    const posB = viewState.positions["b"];
    expect(posA).toBeDefined();
    expect(posB).toBeDefined();
    expect(posA.isRecursive).toBeFalsy();
    expect(posB.isRecursive).toBeFalsy();

    expect(viewState.positions["a"]).toBeDefined();
    expect(viewState.positions["a.a"]).toBeDefined();
    expect(viewState.positions["a.b"]).toBeDefined();
    expect(viewState.positions["a.c"]).toBeDefined();
    expect(viewState.positions["a.a"].isRecursive).toBe(true);
    expect(viewState.positions["a.b.a"]).toBeDefined();
    expect(viewState.positions["a.b.a"].isRecursive).toBe(true);

    expect(viewState.positions["b"]).toBeDefined();
    expect(viewState.positions["b.a"]).toBeDefined();
    expect(viewState.positions["b.a.a"]).toBeDefined();
    expect(viewState.positions["b.a.b"]).toBeDefined();
    expect(viewState.positions["b.a.c"]).toBeDefined();
    expect(viewState.positions["b.a.a"].isRecursive).toBe(true);
    expect(viewState.positions["b.a.b"].isRecursive).toBe(true);
    expect(viewState.positions["b.a.c"].isRecursive).toBeFalsy();
  });

  it("should handle mutual recursion: a{b} b{a}", () => {
    const viewState = createViewState("a{b} b{a}");
    expect(Object.keys(viewState.positions)).toHaveLength(6);

    expect(viewState.positions["a"].isRecursive).toBeFalsy();
    expect(viewState.positions["b"].isRecursive).toBeFalsy();
    expect(viewState.positions["a.b"].isRecursive).toBeFalsy();
    expect(viewState.positions["b.a"].isRecursive).toBeFalsy();
    expect(viewState.positions["a.b.a"].isRecursive).toBe(true);
    expect(viewState.positions["b.a.b"].isRecursive).toBe(true);
  });

  it("should position children at consistent distance from parent", () => {
    const viewState = createViewState("a{b c}");
    const parentPos = viewState.positions["a"].position;
    const parentRadius = viewState.positions["a"].size / 3.3;

    const distB = Math.sqrt(
      Math.pow(viewState.positions["a.b"].position.x - parentPos.x, 2) +
        Math.pow(viewState.positions["a.b"].position.y - parentPos.y, 2),
    );
    const distC = Math.sqrt(
      Math.pow(viewState.positions["a.c"].position.x - parentPos.x, 2) +
        Math.pow(viewState.positions["a.c"].position.y - parentPos.y, 2),
    );

    expect(Math.abs(distB - parentRadius)).toBeLessThan(0.1);
    expect(Math.abs(distC - parentRadius)).toBeLessThan(0.1);
  });

  it("should compute correct value for leaf elements", () => {
    const viewState = createViewState("leaf");
    expect(viewState.positions["leaf"].value).toBe(1);
  });

  it("should compute higher values for elements with more descendants", () => {
    const viewState = createViewState("a{b} a.b{c d}");
    const valueA = viewState.positions["a"].value;
    const valueB = viewState.positions["a.b"].value;
    const valueC = viewState.positions["a.b.c"].value;
    expect(valueA).toBeGreaterThan(valueB);
    expect(valueB).toBeGreaterThan(valueC);
  });

  it("should position single child at parent center", () => {
    const viewState = createViewState("a{b}");
    const parentPos = viewState.positions["a"].position;
    const childPos = viewState.positions["a.b"].position;
    expect(Math.abs(childPos.x - parentPos.x)).toBeLessThan(0.1);
    expect(Math.abs(childPos.y - parentPos.y)).toBeLessThan(0.1);
  });

  it("should resolve relationships to positioned elements", () => {
    const viewState = createViewState("a-->b");
    expect(viewState.relationships).toHaveLength(1);
    const rel = viewState.relationships[0];
    expect(rel.sourcePath).toBeDefined();
    expect(rel.targetPath).toBeDefined();
    expect(rel.type).toBe("-->");
    expect(viewState.positions[rel.sourcePath]).toBeDefined();
    expect(viewState.positions[rel.targetPath]).toBeDefined();
  });

  it("should handle relationships in nested context", () => {
    const viewState = createViewState("a{b-->c}");
    expect(viewState.relationships).toHaveLength(1);
    const rel = viewState.relationships[0];
    expect(rel.sourcePath).toContain("a");
    expect(rel.targetPath).toContain("a");
  });

  it("should maintain circular properties at nested levels", () => {
    const viewState = createViewState("a{b c d}");
    const parentPos = viewState.positions["a"].position;
    const parentRadius = viewState.positions["a"].size / 3.3;

    const distances = ["a.b", "a.c", "a.d"].map((id) => {
      const pos = viewState.positions[id].position;
      return Math.sqrt(
        Math.pow(pos.x - parentPos.x, 2) + Math.pow(pos.y - parentPos.y, 2),
      );
    });

    distances.forEach((dist) => {
      expect(Math.abs(dist - parentRadius)).toBeLessThan(0.1);
    });
  });

  it("should handle wide shallow tree", () => {
    const viewState = createViewState("a{b c d e f}");
    expect(Object.keys(viewState.positions).length).toBeGreaterThanOrEqual(6);
    expect(viewState.positions["a"]).toBeDefined();
    expect(viewState.positions["a.b"]).toBeDefined();
    expect(viewState.positions["a.f"]).toBeDefined();
  });

  it("should set correct view mode", () => {
    const viewState = createViewState("a{b c}");
    expect(viewState.viewMode).toBe("circular");
  });

  it("should set default zoom and pan", () => {
    const viewState = createViewState("a b c");
    expect(viewState.zoom).toBe(1);
    expect(viewState.pan.x).toBe(0);
    expect(viewState.pan.y).toBe(0);
  });

  it("should handle empty input", () => {
    const viewState = createViewState("");
    expect(Object.keys(viewState.positions)).toHaveLength(0);
    expect(viewState.relationships).toHaveLength(0);
  });

  it("should handle whitespace-only input", () => {
    const viewState = createViewState("   \n  \t  ");
    expect(Object.keys(viewState.positions)).toHaveLength(0);
  });

  it("should adapt positioning to different canvas sizes", () => {
    const layout1 = new CircularLayout();
    const tokens1 = new Lexer("a").tokenize();
    const model1 = new Parser(tokens1).parse();
    const viewState1 = layout1.apply(model1, { width: 400, height: 300 });

    const layout2 = new CircularLayout();
    const tokens2 = new Lexer("a").tokenize();
    const model2 = new Parser(tokens2).parse();
    const viewState2 = layout2.apply(model2, { width: 800, height: 600 });

    expect(viewState1.positions["a"].position.x).toBe(200);
    expect(viewState2.positions["a"].position.x).toBe(400);
  });

  it("should handle complex recursion with multiple branches", () => {
    const viewState = createViewState("a{a b{a{a b c} b}} c{a{b}}");
    expect(viewState.positions["a"]).toBeDefined();
    expect(viewState.positions["a.b"]).toBeDefined();
    expect(viewState.positions["c"]).toBeDefined();
    expect(Object.keys(viewState.positions).length).toBeGreaterThan(3);
  });

  it("should handle anonymous elements", () => {
    const viewState = createViewState("a{{}}");
    expect(Object.keys(viewState.positions).length).toBeGreaterThan(0);
    expect(viewState.positions["a"]).toBeDefined();
  });

  it("should resolve relationships to shallowest path occurrence", () => {
    const viewState = createViewState("a{b} c-->b");
    const rel = viewState.relationships.find((r) => r.type === "-->");
    expect(rel).toBeDefined();
    if (rel) {
      expect(viewState.positions[rel.sourcePath].id).toBe("c");
      expect(viewState.positions[rel.targetPath].id).toBe("b");
    }
  });
});
