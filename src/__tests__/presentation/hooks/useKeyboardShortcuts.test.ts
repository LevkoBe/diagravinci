import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import React from "react";
import { Provider } from "react-redux";
import diagramReducer, {
  setModel,
  setViewMode,
  setViewState,
} from "../../../application/store/diagramSlice";
import uiReducer, {
  setInteractionMode,
  setSelectedElements,
  setNavigationParentId,
} from "../../../application/store/uiSlice";
import historyReducer from "../../../application/store/historySlice";
import executionReducer, {
  startExecution,
} from "../../../application/store/executionSlice";
import { createElement } from "../../../domain/models/Element";
import type { Element } from "../../../domain/models/Element";
import type { DiagramModel } from "../../../domain/models/DiagramModel";
import type { Relationship } from "../../../domain/models/Relationship";
import { useKeyboardShortcuts } from "../../../presentation/hooks/useKeyboardShortcuts";

let testStore: ReturnType<typeof makeTestStore>;
const mockSyncFromVis = vi.fn();
const mockSyncFromCode = vi.fn();

vi.mock("../../../application/store/store", () => ({
  get store() {
    return testStore;
  },
  syncManager: {
    syncFromVis: (...args: unknown[]) => mockSyncFromVis(...args),
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
      execution: executionReducer,
    },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(Provider, { store: testStore, children });
}

function makeModel(
  rootChildren: string[],
  elDefs: Record<string, string[]>,
  relDefs: Array<[string, string]> = [],
): DiagramModel {
  const root = createElement("root", "object");
  root.childIds = rootChildren;
  const elements: Record<string, Element> = {};
  for (const [id, children] of Object.entries(elDefs)) {
    const el = createElement(id, "object");
    el.childIds = children;
    elements[id] = el;
  }
  const relationships: Record<string, Relationship> = {};
  for (const [s, t] of relDefs) {
    const id = `rel_${s}_${t}`;
    relationships[id] = { id, source: s, target: t, type: "-->" };
  }
  return {
    root,
    elements,
    relationships,
    metadata: { version: "1.0.0", created: "", modified: "" },
  };
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
});

afterEach(() => {
  document.querySelectorAll("[data-test-cleanup]").forEach((el) => el.remove());
});

describe("input guards", () => {
  it("ignores keydown from a TEXTAREA element", () => {
    const model = makeModel(["a", "b"], { a: [], b: [] });
    testStore.dispatch(setModel(model));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    const textarea = document.createElement("textarea");
    textarea.setAttribute("data-test-cleanup", "");
    document.body.appendChild(textarea);

    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyA",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(testStore.getState().ui.selectedElementIds).toEqual([]);
  });

  it("ignores keydown from an INPUT element", () => {
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    const input = document.createElement("input");
    input.setAttribute("data-test-cleanup", "");
    document.body.appendChild(input);

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["a"]);
  });

  it("ignores keydown from inside the code-editor container", () => {
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    const editorDiv = document.createElement("div");
    editorDiv.setAttribute("data-code-editor", "");
    editorDiv.setAttribute("data-test-cleanup", "");
    const inner = document.createElement("div");
    editorDiv.appendChild(inner);
    document.body.appendChild(editorDiv);

    act(() => {
      inner.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["a"]);
  });
});

describe("app shortcuts", () => {
  it("Ctrl+S calls onSave", () => {
    const onSave = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSave }), { wrapper: Wrapper });
    fireKey({ code: "KeyS", ctrlKey: true });
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("Ctrl+Shift+S does NOT call onSave", () => {
    const onSave = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSave }), { wrapper: Wrapper });
    fireKey({ code: "KeyS", ctrlKey: true, shiftKey: true });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Ctrl+O calls onOpen", () => {
    const onOpen = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onOpen }), { wrapper: Wrapper });
    fireKey({ code: "KeyO", ctrlKey: true });
    expect(onOpen).toHaveBeenCalledOnce();
  });
});

