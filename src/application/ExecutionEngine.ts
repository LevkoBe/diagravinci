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

function leafId(ref: string): string {
  const dot = ref.lastIndexOf(".");
  return dot === -1 ? ref : ref.slice(dot + 1);
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
    const srcLeaf = leafId(rel.source);
    const tgtLeaf = leafId(rel.target);
    if (idMap[srcLeaf] && idMap[tgtLeaf]) {
      relationships.push({
        ...rel,
        id: `${rel.id}_${suffix}`,
        source: idMap[srcLeaf],
        target: idMap[tgtLeaf],
      });
    }
  }

  return { all, relationships };
}

function connectedComponents(ids: string[], model: DiagramModel): string[][] {
  const idSet = new Set(ids);
  const parent = new Map<string, string>(ids.map((id) => [id, id]));

  function find(id: string): string {
    while (parent.get(id) !== id) {
      const p = parent.get(id)!;
      parent.set(id, parent.get(p)!);
      id = p;
    }
    return id;
  }

  for (const rel of Object.values(model.relationships)) {
    const src = leafId(rel.source);
    const tgt = leafId(rel.target);
    if (idSet.has(src) && idSet.has(tgt)) {
      parent.set(find(src), find(tgt));
    }
  }

  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const root = find(id);
    const g = groups.get(root) ?? [];
    g.push(id);
    groups.set(root, g);
  }

  return [...groups.values()];
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
  return id.replace(/(_\d+)+$/, "");
}

function isGen(el: Element): boolean {
  return el.type === "function" && el.id === "gen";
}

function isRoundRobin(el: Element): boolean {
  return el.type === "function" && el.id === "round_robin";
}

