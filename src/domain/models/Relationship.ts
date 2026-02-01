export type RelationshipType = "-->" | "--|>" | "..|>" | "*--" | "o--";

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  label?: string;
}

export function createRelationship(
  id: string,
  source: string,
  target: string,
  type: RelationshipType,
  label?: string,
): Relationship {
  return {
    id,
    source,
    target,
    type,
    label,
  };
}
