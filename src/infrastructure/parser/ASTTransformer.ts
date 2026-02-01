import { ASTNode, ElementNode, RelationshipNode } from "./ASTNode";
import {
  DiagramModel,
  createEmptyDiagram,
} from "../../domain/models/DiagramModel";
import { Element, createElement } from "../../domain/models/Element";
import {
  Relationship,
  createRelationship,
} from "../../domain/models/Relationship";

export class ASTTransformer {
  transform(nodes: ASTNode[]): DiagramModel {
    const model = createEmptyDiagram();
    // TODO: nodes -> model
    return model;
  }

  private transformElement(node: ElementNode): Element {
    return createElement(this.generateId(), node.name, "object");
  }

  private transformRelationship(node: RelationshipNode): Relationship {
    return createRelationship(
      this.generateId(),
      node.source,
      node.target,
      "-->",
    );
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random()}`;
  }
}
