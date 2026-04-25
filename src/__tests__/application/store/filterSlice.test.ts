import { describe, it, expect } from "vitest";
import reducer, {
  addSelector,
  updateSelector,
  removeSelector,
  setSelectorMode,
  setSelectorColor,
  setFoldLevel,
  setFoldActive,
  toggleFoldActive,
  toggleElementFold,
  clearFoldOverrides,
  moveSelectorUp,
  moveSelectorDown,
  cycleSelector,
  syncSelectorsFromTab,
  setSelectionSelector,
  restoreFilterState,
  syncSelectorsFromCode,
} from "../../../application/store/filterSlice";
import { SELECTION_SELECTOR_ID } from "../../../domain/models/Selector";
import type { Selector } from "../../../domain/models/Selector";

function makeSelector(id: string, mode: Selector["mode"] = "off"): Selector {
  return {
    id,
    label: `Selector ${id}`,
    mode,
    color: "#e05c5c",
    expression: "",
  };
}

describe("filterSlice", () => {
  it("has correct initial state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.selectors).toEqual([]);
    expect(state.foldLevel).toBe(1);
    expect(state.foldActive).toBe(false);
    expect(state.manuallyFolded).toEqual([]);
    expect(state.manuallyUnfolded).toEqual([]);
    expect(state._rev).toBe(0);
  });

  describe("selector CRUD", () => {
    it("addSelector appends a selector and increments _rev", () => {
      const state = reducer(undefined, addSelector(makeSelector("p1")));
      expect(state.selectors).toHaveLength(1);
      expect(state.selectors[0].id).toBe("p1");
      expect(state._rev).toBe(1);
    });

    it("updateSelector replaces selector by id", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const updated = { ...makeSelector("p1"), label: "Updated" };
      const s2 = reducer(s1, updateSelector(updated));
      expect(s2.selectors[0].label).toBe("Updated");
    });

    it("updateSelector does nothing for unknown id", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, updateSelector(makeSelector("unknown")));
      expect(s2.selectors).toHaveLength(1);
    });

    it("removeSelector removes the selector", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, removeSelector("p1"));
      expect(s2.selectors).toHaveLength(0);
    });

    it("setSelectorMode changes mode", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, setSelectorMode({ id: "p1", mode: "dim" }));
      expect(s2.selectors[0].mode).toBe("dim");
    });

    it("setSelectorMode does nothing for unknown id", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1", "hide")));
      const s2 = reducer(s1, setSelectorMode({ id: "unknown", mode: "color" }));
      expect(s2.selectors[0].mode).toBe("hide");
    });

    it("setSelectorColor changes color", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, setSelectorColor({ id: "p1", color: "#00ff00" }));
      expect(s2.selectors[0].color).toBe("#00ff00");
    });

    it("setSelectorColor does nothing for unknown id", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, setSelectorColor({ id: "unknown", color: "#fff" }));
      expect(s2.selectors[0].color).toBe("#e05c5c");
    });
  });

  describe("fold actions", () => {
    it("setFoldLevel clamps to minimum 1", () => {
      const state = reducer(undefined, setFoldLevel(0));
      expect(state.foldLevel).toBe(1);
    });

    it("setFoldLevel sets positive value", () => {
      const state = reducer(undefined, setFoldLevel(3));
      expect(state.foldLevel).toBe(3);
    });

    it("setFoldActive sets foldActive", () => {
      const state = reducer(undefined, setFoldActive(true));
      expect(state.foldActive).toBe(true);
    });

    it("toggleFoldActive toggles and clears overrides", () => {
      const s1 = reducer(
        undefined,
        toggleElementFold({ path: "a", currentlyFolded: false }),
      );
      const s2 = reducer(s1, toggleFoldActive());
      expect(s2.foldActive).toBe(true);
      expect(s2.manuallyFolded).toEqual([]);
      expect(s2.manuallyUnfolded).toEqual([]);
    });

    it("toggleElementFold adds to manuallyFolded when unfolded", () => {
      const state = reducer(
        undefined,
        toggleElementFold({ path: "a.b", currentlyFolded: false }),
      );
      expect(state.manuallyFolded).toContain("a.b");
      expect(state.manuallyUnfolded).not.toContain("a.b");
    });

    it("toggleElementFold adds to manuallyUnfolded when currently folded", () => {
      const s1 = reducer(
        undefined,
        toggleElementFold({ path: "a.b", currentlyFolded: false }),
      );
      const s2 = reducer(
        s1,
        toggleElementFold({ path: "a.b", currentlyFolded: true }),
      );
      expect(s2.manuallyFolded).not.toContain("a.b");
      expect(s2.manuallyUnfolded).toContain("a.b");
    });

    it("toggleElementFold avoids duplicates in manuallyFolded", () => {
      const s1 = reducer(
        undefined,
        toggleElementFold({ path: "a", currentlyFolded: false }),
      );
      const s2 = reducer(
        s1,
        toggleElementFold({ path: "a", currentlyFolded: false }),
      );
      expect(s2.manuallyFolded.filter((p) => p === "a")).toHaveLength(1);
    });

    it("toggleElementFold removes path from manuallyUnfolded when re-folding", () => {
      const s1 = reducer(
        undefined,
        toggleElementFold({ path: "a", currentlyFolded: true }),
      );
      expect(s1.manuallyUnfolded).toContain("a");

      const s2 = reducer(
        s1,
        toggleElementFold({ path: "a", currentlyFolded: false }),
      );
      expect(s2.manuallyUnfolded).not.toContain("a");
      expect(s2.manuallyFolded).toContain("a");
    });

    it("clearFoldOverrides empties both fold arrays", () => {
      const s1 = reducer(
        undefined,
        toggleElementFold({ path: "a", currentlyFolded: false }),
      );
      const s2 = reducer(s1, clearFoldOverrides());
      expect(s2.manuallyFolded).toEqual([]);
      expect(s2.manuallyUnfolded).toEqual([]);
    });
  });

  describe("selector ordering", () => {
    it("moveSelectorUp swaps selector with the one above", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, addSelector(makeSelector("p2")));
      const s3 = reducer(s2, moveSelectorUp("p2"));
      expect(s3.selectors[0].id).toBe("p2");
      expect(s3.selectors[1].id).toBe("p1");
    });

    it("moveSelectorUp does nothing when already at top", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, addSelector(makeSelector("p2")));
      const s3 = reducer(s2, moveSelectorUp("p1"));
      expect(s3.selectors[0].id).toBe("p1");
    });

    it("moveSelectorDown swaps selector with the one below", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, addSelector(makeSelector("p2")));
      const s3 = reducer(s2, moveSelectorDown("p1"));
      expect(s3.selectors[0].id).toBe("p2");
      expect(s3.selectors[1].id).toBe("p1");
    });

    it("moveSelectorDown does nothing when already at bottom", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, addSelector(makeSelector("p2")));
      const s3 = reducer(s2, moveSelectorDown("p2"));
      expect(s3.selectors[1].id).toBe("p2");
    });

    it("moveSelectorDown does nothing for unknown id", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, moveSelectorDown("unknown"));
      expect(s2.selectors).toHaveLength(1);
    });
  });

  describe("cycleSelector", () => {
    it("cycles off → color", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1", "off")));
      const s2 = reducer(s1, cycleSelector("p1"));
      expect(s2.selectors[0].mode).toBe("color");
    });

    it("cycles color → dim", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1", "color")));
      const s2 = reducer(s1, cycleSelector("p1"));
      expect(s2.selectors[0].mode).toBe("dim");
    });

    it("cycles dim → hide", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1", "dim")));
      const s2 = reducer(s1, cycleSelector("p1"));
      expect(s2.selectors[0].mode).toBe("hide");
    });

    it("cycles hide → off", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1", "hide")));
      const s2 = reducer(s1, cycleSelector("p1"));
      expect(s2.selectors[0].mode).toBe("off");
    });

    it("does nothing for unknown id", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, cycleSelector("unknown"));
      expect(s2.selectors).toHaveLength(1);
    });
  });

  describe("syncSelectorsFromTab", () => {
    it("replaces all selectors from payload", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("old")));
      const s2 = reducer(
        s1,
        syncSelectorsFromTab([makeSelector("new1"), makeSelector("new2")]),
      );
      expect(s2.selectors).toHaveLength(2);
      expect(s2.selectors[0].id).toBe("new1");
      expect(s2.selectors[1].id).toBe("new2");
    });
  });

  describe("setSelectionSelector", () => {
    it("adds a selection selector for given ids", () => {
      const s1 = reducer(
        undefined,
        setSelectionSelector({ ids: ["a", "b"], color: "#ff0000" }),
      );
      const sel = s1.selectors.find((s) => s.id === SELECTION_SELECTOR_ID);
      expect(sel).toBeDefined();
      expect(sel?.mode).toBe("color");
    });

    it("removes selection selector when ids is empty", () => {
      const s1 = reducer(
        undefined,
        setSelectionSelector({ ids: ["a"], color: "#ff0000" }),
      );
      const s2 = reducer(s1, setSelectionSelector({ ids: [], color: "#ff0000" }));
      expect(
        s2.selectors.find((s) => s.id === SELECTION_SELECTOR_ID),
      ).toBeUndefined();
    });

    it("replaces existing selection selector", () => {
      const s1 = reducer(
        undefined,
        setSelectionSelector({ ids: ["a"], color: "#ff0000" }),
      );
      const s2 = reducer(
        s1,
        setSelectionSelector({ ids: ["b"], color: "#0000ff" }),
      );
      const sels = s2.selectors.filter((s) => s.id === SELECTION_SELECTOR_ID);
      expect(sels).toHaveLength(1);
      expect(sels[0].color).toBe("#0000ff");
    });

    it("handles single id without alternation pattern", () => {
      const s1 = reducer(
        undefined,
        setSelectionSelector({ ids: ["myNode"], color: "#aaa" }),
      );
      const sel = s1.selectors.find((s) => s.id === SELECTION_SELECTOR_ID);
      expect(sel?.selectionPattern).toMatch(/myNode/);
    });
  });

  describe("restoreFilterState", () => {
    it("restores full filter state from payload", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const restored = reducer(
        s1,
        restoreFilterState({
          selectors: [makeSelector("q1"), makeSelector("q2")],
          foldLevel: 3,
          foldActive: true,
          manuallyFolded: ["a.b"],
          manuallyUnfolded: ["c.d"],
        }),
      );
      expect(restored.selectors).toHaveLength(2);
      expect(restored.selectors[0].id).toBe("q1");
      expect(restored.foldLevel).toBe(3);
      expect(restored.foldActive).toBe(true);
      expect(restored.manuallyFolded).toEqual(["a.b"]);
      expect(restored.manuallyUnfolded).toEqual(["c.d"]);
    });
  });

  describe("_rev counter", () => {
    it("increments _rev on every mutating action", () => {
      let state = reducer(undefined, { type: "@@INIT" });
      const actions = [
        addSelector(makeSelector("p1")),
        setSelectorMode({ id: "p1", mode: "color" }),
        setFoldLevel(2),
        setFoldActive(true),
        toggleFoldActive(),
        toggleElementFold({ path: "a", currentlyFolded: false }),
        clearFoldOverrides(),
      ];
      let prevRev = state._rev;
      for (const action of actions) {
        state = reducer(state, action);
        expect(state._rev).toBeGreaterThan(prevRev);
        prevRev = state._rev;
      }
    });
  });

  describe("syncSelectorsFromCode", () => {
    it("adds new model selectors not previously in state", () => {
      const s1 = reducer(
        undefined,
        syncSelectorsFromCode({
          modelSelectors: [makeSelector("code1", "color")],
          prevModelSelectorIds: [],
        }),
      );
      expect(s1.selectors.find((s) => s.id === "code1")).toBeDefined();
      expect(s1.selectors.find((s) => s.id === "code1")?.mode).toBe("color");
    });

    it("removes selectors that were in prev but not in new model selectors", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("old")));
      const s2 = reducer(
        s1,
        syncSelectorsFromCode({
          modelSelectors: [],
          prevModelSelectorIds: ["old"],
        }),
      );
      expect(s2.selectors.find((s) => s.id === "old")).toBeUndefined();
    });

    it("keeps selectors that were not from model code", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("manual")));
      const s2 = reducer(
        s1,
        syncSelectorsFromCode({
          modelSelectors: [makeSelector("code1")],
          prevModelSelectorIds: [],
        }),
      );
      expect(s2.selectors.find((s) => s.id === "manual")).toBeDefined();
      expect(s2.selectors.find((s) => s.id === "code1")).toBeDefined();
    });

    it("fully overwrites existing model selector content from code (mode is code-authoritative)", () => {
      const s1 = reducer(
        undefined,
        syncSelectorsFromCode({
          modelSelectors: [makeSelector("code1", "color")],
          prevModelSelectorIds: [],
        }),
      );
      const s2 = reducer(s1, setSelectorMode({ id: "code1", mode: "off" }));
      expect(s2.selectors.find((s) => s.id === "code1")?.mode).toBe("off");

      const s3 = reducer(
        s2,
        syncSelectorsFromCode({
          modelSelectors: [{ ...makeSelector("code1"), mode: "dim" as const }],
          prevModelSelectorIds: ["code1"],
        }),
      );
      expect(s3.selectors.find((s) => s.id === "code1")?.mode).toBe("dim");
    });

    it("updates existing selector content (same id, new data)", () => {
      const s1 = reducer(
        undefined,
        syncSelectorsFromCode({
          modelSelectors: [makeSelector("code1")],
          prevModelSelectorIds: [],
        }),
      );
      const s2 = reducer(
        s1,
        syncSelectorsFromCode({
          modelSelectors: [{ ...makeSelector("code1"), mode: "color" as const }],
          prevModelSelectorIds: ["code1"],
        }),
      );
      expect(s2.selectors.find((s) => s.id === "code1")?.mode).toBe("color");
    });

    it("increments _rev", () => {
      const s1 = reducer(
        undefined,
        syncSelectorsFromCode({
          modelSelectors: [],
          prevModelSelectorIds: [],
        }),
      );
      expect(s1._rev).toBe(1);
    });
  });
});
