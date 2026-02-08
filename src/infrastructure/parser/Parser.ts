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
  private model: DiagramModel;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter((t) => t.type !== "NEWLINE");
    this.model = createEmptyDiagram();
  }

  parse(): DiagramModel {
    const root: Element = this.createElement("root");

    this.parseContents(root);

    const rootIsUsed = Object.values(this.model.relationships).some(
      (rel) => rel.source === root.id || rel.target === root.id,
    );
    if (!rootIsUsed) delete this.model.elements[root.id];

    return this.model;
  }

  private parseContents(parent: Element, wrapper: OpeningWrapper = "{") {
    let lastElement: Element = parent;
    let lastRelationship: Relationship | null = null;

    while (this.peek() && this.peek()!.type !== WRAPPERS[wrapper].close) {
      switch (this.peek()?.kind) {
        case "{": {
          if (lastRelationship) {
            const elem = this.createElement();
            lastRelationship.target = elem.id;
            lastRelationship = null;
          }
          const nextToken = defaultOpeningWrapper(this.next()?.type);
          lastElement.type = WRAPPERS[nextToken].type;
          this.parseContents(lastElement, nextToken);
          break;
        }
        case "}":
          this.next(); // skip redundant wrapper
          break;
        case "-":
        case ">": {
          lastRelationship = this.parseRelationship(lastElement ?? parent);
          this.model.relationships[lastRelationship.id] = lastRelationship;
          break;
        }
        case "x": {
          lastElement = this.parseElement(WRAPPERS[wrapper].type);

          if (lastRelationship) {
            lastRelationship.target = lastElement.id;
            lastRelationship = null;
          }
          parent.childIds.add(lastElement.id);
          break;
        }
      }
    }
    this.next();
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
  ) => {
    const existing = this.model.elements[id];

    if (existing) {
      if (type !== "object") existing.type = type;
      return existing;
    }

    const elem = createElement(id, type);
    this.model.elements[elem.id] = elem;
    return elem;
  };

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
