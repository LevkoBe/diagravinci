import { describe, it, expect } from "vitest";
import reducer, {
  pushHistory,
  undoHistory,
  redoHistory,
  entriesEqual,
  type HistoryEntry,
  type HistoryState,
} from "../../../application/store/historySlice";
import { createEmptyDiagram } from "../../../domain/models/DiagramModel";

function makeEntry(code: string, x = 0, y = 0): HistoryEntry {
  return {
    code,
    model: createEmptyDiagram(),
    positions: {
      a: { id: "a", position: { x, y }, size: 100, value: 0 },
    },
    relationships: [],
    viewMode: "basic",
  };
}

const initialState: HistoryState = { past: [], present: null, future: [] };

describe("entriesEqual", () => {
  it("returns true for identical entries", () => {
    const e = makeEntry("a{}", 10, 20);
    expect(entriesEqual(e, e)).toBe(true);
  });

  it("returns false when code differs", () => {
    expect(entriesEqual(makeEntry("a{}"), makeEntry("b{}"))).toBe(false);
  });

  it("returns false when viewMode differs", () => {
    const a = { ...makeEntry("x"), viewMode: "basic" as const };
    const b = { ...makeEntry("x"), viewMode: "execute" as const };
    expect(entriesEqual(a, b)).toBe(false);
  });

  it("returns true for positions within 5px rounding bucket (same bucket)", () => {
    expect(entriesEqual(makeEntry("x", 0, 0), makeEntry("x", 2, 2))).toBe(true);
  });

  it("returns false for positions in different 5px rounding buckets", () => {
    expect(entriesEqual(makeEntry("x", 0, 0), makeEntry("x", 6, 0))).toBe(false);
  });

  it("sorts by key before comparing — order-independent position signature", () => {
    const multiPos = (aFirst: boolean): HistoryEntry => ({
      code: "x",
      model: createEmptyDiagram(),
      positions: aFirst
        ? {
            alpha: { id: "alpha", position: { x: 10, y: 20 }, size: 100, value: 0 },
            beta:  { id: "beta",  position: { x: 30, y: 40 }, size: 100, value: 0 },
          }
        : {
            beta:  { id: "beta",  position: { x: 30, y: 40 }, size: 100, value: 0 },
            alpha: { id: "alpha", position: { x: 10, y: 20 }, size: 100, value: 0 },
          },
      relationships: [],
      viewMode: "basic",
    });
    expect(entriesEqual(multiPos(true), multiPos(false))).toBe(true);
  });
});

describe("pushHistory", () => {
  it("sets present when pushing onto empty state", () => {
    const e = makeEntry("a{}");
    const state = reducer(initialState, pushHistory(e));
    expect(state.present).toEqual(e);
    expect(state.past).toHaveLength(0);
  });

  it("moves present to past when pushing a new distinct entry", () => {
    const s1 = reducer(initialState, pushHistory(makeEntry("a{}")));
    const s2 = reducer(s1, pushHistory(makeEntry("b{}")));
    expect(s2.past).toHaveLength(1);
    expect(s2.present?.code).toBe("b{}");
  });

  it("clears future on push", () => {
    let s = reducer(initialState, pushHistory(makeEntry("a{}")));
    s = reducer(s, pushHistory(makeEntry("b{}")));
    s = reducer(s, undoHistory());
    expect(s.future).toHaveLength(1);
    s = reducer(s, pushHistory(makeEntry("c{}")));
    expect(s.future).toHaveLength(0);
  });

  it("does not push duplicate entry (same code + position)", () => {
    let s = reducer(initialState, pushHistory(makeEntry("a{}")));
    s = reducer(s, pushHistory(makeEntry("a{}")));
    expect(s.past).toHaveLength(0);
  });

  it("caps past at MAX_HISTORY (50) entries", () => {
    let s = initialState;
    for (let i = 0; i <= 51; i++) {
      s = reducer(s, pushHistory(makeEntry(`node${i}{}`)));
    }
    expect(s.past.length).toBeLessThanOrEqual(50);
  });
});

describe("undoHistory", () => {
  it("does nothing when past is empty", () => {
    const s = reducer(initialState, undoHistory());
    expect(s).toEqual(initialState);
  });

  it("moves present to future and restores last past entry", () => {
    let s = reducer(initialState, pushHistory(makeEntry("a{}")));
    s = reducer(s, pushHistory(makeEntry("b{}")));
    s = reducer(s, undoHistory());
    expect(s.present?.code).toBe("a{}");
    expect(s.future[0]?.code).toBe("b{}");
    expect(s.past).toHaveLength(0);
  });

  it("restores from past even when present is null (defensive branch)", () => {
    const stateWithNullPresent: HistoryState = {
      past: [makeEntry("a{}")],
      present: null,
      future: [],
    };
    const s = reducer(stateWithNullPresent, undoHistory());
    expect(s.present?.code).toBe("a{}");
    expect(s.future).toHaveLength(0);
  });
});

describe("redoHistory", () => {
  it("does nothing when future is empty", () => {
    let s = reducer(initialState, pushHistory(makeEntry("a{}")));
    const before = s;
    s = reducer(s, redoHistory());
    expect(s.present).toEqual(before.present);
  });

  it("moves present to past and restores first future entry", () => {
    let s = reducer(initialState, pushHistory(makeEntry("a{}")));
    s = reducer(s, pushHistory(makeEntry("b{}")));
    s = reducer(s, undoHistory());
    s = reducer(s, redoHistory());
    expect(s.present?.code).toBe("b{}");
    expect(s.past[s.past.length - 1]?.code).toBe("a{}");
    expect(s.future).toHaveLength(0);
  });

  it("restores from future even when present is null (defensive branch)", () => {
    const stateWithNullPresent: HistoryState = {
      past: [],
      present: null,
      future: [makeEntry("b{}")],
    };
    const s = reducer(stateWithNullPresent, redoHistory());
    expect(s.present?.code).toBe("b{}");
    expect(s.past).toHaveLength(0);
  });

  it("supports multiple undo/redo cycles", () => {
    let s = reducer(initialState, pushHistory(makeEntry("a{}")));
    s = reducer(s, pushHistory(makeEntry("b{}")));
    s = reducer(s, pushHistory(makeEntry("c{}")));
    s = reducer(s, undoHistory());
    s = reducer(s, undoHistory());
    expect(s.present?.code).toBe("a{}");
    s = reducer(s, redoHistory());
    expect(s.present?.code).toBe("b{}");
    s = reducer(s, redoHistory());
    expect(s.present?.code).toBe("c{}");
  });
});
