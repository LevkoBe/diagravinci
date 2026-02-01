import { Token } from "./Token";
import { ASTNode, ElementNode, RelationshipNode } from "./ASTNode";

export class Parser {
  private tokens: Token[];
  private position: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.position = 0;
  }

  parse(): ASTNode[] {
    const nodes: ASTNode[] = [];
    // TODO: implement recursive descent parser
    return nodes;
  }

  private consume(): Token | null {
    // Consume token & advance
    return null;
  }
}