describe("canvas selection shortcuts", () => {
  it("Ctrl+A selects all elements", () => {
    const model = makeModel(["a", "b", "c"], { a: [], b: [], c: [] });
    testStore.dispatch(setModel(model));
    const pos = (id: string) => ({ id, position: { x: 0, y: 0 }, size: 60, value: 0 });
    testStore.dispatch(setViewState({ ...testStore.getState().diagram.viewState, positions: { a: pos("a"), b: pos("b"), c: pos("c") } }));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ code: "KeyA", ctrlKey: true });

    const ids = testStore.getState().ui.selectedElementIds;
    expect(ids).toHaveLength(3);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).toContain("c");
  });

  it("Ctrl+A with empty model results in empty selection", () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ code: "KeyA", ctrlKey: true });
    expect(testStore.getState().ui.selectedElementIds).toEqual([]);
  });

  it("Escape clears selection", () => {
    testStore.dispatch(setSelectedElements(["a", "b"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ key: "Escape", code: "Escape" });

    expect(testStore.getState().ui.selectedElementIds).toEqual([]);
  });

  it("Escape with Ctrl does not clear selection", () => {
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ key: "Escape", code: "Escape", ctrlKey: true });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["a"]);
  });
});

describe("delete shortcuts", () => {
  it("Delete calls syncFromVis without the deleted element", () => {
    const model = makeModel(["a", "b"], { a: [], b: [] });
    testStore.dispatch(setModel(model));
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ key: "Delete", code: "Delete" });

    expect(mockSyncFromVis).toHaveBeenCalledOnce();
    const newModel = mockSyncFromVis.mock.calls[0][0] as DiagramModel;
    expect(newModel.elements["a"]).toBeUndefined();
    expect(newModel.elements["b"]).toBeDefined();
    expect(testStore.getState().ui.selectedElementIds).toEqual([]);
  });

  it("Backspace behaves identically to Delete", () => {
    const model = makeModel(["a", "b"], { a: [], b: [] });
    testStore.dispatch(setModel(model));
    testStore.dispatch(setSelectedElements(["b"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ key: "Backspace", code: "Backspace" });

    expect(mockSyncFromVis).toHaveBeenCalledOnce();
    const newModel = mockSyncFromVis.mock.calls[0][0] as DiagramModel;
    expect(newModel.elements["b"]).toBeUndefined();
  });

  it("Delete does nothing when selection is empty", () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ key: "Delete", code: "Delete" });
    expect(mockSyncFromVis).not.toHaveBeenCalled();
  });

  it("Delete removes relationships that involve the deleted element", () => {
    const model = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
    testStore.dispatch(setModel(model));
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ key: "Delete", code: "Delete" });

    const newModel = mockSyncFromVis.mock.calls[0][0] as DiagramModel;
    expect(Object.keys(newModel.relationships)).toHaveLength(0);
  });
});

