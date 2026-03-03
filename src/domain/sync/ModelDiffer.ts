import type { DiagramModel } from "../models/DiagramModel";
import type { Element } from "../models/Element";
import type { Relationship } from "../models/Relationship";
export interface ModelDiff {
  addedElements: Element[];
  removedElementIds: string[];
  modifiedElements: Element[];
  addedRelationships: Relationship[];
  removedRelationshipIds: string[];
  modifiedRelationships: Relationship[];
}
export class ModelDiffer {
  static diff(oldModel: DiagramModel, newModel: DiagramModel): ModelDiff {
    const addedElements: Element[] = [];
    const removedElementIds: string[] = [];
    const modifiedElements: Element[] = [];

    Object.keys(newModel.elements).forEach((id) => {
      if (!oldModel.elements[id]) {
        addedElements.push(newModel.elements[id]);
      } else if (
        JSON.stringify(oldModel.elements[id]) !==
        JSON.stringify(newModel.elements[id])
      ) {
        modifiedElements.push(newModel.elements[id]);
      }
    });
    Object.keys(oldModel.elements)
      .filter((id) => !newModel.elements[id])
      .forEach((id) => removedElementIds.push(id));
    newModel.root.childIds
      .filter((id) => !oldModel.root.childIds.includes(id))
      .forEach((id) => addedElements.push(newModel.elements[id]));
    oldModel.root.childIds
      .filter((id) => !newModel.root.childIds.includes(id))
      .forEach((id) => removedElementIds.push(id));

    const oldRelMap = oldModel.relationships;
    const newRelMap = newModel.relationships;
    const addedRelationships = Object.values(newRelMap).filter(
      (r) => !oldRelMap[r.id],
    );
    const removedRelationshipIds = Object.values(oldRelMap)
      .filter((r) => !newRelMap[r.id])
      .map((r) => r.id);
    const modifiedRelationships = Object.values(newRelMap).filter(
      (r) =>
        oldRelMap[r.id] &&
        JSON.stringify(oldRelMap[r.id]) !== JSON.stringify(r),
    );

    return {
      addedElements,
      removedElementIds,
      modifiedElements,
      addedRelationships,
      removedRelationshipIds,
      modifiedRelationships,
    };
  }

  static isEmpty(diff: ModelDiff): boolean {
    return (
      diff.addedElements.length === 0 &&
      diff.removedElementIds.length === 0 &&
      diff.modifiedElements.length === 0 &&
      diff.addedRelationships.length === 0 &&
      diff.removedRelationshipIds.length === 0 &&
      diff.modifiedRelationships.length === 0
    );
  }
}
