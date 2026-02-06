import {
  defaultOpeningWrapper,
  defaultRelationshipType,
  type ClosingWrapper,
  type OpeningWrapper,
  type RelationshipType,
  type Token,
  type TokenType,
} from "./Token";
import {
  type DiagramModel,
  createEmptyDiagram,
} from "../../domain/models/DiagramModel";
import { type Element, createElement } from "../../domain/models/Element";
import {
  type Relationship,
  createRelationship,
} from "../../domain/models/Relationship";

const WRAPPERS: Record<OpeningWrapper, ClosingWrapper> = {
  "{": "}",
  "[": "]",
  "(": ")",
  "<": ">",
};

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter((t) => t.type !== "NEWLINE");
  }

  parse(): DiagramModel {
    const model = createEmptyDiagram();
    const root: Element = this.createElement("root");

    const { e, r } = this.parseContents(root);
    e.forEach((elem) => model.elements.set(elem.id, elem));
    r.forEach((rel) => model.relationships.set(rel.id, rel));

    return model;
  }

  private parseContents(
    parent: Element,
    close: TokenType = "}",
  ): {
    e: Element[];
    r: Relationship[];
  } {
    const elements: Element[] = [];
    const relationships: Relationship[] = [];

    while (this.peek() && this.peek()!.type !== close) {
      let newContents: { e: Element[]; r: Relationship[] } = { e: [], r: [] };

      switch (this.peek()?.kind) {
        case "{":
          newContents = this.parseContents(
            elements[elements.length - 1] ?? parent,
            WRAPPERS[defaultOpeningWrapper(this.next()?.type)],
          );
          break;
        case "}":
          throw new Error(
            `Closing wrapper of type ${this.peek()?.type} should have been closed.`,
          );
        case "-":
        case ">":
          newContents.r = [this.parseRelationshipWithTarget(parent.id)];
          break;
        case "x":
          newContents.e = [this.parseElement()];
          break;
      }
      newContents.e.forEach((e) => {
        elements.push(e);
        parent.children.push(e);
      });
      newContents.r.forEach((r) => relationships.push(r));
    }
    return { e: elements, r: relationships };
  }

  private parseElement = (): Element => this.createElement(this.next()?.value);
  private parseRelationshipWithTarget = (sourceId: string): Relationship => {
    let label: string | undefined = undefined;
    let relType: TokenType | undefined = undefined;

    if (this.nextLike("-x>")) {
      this.next();
      label = this.next()?.value;
      relType = this.next()?.type;
    } else if (this.nextLike(">x-")) {
      relType = this.next()?.type;
      label = this.next()?.value;
      this.next();
    } else {
      relType = this.next()?.type;
    }
    return this.createRelationship(
      defaultRelationshipType(relType),
      sourceId,
      this.createElement(this.next()?.value).id,
      label,
    );
  };

  private createElement = (name: string = "[no-name]") =>
    createElement(this.genId(), name, "object");
  private createRelationship = (
    type: RelationshipType = "-->",
    source: string = "",
    target: string = "",
    label: string = "",
  ) => createRelationship(this.genId("rel"), source, target, type, label);

  private peek = (offset = 0): Token | undefined =>
    this.tokens[this.pos + offset];
  private next = (): Token | undefined => this.tokens[this.pos++];
  private nextLike(pattern: string, at: number = 0) {
    return pattern
      .split("")
      .every((k, i) => this.peek(this.pos + at + i)?.kind === k);
  }

  private genId = (prefix: string = "elem") =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
