import type { DiagramModel } from "../../domain/models/DiagramModel";
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
    const rootIdSet = new Set(this.model.root.childIds);
    const rootElements = Object.values(this.model.elements).filter((e) =>
      rootIdSet.has(e.id),
    );

    for (const element of rootElements)
      lines.push(this.generateElement(element, 0, new AncestryTracker()));
    lines.push("");
    for (const relationship of Object.values(this.model.relationships))
      lines.push(this.generateRelationship(relationship));

    return lines.join("\n");
  }

  private getElementById(id: string): Element {
    const element = this.model.elements[id];
    return element ?? createElement("[NON-EXISTING ELEMENT]", "object");
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

    const hasContent = element.childIds.length > 0;

    if (!hasContent) return `${indentation}${element.id}${opening}${closing}`;

    const newAncestry = ancestry.tryAdd(element.id);
    if (!newAncestry)
      return `${indentation}${element.id}${opening}${closing} # recursion`;

    const lines: string[] = [];
    lines.push(`${indentation}${element.id}${opening}`);

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
    return relationship.label
      ? `${relationship.source} --${relationship.label}${arrow} ${relationship.target}`
      : `${relationship.source} ${arrow} ${relationship.target}`;
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
