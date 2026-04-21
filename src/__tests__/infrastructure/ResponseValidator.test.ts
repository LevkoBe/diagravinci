import { describe, it, expect } from "vitest";
import { ResponseValidator } from "../../infrastructure/ai/ResponseValidator";

describe("ResponseValidator.isValidDiagramSyntax", () => {
  it("returns true for empty input", () => {
    expect(ResponseValidator.isValidDiagramSyntax("")).toBe(true);
  });

  it("returns true for a single element", () => {
    expect(ResponseValidator.isValidDiagramSyntax("a")).toBe(true);
  });

  it("returns true for nested elements", () => {
    expect(ResponseValidator.isValidDiagramSyntax("a{b c}")).toBe(true);
  });

  it("returns true for valid relationship", () => {
    expect(ResponseValidator.isValidDiagramSyntax("a b\na --> b")).toBe(true);
  });

  it("returns true for complex valid diagram", () => {
    const code = `
      system{
        frontend
        backend{
          api
          db[]
        }
      }
      frontend --> api
      api --> db
    `;
    expect(ResponseValidator.isValidDiagramSyntax(code)).toBe(true);
  });

  it("returns true for all element types", () => {
    expect(ResponseValidator.isValidDiagramSyntax("a{} b[] c() e<>")).toBe(
      true,
    );
  });

  it("returns true for labeled relationship", () => {
    expect(ResponseValidator.isValidDiagramSyntax("a b\na --calls--> b")).toBe(
      true,
    );
  });

  it("returns false for excessively deep nesting (> 1000 levels)", () => {
    let code = "root";
    for (let i = 0; i < 1002; i++) code += "{nested";
    expect(ResponseValidator.isValidDiagramSyntax(code)).toBe(false);
  });
});
