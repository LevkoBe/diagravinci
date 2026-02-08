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
import {
  type Element,
  type ElementType,
  createElement,
} from "../../domain/models/Element";
import {
  type Relationship,
  createRelationship,
} from "../../domain/models/Relationship";

const WRAPPERS: Record<
  OpeningWrapper,
  { close: ClosingWrapper; type: ElementType }
> = {
  "{": { close: "}", type: "object" },
  "[": { close: "]", type: "state" },
  "(": { close: ")", type: "function" },
  "<": { close: ">", type: "choice" },
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
    e.forEach((elem) => {
      if (!model.elements.has(elem.id)) model.elements.set(elem.id, elem);
      else
        elem.childIds.forEach((child) =>
          model.elements.get(elem.id)!.childIds.add(child),
        );
    });
    r.forEach((rel) => model.relationships.set(rel.id, rel));

    return model;
  }

  private parseContents(
    parent: Element,
    wrapper: OpeningWrapper = "{",
  ): {
    e: Element[];
    r: Relationship[];
  } {
    const elements: Element[] = [];
    const relationships: Relationship[] = [];
    let lastElement: Element | null = parent;
    let lastRelationship: Relationship | null = null;

    while (this.peek() && this.peek()!.type !== WRAPPERS[wrapper].close) {
      let newContents: { e: Element[]; r: Relationship[] } = { e: [], r: [] };
      let nextToken;

      switch (this.peek()?.kind) {
        case "{":
          nextToken = defaultOpeningWrapper(this.next()?.type);
          lastElement.type = WRAPPERS[nextToken].type;
          newContents = this.parseContents(
            elements[elements.length - 1] ?? parent,
            nextToken,
          );
          break;
        case "}":
          // these are redundant wrappers
          this.next();
          break;
        case "-":
        case ">":
          newContents.r = [this.parseRelationship(lastElement ?? parent)];
          break;
        case "x":
          lastElement = this.parseElement(WRAPPERS[wrapper].type);
          newContents.e.push(lastElement);
          break;
      }
      newContents.e.forEach((e) => {
        if (lastRelationship) {
          lastRelationship.target = e.id;
          lastRelationship = null;
        }
        elements.push(e);
        parent.childIds.add(e.id);
      });
      newContents.r.forEach((r) => {
        relationships.push(r);
        lastRelationship = r;
      });
    }
    this.next();
    return { e: elements, r: relationships };
  }

  private parseElement = (defaultType?: ElementType): Element =>
    this.createElement(this.next()?.value, defaultType);
  private parseRelationship = (source: Element): Relationship => {
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
      source.id,
      source.id,
      label,
    );
  };

  private createElement = (
    id: string = "[placeholder]",
    type: ElementType = "object",
  ) => createElement(id, type);
  private createRelationship = (
    type: RelationshipType = "-->",
    source: string = "",
    target: string = "",
    label: string = "",
  ) => createRelationship(this.genId("rel"), source, target, type, label);

  private peek = (offset = 0): Token | undefined =>
    this.tokens[this.pos + offset];
  private next = (): Token | undefined => this.tokens[this.pos++];
  private nextLike = (pattern: string) =>
    pattern.split("").every((k, i) => this.peek(i)?.kind === k);

  private genId = (prefix: string = "elem") =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
