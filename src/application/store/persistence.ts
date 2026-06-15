import type { UIState } from "./uiSlice";
import type { FilterState } from "./filterSlice";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { DiagramState } from "./diagramSlice";
import type { ViewState } from "../../domain/models/ViewState";
import { AppConfig } from "../../config/appConfig";

const DB_NAME = "diagravinci_db";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const STATE_KEY = "diagravinci_state";
const ACTIVE_SESSION_KEY = "diagravinci_activeSession";

export function loadActiveSessionId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveActiveSessionId(id: string | null): void {
  try {
    if (id === null) sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    else sessionStorage.setItem(ACTIVE_SESSION_KEY, id);
  } catch {
    // quota exceeded or private mode
  }
}

type PersistedFilter = Pick<
  FilterState,
  "selectors" | "groups" | "foldLevel" | "foldActive" | "manuallyFolded" | "manuallyUnfolded"
>;

type PersistedState = {
  ui: Pick<
    UIState,
    | "renderStyle"
    | "relLineStyle"
    | "interactionMode"
    | "activeElementType"
    | "activeRelationshipType"
    | "classDiagramMode"
    | "opaqueElementBg"
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
  ui: UIState;
  filter: FilterState;
  diagram: {
    code: string;
    model: DiagramModel;
    viewState: ViewState;
    canvasSize: { width: number; height: number };
  };
};

const FALLBACK_COLORS = AppConfig.ui.COLOR_PALETTE;

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
    // quota exceeded
  }
}

function hydratePersistedState(parsed: PersistedState): HydratedState {
  const selectors = (parsed.filter.selectors ?? []).map((p, i) => ({
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
  // Migrate sessions saved before the selectorModes → groupModes rename
  if (parsed.diagram.model.sessions) {
    parsed.diagram.model.sessions = parsed.diagram.model.sessions.map((s) => ({
      ...s,
      groupModes:
        s.groupModes ??
        (s as unknown as { selectorModes?: Record<string, string> }).selectorModes ??
        {},
    }));
  }
  return {
    ...parsed,
    filter: {
      ...parsed.filter,
      selectors,
      groups: parsed.filter?.groups ?? [],
      _rev: 0,
    },
    diagram: {
      ...parsed.diagram,
      viewState,
      canvasSize: { width: 800, height: 600 },
    },
    ui: {
      ...parsed.ui,
      classDiagramMode: parsed.ui.classDiagramMode ?? true,
      relLineStyle: parsed.ui.relLineStyle ?? "straight",
      opaqueElementBg: parsed.ui.opaqueElementBg ?? true,
      connectingFromId: null,
      selectedElementIds: [],
      zoomCommand: null,
      groupMoveSelectorId: null,
      navigationParentId: null,
      activeSessionId: loadActiveSessionId(),
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
    ui: {
      renderStyle: state.ui.renderStyle,
      relLineStyle: state.ui.relLineStyle,
      interactionMode: state.ui.interactionMode,
      activeElementType: state.ui.activeElementType,
      activeRelationshipType: state.ui.activeRelationshipType,
      classDiagramMode: state.ui.classDiagramMode,
      opaqueElementBg: state.ui.opaqueElementBg,
    },
    filter: {
      selectors: state.filter.selectors,
      groups: state.filter.groups,
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
    // quota exceeded — IDB serves as fallback
  }
}

export function loadSplitterWidth(defaultWidth: number): number {
  return defaultWidth;
}
export function saveSplitterWidth(_width: number): void {}
