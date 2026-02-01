export type TokenType =
  | "IDENTIFIER"
  | "{"
  | "}"
  | "["
  | "]"
  | "("
  | ")"
  | "<"
  | ">"
  | "ARROW"
  | "WHITESPACE"
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
