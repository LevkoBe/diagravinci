import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import diagramReducer from "../../../application/store/diagramSlice";
import uiReducer from "../../../application/store/uiSlice";
import { CodeEditor } from "../../../presentation/components/CodeEditor";

let capturedOnMount: ((editor: unknown, monaco: unknown) => void) | undefined;
let capturedOnChange: ((value: string | undefined) => void) | undefined;

vi.mock("@monaco-editor/react", () => ({
  default: ({
    onMount,
    onChange,
  }: {
    onMount?: (editor: unknown, monaco: unknown) => void;
    onChange?: (value: string | undefined) => void;
  }) => {
    capturedOnMount = onMount;
    capturedOnChange = onChange;
    return React.createElement("div", { "data-testid": "monaco-editor" });
  },
}));

vi.mock("@levkobe/c7one", () => ({
  useC7One: () => ({ colors: { "--color-bg-base": "#ffffff" } }),
  detectIsDark: () => false,
}));

const mockSyncFromCode = vi.fn();

vi.mock("../../../application/store/store", () => ({
  syncManager: {
    syncFromCode: (...args: unknown[]) => mockSyncFromCode(...args),
    syncFromVis: vi.fn(),
    subscribe: () => () => {},
  },
  get store() {
    return configureStore({
      reducer: { diagram: diagramReducer, ui: uiReducer },
    });
  },
}));

function makeStore() {
  return configureStore({
    reducer: { diagram: diagramReducer, ui: uiReducer },
  });
}

function renderEditor() {
  const store = makeStore();
  const result = render(
    React.createElement(Provider, {
      store,
      children: React.createElement(CodeEditor),
    }),
  );
  return { ...result, store };
}

beforeEach(() => {
  capturedOnMount = undefined;
  capturedOnChange = undefined;
  vi.clearAllMocks();
});

describe("wrapper structure", () => {
  it("renders a div with the data-code-editor attribute", () => {
    const { container } = renderEditor();
    expect(container.querySelector("[data-code-editor]")).not.toBeNull();
  });

  it("renders the Monaco editor inside the wrapper", () => {
    const { getByTestId } = renderEditor();
    expect(getByTestId("monaco-editor")).toBeTruthy();
  });
});

