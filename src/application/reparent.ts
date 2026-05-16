import type { DiagramModel } from "../domain/models/DiagramModel";

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
  return { ...model, root, elements };
}
