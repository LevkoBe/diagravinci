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
import type {
  FilterPreset,
  FilterMode,
  SelectorAtom,
} from "../../domain/models/Selector";

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

function splitDirective(raw: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && /\s/.test(ch)) {
      if (cur) {
        parts.push(cur);
        cur = "";
      }
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

function parseKVs(parts: string[], startIdx: number): Record<string, string> {
  const kvs: Record<string, string> = {};
  for (let i = startIdx; i < parts.length; i++) {
    const eq = parts[i].indexOf("=");
    if (eq === -1) continue;
    kvs[parts[i].slice(0, eq)] = parts[i].slice(eq + 1);
  }
  return kvs;
}

export class Parser {
  private tokens: Token[];
  private pos = 0;
  private model: DiagramModel;
  private validationErrors: string[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter((t) => t.type !== "NEWLINE");
    this.model = createEmptyDiagram();
  }

  parse(): DiagramModel {
    this.parseContents(this.model.root, "");
    this.validatePaths();
    if (this.validationErrors.length)
      this.model.validationErrors = this.validationErrors;
    return this.model;
  }

  private parseContents(
    parent: Element,
    parentPath: string,
    wrapper: OpeningWrapper = "{",
    depth = 0,
  ) {
    if (depth > AppConfig.parser.MAX_NESTING_DEPTH) {
      throw new Error("Maximum parser nesting depth exceeded");
    }

    let lastEl: Element | null = null;
    let lastPath: string | null = null;
    let lastRel: Relationship | null = null;

    while (this.peek() && this.peek()!.type !== WRAPPERS[wrapper].close) {
      switch (this.peek()?.kind) {
        case "}":
          if (this.peek()?.type === "|") {
            lastEl = this.parseOpeningWrapper(
              parent,
              parentPath,
              lastRel,
              lastEl,
              depth,
              "|",
            );
            lastPath = lastEl.id;
            lastRel = null;
            break;
          }
          if (this.peek()?.type !== ">") {
            this.next();
            lastEl = null;
            lastPath = null;
            break;
          }
          lastRel = lastRel ?? this.createRelationship(lastPath ?? parent.id);
          lastEl = this.parseOpeningWrapper(
            parent,
            parentPath,
            lastRel,
            null,
            depth,
            ">",
          );
          lastPath = lastEl.id;
          lastRel = this.createRelationship(lastEl.id);
          break;
        case "{": {
          lastEl = this.parseOpeningWrapper(
            parent,
            parentPath,
            lastRel,
            lastEl,
            depth,
          );
          lastPath = lastEl.id;
          lastRel = null;
          break;
        }
        case "-":
        case ">": {
          lastRel = this.parseRelationship(lastPath ?? parent.id, lastRel);
          lastEl = null;
          lastPath = null;
          break;
        }
        case "!": {
          this.parseDirective(this.next()!.value);
          break;
        }
        case "x": {
          if (this.peek()?.value === "_") {
            this.next();
            while (this.peek()?.type === "FLAG") this.next();
            if (lastRel) this.updateRelationship(lastRel.id, "_");
            lastRel = null;
            lastEl = null;
            lastPath = null;
            break;
          }

          const tokenValue = this.peek()?.value ?? "";
          const isPathToken =
            tokenValue.startsWith(".") || tokenValue.includes(".");

          if (isPathToken) {
            this.next();
            while (this.peek()?.type === "FLAG") this.next();
            const resolved = this.resolvePathRef(tokenValue, parentPath);
            if (lastRel) {
              if (resolved) {
                this.updateRelationship(lastRel.id, resolved);
              } else {
                this.cancelRelationship(lastRel.id);
                this.validationErrors.push(
                  `Unresolved path reference: "${tokenValue}"`,
                );
              }
              lastRel = null;
              lastEl = null;
              lastPath = null;
            } else {
              lastPath = resolved;
              if (resolved) {
                const leafId = resolved.split(".").pop()!;
                lastEl = this.model.elements[leafId] ?? null;
              } else {
                lastEl = null;
              }
            }
          } else {
            const existedBefore = !!this.model.elements[tokenValue];
            lastEl = this.parseElement(WRAPPERS[wrapper].defaultChildType);
            const isRelSource =
              !lastRel &&
              (this.peek()?.kind === "-" || this.peek()?.kind === ">");
            const isRelTarget = !!lastRel;
            const inRelContext = isRelSource || isRelTarget;

            const localPath = parentPath
              ? `${parentPath}.${lastEl.id}`
              : lastEl.id;
            lastPath = inRelContext && !existedBefore ? localPath : lastEl.id;

            if (isRelTarget) {
              this.updateRelationship(lastRel!.id, lastPath);
              lastRel = null;
            }

            if (!inRelContext || !existedBefore) {
              if (!parent.childIds.includes(lastEl.id))
                parent.childIds.push(lastEl.id);
            }
          }
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
    parentPath: string,
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

    const childPath = parentPath ? `${parentPath}.${lastEl.id}` : lastEl.id;
    this.parseContents(lastEl, childPath, nextToken, depth + 1);
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
    sourcePath: string,
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
      sourcePath,
      defaultRelationshipType(relType),
      sourcePath,
      label,
    );
  };

  private resolvePathRef(raw: string, parentPath: string): string | null {
    if (raw.startsWith(".")) {
      const localId = raw.slice(1);
      return parentPath ? `${parentPath}.${localId}` : localId;
    }
    if (raw.includes(".")) {
      return raw;
    }
    return null;
  }

  private validatePaths(): void {
    const toRemove: string[] = [];
    for (const rel of Object.values(this.model.relationships)) {
      let relInvalid = false;
      for (const pathStr of [rel.source, rel.target]) {
        if (!pathStr.includes(".")) continue;
        const parts = pathStr.split(".");
        let el = this.model.elements[parts[0]];
        let invalid = false;
        for (let i = 1; i < parts.length; i++) {
          if (!el || !el.childIds.includes(parts[i])) {
            this.validationErrors.push(
              `Path "${pathStr}" could not be resolved: "${parts[i]}" is not a child of "${parts[i - 1]}"`,
            );
            invalid = true;
            break;
          }
          el = this.model.elements[parts[i]];
        }
        if (invalid) relInvalid = true;
      }
      if (relInvalid) toRemove.push(rel.id);
    }
    for (const id of toRemove) delete this.model.relationships[id];
  }

  private cancelRelationship(id: string): void {
    delete this.model.relationships[id];
  }

  private parseDirective(raw: string): void {
    const parts = splitDirective(raw.trim());
    const type = parts[0];
    if (type === "atom") this.parseAtomDirective(parts);
    else if (type === "selector") this.parseSelectorDirective(parts);
  }

  private parseAtomDirective(parts: string[]): void {
    const kvs = parseKVs(parts, 1);
    const id = kvs["id"];
    if (!id) return;

    const { id: _id, name, ...patternKvs } = kvs;
    const atom: SelectorAtom = {
      id,
      ...(name ? { name } : {}),
      patterns: patternKvs,
    };

    if (!(this.model.atoms ?? []).some((a) => a.id === id)) {
      (this.model.atoms ??= []).push(atom);
    }
  }

  private parseSelectorDirective(parts: string[]): void {
    const kvs = parseKVs(parts, 1);
    const name = kvs["name"];
    if (!name) return;

    const rawMode = kvs["mode"];
    const mode: FilterMode = (VALID_MODES as string[]).includes(rawMode ?? "")
      ? (rawMode as FilterMode)
      : "color";

    const preset: FilterPreset = {
      id: name,
      label: name,
      selector: { combiner: kvs["combiner"] ?? "" },
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
