import { createElement, type Element } from "./Element";
import type { Relationship } from "./Relationship";
import type { FilterPreset, SelectorAtom } from "./Selector";

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
  atoms?: SelectorAtom[];
  filterPresets?: FilterPreset[];
}

export function createEmptyDiagram(): DiagramModel {
  const now = new Date().toISOString();
  return {
    root: createElement(Math.random().toString(36).substring(2, 11), "object"),
    elements: {},
    relationships: {},
    atoms: [],
    filterPresets: [],
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

export function getSubtreeIds(
  rootId: string,
  elements: Record<string, Element>,
): string[] {
  const result: string[] = [];
  const queue = [rootId];
  const visited = new Set<string>();
  let qi = 0;
  while (qi < queue.length) {
    const id = queue[qi++];
    if (visited.has(id)) continue;
    visited.add(id);
    result.push(id);
    elements[id]?.childIds.forEach((c) => queue.push(c));
  }
  return result;
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
