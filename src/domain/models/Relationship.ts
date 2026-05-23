import type { RelationshipType } from "../../infrastructure/parser/Token";

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  label?: string;
  parentScope?: string;
}

export function createRelationship(
  id: string,
  source: string,
  target: string,
  type: RelationshipType,
  label?: string,
  parentScope?: string,
): Relationship {
  return {
    id,
    source,
    target,
    type,
    label,
    parentScope,
  };
}
