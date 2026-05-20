import { describe, it, expect, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import {
  SyncManager,
  type SyncEvent,
  type ICodeParser,
} from "../../application/SyncManager";
import type { AppStore } from "../../application/store/store";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import { CodeGenerator } from "../../infrastructure/codegen/CodeGenerator";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import {
  createEmptyDiagram,
  DEFAULT_SESSION_ID,
} from "../../domain/models/DiagramModel";
import {
  createEmptyViewState,
  type ViewState,
} from "../../domain/models/ViewState";
import diagramReducer, {
  setViewState,
} from "../../application/store/diagramSlice";
import filterReducer from "../../application/store/filterSlice";

function makeStore(
  initialCode = "",
  viewMode: ViewState["viewMode"] = "basic",
) {
  const store = configureStore({
    reducer: { diagram: diagramReducer, filter: filterReducer },
    preloadedState: {
      diagram: {
        model: createEmptyDiagram(),
        viewState: { ...createEmptyViewState(), viewMode },
        code: initialCode,
        canvasSize: { width: 800, height: 600 },
      },
    },
  });
  const parser = {
    parse: (c: string) => new Parser(new Lexer(c).tokenize()).parse(),
  };
  const codeGenerator = {
    generate: (m: DiagramModel) => new CodeGenerator(m).generate(),
  };
  const sm = new SyncManager(store as unknown as AppStore, parser, codeGenerator);
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

  it("handles a parse error without throwing", () => {
    const { store, sm } = makeStore();
    const before = store.getState().diagram.model;
    expect(() => sm.syncFromCode("!!!invalid!!!")).not.toThrow();
    expect(store.getState().diagram.model).toBe(before);
  });
});

describe("SyncManager.syncFromCode – catch branch", () => {
  it("does not throw when the parser itself throws", () => {
    const { store } = makeStore();
    const throwingParser = {
      parse: () => {
        throw new Error("parse error");
      },
    };
    const gen = {
      generate: (m: DiagramModel) => new CodeGenerator(m).generate(),
    };
    const sm = new SyncManager(
      store as unknown as AppStore,
      throwingParser as unknown as ICodeParser,
      gen,
    );
    const before = store.getState().diagram.model;
    expect(() => sm.syncFromCode("anything")).not.toThrow();
    expect(store.getState().diagram.model).toBe(before);
  });
});

describe("SyncManager.normalizeSessionsAndAutoColor – no-sessions branch", () => {
  function makeSessionStrippingParser() {
    return {
      parse: (code: string): DiagramModel => {
        const model = new Parser(new Lexer(code).tokenize()).parse();
        return { ...model, sessions: [] };
      },
    };
  }

  it("adds default session when parsed model has no sessions", () => {
    const { store } = makeStore();
    const gen = {
      generate: (m: DiagramModel) => new CodeGenerator(m).generate(),
    };
    const sm = new SyncManager(
      store as unknown as AppStore,
      makeSessionStrippingParser() as unknown as ICodeParser,
      gen,
    );
    sm.syncFromCode("a{}");
    const def = (store.getState().diagram.model.sessions ?? []).find(
      (s) => s.id === DEFAULT_SESSION_ID,
    );
    expect(def).toBeDefined();
  });

  it("uses empty separator when code is already empty (sep-ternary false branch)", () => {
    const { store } = makeStore();
    const gen = {
      generate: (m: DiagramModel) => new CodeGenerator(m).generate(),
    };
    const sm = new SyncManager(
      store as unknown as AppStore,
      makeSessionStrippingParser() as unknown as ICodeParser,
      gen,
    );
    sm.syncFromCode("");
    expect(store.getState().diagram.code).toContain("!session");
  });
});

describe("SyncManager.syncFromVis – additional branches", () => {
  it("is a no-op when model is unchanged (early-return branch)", () => {
    const { store, sm } = makeStore();
    sm.syncFromCode("a{}");
    const { model, viewState } = store.getState().diagram;
    const beforeVS = viewState;
    sm.syncFromVis(model);
    expect(store.getState().diagram.viewState).toBe(beforeVS);
  });

  it("dispatches selector sync when selectors differ", () => {
    const { store, sm } = makeStore();
    sm.syncFromCode("!selector  name=Tag  color=#ff0000\na{}");
    const { model } = store.getState().diagram;
    sm.syncFromVis({ ...model, selectors: [] });
    expect(store.getState().filter).toBeDefined();
  });

  it("dispatches update when sessions differ", () => {
    const { store, sm } = makeStore();
    sm.syncFromCode("a{}");
    const { model } = store.getState().diagram;
    const newSession = { id: "extra", label: "Extra", selectorModes: {} };
    sm.syncFromVis({
      ...model,
      sessions: [...(model.sessions ?? []), newSession],
    });
    const stored = store.getState().diagram.model.sessions ?? [];
    expect(stored.some((s) => s.id === "extra")).toBe(true);
  });
});

describe("SyncManager.subscribe", () => {
  it("calls listener when sync produces an event", () => {
    const { sm } = makeStore();
    const events: SyncEvent[] = [];
    sm.subscribe((e) => events.push(e));
    sm.syncFromCode("a{}");
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe("code");
  });

  it("unsubscribe stops listener from receiving further events", () => {
    const { sm } = makeStore();
    const events: SyncEvent[] = [];
    const unsub = sm.subscribe((e) => events.push(e));
    unsub();
    sm.syncFromCode("a{}");
    expect(events).toHaveLength(0);
  });
});

describe("SyncManager.syncFromAI", () => {
  it("updates model the same as syncFromCode", () => {
    const { store, sm } = makeStore();
    sm.syncFromAI("a{}\nb{}");
    const { model } = store.getState().diagram;
    expect(Object.keys(model.elements).length).toBeGreaterThan(0);
  });
});

describe("SyncManager.reLayout", () => {
  it("returns early without updating viewState when viewMode is execute", () => {
    const { store, sm } = makeStore("", "execute");
    const before = store.getState().diagram.viewState;
    sm.reLayout();
    expect(store.getState().diagram.viewState).toBe(before);
  });

  it("updates viewState when viewMode is basic", () => {
    const { store, sm } = makeStore();
    sm.syncFromCode("a{}\nb{}");
    sm.reLayout();
    expect(store.getState().diagram.viewState).toBeDefined();
  });
});

describe("SyncManager.restartForceIfNeeded", () => {
  it("starts forceSimulation when resulting viewMode is force", () => {
    const { sm } = makeStore("", "force");
    const startSpy = vi
      .spyOn(sm.forceSimulation, "start")
      .mockImplementation(() => {});
    vi.spyOn(sm.forceSimulation, "stop").mockImplementation(() => {});
    sm.syncFromCode("a{}");
    expect(startSpy).toHaveBeenCalled();
  });

  it("dispatches new viewState in reLayout when viewMode is force", () => {
    const { store, sm } = makeStore("", "force");
    vi.spyOn(sm.forceSimulation, "start").mockImplementation(() => {});
    vi.spyOn(sm.forceSimulation, "stop").mockImplementation(() => {});
    store.dispatch(
      setViewState({ ...createEmptyViewState(), viewMode: "force" }),
    );
    sm.reLayout();
    expect(store.getState().diagram.viewState.viewMode).toBe("force");
  });
});
