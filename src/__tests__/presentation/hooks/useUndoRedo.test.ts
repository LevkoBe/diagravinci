import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import React from "react";
import { Provider } from "react-redux";
import diagramReducer, {
  setCode,
} from "../../../application/store/diagramSlice";
import uiReducer from "../../../application/store/uiSlice";
import historyReducer, {
  pushHistory,
} from "../../../application/store/historySlice";
import type { HistoryEntry } from "../../../application/store/historySlice";
import { createElement } from "../../../domain/models/Element";
import { createEmptyDiagram } from "../../../domain/models/DiagramModel";
import { useUndoRedo } from "../../../presentation/hooks/useUndoRedo";

let testStore: ReturnType<typeof makeTestStore>;
const mockSyncFromCode = vi.fn();

vi.mock("../../../application/store/store", () => ({
  get store() {
    return testStore;
  },
  syncManager: {
    syncFromVis: vi.fn(),
    syncFromCode: (...args: unknown[]) => mockSyncFromCode(...args),
    subscribe: () => () => {},
  },
}));

function makeTestStore() {
  return configureStore({
    reducer: {
      diagram: diagramReducer,
      ui: uiReducer,
      history: historyReducer,
    },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(Provider, { store: testStore, children });
}

function makeEntry(code: string): HistoryEntry {
  const model = createEmptyDiagram();
  const root = createElement("root", "object");
  return {
    code,
    model: { ...model, root },
    positions: {},
    relationships: [],
    viewMode: "basic",
  };
}

function setupHistory(...codes: string[]) {
  for (const code of codes) {
    testStore.dispatch(pushHistory(makeEntry(code)));
  }
  testStore.dispatch(setCode(codes[codes.length - 1]));
}

function fireKey(init: Partial<KeyboardEventInit> & { code: string }) {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  });
}

beforeEach(() => {
  testStore = makeTestStore();
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll("[data-test-cleanup]").forEach((el) => el.remove());
});

describe("canUndo / canRedo", () => {
  it("canUndo is false initially", () => {
    const { result } = renderHook(() => useUndoRedo(), { wrapper: Wrapper });
    expect(result.current.canUndo).toBe(false);
  });

  it("canRedo is false initially", () => {
    const { result } = renderHook(() => useUndoRedo(), { wrapper: Wrapper });
    expect(result.current.canRedo).toBe(false);
  });

  it("canUndo becomes true after pushing two history entries", () => {
    setupHistory("state1", "state2");
    const { result } = renderHook(() => useUndoRedo(), { wrapper: Wrapper });
    expect(result.current.canUndo).toBe(true);
  });

  it("canRedo becomes true after an undo", () => {
    setupHistory("state1", "state2");
    const { result } = renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    act(() => result.current.undo());

    expect(result.current.canRedo).toBe(true);
  });
});

describe("Ctrl+Z undo shortcut", () => {
  it("Ctrl+Z does nothing when history is empty", () => {
    renderHook(() => useUndoRedo(), { wrapper: Wrapper });
    fireKey({ code: "KeyZ", key: "z", ctrlKey: true });
    expect(testStore.getState().history.past).toHaveLength(0);
  });

  it("Ctrl+Z undoes the last change and updates diagram code", () => {
    setupHistory("state1", "state2");
    renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    fireKey({ code: "KeyZ", key: "z", ctrlKey: true });

    expect(testStore.getState().history.past).toHaveLength(0);
    expect(testStore.getState().history.present?.code).toBe("state1");
    expect(testStore.getState().diagram.code).toBe("state1");
  });

  it("Ctrl+Z with Shift does not trigger undo", () => {
    setupHistory("state1", "state2");
    renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    fireKey({ code: "KeyZ", key: "z", ctrlKey: true, shiftKey: true });

    expect(testStore.getState().history.past).toHaveLength(1);
  });

  it("Ctrl+Z ignores events from TEXTAREA", () => {
    setupHistory("state1", "state2");
    renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    const textarea = document.createElement("textarea");
    textarea.setAttribute("data-test-cleanup", "");
    document.body.appendChild(textarea);

    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyZ",
          key: "z",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(testStore.getState().history.past).toHaveLength(1);
  });

  it("multiple Ctrl+Z calls walk back through history", () => {
    setupHistory("state1", "state2", "state3");
    renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    fireKey({ code: "KeyZ", key: "z", ctrlKey: true });
    expect(testStore.getState().history.present?.code).toBe("state2");

    fireKey({ code: "KeyZ", key: "z", ctrlKey: true });
    expect(testStore.getState().history.present?.code).toBe("state1");

    fireKey({ code: "KeyZ", key: "z", ctrlKey: true });
    expect(testStore.getState().history.present?.code).toBe("state1");
  });
});

describe("Ctrl+Y redo shortcut", () => {
  it("Ctrl+Y does nothing when there is nothing to redo", () => {
    setupHistory("state1", "state2");
    renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    fireKey({ code: "KeyY", key: "y", ctrlKey: true });

    expect(testStore.getState().history.future).toHaveLength(0);
  });

  it("Ctrl+Y redoes after an undo", () => {
    setupHistory("state1", "state2");
    renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    fireKey({ code: "KeyZ", key: "z", ctrlKey: true });
    expect(testStore.getState().history.present?.code).toBe("state1");

    fireKey({ code: "KeyY", key: "y", ctrlKey: true });
    expect(testStore.getState().history.present?.code).toBe("state2");
    expect(testStore.getState().diagram.code).toBe("state2");
  });
});

describe("Ctrl+Shift+Z redo shortcut", () => {
  it("Ctrl+Shift+Z redoes after an undo", () => {
    setupHistory("state1", "state2");
    renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    fireKey({ code: "KeyZ", key: "z", ctrlKey: true });
    fireKey({ code: "KeyZ", key: "Z", ctrlKey: true, shiftKey: true });

    expect(testStore.getState().history.present?.code).toBe("state2");
  });
});

describe("programmatic undo / redo", () => {
  it("undo() moves present to past and restores the prior entry", () => {
    setupHistory("v1", "v2");
    const { result } = renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    act(() => result.current.undo());

    expect(testStore.getState().history.present?.code).toBe("v1");
    expect(testStore.getState().history.future).toHaveLength(1);
  });

  it("redo() after undo restores the future entry", () => {
    setupHistory("v1", "v2");
    const { result } = renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(testStore.getState().history.present?.code).toBe("v2");
    expect(testStore.getState().history.future).toHaveLength(0);
  });

  it("undo() is a no-op when there is nothing to undo", () => {
    const { result } = renderHook(() => useUndoRedo(), { wrapper: Wrapper });
    act(() => result.current.undo());
    expect(testStore.getState().history.past).toHaveLength(0);
  });

  it("redo() is a no-op when there is nothing to redo", () => {
    setupHistory("v1");
    const { result } = renderHook(() => useUndoRedo(), { wrapper: Wrapper });
    act(() => result.current.redo());
    expect(testStore.getState().history.future).toHaveLength(0);
  });
});

describe("history debounce", () => {
  it("does not push history immediately on code change", () => {
    renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    act(() => testStore.dispatch(setCode("new code")));

    expect(testStore.getState().history.present?.code).not.toBe("new code");
  });

  it("pushes history after the debounce period elapses", () => {
    renderHook(() => useUndoRedo(), { wrapper: Wrapper });

    act(() => testStore.dispatch(setCode("new code")));
    act(() => vi.runAllTimers());

    expect(testStore.getState().history.present?.code).toBe("new code");
  });
});
