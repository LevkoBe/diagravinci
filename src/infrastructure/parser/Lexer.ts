import {
  TOKEN_LITERALS,
  type Token,
  type TokenType,
  createToken,
  COMMENT_CHAR,
  FLAG_CHAR,
  DIRECTIVE_CHAR,
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

      if (char === COMMENT_CHAR) {
        this.skipComment();
        continue;
      }

      if (char === DIRECTIVE_CHAR) {
        this.advance();
        tokens.push(this.readDirectiveLine());
        continue;
      }

      if (/[ \t\n\r]/.test(char)) {
        if (char === "\n") {
          tokens.push(this.createCurrentToken("NEWLINE", char));
        }
        this.advance();
        continue;
      }

      if (char === FLAG_CHAR) {
        const next = this.input[this.i + 1] ?? "";
        if (next === '"') {
          this.advance(); // skip ':'
          tokens.push(this.readQuoted("FLAG"));
          continue;
        }
        if (/[a-zA-Z_]/.test(next)) {
          this.advance();
          tokens.push(this.readFlagIdentifier());
          continue;
        }
      }

      if (char === '"') {
        tokens.push(this.readQuoted("IDENTIFIER"));
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
      } else if (
        char === "." &&
        /[a-zA-Z_]/.test(this.input[this.i + 1] ?? "")
      ) {
        tokens.push(this.readRelativeIdentifier());
        continue;
      }

      this.advance();
    }

    return tokens;
  }

  private readQuoted(type: "IDENTIFIER" | "FLAG"): Token {
    const start = { row: this.row, col: this.col };
    this.advance(); // skip opening "
    const chars: string[] = [];
    while (this.peek() !== '"' && this.peek() !== "" && this.peek() !== "\n") {
      chars.push(this.peek());
      this.advance();
    }
    if (this.peek() === '"') this.advance(); // skip closing "
    return createToken(type, chars.join(""), start.row, start.col);
  }

  private readIdentifier(): Token {
    const start = { row: this.row, col: this.col };
    const chars: string[] = [];

    while (/[a-z0-9_]/i.test(this.peek())) {
      chars.push(this.peek());
      this.advance();
      if (
        this.peek() === "." &&
        /[a-zA-Z_]/.test(this.input[this.i + 1] ?? "")
      ) {
        chars.push(".");
        this.advance();
      }
    }

    return createToken("IDENTIFIER", chars.join(""), start.row, start.col);
  }

  private readRelativeIdentifier(): Token {
    const start = { row: this.row, col: this.col };
    const chars: string[] = ["."];
    this.advance(); // consume leading '.'
    while (/[a-z0-9_]/i.test(this.peek())) {
      chars.push(this.peek());
      this.advance();
    }
    return createToken("IDENTIFIER", chars.join(""), start.row, start.col);
  }

  private readFlagIdentifier(): Token {
    const start = { row: this.row, col: this.col };
    const chars: string[] = [];

    while (/[a-z0-9_]/i.test(this.peek())) {
      chars.push(this.peek());
      this.advance();
    }

    return createToken("FLAG", chars.join(""), start.row, start.col);
  }

  private readDirectiveLine(): Token {
    const start = { row: this.row, col: this.col };
    const chars: string[] = [];

    while (!["", "\n"].includes(this.peek())) {
      chars.push(this.peek());
      this.advance();
    }

    return createToken(
      "DIRECTIVE",
      chars.join("").trim(),
      start.row,
      start.col,
    );
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
