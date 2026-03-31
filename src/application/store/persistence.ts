import type { UIState } from "./uiSlice";
import type { FilterState } from "./filterSlice";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { DiagramState } from "./diagramSlice";
import type { ViewState } from "../../domain/models/ViewState";

const DB_NAME = "diagravinci_db";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const STATE_KEY = "diagravinci_state";
const SPLITTER_KEY = "diagravinci_splitter_width";

type PersistedFilter = Pick<
  FilterState,
  "presets" | "foldLevel" | "foldActive" | "manuallyFolded" | "manuallyUnfolded"
>;

type PersistedState = {
  theme: { isDark: boolean };
  ui: Pick<
    UIState,
    | "renderStyle"
    | "interactionMode"
    | "activeElementType"
    | "activeRelationshipType"
  >;
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
  diagram: {
    code: string;
    model: DiagramModel;
    viewState: ViewState;
    canvasSize: { width: number; height: number };
  };
};

const FALLBACK_COLORS = [
  "#e05c5c",
  "#e07a2f",
  "#d4a017",
  "#5cb85c",
  "#2f9ee0",
  "#7b5ce0",
  "#d45cb8",
  "#5ce0c8",
];

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Silently ignore
  }
}

function hydratePersistedState(parsed: PersistedState): HydratedState {
  const presets = (parsed.filter.presets ?? []).map((p, i) => ({
    ...p,
    color:
      (p as { color?: string }).color ??
      FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));
  const viewState = {
    ...parsed.diagram.viewState,
    coloredPaths:
      (parsed.diagram.viewState as { coloredPaths?: Record<string, string> })
        .coloredPaths ?? {},
  };
  return {
    ...parsed,
    filter: {
      ...parsed.filter,
      presets,
      isModalOpen: false,
      activeModalPresetId: null,
      _rev: 0,
    },
    diagram: {
      ...parsed.diagram,
      viewState,
      canvasSize: { width: 800, height: 600 },
    },
    ui: {
      ...parsed.ui,
      connectingFromId: null,
      selectedElementId: null,
      zoomCommand: null,
    },
  };
}

export function loadState(): HydratedState | undefined {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PersistedState;
    return hydratePersistedState(parsed);
  } catch {
    return undefined;
  }
}

export async function loadStateAsync(): Promise<HydratedState | undefined> {
  try {
    const parsed = await idbGet<PersistedState>(STATE_KEY);
    if (!parsed) return undefined;
    return hydratePersistedState(parsed);
  } catch {
    return undefined;
  }
}

export function saveState(state: AppState): void {
  const persisted: PersistedState = {
    theme: { isDark: state.theme.isDark },
    ui: {
      renderStyle: state.ui.renderStyle,
      interactionMode: state.ui.interactionMode,
      activeElementType: state.ui.activeElementType,
      activeRelationshipType: state.ui.activeRelationshipType,
    },
    filter: {
      presets: state.filter.presets.map(({ ...rest }) => ({
        ...rest,
        isActive: false,
      })),
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

  idbSet(STATE_KEY, persisted);

  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(persisted));
  } catch {
    // Quota exceeded — IDB will serve the data on next load
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
