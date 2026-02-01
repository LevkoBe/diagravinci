export type ASTNodeType = "Element" | "Relationship" | "Property";

export interface ASTNode {
  type: ASTNodeType;
}

export interface ElementNode extends ASTNode {
  type: "Element";
  name: string;
  wrapper: string;
  properties: string[];
  children: ElementNode[];
}

export interface RelationshipNode extends ASTNode {
  type: "Relationship";
  source: string;
  target: string;
  relationshipType: string;
  label?: string;
}
