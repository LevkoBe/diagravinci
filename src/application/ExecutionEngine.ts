import type { DiagramModel } from "../domain/models/DiagramModel";
import type { ViewState, PositionedElement } from "../domain/models/ViewState";
import type { Element } from "../domain/models/Element";
import type { Relationship } from "../domain/models/Relationship";
import type { TokenInstance } from "./store/executionSlice";

export type { TokenInstance };

export interface ExecutionStepDelta {
  addElements: Array<{
    element: Element;
    parentElementId: string;
    path: string;
    posEntry: PositionedElement;
    spawnOriginId: string;
  }>;
  addRelationships: Relationship[];
  removeElements: Array<{
    elementId: string;
    parentElementId: string;
    path: string;
  }>;
  removeRelationshipIds: string[];
  moveElements: Array<{
    elementId: string;
    fromParentId: string;
    fromPath: string;
    toParentId: string;
    toPath: string;
    newPosition: { x: number; y: number };
  }>;
}

export interface StepResult {
  delta: ExecutionStepDelta;
  nextInstances: TokenInstance[];
  nextInstanceId: number;
}

function isFlowRelationship(type: string): boolean {
  return type.includes(">") && !type.includes("|>");
}

function buildOutgoingMap(model: DiagramModel): Record<string, string[]> {
  const outgoing: Record<string, string[]> = {};
  for (const rel of Object.values(model.relationships)) {
    if (!isFlowRelationship(rel.type)) continue;
    if (!outgoing[rel.source]) outgoing[rel.source] = [];
    outgoing[rel.source].push(rel.target);
  }
  return outgoing;
}

function findElementPath(viewState: ViewState, elementId: string): string {
  if (viewState.positions[elementId]) return elementId;
  let found: string | null = null;
  for (const path of Object.keys(viewState.positions)) {
    if (path === elementId || path.endsWith(`.${elementId}`)) {
      if (!found || path.length < found.length) found = path;
    }
  }
  return found ?? elementId;
}

interface ClonedItem {
  element: Element;
  parentCloneId: string | null;
}

function cloneSubtree(
  model: DiagramModel,
  rootChildIds: string[],
  suffix: string,
): { all: ClonedItem[]; relationships: Relationship[] } {
  const all: ClonedItem[] = [];
  const idMap: Record<string, string> = {};

  const queue: Array<{ id: string; parentCloneId: string | null }> =
    rootChildIds.map((id) => ({ id, parentCloneId: null }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, parentCloneId } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const el = model.elements[id];
    if (!el) continue;
    const newId = `${id}_${suffix}`;
    idMap[id] = newId;
    all.push({
      element: {
        ...el,
        id: newId,
        childIds: el.childIds.map((c) => `${c}_${suffix}`),
      },
      parentCloneId,
    });
    for (const childId of el.childIds) {
      queue.push({ id: childId, parentCloneId: newId });
    }
  }

  const relationships: Relationship[] = [];
  for (const rel of Object.values(model.relationships)) {
    if (idMap[rel.source] && idMap[rel.target]) {
      relationships.push({
        ...rel,
        id: `${rel.id}_${suffix}`,
        source: idMap[rel.source],
        target: idMap[rel.target],
      });
    }
  }

  return { all, relationships };
}

function collectSubtreeRemoves(
  model: DiagramModel,
  rootId: string,
  parentId: string,
  rootPath: string,
): Array<{ elementId: string; parentElementId: string; path: string }> {
  const result: Array<{ elementId: string; parentElementId: string; path: string }> = [];
  const queue: Array<{ id: string; parentId: string; path: string }> = [
    { id: rootId, parentId, path: rootPath },
  ];
  while (queue.length > 0) {
    const { id, parentId: pid, path } = queue.shift()!;
    result.push({ elementId: id, parentElementId: pid, path });
    const el = model.elements[id];
    if (el) {
      for (const childId of el.childIds) {
        queue.push({ id: childId, parentId: id, path: `${path}.${childId}` });
      }
    }
  }
  return result;
}

function baseName(id: string): string {
  return id.replace(/_\d+$/, "");
}

function isGen(el: Element): boolean {
  return el.type === "function" && el.id === "gen";
}

