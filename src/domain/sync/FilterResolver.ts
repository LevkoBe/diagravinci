import type { FilterPreset, SelectorAtom } from "../../domain/models/Selector";
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

function matchesPreset(
  path: string,
  preset: FilterPreset,
  model: DiagramModel,
  globalAtoms: SelectorAtom[],
): boolean {
  const elementId = path.split(".").at(-1)!;
  const element = model.elements[elementId];

  if (preset.selectionPattern) {
    try {
      return new RegExp(preset.selectionPattern).test(path);
    } catch {
      return false;
    }
  }

  if (element?.flags?.includes(preset.id)) return true;

  const type = element?.type ?? "";
  return evaluateSelector(preset.selector, path, type, globalAtoms);
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
    const globalAtoms = model.atoms ?? [];

    const allPresets = filterState.presets;

    for (const preset of allPresets) {
      if (!preset.isActive) continue;

      if (preset.mode === "color") {
        for (const path of allPaths) {
          if (matchesPreset(path, preset, model, globalAtoms)) {
            coloredMap.set(path, preset.color);
          }
        }
        continue;
      }

      const unmatched: string[] = [];
      for (const path of allPaths) {
        if (!matchesPreset(path, preset, model, globalAtoms))
          unmatched.push(path);
      }

      if (preset.mode === "hide") {
        unmatched.forEach((p) => hiddenSet.add(p));
      } else if (preset.mode === "dim") {
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
