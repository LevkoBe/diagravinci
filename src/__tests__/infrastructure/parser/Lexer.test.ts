import { describe, it, expect } from "vitest";
import { Lexer } from "../../../infrastructure/parser/Lexer";

describe("Lexer", () => {
  it("should tokenize a word", () => {
    const tokens = new Lexer("word").tokenize();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("IDENTIFIER");
    expect(tokens[0].value).toBe("word");
  });

  it("should tokenize a list of objects", () => {
    const input = "should tokenize a list of objects";
    const tokens = new Lexer(input).tokenize();
    const identifiers = tokens.filter((t) => t.type === "IDENTIFIER");
    expect(identifiers).toHaveLength(input.split(" ").length);
  });

  it("should tokenize an object", () => {
    const tokens = new Lexer("player{}").tokenize();
    expect(tokens).toHaveLength(3);
    expect(tokens[0].type).toBe("IDENTIFIER");
    expect(tokens[0].value).toBe("player");
    expect(tokens[1].type).toBe("{");
    expect(tokens[1].value).toBe("{");
    expect(tokens[2].type).toBe("}");
    expect(tokens[2].value).toBe("}");
  });

  it("should tokenize element with properties", () => {
    const tokens = new Lexer("player{username password}").tokenize();

    const identifiers = tokens.filter((t) => t.type === "IDENTIFIER");
    expect(identifiers).toHaveLength(3);
    expect(identifiers[0].value).toBe("player");
    expect(identifiers[1].value).toBe("username");
    expect(identifiers[2].value).toBe("password");
  });

  it("should tokenize state elements with brackets", () => {
    const tokens = new Lexer("game[menu playing]").tokenize();

    expect(tokens.some((t) => t.type === "[")).toBe(true);
    expect(tokens.some((t) => t.type === "]")).toBe(true);
  });

  it("should tokenize function elements with parentheses", () => {
    const tokens = new Lexer("calculate()").tokenize();

    expect(tokens.some((t) => t.type === "(")).toBe(true);
    expect(tokens.some((t) => t.type === ")")).toBe(true);
  });

  it("should tokenize arrow relationships", () => {
    const tokens = new Lexer("a --> b").tokenize();

    expect(tokens.some((t) => t.type === "-->")).toBe(true);
  });

  it("should tokenize pipe arrow relationships", () => {
    const tokens = new Lexer("a --|> b").tokenize();

    expect(tokens.some((t) => t.type === "--|>")).toBe(true);
  });

  it("should skip comments", () => {
    const tokens = new Lexer("# This is a comment\nplayer{}").tokenize();

    const identifiers = tokens.filter((t) => t.type === "IDENTIFIER");
    expect(identifiers).toHaveLength(1);
    expect(identifiers[0].value).toBe("player");
  });

  it("should handle multiline input", () => {
    const input = `player{
      username
      password
    }`;

    const tokens = new Lexer(input).tokenize();

    const identifiers = tokens.filter((t) => t.type === "IDENTIFIER");
    expect(identifiers.length).toBe(3);
  });

  it("should tokenize composition relationship", () => {
    const tokens = new Lexer("whole *-- part").tokenize();

    expect(tokens.some((t) => t.type === "*--")).toBe(true);
  });

  it("should tokenize aggregation relationship", () => {
    const tokens = new Lexer("container o-- item").tokenize();
    expect(tokens.some((t) => t.type === "o--")).toBe(true);
  });

  it("should tokenize implementation relationship", () => {
    const tokens = new Lexer("class ..|> interface").tokenize();
    expect(tokens.some((t) => t.type === "..|>")).toBe(true);
  });

  it("should tokenize lines and arrows", () => {
    const tokens = new Lexer("->-<------>-<-").tokenize();
    expect(tokens.some((t) => t.type === ">")).toBe(true);
    expect(tokens.some((t) => t.type === "<--")).toBe(true);
    expect(tokens.some((t) => t.type === "--")).toBe(true);
    expect(tokens.some((t) => t.type === "-->")).toBe(true);
    expect(tokens.some((t) => t.type === "<")).toBe(true);
  });

  it("should tokenize relationship with a comment", () => {
    const tokens = new Lexer(
      "a --comment--> b # relationship comment",
    ).tokenize();
    expect(tokens[0].type).toBe("IDENTIFIER");
    expect(tokens[1].type).toBe("--");
    expect(tokens[2].type).toBe("IDENTIFIER");
    expect(tokens[3].type).toBe("-->");
    expect(tokens[4].type).toBe("IDENTIFIER");
  });

  it("should not tokenize comment", () => {
    const tokens = new Lexer("# full line comment").tokenize();
    expect(tokens).toHaveLength(0);
  });

  it("should tokenize improperly spaced input", () => {
    const tokens = new Lexer(`  player { username   password }
            game{players[player]rankings}*--          player`).tokenize();
    expect(tokens.filter((t) => t.type === "IDENTIFIER").length).toBe(8);
    expect(tokens.filter((t) => /[{}[\]]/.test(t.type)).length).toBe(6);
    expect(tokens[5].type).toBe("NEWLINE");
  });

  it("should not tokenize gibberish", () => {
    const tokens = new Lexer("!@#$%^&*()_+").tokenize();
    expect(tokens.length).toBe(0);
  });

  it("should tokenize gibberish", () => {
    const input = "}{}{{}{}{}<>><<][][}{}{{}{((()((()(>{<<()(()()(";
    const tokens = new Lexer(input).tokenize();
    expect(tokens.length).toBe(input.length);
  });

  it("should tokenize relationship with label", () => {
    const tokens = new Lexer("player o--owns-- tool").tokenize();
    expect(tokens.some((t) => t.type === "o--")).toBe(true);
  });
});
