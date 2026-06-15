import type { Selector, Rule, SelectorMode } from "../../domain/models/Selector";
import { toSelectorId } from "../../domain/models/Selector";
import type { PositionedElement } from "../../domain/models/ViewState";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { FilterState } from "../../application/store/filterSlice";
import { evaluateSelector } from "../selector/SelectorEvaluator";
import { matchesGroup } from "../selector/GroupEvaluator";

export interface FilterLists {
  hiddenPaths: string[];
  dimmedPaths: string[];
  foldedPaths: string[];
  coloredPaths: Record<string, string>;
}

function pathDepth(path: string): number {
  return path.split(".").length;
}

export function matchesSelector(
  path: string,
  selector: Selector,
  model: DiagramModel,
  rules: Rule[],
): boolean {
  const elementId = path.split(".").at(-1)!;
  const element = model.elements[elementId];
  if (element?.flags?.some((f) => toSelectorId(f) === selector.id)) return true;
  const type = element?.type ?? "";
  return evaluateSelector(selector.expression, path, type, rules);
}

export class FilterResolver {
  static resolve(
    filterState: FilterState,
    positions: Record<string, PositionedElement>,
    model: DiagramModel,
    activeSessionId: string | null = null,
  ): FilterLists {
    const allPaths = Object.keys(positions);
    const hiddenSet = new Set<string>();
    const dimmedSet = new Set<string>();
    const foldedSet = new Set<string>();
    const coloredMap = new Map<string, string>();
    const rules = model.rules ?? [];
    const groups = model.groups ?? [];

    const activeSession = (model.sessions ?? []).find(
      (s) => s.id === activeSessionId,
    );

    // new-style groups (Group with rule field) — applied first
    for (const group of filterState.groups ?? []) {
      const mode: SelectorMode = activeSession?.groupModes?.[group.id] ?? "off";
      if (mode === "off") continue;

      const elementOf = (path: string) => {
        const id = path.split(".").at(-1)!;
        return model.elements[id];
      };

      applyMode(mode, allPaths, coloredMap, hiddenSet, dimmedSet, group.color, (path) => {
        const el = elementOf(path);
        if (!el) return false;
        if (el.flags?.some((f) => toSelectorId(f) === group.id)) return true;
        return matchesGroup(group, path, el.type, model.elements, groups);
      });
    }

    // old-style selectors (Selector with expression field) — applied last so click-selection always wins
    for (const selector of filterState.selectors) {
      const mode: SelectorMode = activeSession?.groupModes?.[selector.id] ?? "off";
      if (mode === "off") continue;
      applyMode(mode, allPaths, coloredMap, hiddenSet, dimmedSet, selector.color, (path) =>
        matchesSelector(path, selector, model, rules),
      );
    }

    const manuallyUnfoldedSet = new Set(filterState.manuallyUnfolded);

    if (filterState.foldActive) {
      for (const path of allPaths) {
        if (
          pathDepth(path) === filterState.foldLevel &&
          !manuallyUnfoldedSet.has(path)
        ) {
          foldedSet.add(path);
        }
      }
    }

    for (const path of filterState.manuallyFolded) {
      if (!positions[path]) continue;
      if (manuallyUnfoldedSet.has(path)) continue;
      foldedSet.add(path);
    }

    for (const path of filterState.manuallyUnfolded) {
      foldedSet.delete(path);
    }

    return {
      hiddenPaths: [...hiddenSet],
      dimmedPaths: [...dimmedSet],
      foldedPaths: [...foldedSet],
      coloredPaths: Object.fromEntries(coloredMap),
    };
  }

  static equal(a: FilterLists, b: FilterLists): boolean {
    const coloredEqual =
      JSON.stringify(
        Object.entries(a.coloredPaths ?? {}).sort(([k1], [k2]) =>
          k1.localeCompare(k2),
        ),
      ) ===
      JSON.stringify(
        Object.entries(b.coloredPaths ?? {}).sort(([k1], [k2]) =>
          k1.localeCompare(k2),
        ),
      );
    return (
      arraysEqual([...a.hiddenPaths].sort(), [...b.hiddenPaths].sort()) &&
      arraysEqual([...a.dimmedPaths].sort(), [...b.dimmedPaths].sort()) &&
      arraysEqual([...a.foldedPaths].sort(), [...b.foldedPaths].sort()) &&
      coloredEqual
    );
  }
}

function applyMode(
  mode: SelectorMode,
  allPaths: string[],
  coloredMap: Map<string, string>,
  hiddenSet: Set<string>,
  dimmedSet: Set<string>,
  color: string,
  matches: (path: string) => boolean,
): void {
  if (mode === "color") {
    for (const path of allPaths) {
      if (matches(path)) coloredMap.set(path, color);
    }
    return;
  }
  const unmatched: string[] = [];
  for (const path of allPaths) {
    if (!matches(path)) unmatched.push(path);
  }
  if (mode === "hide") {
    unmatched.forEach((p) => hiddenSet.add(p));
  } else if (mode === "dim") {
    unmatched.forEach((p) => dimmedSet.add(p));
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
