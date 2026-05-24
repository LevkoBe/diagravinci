import type { DiagramModel } from "../../domain/models/DiagramModel";
import { DEFAULT_SESSION_ID } from "../../domain/models/DiagramModel";
import type { Rule, Selector, Session } from "../../domain/models/Selector";
import {
  createElement,
  type Element,
  type ElementType,
} from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";

class AncestryTracker {
  private readonly _set: Set<string>;
  constructor(_set: Set<string> = new Set()) {
    this._set = _set;
  }
  tryAdd(id: string): AncestryTracker | null {
    if (this._set.has(id)) return null;
    const newSet = new Set(this._set);
    newSet.add(id);
    return new AncestryTracker(newSet);
  }
}

export class CodeGenerator {
  private model: DiagramModel;

  constructor(model: DiagramModel) {
    this.model = model;
  }

  generate(): string {
    const lines: string[] = [];

    for (const rule of this.model.rules ?? [])
      lines.push(this.generateRule(rule));

    for (const selector of this.model.selectors ?? [])
      lines.push(this.generateSelector(selector));

    const sessionsToEmit = (this.model.sessions ?? []).filter(
      (s) => s.id !== DEFAULT_SESSION_ID || Object.keys(s.selectorModes).length > 0,
    );
    for (const session of sessionsToEmit)
      lines.push(this.generateSession(session));

    if (
      (this.model.rules ?? []).length > 0 ||
      (this.model.selectors ?? []).length > 0 ||
      sessionsToEmit.length > 0
    )
      lines.push("");

    const rootElements = this.model.root.childIds
      .map((id) => this.model.elements[id])
      .filter(Boolean);

    for (const element of rootElements)
      lines.push(this.generateElement(element, 0, new AncestryTracker()));
    lines.push("");
    for (const relationship of Object.values(this.model.relationships)) {
      if (
        CodeGenerator.isAnonymousId(relationship.source) ||
        CodeGenerator.isAnonymousId(relationship.target)
      )
        continue;
      lines.push(this.generateRelationship(relationship));
    }

    return lines.join("\n");
  }

  private static quoteId(id: string): string {
    return /\s/.test(id) ? `"${id}"` : id;
  }

  private static quotePath(path: string): string {
    return path.split(".").map(CodeGenerator.quoteId).join(".");
  }

  private generateRule(rule: Rule): string {
    const parts = [`!rule`, `id=${rule.id}`];
    for (const [key, value] of Object.entries(rule.patterns)) {
      const v = /\s/.test(value) ? `"${value}"` : value;
      parts.push(`${key}=${v}`);
    }
    return parts.join("  ");
  }

  private static quoteLabel(v: string): string {
    if (/[^\w-]/.test(v)) return `"${v.replace(/"/g, "'")}"`;
    return v;
  }

  private generateSelector(selector: Selector): string {
    const parts = [`!selector`, `name=${CodeGenerator.quoteLabel(selector.label)}`];
    parts.push(`color=${selector.color}`);
    if (selector.expression) {
      const v = /\s/.test(selector.expression) ? `"${selector.expression}"` : selector.expression;
      parts.push(`expression=${v}`);
    }
    return parts.join("  ");
  }

  private generateSession(session: Session): string {
    const parts = [`!session`, `id=${session.id}`, `label=${CodeGenerator.quoteLabel(session.label)}`];
    const modes = Object.entries(session.selectorModes)
      .map(([id, mode]) => `${id}:${mode}`)
      .join(",");
    if (modes) parts.push(`selectors=${modes}`);
    return parts.join("  ");
  }

  private getElementById(id: string): Element {
    const element = this.model.elements[id];
    return element ?? createElement("[NON-EXISTING ELEMENT]", "object");
  }

  private static isAnonymousId(id: string): boolean {
    return /^anon_\d+$/.test(id);
  }

  private generateElement(
    element: Element,
    indent: number,
    ancestry: AncestryTracker,
  ): string {
    const indentation = this.getIndentation(indent);
    const wrapper = this.getWrapperFromType(element.type);
    const opening = wrapper[0];
    const closing = wrapper[1];
    const isAnonFlow = element.type === "flow" && CodeGenerator.isAnonymousId(element.id);
    const nameOut = isAnonFlow ? "" : CodeGenerator.quoteId(element.id);
    const flagSuffix = element.flags
      ? element.flags.map((f) => /\s/.test(f) ? `:"${f}"` : `:${f}`).join("")
      : "";

    const hasContent = element.childIds.length > 0;

    if (!hasContent)
      return `${indentation}${nameOut}${flagSuffix}${opening}${closing}`;

    const newAncestry = ancestry.tryAdd(element.id);
    if (!newAncestry)
      return `${indentation}${nameOut}${flagSuffix}${opening}${closing} # recursion`;

    const lines: string[] = [];
    lines.push(`${indentation}${nameOut}${flagSuffix}${opening}`);

    for (const id of element.childIds) {
      lines.push(
        this.generateElement(this.getElementById(id), indent + 1, newAncestry),
      );
    }
    lines.push(`${indentation}${closing}`);

    return lines.join("\n");
  }

  private generateRelationship(relationship: Relationship): string {
    const arrow = relationship.type;
    const src = CodeGenerator.quotePath(relationship.source);
    const tgt = CodeGenerator.quotePath(relationship.target);
    return relationship.label
      ? `${src} --${CodeGenerator.quoteId(relationship.label)}${arrow} ${tgt}`
      : `${src} ${arrow} ${tgt}`;
  }

  private getWrapperFromType(type: ElementType): [string, string] {
    switch (type) {
      case "object":
        return ["{", "}"];
      case "collection":
        return ["[", "]"];
      case "state":
        return ["|", "|"];
      case "function":
        return ["(", ")"];
      case "flow":
        return [">", ">"];
      case "choice":
        return ["<", ">"];
      default:
        return ["{", "}"];
    }
  }

  private static readonly INDENTS = Array.from({ length: 20 }, (_, i) =>
    "  ".repeat(i),
  );

  private getIndentation(level: number): string {
    return CodeGenerator.INDENTS[level] ?? "  ".repeat(level);
  }
}
