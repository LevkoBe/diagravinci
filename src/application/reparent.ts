import type { DiagramModel } from "../domain/models/DiagramModel";

function remapPath(path: string, oldPrefix: string, newPrefix: string): string {
  if (path === oldPrefix) return newPrefix;
  if (path.startsWith(oldPrefix + ".")) return newPrefix + path.slice(oldPrefix.length);
  return path;
}

export function applyReparent(
  model: DiagramModel,
  elementId: string,
  oldParentPath: string,
  newParentPath: string,
): DiagramModel {
  const movingElement = model.elements[elementId];
  if (!movingElement) return model;
  const elements = { ...model.elements };
  let root = { ...model.root };
  if (oldParentPath === model.root.id) {
    root = { ...root, childIds: root.childIds.filter((n) => n !== elementId) };
  } else {
    const oldParentId = oldParentPath.split(".").at(-1)!;
    const oldParent = elements[oldParentId];
    if (oldParent) {
      elements[oldParent.id] = {
        ...oldParent,
        childIds: oldParent.childIds.filter((n) => n !== elementId),
      };
    }
  }
  if (newParentPath === model.root.id) {
    if (!root.childIds.includes(elementId)) {
      root = { ...root, childIds: [...root.childIds, elementId] };
    }
  } else {
    const newParentId = newParentPath.split(".").at(-1)!;
    const newParent = elements[newParentId];
    if (newParent && !newParent.childIds.includes(elementId)) {
      elements[newParentId] = {
        ...newParent,
        childIds: [...newParent.childIds, elementId],
      };
    }
  }

  const oldPath = oldParentPath === model.root.id ? elementId : `${oldParentPath}.${elementId}`;
  const newPath = newParentPath === model.root.id ? elementId : `${newParentPath}.${elementId}`;

  let relationships = model.relationships;
  if (oldPath !== newPath) {
    const remapped: typeof relationships = {};
    for (const [relId, rel] of Object.entries(model.relationships)) {
      const newSource = remapPath(rel.source, oldPath, newPath);
      const newTarget = remapPath(rel.target, oldPath, newPath);
      const newParentScope = rel.parentScope ? remapPath(rel.parentScope, oldPath, newPath) : rel.parentScope;
      if (newSource !== rel.source || newTarget !== rel.target || newParentScope !== rel.parentScope) {
        const newId = `${newSource}${rel.type}${newTarget}`;
        remapped[newId] = { ...rel, id: newId, source: newSource, target: newTarget, parentScope: newParentScope };
      } else {
        remapped[relId] = rel;
      }
    }
    relationships = remapped;
  }

  return { ...model, root, elements, relationships };
}
