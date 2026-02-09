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
  ">": { close: ">", type: "flow" },
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
    this.parseContents(this.model.root);
    return this.model;
  }

  private parseContents(
    parent: Element,
    wrapper: OpeningWrapper = "{",
    defaultType?: ElementType,
  ) {
    let lastEl: Element | null = parent;
    let lastRel: Relationship | null = null;
    let nextToken: TokenType;

    while (this.peek() && this.peek()!.type !== WRAPPERS[wrapper].close) {
      switch (this.peek()?.kind) {
        case "}":
          if (this.peek()?.type !== ">") {
            this.next(); // skip redundant wrapper
            lastEl = null;
            break;
          }
          nextToken = defaultOpeningWrapper(this.next()?.type);
          lastRel = lastRel ?? this.createRelationship(lastEl?.id ?? parent.id);
          lastEl = this.openWrapper(lastRel, null, ">");
          this.parseContents(lastEl, nextToken, "object");
          if (!parent.childIds.includes(lastEl.id))
            parent.childIds.push(lastEl.id);
          break;
        case "{": {
          nextToken = defaultOpeningWrapper(this.next()?.type);
          lastEl = this.openWrapper(lastRel, lastEl, nextToken);
          this.parseContents(lastEl, nextToken);
          break;
        }
        case "-":
        case ">": {
          lastRel = this.parseRelationship(lastEl ?? parent);
          this.model.relationships[lastRel.id] = lastRel;
          lastEl = null;
          break;
        }
        case "x": {
          lastEl = this.parseElement(defaultType ?? WRAPPERS[wrapper].type);

          if (lastRel) {
            lastRel.target = lastEl.id;
            lastRel = null;
          }
          if (!parent.childIds.includes(lastEl.id))
            parent.childIds.push(lastEl.id);
          break;
        }
      }
    }
    this.next();
  }

  private openWrapper = (
    lastRel: Relationship | null,
    lastEl: Element | null,
    nextToken: OpeningWrapper,
  ): Element => {
    if (!lastEl) lastEl = this.createElement(this.genId("anon"));
    if (lastRel) {
      lastRel.target = lastEl.id;
      lastRel = null;
    }
    lastEl.type = WRAPPERS[nextToken].type;
    return lastEl;
  };

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
      source.id,
      defaultRelationshipType(relType),
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
    source: string = "",
    type: RelationshipType = "-->",
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