describe("Escape key handling", () => {
  it("blurs the active element when Escape is pressed inside the editor", () => {
    const { container } = renderEditor();

    const blurMock = vi.fn();
    const spy = vi
      .spyOn(document, "activeElement", "get")
      .mockReturnValue({ blur: blurMock } as unknown as Element);

    const wrapper = container.querySelector("[data-code-editor]")!;
    fireEvent.keyDown(wrapper, { key: "Escape", code: "Escape" });

    expect(blurMock).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("does not throw when activeElement is null", () => {
    const { container } = renderEditor();
    const spy = vi
      .spyOn(document, "activeElement", "get")
      .mockReturnValue(null);

    const wrapper = container.querySelector("[data-code-editor]")!;
    expect(() =>
      fireEvent.keyDown(wrapper, { key: "Escape", code: "Escape" }),
    ).not.toThrow();

    spy.mockRestore();
  });
});

describe("event propagation", () => {
  it("stops propagation for bare (non-modifier) key events", () => {
    const { container } = renderEditor();
    const bodyHandler = vi.fn();
    document.body.addEventListener("keydown", bodyHandler);

    const wrapper = container.querySelector("[data-code-editor]")!;
    fireEvent.keyDown(wrapper, { key: "a", code: "KeyA" });

    expect(bodyHandler).not.toHaveBeenCalled();
    document.body.removeEventListener("keydown", bodyHandler);
  });

  it("does NOT stop propagation for Ctrl+key events", () => {
    const { container } = renderEditor();
    const bodyHandler = vi.fn();
    document.body.addEventListener("keydown", bodyHandler);

    const wrapper = container.querySelector("[data-code-editor]")!;
    fireEvent.keyDown(wrapper, { key: "s", code: "KeyS", ctrlKey: true });

    expect(bodyHandler).toHaveBeenCalledOnce();
    document.body.removeEventListener("keydown", bodyHandler);
  });

  it("does NOT stop propagation for Meta+key events", () => {
    const { container } = renderEditor();
    const bodyHandler = vi.fn();
    document.body.addEventListener("keydown", bodyHandler);

    const wrapper = container.querySelector("[data-code-editor]")!;
    fireEvent.keyDown(wrapper, { key: "s", code: "KeyS", metaKey: true });

    expect(bodyHandler).toHaveBeenCalledOnce();
    document.body.removeEventListener("keydown", bodyHandler);
  });

  it("does NOT stop propagation for Alt+key events", () => {
    const { container } = renderEditor();
    const bodyHandler = vi.fn();
    document.body.addEventListener("keydown", bodyHandler);

    const wrapper = container.querySelector("[data-code-editor]")!;
    fireEvent.keyDown(wrapper, { key: "a", code: "KeyA", altKey: true });

    expect(bodyHandler).toHaveBeenCalledOnce();
    document.body.removeEventListener("keydown", bodyHandler);
  });
});

describe("Monaco onMount", () => {
  it("registers a Ctrl+D command", () => {
    renderEditor();

    const addCommand = vi.fn();
    const trigger = vi.fn();
    const mockEditor = { addCommand, trigger };
    const mockMonaco = {
      KeyMod: { CtrlCmd: 2048 },
      KeyCode: { KeyD: 39 },
      languages: { setLanguageConfiguration: vi.fn() },
    };

    capturedOnMount?.(mockEditor, mockMonaco);

    expect(addCommand).toHaveBeenCalledOnce();
    expect(addCommand.mock.calls[0][0]).toBe(2048 | 39);
  });

  it("Ctrl+D command triggers editor.action.copyLinesDownAction", () => {
    renderEditor();

    const trigger = vi.fn();
    const mockEditor = {
      addCommand: (_key: number, cb: () => void) => cb(),
      trigger,
    };
    const mockMonaco = {
      KeyMod: { CtrlCmd: 2048 },
      KeyCode: { KeyD: 39 },
      languages: { setLanguageConfiguration: vi.fn() },
    };

    capturedOnMount?.(mockEditor, mockMonaco);

    expect(trigger).toHaveBeenCalledWith(
      "keyboard",
      "editor.action.copyLinesDownAction",
      null,
    );
  });

  it("sets the line comment character to #", () => {
    renderEditor();

    const setLanguageConfiguration = vi.fn();
    const mockEditor = { addCommand: vi.fn(), trigger: vi.fn() };
    const mockMonaco = {
      KeyMod: { CtrlCmd: 2048 },
      KeyCode: { KeyD: 39 },
      languages: { setLanguageConfiguration },
    };

    capturedOnMount?.(mockEditor, mockMonaco);

    expect(setLanguageConfiguration).toHaveBeenCalledWith(
      "plaintext",
      expect.objectContaining({
        comments: { lineComment: "#" },
      }),
    );
  });
});

describe("Monaco onChange", () => {
  it("does not call syncFromCode synchronously (debounced)", () => {
    vi.useFakeTimers();
    renderEditor();

    capturedOnChange?.("hello world");

    expect(mockSyncFromCode).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("calls syncFromCode after the debounce delay", () => {
    vi.useFakeTimers();
    renderEditor();

    capturedOnChange?.("hello world");
    vi.runAllTimers();

    expect(mockSyncFromCode).toHaveBeenCalledWith("hello world");

    vi.useRealTimers();
  });

  it("ignores undefined value from Monaco", () => {
    renderEditor();
    expect(() => capturedOnChange?.(undefined)).not.toThrow();
    expect(mockSyncFromCode).not.toHaveBeenCalled();
  });
});
