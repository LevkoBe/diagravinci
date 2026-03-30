import type { UIState } from "./uiSlice";
import type { FilterState } from "./filterSlice";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { DiagramState } from "./diagramSlice";
import type { ViewState } from "../../domain/models/ViewState";

const STATE_KEY = "diagravinci_state";
const SPLITTER_KEY = "diagravinci_splitter_width";

type PersistedFilter = Pick<FilterState, "presets" | "foldLevel" | "foldActive" | "manuallyFolded" | "manuallyUnfolded">;

type PersistedState = {
  theme: { isDark: boolean };
  ui: Pick<UIState, "renderStyle" | "interactionMode" | "activeElementType" | "activeRelationshipType">;
  filter: PersistedFilter;
  diagram: { code: string; model: DiagramModel; viewState: ViewState };
};

type HydratedState = Omit<PersistedState, "filter" | "diagram" | "ui"> & {
  filter: FilterState;
  diagram: DiagramState;
  ui: UIState;
};

type AppState = {
  theme: { isDark: boolean };
  ui: UIState;
  filter: FilterState;
  diagram: { code: string; model: DiagramModel; viewState: ViewState; canvasSize: { width: number; height: number } };
};

const FALLBACK_COLORS = [
  "#e05c5c", "#e07a2f", "#d4a017", "#5cb85c",
  "#2f9ee0", "#7b5ce0", "#d45cb8", "#5ce0c8",
];

export function loadState(): HydratedState | undefined {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PersistedState;
    const presets = (parsed.filter.presets ?? []).map((p, i) => ({
      ...p,
      color: (p as { color?: string }).color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }));
    const viewState = {
      ...parsed.diagram.viewState,
      coloredPaths: (parsed.diagram.viewState as { coloredPaths?: Record<string, string> }).coloredPaths ?? {},
    };
    return {
      ...parsed,
      filter: { ...parsed.filter, presets, isModalOpen: false, activeModalPresetId: null, _rev: 0 },
      diagram: { ...parsed.diagram, viewState, canvasSize: { width: 800, height: 600 } },
      ui: { ...parsed.ui, connectingFromId: null, selectedElementId: null, zoomCommand: null },
    };
  } catch {
    return undefined;
  }
}

export function saveState(state: AppState): void {
  try {
    const persisted: PersistedState = {
      theme: { isDark: state.theme.isDark },
      ui: {
        renderStyle: state.ui.renderStyle,
        interactionMode: state.ui.interactionMode,
        activeElementType: state.ui.activeElementType,
        activeRelationshipType: state.ui.activeRelationshipType,
      },
      filter: {
        presets: state.filter.presets,
        foldLevel: state.filter.foldLevel,
        foldActive: state.filter.foldActive,
        manuallyFolded: state.filter.manuallyFolded,
        manuallyUnfolded: state.filter.manuallyUnfolded,
      },
      diagram: {
        code: state.diagram.code,
        model: state.diagram.model,
        viewState: state.diagram.viewState,
      },
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(persisted));
  } catch {
    // Silently ignore quota errors
  }
}

export function loadSplitterWidth(defaultWidth: number): number {
  try {
    const raw = localStorage.getItem(SPLITTER_KEY);
    if (raw === null) return defaultWidth;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultWidth;
  } catch {
    return defaultWidth;
  }
}

export function saveSplitterWidth(width: number): void {
  try {
    localStorage.setItem(SPLITTER_KEY, String(width));
  } catch {
    // Silently ignore
  }
}
