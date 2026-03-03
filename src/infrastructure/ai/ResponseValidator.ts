import { Lexer } from "../parser/Lexer";
import { Parser } from "../parser/Parser";

export class ResponseValidator {
  static isValidDiagramSyntax(code: string): boolean {
    try {
      const tokens = new Lexer(code).tokenize();
      new Parser(tokens).parse();
      return true;
    } catch (e) {
      console.warn("AI generated invalid syntax:", (e as Error).message);
      return false;
    }
  }
}