function isRoundRobin(el: Element): boolean {
  return el.type === "function" && el.id === "round_robin";
}

function forwardInstance(
  instance: TokenInstance,
  nextTargetId: string,
  nextTargetPath: string,
  nextTargetPos: { x: number; y: number },
  delta: ExecutionStepDelta,
  nextInstances: TokenInstance[],
): void {
  for (const cloneId of instance.clonedElementIds) {
    delta.moveElements.push({
      elementId: cloneId,
      fromParentId: instance.currentElementId,
      fromPath: `${instance.currentPath}.${cloneId}`,
      toParentId: nextTargetId,
      toPath: `${nextTargetPath}.${cloneId}`,
      newPosition: { ...nextTargetPos },
    });
  }
  nextInstances.push({
    ...instance,
    currentElementId: nextTargetId,
    currentPath: nextTargetPath,
  });
}

export function computeExecutionStep(
  model: DiagramModel,
  viewState: ViewState,
  instances: TokenInstance[],
  _tickCount: number,
  nextInstanceId: number,
  executionColor: string,
): StepResult {
  void executionColor;

  const delta: ExecutionStepDelta = {
    addElements: [],
    addRelationships: [],
    removeElements: [],
    removeRelationshipIds: [],
    moveElements: [],
  };
  const nextInstances: TokenInstance[] = [];
  let idCounter = nextInstanceId;

  const outgoing = buildOutgoingMap(model);

  function instanceRoundRobinIdx(instanceId: string): number {
    const m = instanceId.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  const allCloneIds = new Set<string>();
  for (const inst of instances) {
    for (const topId of inst.clonedElementIds) {
      const bfsQ = [topId];
      while (bfsQ.length > 0) {
        const id = bfsQ.shift()!;
        allCloneIds.add(id);
        model.elements[id]?.childIds.forEach((c) => bfsQ.push(c));
      }
    }
  }

  function templateChildren(el: Element): string[] {
    return el.childIds.filter((id) => !allCloneIds.has(id) && model.elements[id]);
  }

  function templateChildTypes(el: Element): Set<string> {
    return new Set(templateChildren(el).map((id) => model.elements[id]!.type));
  }

  for (const instance of instances) {
    const currentEl = model.elements[instance.currentElementId];

    const removeInstanceClones = () => {
      for (const cloneId of instance.clonedElementIds) {
        delta.removeElements.push(
          ...collectSubtreeRemoves(
            model,
            cloneId,
            instance.currentElementId,
            `${instance.currentPath}.${cloneId}`,
          ),
        );
      }
      for (const relId of instance.clonedRelationshipIds) {
        delta.removeRelationshipIds.push(relId);
      }
    };

    if (currentEl?.type === "object") {
      removeInstanceClones();
      continue;
    }

    const targets = (outgoing[instance.currentElementId] ?? []).filter(
      (tid) => model.elements[tid] !== undefined,
    );

    if (targets.length === 0) {
      if (currentEl?.type === "collection" || currentEl?.type === "state") {
        nextInstances.push(instance); // accumulate indefinitely
      } else {
        removeInstanceClones();
      }
      continue;
    }

    if (currentEl?.type === "flow") {
      const allowed = templateChildTypes(currentEl);
      if (allowed.size > 0) {
        const hasMatch = instance.clonedElementIds.some(
          (cid) => allowed.has(model.elements[cid]?.type ?? ""),
        );
        if (!hasMatch) {
          removeInstanceClones();
          continue;
        }
      }
    }

    if (currentEl?.type === "collection") {
      const allowed = templateChildTypes(currentEl);
      if (allowed.size > 0) {
        const hasMatch = instance.clonedElementIds.some(
          (cid) => allowed.has(model.elements[cid]?.type ?? ""),
        );
        if (!hasMatch) {
          removeInstanceClones();
          continue;
        }
      }
    }

    if (currentEl?.type === "choice" && targets.length > 1) {
      const selectors = templateChildren(currentEl).map((id) => ({
        type: model.elements[id]!.type as string,
        pattern: id.startsWith("anon_") ? null : id,
      }));

      const conditionMet =
        selectors.length === 0 ||
        instance.clonedElementIds.some((cid) => {
          const cloneEl = model.elements[cid];
          return selectors.some((s) => {
            if (cloneEl?.type !== s.type) return false;
            if (s.pattern === null) return true;
            try {
              return new RegExp(s.pattern).test(baseName(cid));
            } catch {
              return s.pattern === baseName(cid);
            }
          });
        });

      const choiceRels = Object.values(model.relationships).filter(
        (r) => isFlowRelationship(r.type) && r.source === currentEl.id,
      );
      const yesTarget =
        choiceRels.find((r) => r.label?.toLowerCase() === "yes")?.target ??
        targets[0];
      const noTarget =
        choiceRels.find((r) => r.label?.toLowerCase() === "no")?.target ??
        targets[1] ??
        targets[0];

      const nextTargetId = conditionMet ? yesTarget : noTarget;
      const nextTargetPath = findElementPath(viewState, nextTargetId);
      const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
      forwardInstance(instance, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
      continue;
    }

    if (currentEl?.type === "function") {
      if (isGen(currentEl)) {
        removeInstanceClones();
        continue;
      }

      if (isRoundRobin(currentEl)) {
        const nextTargetId = targets[instanceRoundRobinIdx(instance.id) % targets.length];
        const nextTargetPath = findElementPath(viewState, nextTargetId);
        const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
        forwardInstance(instance, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
        continue;
      }

      const tmplChildIds = templateChildren(currentEl);

      if (tmplChildIds.length === 0) {
        const nextTargetId = targets[0];
        const nextTargetPath = findElementPath(viewState, nextTargetId);
        const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
        forwardInstance(instance, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
      } else {
        removeInstanceClones();
        const nextTargetId = targets[0];
        const nextTargetPath = findElementPath(viewState, nextTargetId);
        const targetPos =
          viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
        const targetSize = viewState.positions[nextTargetPath]?.size ?? 40;

        for (const childId of tmplChildIds) {
          const suffix = String(idCounter++);
          const { all: clonedItems, relationships: clonedRels } =
            cloneSubtree(model, [childId], suffix);
          const idx = parseInt(suffix, 10);
          const offsetX = (idx % 5) * 6;
          const offsetY = Math.floor(idx / 5) * 6;

          for (const { element: el, parentCloneId } of clonedItems) {
            const parentElementId = parentCloneId ?? nextTargetId;
            const parentPath = parentCloneId
              ? `${nextTargetPath}.${parentCloneId}`
              : nextTargetPath;
            delta.addElements.push({
              element: el,
              parentElementId,
              path: `${parentPath}.${el.id}`,
              posEntry: {
                id: el.id,
                position: {
                  x: targetPos.x + offsetX,
                  y: targetPos.y + offsetY,
                },
                size: Math.round(targetSize * 0.5),
                value: 1,
              },
              spawnOriginId: instance.currentElementId,
            });
          }
          for (const rel of clonedRels) {
            delta.addRelationships.push(rel);
          }

          const topLevelCloneIds = clonedItems
            .filter((c) => c.parentCloneId === null)
            .map((c) => c.element.id);

          nextInstances.push({
            id: `inst_${suffix}`,
            currentElementId: nextTargetId,
            currentPath: nextTargetPath,
            clonedElementIds: topLevelCloneIds,
            clonedRelationshipIds: clonedRels.map((r) => r.id),
          });
        }
      }
      continue;
    }

    const nextTargetId = targets[0];
    const nextTargetPath = findElementPath(viewState, nextTargetId);
    const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
    forwardInstance(instance, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
  }

  for (const element of Object.values(model.elements)) {
    if (!isGen(element)) continue;

    const targets = outgoing[element.id] ?? [];
    if (targets.length === 0) continue;

    let tmplChildIds = templateChildren(element);
    if (tmplChildIds.length === 0) {
      const firstTarget = model.elements[targets[0]];
      if (firstTarget) tmplChildIds = templateChildren(firstTarget);
    }
    if (tmplChildIds.length === 0) continue;

    for (const childId of tmplChildIds) {
      const suffix = String(idCounter++);
      const { all: clonedItems, relationships: clonedRels } = cloneSubtree(
        model,
        [childId],
        suffix,
      );

      const targetIdx = parseInt(suffix, 10) % targets.length;
      const targetId = targets[targetIdx];
      const targetPath = findElementPath(viewState, targetId);
      const targetPos = viewState.positions[targetPath]?.position ?? { x: 0, y: 0 };
      const targetSize = viewState.positions[targetPath]?.size ?? 40;

      const idx = parseInt(suffix, 10);
      const offsetX = (idx % 5) * 6;
      const offsetY = Math.floor(idx / 5) * 6;

      for (const { element: el, parentCloneId } of clonedItems) {
        const parentElementId = parentCloneId ?? targetId;
        const parentPath = parentCloneId
          ? `${targetPath}.${parentCloneId}`
          : targetPath;
        delta.addElements.push({
          element: el,
          parentElementId,
          path: `${parentPath}.${el.id}`,
          posEntry: {
            id: el.id,
            position: { x: targetPos.x + offsetX, y: targetPos.y + offsetY },
            size: Math.round(targetSize * 0.5),
            value: 1,
          },
          spawnOriginId: element.id,
        });
      }

      for (const rel of clonedRels) {
        delta.addRelationships.push(rel);
      }

      const topLevelCloneIds = clonedItems
        .filter((c) => c.parentCloneId === null)
        .map((c) => c.element.id);

      nextInstances.push({
        id: `inst_${suffix}`,
        currentElementId: targetId,
        currentPath: targetPath,
        clonedElementIds: topLevelCloneIds,
        clonedRelationshipIds: clonedRels.map((r) => r.id),
      });
    }
  }

  return { delta, nextInstances, nextInstanceId: idCounter };
}

export function getExecutionColorMap(
  instances: TokenInstance[],
  color: string,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const inst of instances) {
    for (const id of inst.clonedElementIds) {
      map[id] = color;
    }
  }
  return map;
}

export function applyDeltaToModel(
  model: DiagramModel,
  delta: ExecutionStepDelta,
): DiagramModel {
  const elements: Record<string, Element> = {};
  for (const [id, el] of Object.entries(model.elements)) {
    elements[id] = { ...el, childIds: [...el.childIds] };
  }
  const relationships = { ...model.relationships };
  const root = { ...model.root, childIds: [...model.root.childIds] };

  for (const { element, parentElementId } of delta.addElements) {
    elements[element.id] = { ...element, childIds: [...element.childIds] };
    const parent = elements[parentElementId];
    if (parent && !parent.childIds.includes(element.id)) {
      parent.childIds = [...parent.childIds, element.id];
    }
  }

  for (const rel of delta.addRelationships) {
    relationships[rel.id] = rel;
  }

  for (const { elementId, parentElementId } of delta.removeElements) {
    delete elements[elementId];
    const parent = elements[parentElementId];
    if (parent) {
      parent.childIds = parent.childIds.filter((c) => c !== elementId);
    }
  }

  for (const id of delta.removeRelationshipIds) {
    delete relationships[id];
  }

  for (const { elementId, fromParentId, toParentId } of delta.moveElements) {
    const fromParent = elements[fromParentId];
    if (fromParent) {
      fromParent.childIds = fromParent.childIds.filter((c) => c !== elementId);
    }
    const toParent = elements[toParentId];
    if (toParent && !toParent.childIds.includes(elementId)) {
      toParent.childIds = [...toParent.childIds, elementId];
    }
  }

  return { ...model, root, elements, relationships };
}

export function buildCleanedModel(
  model: DiagramModel,
  instances: TokenInstance[],
): DiagramModel {
  const elements: Record<string, Element> = {};
  for (const [id, el] of Object.entries(model.elements)) {
    elements[id] = { ...el, childIds: [...el.childIds] };
  }
  const relationships = { ...model.relationships };
  const root = { ...model.root, childIds: [...model.root.childIds] };

  for (const instance of instances) {
    for (const cloneId of instance.clonedElementIds) {
      delete elements[cloneId];
      const parent = elements[instance.currentElementId];
      if (parent) {
        parent.childIds = parent.childIds.filter((c) => c !== cloneId);
      }
    }
    for (const relId of instance.clonedRelationshipIds) {
      delete relationships[relId];
    }
  }

  return { ...model, root, elements, relationships };
}
