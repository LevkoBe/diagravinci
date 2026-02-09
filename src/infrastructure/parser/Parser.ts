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
  { close: ClosingWrapper; type: ElementType; defaultChildType: ElementType }
> = {
  "{": { close: "}", type: "object", defaultChildType: "object" },
  "[": { close: "]", type: "state", defaultChildType: "state" },
  "(": { close: ")", type: "function", defaultChildType: "function" },
  "<": { close: ">", type: "choice", defaultChildType: "choice" },
  ">": { close: ">", type: "flow", defaultChildType: "object" },
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

  private parseContents(parent: Element, wrapper: OpeningWrapper = "{") {
    let lastEl: Element | null = null;
    let lastRel: Relationship | null = null;

    while (this.peek() && this.peek()!.type !== WRAPPERS[wrapper].close) {
      switch (this.peek()?.kind) {
        case "}":
          if (this.peek()?.type !== ">") {
            this.next(); // skip redundant wrapper
            lastEl = null;
            break;
          }
          lastRel = lastRel ?? this.createRelationship(lastEl?.id ?? parent.id);
          lastEl = this.parseOpeningWrapper(parent, lastRel, null, ">");
          lastRel = this.createRelationship(lastEl.id);
          break;
        case "{": {
          lastEl = this.parseOpeningWrapper(parent, lastRel, lastEl);
          lastRel = null;
          break;
        }
        case "-":
        case ">": {
          lastRel = this.parseRelationship(lastEl ?? parent, lastRel);
          lastEl = null;
          break;
        }
        case "x": {
          lastEl = this.parseElement(WRAPPERS[wrapper].defaultChildType);

          if (lastRel) this.updateRelationship(lastRel.id, lastEl.id);
          lastRel = null;
          if (!parent.childIds.includes(lastEl.id))
            parent.childIds.push(lastEl.id);
          break;
        }
      }
    }
    if (lastRel) this.updateRelationship(lastRel.id, parent.id);
    this.next();
  }

  private parseOpeningWrapper(
    parent: Element,
    lastRel: Relationship | null,
    lastEl: Element | null,
    nextToken?: OpeningWrapper,
  ): Element {
    const next = this.next();
    nextToken = nextToken ?? defaultOpeningWrapper(next?.type);

    if (!lastEl) lastEl = this.createElement(this.genId("anon"));
    if (lastRel) this.updateRelationship(lastRel.id, lastEl.id);
    lastEl.type = WRAPPERS[nextToken].type;
    this.parseContents(lastEl, nextToken);
    if (!parent.childIds.includes(lastEl.id)) parent.childIds.push(lastEl.id);
    return lastEl;
  }

  private parseElement = (defaultType?: ElementType): Element =>
    this.createElement(this.next()?.value, defaultType);

  private parseRelationship = (
    source: Element,
    lastRel: Relationship | null,
  ): Relationship => {
    let label: string | undefined = undefined;
    let relType: TokenType | undefined = undefined;

    if (this.nextLike("-x>") || this.nextLike("-x-")) {
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

    if (lastRel) {
      lastRel.label = label ?? lastRel.label;
      lastRel.type = defaultRelationshipType(relType) ?? lastRel.type;
      return lastRel;
    }
    return this.createRelationship(
      source.id,
      defaultRelationshipType(relType),
      source.id,
      label,
    );
  };

  private updateRelationship(id: string, newTarget: string) {
    const rel = this.model.relationships[id];
    rel.target = newTarget;
    rel.id = `${rel.source}${rel.type}${rel.target}`;

    delete this.model.relationships[id];
    this.model.relationships[rel.id] = rel;
  }

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

  private createRelationship(
    source: string = "",
    type: RelationshipType = "-->",
    target: string = "",
    label: string = "",
  ): Relationship {
    const rel = createRelationship(
      this.genId("rel"),
      source,
      target,
      type,
      label,
    );
    this.model.relationships[rel.id] = rel;
    return rel;
  }

  private peek = (offset = 0): Token | undefined =>
    this.tokens[this.pos + offset];
  private next = (): Token | undefined => this.tokens[this.pos++];
  private nextLike = (pattern: string) =>
    pattern.split("").every((k, i) => this.peek(i)?.kind === k);

  private genId = (prefix: string = "elem") =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