describe("clipboard shortcuts", () => {
  it("Ctrl+X deletes the selection and records it as clipboard", () => {
    const model = makeModel(["a", "b"], { a: [], b: [] });
    testStore.dispatch(setModel(model));
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ code: "KeyX", ctrlKey: true });

    expect(mockSyncFromVis).toHaveBeenCalledOnce();
    const newModel = mockSyncFromVis.mock.calls[0][0] as DiagramModel;
    expect(newModel.elements["a"]).toBeUndefined();
    expect(testStore.getState().ui.selectedElementIds).toEqual([]);
  });

  it("Ctrl+C does not modify the model", () => {
    const model = makeModel(["a", "b"], { a: [], b: [] });
    testStore.dispatch(setModel(model));
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ code: "KeyC", ctrlKey: true });

    expect(mockSyncFromVis).not.toHaveBeenCalled();
  });

  it("Ctrl+C then Ctrl+V pastes the copied element into root", () => {
    const model = makeModel(["a"], { a: [] });
    testStore.dispatch(setModel(model));
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ code: "KeyC", ctrlKey: true });

    act(() => testStore.dispatch(setSelectedElements([])));

    fireKey({ code: "KeyV", ctrlKey: true });

    expect(mockSyncFromVis).toHaveBeenCalledOnce();
    const newModel = mockSyncFromVis.mock.calls[0][0] as DiagramModel;
    expect(Object.keys(newModel.elements)).toHaveLength(2);
    expect(newModel.root.childIds).toHaveLength(2);
  });

  it("Ctrl+C then Ctrl+V pastes into each selected target", () => {
    const model = makeModel(["a", "p1", "p2"], { a: [], p1: [], p2: [] });
    testStore.dispatch(setModel(model));
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ code: "KeyC", ctrlKey: true });

    act(() => testStore.dispatch(setSelectedElements(["p1", "p2"])));

    fireKey({ code: "KeyV", ctrlKey: true });

    expect(mockSyncFromVis).toHaveBeenCalledOnce();
    const newModel = mockSyncFromVis.mock.calls[0][0] as DiagramModel;

    expect(Object.keys(newModel.elements)).toHaveLength(3);
    expect(newModel.elements["p1"].childIds).toContain("a");
    expect(newModel.elements["p2"].childIds).toContain("a");
  });

  it("Ctrl+D duplicates the selected element as a sibling", () => {
    const model = makeModel(["a", "b"], { a: [], b: [] });
    testStore.dispatch(setModel(model));
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ code: "KeyD", ctrlKey: true });

    expect(mockSyncFromVis).toHaveBeenCalledOnce();
    const newModel = mockSyncFromVis.mock.calls[0][0] as DiagramModel;
    expect(Object.keys(newModel.elements)).toHaveLength(3);
    expect(newModel.root.childIds).toHaveLength(3);
  });

  it("Ctrl+D duplicates subtree (element with children)", () => {
    const model = makeModel(["a"], { a: ["child1"], child1: [] });
    testStore.dispatch(setModel(model));
    testStore.dispatch(setSelectedElements(["a"]));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ code: "KeyD", ctrlKey: true });

    expect(mockSyncFromVis).toHaveBeenCalledOnce();
    const newModel = mockSyncFromVis.mock.calls[0][0] as DiagramModel;

    expect(Object.keys(newModel.elements)).toHaveLength(4);
  });

  it("Ctrl+D does nothing when selection is empty", () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ code: "KeyD", ctrlKey: true });
    expect(mockSyncFromVis).not.toHaveBeenCalled();
  });
});

describe("execute mode shortcuts", () => {
  it("F5 switches to execute view mode", () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ code: "F5", key: "F5" });
    expect(testStore.getState().diagram.viewState.viewMode).toBe("execute");
  });

  it("F5 again exits execute mode and restores the previous view mode", () => {
    testStore.dispatch(setViewMode("hierarchical"));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ code: "F5", key: "F5" });
    expect(testStore.getState().diagram.viewState.viewMode).toBe("execute");

    fireKey({ code: "F5", key: "F5" });
    expect(testStore.getState().diagram.viewState.viewMode).toBe(
      "hierarchical",
    );
  });

  it("Space starts execution when in execute mode and stopped", () => {
    testStore.dispatch(setViewMode("execute"));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ code: "Space", key: " " });

    expect(testStore.getState().execution.status).toBe("running");
  });

  it("Space pauses execution when already running", () => {
    testStore.dispatch(setViewMode("execute"));
    testStore.dispatch(startExecution());
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ code: "Space", key: " " });

    expect(testStore.getState().execution.status).toBe("paused");
  });

  it("Space outside execute mode does not start execution", () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ code: "Space", key: " " });
    expect(testStore.getState().execution.status).toBe("stopped");
  });
});

