import type { Selector, Rule } from "../../domain/models/Selector";
import type { PositionedElement } from "../../domain/models/ViewState";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { FilterState } from "../../application/store/filterSlice";
import { evaluateSelector } from "../selector/SelectorEvaluator";

export interface FilterLists {
  hiddenPaths: string[];
  dimmedPaths: string[];
  foldedPaths: string[];
  coloredPaths: Record<string, string>;
}

function pathDepth(path: string): number {
  return path.split(".").length;
}

function matchesSelector(
  path: string,
  selector: Selector,
  model: DiagramModel,
  rules: Rule[],
): boolean {
  const elementId = path.split(".").at(-1)!;
  const element = model.elements[elementId];

  if (selector.selectionPattern) {
    try {
      return new RegExp(selector.selectionPattern).test(path);
    } catch {
      return false;
    }
  }

  if (element?.flags?.includes(selector.id)) return true;

  const type = element?.type ?? "";
  return evaluateSelector(selector.expression, path, type, rules);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export class FilterResolver {
  static resolve(
    filterState: FilterState,
    positions: Record<string, PositionedElement>,
    model: DiagramModel,
  ): FilterLists {
    const allPaths = Object.keys(positions);
    const hiddenSet = new Set<string>();
    const dimmedSet = new Set<string>();
    const foldedSet = new Set<string>();
    const coloredMap = new Map<string, string>();
    const rules = model.rules ?? [];

    for (const selector of filterState.selectors) {
      if (selector.mode === "off") continue;

      if (selector.mode === "color") {
        for (const path of allPaths) {
          if (matchesSelector(path, selector, model, rules)) {
            coloredMap.set(path, selector.color);
          }
        }
        continue;
      }

      const unmatched: string[] = [];
      for (const path of allPaths) {
        if (!matchesSelector(path, selector, model, rules)) unmatched.push(path);
      }

      if (selector.mode === "hide") {
        unmatched.forEach((p) => hiddenSet.add(p));
      } else if (selector.mode === "dim") {
        unmatched.forEach((p) => dimmedSet.add(p));
      }
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
