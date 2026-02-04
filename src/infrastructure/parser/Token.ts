export const TOKEN_LITERALS = [
  "{",
  "}",
  "[",
  "]",
  "(",
  ")",
  "<",
  ">",
  "-->",
  "--|>",
  "..|>",
  "--",
  "o--",
  "*--",
] as const;

export type TokenType =
  | (typeof TOKEN_LITERALS)[number]
  | "IDENTIFIER"
  | "WHITESPACE"
  | "NEWLINE"
  | "COMMENT"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export function createToken(
  type: TokenType,
  value: string,
  line: number,
  column: number,
): Token {
  return {
    type,
    value,
    line,
    column,
  };
}
