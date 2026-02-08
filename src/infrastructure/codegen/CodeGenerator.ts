import type { DiagramModel } from "../../domain/models/DiagramModel";
import {
  createElement,
  type Element,
  type ElementType,
} from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";

export class CodeGenerator {
  private model: DiagramModel;

  constructor(model: DiagramModel) {
    this.model = model;
  }

  generate(): string {
    const lines: string[] = [];
    const rootElements = Object.values(this.model.elements).filter((e) =>
      this.model.root.childIds.includes(e.id),
    );

    for (const element of rootElements)
      lines.push(this.generateElement(element, 0));
    lines.push("");
    for (const relationship of Object.values(this.model.relationships))
      lines.push(this.generateRelationship(relationship));

    return lines.join("\n");
  }

  private getElementById(id: string): Element {
    const element = this.model.elements[id];
    return element ?? createElement("[NON-EXISTING ELEMENT]", "object");
  }

  private generateElement(element: Element, indent: number): string {
    const indentation = this.getIndentation(indent);
    const wrapper = this.getWrapperFromType(element.type);
    const opening = wrapper[0];
    const closing = wrapper[1];

    const hasContent = element.childIds.length > 0;

    if (!hasContent) return `${indentation}${element.id}${opening}${closing}`;

    const lines: string[] = [];
    lines.push(`${indentation}${element.id}${opening}`);

    for (const id of element.childIds)
      lines.push(this.generateElement(this.getElementById(id), indent + 1));
    lines.push(`${indentation}${closing}`);

    return lines.join("\n");
  }

  private generateRelationship(relationship: Relationship): string {
    const arrow = relationship.type;
    return relationship.label
      ? `${relationship.source} ${arrow}${relationship.label}${arrow} ${relationship.target}`
      : `${relationship.source} ${arrow} ${relationship.target}`;
  }

  private getWrapperFromType(type: ElementType): [string, string] {
    switch (type) {
      case "object":
        return ["{", "}"];
      case "state":
        return ["[", "]"];
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

  private getIndentation(level: number): string {
    return "  ".repeat(level);
  }
}
