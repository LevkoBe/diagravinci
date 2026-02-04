import {
  TOKEN_LITERALS,
  type Token,
  type TokenType,
  createToken,
} from "./Token";

export class Lexer {
  private input: string;
  private i: number;
  private row: number;
  private col: number;

  constructor(input: string) {
    this.input = input;
    this.i = 0;
    this.row = 1;
    this.col = 1;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.i < this.input.length) {
      const char = this.peek();

      if (char === "#") {
        this.skipComment();
        continue;
      }

      if (/[ \t\n\r]/.test(char)) {
        if (char === "\n") {
          tokens.push(this.createCurrentToken("NEWLINE", char));
        }
        this.advance();
        continue;
      }

      const literal = TOKEN_LITERALS.find((t) =>
        this.input.startsWith(t, this.i),
      );
      if (literal) {
        tokens.push(this.createCurrentToken(literal, literal));
        this.advance(literal.length);
        continue;
      } else if (/[a-zA-Z_]/.test(char)) {
        tokens.push(this.readIdentifier());
        continue;
      }

      this.advance();
    }

    tokens.push(createToken("EOF", "", this.row, this.col));
    return tokens;
  }

  private readIdentifier(): Token {
    const start = { row: this.row, col: this.col };
    let value = "";

    while (this.i < this.input.length && /[a-zA-Z0-9_]/.test(this.peek())) {
      value += this.peek();
      this.advance();
    }

    return createToken("IDENTIFIER", value, start.row, start.col);
  }

  private skipComment(): void {
    while (!["\n", ""].includes(this.peek())) this.advance();
  }

  private peek = () => this.input[this.i] ?? "";

  private advance(n = 1): string {
    let last = "";
    while (n--) {
      last = this.input[this.i++] ?? "";
      if (last === "\n") {
        this.row++;
        this.col = 1;
      } else this.col++;
    }
    return last;
  }

  private createCurrentToken = (type: TokenType, value: string) =>
    createToken(type, value, this.row, this.col);
}
