import type { DiagramModel } from "../domain/models/DiagramModel";
import type { ViewState, PositionedElement } from "../domain/models/ViewState";
import type { Element } from "../domain/models/Element";
import type { Relationship } from "../domain/models/Relationship";
import type { TokenInstance } from "./store/executionSlice";

export type { TokenInstance };

/**
 * Describes all model/viewState mutations produced by one execution tick.
 */
export interface ExecutionStepDelta {
  /** Add new clone elements as children of a specific parent element. */
  addElements: Array<{
    element: Element;
    parentElementId: string;
    path: string;
    posEntry: PositionedElement;
    /** Element ID that generated this clone — used to animate spawn from origin. */
    spawnOriginId: string;
  }>;
  addRelationships: Relationship[];
  /** Remove consumed clone elements from their parent. */
  removeElements: Array<{
    elementId: string;
    parentElementId: string;
    path: string;
  }>;
  removeRelationshipIds: string[];
  /** Move propagated clones from one parent element to the next. */
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

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Any directed relationship carries execution tokens EXCEPT inheritance (`--|>`, `..|>`).
 * This includes both solid `-->` and dotted `..>` arrows.
 */
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

/** Find the viewState path for an element (prefers shortest/direct match). */
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
  /** null = direct child of the source; otherwise the clone ID of the parent. */
  parentCloneId: string | null;
}

/**
 * Clones the subtree rooted at each ID in `rootChildIds` using `suffix` to
 * make IDs unique. Returns a flat list with each item's correct parent clone ID
 * so that callers can set `parentElementId` accurately (top-level items have
 * parentCloneId === null, nested items have their parent's clone ID).
 * Also clones any relationships whose both endpoints live inside the subtree.
 */
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

/**
 * Recursively collects all elements in the subtree rooted at `rootId`
 * (including the root) so they can all be added to removeElements.
 */
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

/** Strips trailing `_N` numeric suffix from a clone ID to recover the original name. */
function baseName(id: string): string {
  return id.replace(/_\d+$/, "");
}

/** True for `gen` function elements (spontaneous generators). */
function isGen(el: Element): boolean {
  return el.type === "function" && el.id === "gen";
}

/** True for `round_robin` function elements (incoming round-robin routers). */
function isRoundRobin(el: Element): boolean {
  return el.type === "function" && el.id === "round_robin";
}

/**
 * Moves all clones of an instance to a new target element and records a
 * forwarded instance for the next tick.
 */
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

// ─── main export ─────────────────────────────────────────────────────────────

