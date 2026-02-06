import { describe, it, expect } from "vitest";
import { Lexer } from "../../../infrastructure/parser/Lexer";
import { Parser } from "../../../infrastructure/parser/Parser";

function parse(input: string) {
  const tokens = new Lexer(input).tokenize();
  return new Parser(tokens).parse();
}

describe("Parser", () => {
  it("should parse a single element", () => {
    const model = parse("player");

    expect(model.elements.size).toBe(2); // root + player
    expect([...model.elements.values()].some((e) => e.name === "player")).toBe(
      true,
    );
  });

  it("should parse multiple top-level elements", () => {
    const model = parse("player enemy npc");

    const names = [...model.elements.values()].map((e) => e.name);
    expect(names).toContain("player");
    expect(names).toContain("enemy");
    expect(names).toContain("npc");
  });

  it("should parse nested elements using braces", () => {
    const model = parse(`
      player {
        weapon
        armor
      }
    `);

    const player = [...model.elements.values()].find(
      (e) => e.name === "player",
    )!;
    const childrenNames = player.children.map((c) => c.name);

    expect(childrenNames).toEqual(expect.arrayContaining(["weapon", "armor"]));
  });

  it("should support different wrapper types", () => {
    const model = parse(`
      game {
        menu [start options]
        engine (loop)
      }
    `);

    const names = [...model.elements.values()].map((e) => e.name);
    expect(names).toContain("menu");
    expect(names).toContain("start");
    expect(names).toContain("options");
    expect(names).toContain("engine");
    expect(names).toContain("loop");
  });

  it("should parse a simple relationship", () => {
    const model = parse("a --> b");

    expect(model.relationships.size).toBe(1);

    const rel = [...model.relationships.values()][0];
    expect(rel.type).toBe("-->");
  });

  it("should link relationship source and target correctly", () => {
    const model = parse("a --> b");

    const rel = [...model.relationships.values()][0];
    const elements = [...model.elements.values()];

    const source = elements.find((e) => e.id === rel.source)!;
    const target = elements.find((e) => e.id === rel.target)!;

    expect(source.name).toBe("a");
    expect(target.name).toBe("b");
  });

  it("should parse relationship with label after arrow", () => {
    const model = parse("a --uses--> b");

    const rel = [...model.relationships.values()][0];
    expect(rel.label).toBe("uses");
  });

  it("should parse relationship with label before arrow", () => {
    const model = parse("a <--uses-- b");

    const rel = [...model.relationships.values()][0];
    expect(rel.label).toBe("uses");
  });

  it("should attach relationships to the correct parent context", () => {
    const model = parse(`
      player {
        weapon
        player --> weapon
      }
    `);

    expect(model.relationships.size).toBe(1);

    const rel = [...model.relationships.values()][0];
    const source = model.elements.get(rel.source)!;

    expect(source.name).toBe("player");
  });

  it("should parse multiple relationships", () => {
    const model = parse(`
      a --> b
      b --> c
      c --> a
    `);

    expect(model.relationships.size).toBe(3);
  });

  it("should ignore newlines during parsing", () => {
    const model = parse(`
      player
      enemy
      npc
    `);

    const names = [...model.elements.values()].map((e) => e.name);
    expect(names).toContain("player");
    expect(names).toContain("enemy");
    expect(names).toContain("npc");
  });

  it("should throw on unexpected closing wrapper", () => {
    expect(() => parse("player }")).toThrow();
  });

  it("should allow deeply nested structures", () => {
    const model = parse(`
      game {
        level {
          room {
            enemy
          }
        }
      }
    `);

    const names = [...model.elements.values()].map((e) => e.name);
    expect(names).toContain("enemy");
  });
});