describe("mode switching", () => {
  const modeMap: Array<[string, string]> = [
    ["Digit1", "select"],
    ["Digit2", "create"],
    ["Digit3", "connect"],
    ["Digit4", "delete"],
    ["Digit5", "disconnect"],
    ["Digit6", "readonly"],
    ["Digit7", "presentation"],
  ];

  for (const [code, mode] of modeMap) {
    it(`${code} sets interactionMode to "${mode}"`, () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
      fireKey({ code });
      expect(testStore.getState().ui.interactionMode).toBe(mode);
    });
  }

  it("mode key is ignored when Ctrl is held", () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ code: "Digit2", ctrlKey: true });
    expect(testStore.getState().ui.interactionMode).toBe("select");
  });

  it("mode key is ignored when Alt is held", () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ code: "Digit2", altKey: true });
    expect(testStore.getState().ui.interactionMode).toBe("select");
  });
});

describe("QWERTY type shortcuts", () => {
  const elementTypeMap: Array<[string, string]> = [
    ["KeyQ", "object"],
    ["KeyW", "collection"],
    ["KeyE", "state"],
    ["KeyR", "function"],
    ["KeyT", "flow"],
    ["KeyY", "choice"],
  ];

  for (const [code, type] of elementTypeMap) {
    it(`${code} in create mode sets activeElementType to "${type}"`, () => {
      testStore.dispatch(setInteractionMode("create"));
      renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
      fireKey({ code });
      expect(testStore.getState().ui.activeElementType).toBe(type);
    });
  }

  const relTypeMap: Array<[string, string]> = [
    ["KeyQ", "-->"],
    ["KeyW", "..>"],
    ["KeyE", "--|>"],
    ["KeyR", "..|>"],
    ["KeyT", "o--"],
    ["KeyY", "*--"],
  ];

  for (const [code, type] of relTypeMap) {
    it(`${code} in connect mode sets activeRelationshipType to "${type}"`, () => {
      testStore.dispatch(setInteractionMode("connect"));
      renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
      fireKey({ code });
      expect(testStore.getState().ui.activeRelationshipType).toBe(type);
    });
  }

  it("KeyW in select mode sends zoom-in command", () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ code: "KeyW" });
    expect(testStore.getState().ui.zoomCommand?.type).toBe("in");
  });

  it("KeyE in select mode sends zoom-out command", () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ code: "KeyE" });
    expect(testStore.getState().ui.zoomCommand?.type).toBe("out");
  });

  it("KeyR in select mode sends zoom-reset command", () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ code: "KeyR" });
    expect(testStore.getState().ui.zoomCommand?.type).toBe("reset");
  });

  it("KeyY in select mode toggles class diagram mode", () => {
    const before = testStore.getState().ui.classDiagramMode;
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    fireKey({ code: "KeyY" });
    expect(testStore.getState().ui.classDiagramMode).toBe(!before);
  });
});

