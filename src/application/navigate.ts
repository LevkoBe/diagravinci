import type { DiagramModel } from "../domain/models/DiagramModel";

export type NavDirection = "forward" | "forward-all" | "backward" | "backward-all" | "parent" | "child" | "child-all";

function getColorForId(id: string, coloredPaths: Record<string, string>): string | null {
  if (coloredPaths[id]) return coloredPaths[id];
  for (const [path, color] of Object.entries(coloredPaths)) {
    if (path.split(".").at(-1) === id) return color;
  }
  return null;
}

function colorMatchRank(peerId: string, currentColor: string | null, coloredPaths: Record<string, string>): number {
  if (!currentColor) return 1;
  return getColorForId(peerId, coloredPaths) === currentColor ? 0 : 1;
}

export function findParentId(
  childId: string,
  model: DiagramModel,
): string | null {
  if (model.root.childIds.includes(childId)) return model.root.id;
  for (const [id, el] of Object.entries(model.elements)) {
    if (el.childIds.includes(childId)) return id;
  }
  return null;
}

export function navigateSelection(
  selectedIds: string[],
  model: DiagramModel,
  direction: NavDirection,
  coloredPaths?: Record<string, string>,
): string[] {
  if (selectedIds.length === 0) return selectedIds;

  const rels = Object.values(model.relationships);
  const result = new Set<string>();

  for (const id of selectedIds) {
    const currentColor = coloredPaths ? getColorForId(id, coloredPaths) : null;

    switch (direction) {
      case "forward": {
        const outgoing = rels
          .filter((r) => r.source === id || r.source.split(".").at(-1) === id)
          .sort((a, b) => colorMatchRank(a.target.split(".").at(-1)!, currentColor, coloredPaths ?? {}) - colorMatchRank(b.target.split(".").at(-1)!, currentColor, coloredPaths ?? {}));
        if (outgoing.length > 0)
          result.add(outgoing[0].target.split(".").at(-1)!);
        break;
      }
      case "forward-all": {
        const outgoing = rels
          .filter((r) => r.source === id || r.source.split(".").at(-1) === id)
          .sort((a, b) => colorMatchRank(a.target.split(".").at(-1)!, currentColor, coloredPaths ?? {}) - colorMatchRank(b.target.split(".").at(-1)!, currentColor, coloredPaths ?? {}));
        outgoing.forEach((r) => result.add(r.target.split(".").at(-1)!));
        break;
      }
      case "backward": {
        const incoming = rels
          .filter((r) => r.target === id || r.target.split(".").at(-1) === id)
          .sort((a, b) => colorMatchRank(a.source.split(".").at(-1)!, currentColor, coloredPaths ?? {}) - colorMatchRank(b.source.split(".").at(-1)!, currentColor, coloredPaths ?? {}));
        if (incoming.length > 0)
          result.add(incoming[0].source.split(".").at(-1)!);
        break;
      }
      case "backward-all": {
        const incoming = rels
          .filter((r) => r.target === id || r.target.split(".").at(-1) === id)
          .sort((a, b) => colorMatchRank(a.source.split(".").at(-1)!, currentColor, coloredPaths ?? {}) - colorMatchRank(b.source.split(".").at(-1)!, currentColor, coloredPaths ?? {}));
        incoming.forEach((r) => result.add(r.source.split(".").at(-1)!));
        break;
      }
      case "parent": {
        const parentId = findParentId(id, model);
        if (parentId && parentId !== model.root.id) result.add(parentId);
        break;
      }
      case "child": {
        const el = model.elements[id];
        if (el?.childIds.length) result.add(el.childIds[0]);
        break;
      }
      case "child-all": {
        const el = model.elements[id];
        if (el?.childIds.length) el.childIds.forEach((cid) => result.add(cid));
        break;
      }
    }
  }

  return [...result];
}

export function navigateAlternative(
  selectedIds: string[],
  model: DiagramModel,
  direction: "next" | "prev",
  parentIdHint: string | null,
): string[] {
  if (selectedIds.length === 0) return selectedIds;

  const result = new Set<string>();

  for (const id of selectedIds) {
    let parentId: string | null = parentIdHint;
    if (parentId !== null) {
      const hintParent =
        parentId === model.root.id ? model.root : model.elements[parentId];
      if (!hintParent?.childIds.includes(id)) parentId = null;
    }
    if (parentId === null) parentId = findParentId(id, model);
    if (parentId === null) continue;

    const parent =
      parentId === model.root.id ? model.root : model.elements[parentId];
    if (!parent) continue;

    const siblings = parent.childIds;
    const idx = siblings.indexOf(id);
    if (idx === -1 || siblings.length <= 1) continue;

    const n = siblings.length;
    const next = direction === "next" ? (idx + 1) % n : (idx - 1 + n) % n;
    result.add(siblings[next]);
  }

  return [...result];
}
