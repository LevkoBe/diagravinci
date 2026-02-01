import type { Token, TokenType, createToken } from "./Token";

export class Lexer {
  private input: string;
  private position: number;
  private line: number;
  private column: number;

  constructor(input: string) {
    this.input = input;
    this.position = 0;
    this.line = 1;
    this.column = 1;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    // TODO: implement tokenization
    return tokens;
  }

  private advance(): string {
    // TODO: move one character forward
    return "";
  }
}