describe("arrow navigation", () => {
  function setupNavigation(
    model: DiagramModel,
    selectedIds: string[],
    mode: string = "select",
  ) {
    testStore.dispatch(setModel(model));
    testStore.dispatch(
      setInteractionMode(mode as Parameters<typeof setInteractionMode>[0]),
    );
    testStore.dispatch(setSelectedElements(selectedIds));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
  }

  it("ArrowRight navigates forward along a relationship", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
    setupNavigation(m, ["a"]);

    fireKey({ key: "ArrowRight", code: "ArrowRight" });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["b"]);
  });

  it("ArrowLeft navigates backward along a relationship", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
    setupNavigation(m, ["b"]);

    fireKey({ key: "ArrowLeft", code: "ArrowLeft" });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["a"]);
  });

  it("ArrowDown navigates to the first child", () => {
    const m = makeModel(["a"], { a: ["b", "c"], b: [], c: [] });
    setupNavigation(m, ["a"]);

    fireKey({ key: "ArrowDown", code: "ArrowDown" });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["a.b"]);
  });

  it("ArrowUp navigates to the parent element", () => {
    const m = makeModel(["a"], { a: ["b"], b: [] });
    setupNavigation(m, ["a.b"]);

    fireKey({ key: "ArrowUp", code: "ArrowUp" });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["a"]);
  });

  it("navigation works in presentation mode", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
    setupNavigation(m, ["a"], "presentation");

    fireKey({ key: "ArrowRight", code: "ArrowRight" });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["b"]);
  });

  it("navigation works in create mode", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
    setupNavigation(m, ["a"], "create");

    fireKey({ key: "ArrowRight", code: "ArrowRight" });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["b"]);
  });

  it("navigation works in connect mode", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
    setupNavigation(m, ["a"], "connect");

    fireKey({ key: "ArrowRight", code: "ArrowRight" });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["b"]);
  });

  it("Shift+ArrowRight navigates to all outgoing targets", () => {
    const m = makeModel(["a", "b", "c"], { a: [], b: [], c: [] }, [
      ["a", "b"],
      ["a", "c"],
    ]);
    setupNavigation(m, ["a"]);

    fireKey({ key: "ArrowRight", code: "ArrowRight", shiftKey: true });

    const ids = testStore.getState().ui.selectedElementIds;
    expect(ids).toHaveLength(2);
    expect(ids).toContain("b");
    expect(ids).toContain("c");
  });

  it("Shift+ArrowLeft navigates to all incoming sources", () => {
    const m = makeModel(["a", "b", "c"], { a: [], b: [], c: [] }, [
      ["a", "c"],
      ["b", "c"],
    ]);
    setupNavigation(m, ["c"]);

    fireKey({ key: "ArrowLeft", code: "ArrowLeft", shiftKey: true });

    const ids = testStore.getState().ui.selectedElementIds;
    expect(ids).toHaveLength(2);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
  });

  it("Shift+ArrowDown navigates to all children", () => {
    const m = makeModel(["a"], { a: ["b", "c", "d"], b: [], c: [], d: [] });
    setupNavigation(m, ["a"]);

    fireKey({ key: "ArrowDown", code: "ArrowDown", shiftKey: true });

    expect(testStore.getState().ui.selectedElementIds).toHaveLength(3);
  });

  it("Alt+ArrowRight navigates to the next sibling", () => {
    const m = makeModel(["a", "b", "c"], { a: [], b: [], c: [] });
    setupNavigation(m, ["a"]);

    fireKey({ key: "ArrowRight", code: "ArrowRight", altKey: true });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["b"]);
  });

  it("Alt+ArrowLeft navigates to the previous sibling", () => {
    const m = makeModel(["a", "b", "c"], { a: [], b: [], c: [] });
    setupNavigation(m, ["b"]);

    fireKey({ key: "ArrowLeft", code: "ArrowLeft", altKey: true });

    expect(testStore.getState().ui.selectedElementIds).toEqual(["a"]);
  });

  it("ArrowDown sets navigationParentId to the current element", () => {
    const m = makeModel(["a"], { a: ["b"], b: [] });
    setupNavigation(m, ["a"]);

    fireKey({ key: "ArrowDown", code: "ArrowDown" });

    expect(testStore.getState().ui.navigationParentId).toBe("a");
  });

  it("ArrowRight sets navigationParentId to the origin element", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
    testStore.dispatch(setModel(m));
    testStore.dispatch(setSelectedElements(["a"]));
    testStore.dispatch(setNavigationParentId("some-parent"));
    renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });

    fireKey({ key: "ArrowRight", code: "ArrowRight" });

    expect(testStore.getState().ui.navigationParentId).toBe("a");
  });

  it("arrows do nothing when selection is empty", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] }, [["a", "b"]]);
    setupNavigation(m, []);

    fireKey({ key: "ArrowRight", code: "ArrowRight" });

    expect(testStore.getState().ui.selectedElementIds).toEqual([]);
  });
});