/**
 * Pure function: computes the next execution step.
 *
 * Execution behavior is determined by element type and reserved names — no
 * element `props` are used.
 *
 * ── Element behaviour summary ──────────────────────────────────────────────
 *  `gen()`       function named "gen": spontaneous generator — clones its
 *                template children every tick and forwards to next element.
 *  `round_robin()` function named "round_robin": incoming router — distributes
 *                arriving tokens round-robin across outgoing targets.
 *  `()` function (other): trigger-based — consumes arriving tokens, then
 *                produces its own template children at the next element.
 *                If no template children, passes tokens through unchanged.
 *  `{}` object   — absorbs all arriving tokens; does not forward.
 *  `[]` collection — type filter on input (template child types); accumulates
 *                at dead-end; forwards when outgoing path exists.
 *  `||` state    — pass-through 1:1.
 *  `>>` flow     — type filter: only passes tokens whose type matches a
 *                template child type; empty = pass all.
 *  `<>` choice   — routes 1:1 via yes/no branches. Each template child is a
 *                selector {type, name-regex}; first match → yes, none → no.
 */
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

  // Round-robin routing index derived from the instance ID (persistent across ticks).
  function instanceRoundRobinIdx(instanceId: string): number {
    const m = instanceId.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  // Build allCloneIds BEFORE Step 1 so type/name checks can exclude clones.
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

  /** Original (non-clone) children of an element that exist in the model. */
  function templateChildren(el: Element): string[] {
    return el.childIds.filter((id) => !allCloneIds.has(id) && model.elements[id]);
  }

  /** Set of types from an element's template children. */
  function templateChildTypes(el: Element): Set<string> {
    return new Set(templateChildren(el).map((id) => model.elements[id]!.type));
  }

  // ── Step 1: propagate existing instances ─────────────────────────────────
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

    // `{}` object: absorbs all arriving tokens regardless of name.
    // (Name-based update of stored children is a future feature.)
    if (currentEl?.type === "object") {
      removeInstanceClones();
      continue;
    }

    const targets = (outgoing[instance.currentElementId] ?? []).filter(
      (tid) => model.elements[tid] !== undefined,
    );

    // Dead-end handling.
    if (targets.length === 0) {
      if (currentEl?.type === "collection" || currentEl?.type === "state") {
        nextInstances.push(instance); // accumulate indefinitely
      } else {
        removeInstanceClones(); // consume and drop
      }
      continue;
    }

    // `>>` flow: type filter — drop tokens not matching template child types.
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
      // Matched or no filter — fall through to forwarding.
    }

    // `[]` collection: same type filter on incoming tokens.
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
      // Matched or no filter — fall through to forwarding.
    }

    // `<>` choice: type + name-regex routing.
    if (currentEl?.type === "choice" && targets.length > 1) {
      const selectors = templateChildren(currentEl).map((id) => ({
        type: model.elements[id]!.type as string,
        // Anonymous children (anon_*) match any name of the right type.
        pattern: id.startsWith("anon_") ? null : id,
      }));

      const conditionMet =
        selectors.length === 0 ||
        instance.clonedElementIds.some((cid) => {
          const cloneEl = model.elements[cid];
          return selectors.some((s) => {
            if (cloneEl?.type !== s.type) return false;
            if (s.pattern === null) return true; // type-only match
            try {
              return new RegExp(s.pattern).test(baseName(cid));
            } catch {
              return s.pattern === baseName(cid); // fallback: literal match
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

    // `()` function: three sub-cases by name.
    if (currentEl?.type === "function") {
      if (isGen(currentEl)) {
        // gen absorbs tokens that arrive to prevent feedback loops.
        removeInstanceClones();
        continue;
      }

      if (isRoundRobin(currentEl)) {
        // round_robin: forward clones round-robin to the next target.
        const nextTargetId = targets[instanceRoundRobinIdx(instance.id) % targets.length];
        const nextTargetPath = findElementPath(viewState, nextTargetId);
        const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
        forwardInstance(instance, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
        continue;
      }

      // Regular function (trigger-based):
      const tmplChildIds = templateChildren(currentEl);

      if (tmplChildIds.length === 0) {
        // No template children — pass incoming tokens through unchanged.
        const nextTargetId = targets[0];
        const nextTargetPath = findElementPath(viewState, nextTargetId);
        const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
        forwardInstance(instance, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
      } else {
        // Consume incoming, then produce template children at next target.
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

    // Default forwarding: state, collection (after type-filter), flow (after type-filter).
    const nextTargetId = targets[0];
    const nextTargetPath = findElementPath(viewState, nextTargetId);
    const nextTargetPos = viewState.positions[nextTargetPath]?.position ?? { x: 0, y: 0 };
    forwardInstance(instance, nextTargetId, nextTargetPath, nextTargetPos, delta, nextInstances);
  }

  // ── Step 2: spontaneous generation — only `gen` function elements ──────────
  //
  // allCloneIds was already built above and is reused here to distinguish
  // template children from execution-placed clones.
  for (const element of Object.values(model.elements)) {
    if (!isGen(element)) continue;

    const targets = outgoing[element.id] ?? [];
    if (targets.length === 0) continue;

    // When gen has no template children, borrow from the first target's template
    // children so that `gen()` "generates everything the consumer consumes".
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

/** Returns the set of element IDs that belong to active instances. */
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

/**
 * Applies an ExecutionStepDelta to a model immutably (spread-based, no mutation).
 * Returns the new model state after adds, removes, and moves.
 */
export function applyDeltaToModel(
  model: DiagramModel,
  delta: ExecutionStepDelta,
): DiagramModel {
  // Shallow-copy elements (with childIds arrays cloned)
  const elements: Record<string, Element> = {};
  for (const [id, el] of Object.entries(model.elements)) {
    elements[id] = { ...el, childIds: [...el.childIds] };
  }
  const relationships = { ...model.relationships };
  const root = { ...model.root, childIds: [...model.root.childIds] };

  // Add new clone elements as children of their parent
  for (const { element, parentElementId } of delta.addElements) {
    elements[element.id] = { ...element, childIds: [...element.childIds] };
    const parent = elements[parentElementId];
    if (parent && !parent.childIds.includes(element.id)) {
      parent.childIds = [...parent.childIds, element.id];
    }
  }

  // Add new relationships
  for (const rel of delta.addRelationships) {
    relationships[rel.id] = rel;
  }

  // Remove consumed elements
  for (const { elementId, parentElementId } of delta.removeElements) {
    delete elements[elementId];
    const parent = elements[parentElementId];
    if (parent) {
      parent.childIds = parent.childIds.filter((c) => c !== elementId);
    }
  }

  // Remove consumed relationships
  for (const id of delta.removeRelationshipIds) {
    delete relationships[id];
  }

  // Move elements: detach from old parent, attach to new parent
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

/**
 * Returns a new model with all execution-generated clones removed.
 * Used when resetting execution with materialize = false.
 */
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
