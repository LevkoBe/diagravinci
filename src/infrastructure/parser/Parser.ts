import {
  BACKWARD_TO_CANONICAL,
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
  Group,
  SelectorMode,
  Session,
} from "../../domain/models/Selector";
import { toGroupId } from "../../domain/models/Selector";

const WRAPPERS: Record<
  OpeningWrapper,
  { close: ClosingWrapper; type: ElementType; defaultChildType: ElementType }
> = {
  "{": { close: "}", type: "object", defaultChildType: "object" },
  "[": { close: "]", type: "collection", defaultChildType: "object" },
  "(": { close: ")", type: "function", defaultChildType: "object" },
  "<": { close: ">", type: "choice", defaultChildType: "object" },
  ">": { close: ">", type: "flow", defaultChildType: "object" },
  "|": { close: "|", type: "state", defaultChildType: "object" },
};

const VALID_MODES: SelectorMode[] = ["color", "dim", "hide", "off"];

function wrapperSuffixFor(type: ElementType): string {
  switch (type) {
    case "object":
      return "{}";
    case "collection":
      return "[]";
    case "function":
      return "()";
    case "state":
      return "||";
    case "choice":
      return "<>";
    case "flow":
      return ">>";
  }
}

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
    this.tokens = tokens;
    this.model = createEmptyDiagram();
  }

  parse(): DiagramModel {
    this.parseContents(this.model.root, "");
    this.embedTypesInIds();
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
    let lastElWasWrapped = false;
    let pendingSourceQuantifier: string | undefined = undefined;
    let crossedNewline = false;

    while (this.peek() && this.peek()!.type !== WRAPPERS[wrapper].close) {
      if (this.peek()!.type === "NEWLINE") {
        this.next();
        pendingSourceQuantifier = undefined;
        if (lastRel) {
          const src = this.model.elements[lastRel.source];
          if (src?.type === "flow") {
            this.cancelRelationship(lastRel.id);
            lastRel = null;
          }
        }
        lastElWasWrapped = false;
        crossedNewline = true;
        continue;
      }
      const hitNewlineBoundary = crossedNewline;
      crossedNewline = false;
      switch (this.peek()?.kind) {
        case "}": {
          const peekType = this.peek()?.type;
          if (peekType === "|") {
            lastEl = this.parseOpeningWrapper(
              parent,
              parentPath,
              lastRel,
              lastEl,
              depth,
              "|",
              lastElWasWrapped,
            );
            lastPath = parentPath ? `${parentPath}.${lastEl.id}` : lastEl.id;
            lastRel = null;
            lastElWasWrapped = true;
            break;
          }
          if (peekType !== ">") {
            this.next();
            lastEl = null;
            lastPath = null;
            lastElWasWrapped = false;
            break;
          }
          if (hitNewlineBoundary) {
            lastEl = null;
            lastPath = null;
            lastRel = null;
          }
          if (
            lastEl !== null &&
            lastRel === null &&
            !lastElWasWrapped &&
            (lastEl.type === "object" || lastEl.type === "flow")
          ) {
            lastEl = this.parseOpeningWrapper(
              parent,
              parentPath,
              null,
              lastEl,
              depth,
              ">",
            );
            lastPath = parentPath ? `${parentPath}.${lastEl.id}` : lastEl.id;
            lastRel = this.createRelationship(lastPath, "..>");
            lastElWasWrapped = true;
          } else if (lastRel === null && lastPath === null) {
            lastEl = this.parseOpeningWrapper(
              parent,
              parentPath,
              null,
              null,
              depth,
              ">",
            );
            lastPath = parentPath ? `${parentPath}.${lastEl.id}` : lastEl.id;
            lastRel = this.createRelationship(lastPath, "..>");
            lastElWasWrapped = true;
          } else {
            lastRel =
              lastRel ?? this.createRelationship(lastPath ?? parent.id, "..>");
            lastEl = this.parseOpeningWrapper(
              parent,
              parentPath,
              lastRel,
              null,
              depth,
              ">",
            );
            lastPath = parentPath ? `${parentPath}.${lastEl.id}` : lastEl.id;
            lastRel = this.createRelationship(lastPath, "..>");
            lastElWasWrapped = true;
          }
          break;
        }
        case "{": {
          lastEl = this.parseOpeningWrapper(
            parent,
            parentPath,
            lastRel,
            lastEl,
            depth,
            undefined,
            lastElWasWrapped,
          );
          lastPath = parentPath ? `${parentPath}.${lastEl.id}` : lastEl.id;
          lastRel = null;
          lastElWasWrapped = true;
          break;
        }
        case "q": {
          pendingSourceQuantifier = this.next()!.value;
          break;
        }
        case "-":
        case ">": {
          const scope = wrapper === "(" ? parent.id : undefined;
          lastRel = this.parseRelationship(
            lastPath ?? parent.id,
            lastRel,
            scope,
            pendingSourceQuantifier,
          );
          pendingSourceQuantifier = undefined;
          lastEl = null;
          lastPath = null;
          lastElWasWrapped = false;
          break;
        }
        case "!": {
          this.parseDirective(this.next()!.value);
          break;
        }
        case "x": {
          if (
            this.peek()?.value === "N" &&
            (this.peek(1)?.kind === "-" || this.peek(1)?.kind === ">")
          ) {
            pendingSourceQuantifier = this.next()!.value;
            break;
          }
          if (this.peek()?.value === "_") {
            this.next();
            while (this.peek()?.type === "FLAG") this.next();
            if (lastRel) this.updateRelationship(lastRel.id, "_");
            lastRel = null;
            lastEl = null;
            lastPath = null;
            lastElWasWrapped = false;
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
              lastPath = resolved ?? null;
              lastEl = resolved
                ? (this.model.elements[resolved.split(".").pop()!] ?? null)
                : null;
              lastElWasWrapped = false;
            } else {
              lastPath = resolved;
              if (resolved) {
                const leafId = resolved.split(".").pop()!;
                lastEl = this.model.elements[leafId] ?? null;
              } else {
                lastEl = null;
              }
              lastElWasWrapped = true;
            }
          } else {
            const existedBefore = !!this.model.elements[tokenValue];
            lastEl = this.parseElement(WRAPPERS[wrapper].defaultChildType);
            const localPath: string = parentPath
              ? `${parentPath}.${lastEl.id}`
              : lastEl.id;
            if (
              !lastRel &&
              lastPath !== null &&
              lastPath !== lastEl.id &&
              this.peek()?.type === ">"
            ) {
              const implRel = this.createRelationship(lastPath, "..>");
              this.updateRelationship(implRel.id, localPath);
            }
            const isRelSource =
              !lastRel &&
              (this.peek()?.kind === "-" || this.peek()?.kind === ">");
            const isRelTarget = !!lastRel;
            const inRelContext = isRelSource || isRelTarget;

            lastPath = inRelContext && !existedBefore ? localPath : lastEl.id;

            if (isRelTarget) {
              this.updateRelationship(lastRel!.id, lastPath);
              lastRel = null;
            }

            if (
              !inRelContext ||
              !existedBefore ||
              (isRelSource && parentPath === "")
            ) {
              if (!parent.childIds.includes(lastEl.id))
                parent.childIds.push(lastEl.id);
            }
            lastElWasWrapped = false;
          }
          break;
        }
        default:
          this.next();
          break;
      }
    }
    if (lastRel) {
      this.updateRelationship(lastRel.id, "_");
    }
    this.next();
  }

  private parseOpeningWrapper(
    parent: Element,
    parentPath: string,
    lastRel: Relationship | null,
    lastEl: Element | null,
    depth: number,
    nextToken?: OpeningWrapper,
    preserveType = false,
  ): Element {
    const next = this.next();
    nextToken = nextToken ?? defaultOpeningWrapper(next?.type);

    if (!lastEl) lastEl = this.createElement(this.genId());
    if (!preserveType) lastEl.type = WRAPPERS[nextToken].type;
    const childPath = parentPath ? `${parentPath}.${lastEl.id}` : lastEl.id;
    if (lastRel) this.updateRelationship(lastRel.id, childPath);

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
    parentScope?: string,
    sourceQuantifier?: string,
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

    let targetQuantifier: string | undefined = undefined;
    const nextTok = this.peek();
    if (nextTok?.kind === "q") {
      targetQuantifier = this.next()!.value;
    } else if (
      nextTok?.kind === "x" &&
      nextTok.value === "N" &&
      this.peek(1)?.kind === "x"
    ) {
      targetQuantifier = this.next()!.value;
    }

    if (lastRel) {
      lastRel.label = label ?? lastRel.label;
      lastRel.type = defaultRelationshipType(relType) ?? lastRel.type;
      lastRel.sourceQuantifier = sourceQuantifier ?? lastRel.sourceQuantifier;
      lastRel.targetQuantifier = targetQuantifier ?? lastRel.targetQuantifier;
      return lastRel;
    }
    return this.createRelationship(
      sourcePath,
      defaultRelationshipType(relType),
      sourcePath,
      label,
      parentScope,
      sourceQuantifier,
      targetQuantifier,
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

  private embedTypesInIds(): void {
    const oldToNew = new Map<string, string>();
    for (const [oldId, el] of Object.entries(this.model.elements)) {
      if (oldId === this.model.root.id) continue;
      const suffix = wrapperSuffixFor(el.type);
      if (oldId.endsWith(suffix)) continue; // already embedded (e.g. from a second parse pass)
      const newId = oldId + suffix;
      oldToNew.set(oldId, newId);
    }
    if (oldToNew.size === 0) return;

    for (const [oldId, newId] of oldToNew) {
      const el = this.model.elements[oldId];
      el.id = newId;
      el.childIds = el.childIds.map((c) => oldToNew.get(c) ?? c);
      this.model.elements[newId] = el;
      delete this.model.elements[oldId];
    }

    this.model.root.childIds = this.model.root.childIds.map(
      (c) => oldToNew.get(c) ?? c,
    );

    const renamePath = (p: string) =>
      p
        .split(".")
        .map((seg) => oldToNew.get(seg) ?? seg)
        .join(".");

    const newRels: typeof this.model.relationships = {};
    for (const rel of Object.values(this.model.relationships)) {
      rel.source = renamePath(rel.source);
      rel.target = renamePath(rel.target);
      rel.id = `${rel.source}${rel.type}${rel.target}`;
      newRels[rel.id] = rel;
    }
    this.model.relationships = newRels;
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
    if (type === "group") this.parseGroupDirective(parts);
    else if (type === "atom" || type === "rule") this.parseRuleDirective(parts);
    else if (type === "selector") this.parseSelectorDirective(parts);
    else if (type === "session") this.parseSessionDirective(parts);
  }

  private parseGroupDirective(parts: string[]): void {
    const kvs = parseKVs(parts, 1);
    const rawId = kvs["id"];
    if (!rawId) return;

    const id = toGroupId(rawId);
    const group: Group = {
      id,
      regex: kvs["regex"] ?? kvs["rule"] ?? "",
      ...(kvs["compose"] ? { compose: kvs["compose"] } : {}),
      color: kvs["color"] ?? "#888888",
    };

    if (!(this.model.groups ?? []).some((g) => g.id === id)) {
      (this.model.groups ??= []).push(group);
    }
  }

  private parseRuleDirective(parts: string[]): void {
    const kvs = parseKVs(parts, 1);
    const rawId = kvs["id"];
    if (!rawId) return;

    const id = toGroupId(rawId);
    const namePattern = kvs["all_name"] ?? kvs["name"] ?? kvs["all"] ?? "";
    // migrate: name regex + any-type wildcard → plain regex against full path
    const rule = namePattern ? `${namePattern}.*` : "";
    const group: Group = { id, regex: rule, color: "#888888" };

    if (!(this.model.groups ?? []).some((g) => g.id === id)) {
      (this.model.groups ??= []).push(group);
    }
  }

  private parseSelectorDirective(parts: string[]): void {
    const kvs = parseKVs(parts, 1);
    const name = kvs["name"];
    if (!name) return;

    const id = toGroupId(name);
    // old expression field used structured syntax ($ref, /) — store as-is;
    // will fail regex compilation and match nothing (user must update manually)
    const rule = kvs["expression"] ?? kvs["formula"] ?? kvs["combiner"] ?? "";
    const group: Group = { id, regex: rule, color: kvs["color"] ?? "#888888" };

    if (!(this.model.groups ?? []).some((g) => g.id === id)) {
      (this.model.groups ??= []).push(group);
    }
  }

  private parseSessionDirective(parts: string[]): void {
    const kvs = parseKVs(parts, 1);
    const id = kvs["id"];
    if (!id) return;

    const label = kvs["label"] ?? id;
    const groupModes: Record<string, SelectorMode> = {};

    const modesRaw = kvs["groups"] ?? kvs["selectors"] ?? ""; // selectors= for backward compat
    if (modesRaw) {
      for (const entry of modesRaw.split(",")) {
        const colonIdx = entry.lastIndexOf(":");
        if (colonIdx < 0) continue;
        const entityId = entry.slice(0, colonIdx).trim();
        const rawMode = entry.slice(colonIdx + 1).trim();
        if (entityId && (VALID_MODES as string[]).includes(rawMode)) {
          groupModes[entityId] = rawMode as SelectorMode;
        }
      }
    }

    const session: Session = { id, label, groupModes };
    const existingIdx = (this.model.sessions ?? []).findIndex(
      (s) => s.id === id,
    );
    if (existingIdx >= 0) {
      this.model.sessions![existingIdx] = session;
    } else {
      (this.model.sessions ??= []).push(session);
    }
  }

  private updateRelationship(id: string, newTarget: string) {
    const rel = this.model.relationships[id];
    const canonical = BACKWARD_TO_CANONICAL[rel.type];
    if (canonical) {
      rel.target = rel.source;
      rel.source = newTarget;
      rel.type = canonical;
    } else {
      rel.target = newTarget;
    }
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
    parentScope?: string,
    sourceQuantifier?: string,
    targetQuantifier?: string,
  ): Relationship {
    const rel = createRelationship(
      this.genId("rel"),
      source,
      target,
      type,
      label,
      parentScope,
      sourceQuantifier,
      targetQuantifier,
    );
    this.model.relationships[rel.id] = rel;
    return rel;
  }

  private peek = (offset = 0): Token | undefined =>
    this.tokens[this.pos + offset];
  private next = (): Token | undefined => this.tokens[this.pos++];
  private nextLike = (pattern: string) =>
    pattern.split("").every((k, i) => this.peek(i)?.kind === k);

  private idCount = 0;
  private genId = (prefix = "anon") => `${prefix}_${++this.idCount}`;
}
