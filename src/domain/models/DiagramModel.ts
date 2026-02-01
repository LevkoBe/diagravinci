import type { Element } from "./Element";
import type { Relationship } from "./Relationship";

export interface DiagramMetadata {
  version: string;
  created: Date;
  modified: Date;
}

export interface DiagramModel {
  elements: Map<string, Element>;
  relationships: Map<string, Relationship>;
  metadata: DiagramMetadata;
}

export function createEmptyDiagram(): DiagramModel {
  return {
    elements: new Map<string, Element>(),
    relationships: new Map<string, Relationship>(),
    metadata: {
      version: "1.0.0",
      created: new Date(),
      modified: new Date(),
    },
  };
}

export function addElement(
  model: DiagramModel,
  element: Element,
): DiagramModel {
  const newElements = new Map(model.elements);
  newElements.set(element.id, element);

  return {
    ...model,
    elements: newElements,
    metadata: {
      ...model.metadata,
      modified: new Date(),
    },
  };
}

export function addRelationship(
  model: DiagramModel,
  relationship: Relationship,
): DiagramModel {
  const newRelationships = new Map(model.relationships);
  newRelationships.set(relationship.id, relationship);

  return {
    ...model,
    relationships: newRelationships,
    metadata: {
      ...model.metadata,
      modified: new Date(),
    },
  };
}