function isMultiplier(el: Element): boolean {
  return el.type === "function" && el.id.startsWith("multiplier_");
}
function multiplierCount(el: Element): number {
  const m = el.id.match(/^multiplier_(\d+)$/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}
function isDuplicator(el: Element): boolean {
  return el.type === "function" && el.id === "duplicator";
}
function isDeduplicator(el: Element): boolean {
  return el.type === "function" && el.id === "deduplicator";
}
function isConnector(el: Element): boolean {
  return el.type === "function" && el.id === "connector";
}
function isDisconnector(el: Element): boolean {
  return el.type === "function" && el.id === "disconnector";
}
function isThrottler(el: Element): boolean {
  return el.type === "function" && el.id.startsWith("throttler_");
}
function throttlerPeriod(el: Element): number {
  const m = el.id.match(/^throttler_(\d+)$/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
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
  tickCount: number,
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
      let bfsQi = 0;
      while (bfsQi < bfsQ.length) {
        const id = bfsQ[bfsQi++];
        allCloneIds.add(id);
        model.elements[id]?.childIds.forEach((c) => bfsQ.push(c));
      }
    }
  }

  function templateChildren(el: Element): string[] {
    return el.childIds.filter((id) => !allCloneIds.has(id) && model.elements[id]);
  }

  const templateChildTypesCache = new Map<string, Set<string>>();
  function templateChildTypes(el: Element): Set<string> {
    const cached = templateChildTypesCache.get(el.id);
    if (cached) return cached;
    const types = new Set(templateChildren(el).map((id) => model.elements[id]!.type));
    templateChildTypesCache.set(el.id, types);
    return types;
  }

  const connectorSkipIds = new Set<string>();
  const connectorGroups = new Map<string, TokenInstance[]>();
  for (const instance of instances) {
    const el = model.elements[instance.currentElementId];
    if (el && isConnector(el)) {
      const group = connectorGroups.get(instance.currentElementId) ?? [];
      group.push(instance);
      connectorGroups.set(instance.currentElementId, group);
    }
  }
  for (const [elementId, group] of connectorGroups) {
    for (const inst of group) connectorSkipIds.add(inst.id);
    const targets = (outgoing[elementId] ?? []).filter((t) => model.elements[t]);
    const merged: TokenInstance = {
      id: group[0].id,
      currentElementId: group[0].currentElementId,
      currentPath: group[0].currentPath,
      clonedElementIds: group.flatMap((i) => i.clonedElementIds),
      clonedRelationshipIds: group.flatMap((i) => i.clonedRelationshipIds),
    };
    if (targets.length === 0) {
      for (const inst of group) {
        for (const cloneId of inst.clonedElementIds)
          delta.removeElements.push(...collectSubtreeRemoves(model, cloneId, inst.currentElementId, `${inst.currentPath}.${cloneId}`));
        for (const relId of inst.clonedRelationshipIds)
          delta.removeRelationshipIds.push(relId);
      }
      continue;
    }
    const allIds = merged.clonedElementIds;
    if (allIds.length > 1) {
      for (let ci = 0; ci < allIds.length; ci++) {
        const from = allIds[ci];
        const to = allIds[(ci + 1) % allIds.length];
        const relId = `conn_${from}_to_${to}`;
        delta.addRelationships.push({ id: relId, source: from, target: to, type: "-->" });
        merged.clonedRelationshipIds.push(relId);
      }
    }
    const nextTargetId = targets[0];
    const nextTargetPath = findElementPath(viewState, nextTargetId);
    const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
    forwardInstance(merged, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
  }

  const deduplicatorSeen = new Map<string, Set<string>>();

  for (const instance of instances) {
    if (connectorSkipIds.has(instance.id)) continue;
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

      const compiledSelectors = selectors.map((s) => ({
        ...s,
        regex: s.pattern === null ? null : (() => { try { return new RegExp(s.pattern!); } catch { return null; } })(),
      }));
      const conditionMet =
        selectors.length === 0 ||
        instance.clonedElementIds.some((cid) => {
          const cloneEl = model.elements[cid];
          return compiledSelectors.some((s) => {
            if (cloneEl?.type !== s.type) return false;
            if (s.pattern === null) return true;
            return s.regex ? s.regex.test(baseName(cid)) : s.pattern === baseName(cid);
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

      if (isMultiplier(currentEl)) {
        const n = multiplierCount(currentEl);
        const nextTargetId = targets[0];
        const nextTargetPath = findElementPath(viewState, nextTargetId);
        const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
        const nextTargetSize = viewState.positions[nextTargetPath]?.size ?? 40;
        forwardInstance(instance, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
        for (let i = 1; i < n; i++) {
          const suffix = String(idCounter++);
          const { all: clonedItems, relationships: clonedRels } = cloneSubtree(
            model, instance.clonedElementIds, suffix,
          );
          for (const { element: el, parentCloneId } of clonedItems) {
            const parentElementId = parentCloneId ?? nextTargetId;
            const parentPath = parentCloneId ? `${nextTargetPath}.${parentCloneId}` : nextTargetPath;
            delta.addElements.push({
              element: el, parentElementId,
              path: `${parentPath}.${el.id}`,
              posEntry: { id: el.id, position: { x: nextTargetPos.x + i * 6, y: nextTargetPos.y + i * 6 }, size: Math.round(nextTargetSize * 0.5), value: 1 },
              spawnOriginId: instance.currentElementId,
            });
          }
          for (const rel of clonedRels) delta.addRelationships.push(rel);
          const topLevelCloneIds = clonedItems.filter(c => c.parentCloneId === null).map(c => c.element.id);
          nextInstances.push({ id: `inst_${idCounter++}`, currentElementId: nextTargetId, currentPath: nextTargetPath, clonedElementIds: topLevelCloneIds, clonedRelationshipIds: clonedRels.map(r => r.id) });
        }
        continue;
      }

      if (isDuplicator(currentEl)) {
        for (let ti = 0; ti < targets.length; ti++) {
          const targetId = targets[ti];
          const targetPath = findElementPath(viewState, targetId);
          const targetPos = viewState.positions[targetPath]?.position ?? { x: 0, y: 0 };
          const targetSize = viewState.positions[targetPath]?.size ?? 40;
          if (ti === 0) {
            forwardInstance(instance, targetId, targetPath, targetPos, delta, nextInstances);
          } else {
            const suffix = String(idCounter++);
            const { all: clonedItems, relationships: clonedRels } = cloneSubtree(
              model, instance.clonedElementIds, suffix,
            );
            for (const { element: el, parentCloneId } of clonedItems) {
              const parentElementId = parentCloneId ?? targetId;
              const parentPath = parentCloneId ? `${targetPath}.${parentCloneId}` : targetPath;
              delta.addElements.push({
                element: el, parentElementId,
                path: `${parentPath}.${el.id}`,
                posEntry: { id: el.id, position: targetPos, size: Math.round(targetSize * 0.5), value: 1 },
                spawnOriginId: instance.currentElementId,
              });
            }
            for (const rel of clonedRels) delta.addRelationships.push(rel);
            const topLevelCloneIds = clonedItems.filter(c => c.parentCloneId === null).map(c => c.element.id);
            nextInstances.push({ id: `inst_${idCounter++}`, currentElementId: targetId, currentPath: targetPath, clonedElementIds: topLevelCloneIds, clonedRelationshipIds: clonedRels.map(r => r.id) });
          }
        }
        continue;
      }

      if (isDeduplicator(currentEl)) {
        const seen = deduplicatorSeen.get(currentEl.id) ?? new Set<string>();
        deduplicatorSeen.set(currentEl.id, seen);
        const tokenBase = baseName(instance.clonedElementIds[0] ?? instance.id);
        if (seen.has(tokenBase)) {
          removeInstanceClones();
        } else {
          seen.add(tokenBase);
          const nextTargetId = targets[0];
          const nextTargetPath = findElementPath(viewState, nextTargetId);
          const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
          forwardInstance(instance, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
        }
        continue;
      }

      if (isDisconnector(currentEl)) {
        for (const relId of instance.clonedRelationshipIds)
          delta.removeRelationshipIds.push(relId);
        const nextTargetId = targets[0];
        const nextTargetPath = findElementPath(viewState, nextTargetId);
        const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
        if (instance.clonedElementIds.length <= 1) {
          forwardInstance({ ...instance, clonedRelationshipIds: [] }, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
        } else {
          for (const cloneId of instance.clonedElementIds) {
            delta.moveElements.push({
              elementId: cloneId,
              fromParentId: instance.currentElementId,
              fromPath: `${instance.currentPath}.${cloneId}`,
              toParentId: nextTargetId,
              toPath: `${nextTargetPath}.${cloneId}`,
              newPosition: { ...nextTargetPos },
            });
            nextInstances.push({
              id: `inst_${idCounter++}`,
              currentElementId: nextTargetId,
              currentPath: nextTargetPath,
              clonedElementIds: [cloneId],
              clonedRelationshipIds: [],
            });
          }
        }
        continue;
      }

      if (isThrottler(currentEl)) {
        const n = throttlerPeriod(currentEl);
        if (tickCount % n !== 0) {
          removeInstanceClones();
        } else {
          const nextTargetId = targets[0];
          const nextTargetPath = findElementPath(viewState, nextTargetId);
          const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
          forwardInstance(instance, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
        }
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

        for (const component of connectedComponents(tmplChildIds, model)) {
          const suffix = String(idCounter++);
          const { all: clonedItems, relationships: clonedRels } =
            cloneSubtree(model, component, suffix);
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
                position: { x: targetPos.x + offsetX, y: targetPos.y + offsetY },
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

    for (const component of connectedComponents(tmplChildIds, model)) {
      const suffix = String(idCounter++);
      const { all: clonedItems, relationships: clonedRels } = cloneSubtree(
        model,
        component,
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
