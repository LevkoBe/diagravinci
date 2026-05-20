import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { SyncManager } from "../../application/SyncManager";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import { CodeGenerator } from "../../infrastructure/codegen/CodeGenerator";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import { createEmptyDiagram, DEFAULT_SESSION_ID } from "../../domain/models/DiagramModel";
import { createEmptyViewState } from "../../domain/models/ViewState";
import diagramReducer from "../../application/store/diagramSlice";
import filterReducer from "../../application/store/filterSlice";

function makeStore(initialCode = "") {
  const store = configureStore({
    reducer: { diagram: diagramReducer, filter: filterReducer },
    preloadedState: {
      diagram: {
        model: createEmptyDiagram(),
        viewState: createEmptyViewState(),
        code: initialCode,
        canvasSize: { width: 800, height: 600 },
        history: [],
        historyIndex: -1,
      },
    },
  });
  const parser = { parse: (c: string) => new Parser(new Lexer(c).tokenize()).parse() };
  const codeGenerator = { generate: (m: DiagramModel) => new CodeGenerator(m).generate() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sm = new SyncManager(store as any, parser, codeGenerator);
  return { store, sm };
}

describe("SyncManager.syncFromCode", () => {
  it("ensures default session is present in the model after sync", () => {
    const { store, sm } = makeStore();
    sm.syncFromCode("a{}");
    const { model } = store.getState().diagram;
    const def = (model.sessions ?? []).find((s) => s.id === DEFAULT_SESSION_ID);
    expect(def).toBeDefined();
  });

  it("auto-colors a newly introduced selector in the default session", () => {
    const { store, sm } = makeStore();
    sm.syncFromCode("!selector  name=MyTag  color=#ff0000\na{}");
    const { model } = store.getState().diagram;
    const def = (model.sessions ?? []).find((s) => s.id === DEFAULT_SESSION_ID);
    expect(def?.selectorModes["mytag"]).toBe("color");
  });

  it("auto-colors new selectors in ALL existing sessions", () => {
    const { store, sm } = makeStore();
    sm.syncFromCode(
      "!session  id=default  label=Default\n" +
      "!session  id=remote  label=Remote\n",
    );
    sm.syncFromCode(
      "!selector  name=Tag  color=#00ff00\n" +
      "!session  id=default  label=Default\n" +
      "!session  id=remote  label=Remote\n",
    );
    const { model } = store.getState().diagram;
    const def = (model.sessions ?? []).find((s) => s.id === "default");
    const remote = (model.sessions ?? []).find((s) => s.id === "remote");
    expect(def?.selectorModes["tag"]).toBe("color");
    expect(remote?.selectorModes["tag"]).toBe("color");
  });

  it("preserves a user-set mode when the same selector is re-synced", () => {
    const { store, sm } = makeStore();
    sm.syncFromCode(
      "!selector  name=Tag  color=#00ff00\n" +
      "!session  id=default  label=Default  selectors=tag:dim\n",
    );
    sm.syncFromCode(
      "!selector  name=Tag  color=#00ff00\n" +
      "!session  id=default  label=Default  selectors=tag:dim\n",
    );
    const { model } = store.getState().diagram;
    const def = (model.sessions ?? []).find((s) => s.id === DEFAULT_SESSION_ID);
    expect(def?.selectorModes["tag"]).toBe("dim");
  });

  it("emitted code does not contain a bare default session line after syncing elements only", () => {
    const { store, sm } = makeStore();
    sm.syncFromCode("a{}\nb{}");
    const { code } = store.getState().diagram;
    expect(code).not.toContain("!session  id=default  label=Default\n");
  });
});
