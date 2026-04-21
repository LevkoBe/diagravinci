import {
  defaultOpeningWrapper,
  defaultRelationshipType,
  type ClosingWrapper,
  type OpeningWrapper,
  type RelationshipType,
  type Token,
  type TokenType,
} from "./Token";
import { AppConfig } from "../../config/appConfig";
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
import type { FilterPreset, FilterMode } from "../../domain/models/Selector";

const WRAPPERS: Record<
  OpeningWrapper,
  { close: ClosingWrapper; type: ElementType; defaultChildType: ElementType }
> = {
  "{": { close: "}", type: "object", defaultChildType: "object" },
  "[": { close: "]", type: "collection", defaultChildType: "object" },
  "(": { close: ")", type: "function", defaultChildType: "function" },
  "<": { close: ">", type: "choice", defaultChildType: "choice" },
  ">": { close: ">", type: "flow", defaultChildType: "object" },
  "|": { close: "|", type: "state", defaultChildType: "object" },
};

const VALID_MODES: FilterMode[] = ["color", "dim", "hide"];

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
    depth = 0,
  ) {
    if (depth > AppConfig.parser.MAX_NESTING_DEPTH) {
      throw new Error("Maximum parser nesting depth exceeded");
    }

    let lastEl: Element | null = null;
    let lastRel: Relationship | null = null;

    while (this.peek() && this.peek()!.type !== WRAPPERS[wrapper].close) {
      switch (this.peek()?.kind) {
        case "}":
          if (this.peek()?.type === "|") {
            lastEl = this.parseOpeningWrapper(parent, lastRel, lastEl, depth, "|");
            lastRel = null;
            break;
          }
          if (this.peek()?.type !== ">") {
            this.next();
            lastEl = null;
            break;
          }
          lastRel = lastRel ?? this.createRelationship(lastEl?.id ?? parent.id);
          lastEl = this.parseOpeningWrapper(parent, lastRel, null, depth, ">");
          lastRel = this.createRelationship(lastEl.id);
          break;
        case "{": {
          lastEl = this.parseOpeningWrapper(parent, lastRel, lastEl, depth);
          lastRel = null;
          break;
        }
        case "-":
        case ">": {
          lastRel = this.parseRelationship(lastEl ?? parent, lastRel);
          lastEl = null;
          break;
        }
        case "!": {
          this.parseDirective(this.next()!.value);
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
        default:
          this.next();
          break;
      }
    }
    if (lastRel) this.updateRelationship(lastRel.id, parent.id);
    this.next();
  }

  private parseOpeningWrapper(
    parent: Element,
    lastRel: Relationship | null,
    lastEl: Element | null,
    depth: number,
    nextToken?: OpeningWrapper,
  ): Element {
    const next = this.next();
    nextToken = nextToken ?? defaultOpeningWrapper(next?.type);

    if (!lastEl) lastEl = this.createElement(this.genId(parent, "anon"));
    if (lastRel) this.updateRelationship(lastRel.id, lastEl.id);
    lastEl.type = WRAPPERS[nextToken].type;
    this.parseContents(lastEl, nextToken, depth + 1);
    if (!parent.childIds.includes(lastEl.id)) parent.childIds.push(lastEl.id);
    return lastEl;
  }

  private parseElement = (defaultType?: ElementType): Element => {
    const el = this.createElement(this.next()?.value, defaultType);
    while (this.peek()?.type === "FLAG") {
      const flag = this.next()!.value;
      if (!el.flags) el.flags = [];
      if (!el.flags.includes(flag)) el.flags.push(flag);
    }
    return el;
  };

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

  private parseDirective(raw: string): void {
    const parts = raw.trim().split(/\s+/);
    const type = parts[0];
    if (type !== "selector") return;

    const kvs: Record<string, string> = {};
    for (let i = 1; i < parts.length; i++) {
      const eq = parts[i].indexOf("=");
      if (eq === -1) continue;
      kvs[parts[i].slice(0, eq)] = parts[i].slice(eq + 1);
    }

    const name = kvs["name"];
    if (!name) return;

    const rawMode = kvs["mode"];
    const mode: FilterMode = (VALID_MODES as string[]).includes(rawMode ?? "")
      ? (rawMode as FilterMode)
      : "color";

    const preset: FilterPreset = {
      id: name,
      label: name,
      selector: {
        atoms: [
          {
            id: `${name}_atom`,
            types: [],
            path: kvs["path"] ?? "",
            meta: { kind: "raw" },
          },
        ],
        combiner: "1",
      },
      mode,
      isActive: true,
      color: kvs["color"] ?? "#888888",
    };

    if (!(this.model.filterPresets ?? []).some((p) => p.id === name)) {
      (this.model.filterPresets ??= []).push(preset);
    }
  }

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
      this.genId(null, "rel"),
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

  private genId = (parent: Element | null, prefix: string = "anon") =>
    parent
      ? `${prefix}_${parent.childIds.length + 1}`
      : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
