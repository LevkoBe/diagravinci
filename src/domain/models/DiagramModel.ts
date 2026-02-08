import { createElement, type Element } from "./Element";
import type { Relationship } from "./Relationship";

export interface DiagramMetadata {
  version: string;
  created: string;
  modified: string;
}

export interface DiagramModel {
  root: Element;
  elements: Record<string, Element>;
  relationships: Record<string, Relationship>;
  metadata: DiagramMetadata;
}

export function createEmptyDiagram(): DiagramModel {
  const now = new Date().toISOString();
  return {
    root: createElement(Math.random().toString(36).substring(2, 11), "object"),
    elements: {},
    relationships: {},
    metadata: {
      version: "1.0.0",
      created: now,
      modified: now,
    },
  };
}

export function addElement(
  model: DiagramModel,
  element: Element,
): DiagramModel {
  return {
    ...model,
    elements: {
      ...model.elements,
      [element.id]: element,
    },
    metadata: {
      ...model.metadata,
      modified: new Date().toISOString(),
    },
  };
}

export function addRelationship(
  model: DiagramModel,
  relationship: Relationship,
): DiagramModel {
  return {
    ...model,
    relationships: {
      ...model.relationships,
      [relationship.id]: relationship,
    },
    metadata: {
      ...model.metadata,
      modified: new Date().toISOString(),
    },
  };
}
