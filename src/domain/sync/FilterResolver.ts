import type { FilterPreset } from "../../domain/models/Selector";
import type { PositionedElement } from "../../domain/models/ViewState";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { FilterState } from "../../application/store/filterSlice";

export interface FilterLists {
  hiddenPaths: string[];
  dimmedPaths: string[];
  foldedPaths: string[];
}

function pathDepth(path: string): number {
  return path.split(".").length;
}

function matchesPreset(
  path: string,
  preset: FilterPreset,
  model: DiagramModel,
): boolean {
  if (preset.selector.atoms.length === 0) return false;

  return preset.selector.atoms.some((atom) => {
    if (atom.path) {
      try {
        if (!new RegExp(atom.path).test(path)) return false;
      } catch (err) {
        console.warn("[FilterResolver] Invalid regex in atom:", atom.path, err);
        return false;
      }
    }

    if (atom.types.length > 0) {
      const elementId = path.split(".").at(-1)!;
      const element = model.elements[elementId];
      if (!element) return false;
      if (!atom.types.includes(element.type as never)) return false;
    }

    return true;
  });
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

    for (const preset of filterState.presets) {
      if (!preset.isActive) continue;

      const unmatched: string[] = [];
      for (const path of allPaths) {
        if (!matchesPreset(path, preset, model)) unmatched.push(path);
      }

      if (unmatched.length > 0) {
        console.log(
          `[FilterResolver] Preset "${preset.label}" (${preset.mode}): unmatched ${unmatched.length} paths`,
          unmatched,
        );
      }

      if (preset.mode === "hide") {
        unmatched.forEach((p) => hiddenSet.add(p));
      } else if (preset.mode === "dim") {
        unmatched.forEach((p) => dimmedSet.add(p));
      }
    }

    if (filterState.foldActive) {
      console.log(
        "[FilterResolver] Fold active at depth:",
        filterState.foldLevel,
        "| paths to check:",
        allPaths.length,
      );
      for (const path of allPaths) {
        if (pathDepth(path) === filterState.foldLevel) {
          if (!filterState.manuallyUnfolded.includes(path)) {
            foldedSet.add(path);
          } else {
            console.log(
              "[FilterResolver] Depth-fold skipped (manually unfolded):",
              path,
            );
          }
        }
      }
    }

    for (const path of filterState.manuallyFolded) {
      if (!positions[path]) {
        console.log(
          "[FilterResolver] manuallyFolded path not in positions (stale):",
          path,
        );
        continue;
      }
      if (filterState.manuallyUnfolded.includes(path)) {
        console.warn(
          "[FilterResolver] Path in both manuallyFolded and manuallyUnfolded:",
          path,
        );
        continue;
      }
      foldedSet.add(path);
      console.log("[FilterResolver] Manually folded:", path);
    }

    for (const path of filterState.manuallyUnfolded) {
      if (foldedSet.delete(path)) {
        console.log(
          "[FilterResolver] Manually unfolded (removed from foldedSet):",
          path,
        );
      }
    }

    const result: FilterLists = {
      hiddenPaths: [...hiddenSet],
      dimmedPaths: [...dimmedSet],
      foldedPaths: [...foldedSet],
    };

    console.log("[FilterResolver] Resolved:", {
      hidden: result.hiddenPaths.length,
      dimmed: result.dimmedPaths.length,
      folded: result.foldedPaths.length,
    });

    return result;
  }

  static equal(a: FilterLists, b: FilterLists): boolean {
    return (
      arraysEqual([...a.hiddenPaths].sort(), [...b.hiddenPaths].sort()) &&
      arraysEqual([...a.dimmedPaths].sort(), [...b.dimmedPaths].sort()) &&
      arraysEqual([...a.foldedPaths].sort(), [...b.foldedPaths].sort())
    );
  }
}
