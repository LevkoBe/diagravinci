import type { RelationshipType } from "../../infrastructure/parser/Token";

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  label?: string;
  parentScope?: string;
  sourceQuantifier?: string;
  targetQuantifier?: string;
}

export function createRelationship(
  id: string,
  source: string,
  target: string,
  type: RelationshipType,
  label?: string,
  parentScope?: string,
  sourceQuantifier?: string,
  targetQuantifier?: string,
): Relationship {
  return {
    id,
    source,
    target,
    type,
    label,
    parentScope,
    sourceQuantifier,
    targetQuantifier,
  };
}
