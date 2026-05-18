import { describe, it, expect } from "vitest";
import reducer, {
  addSelector,
  updateSelector,
  removeSelector,
  setSelectorColor,
  setFoldLevel,
  setFoldActive,
  toggleFoldActive,
  toggleElementFold,
  clearFoldOverrides,
  moveSelectorUp,
  moveSelectorDown,
  syncSelectorsFromTab,
  setSelectionSelector,
  restoreFilterState,
  syncSelectorsFromCode,
} from "../../../application/store/filterSlice";
import { SELECTION_SELECTOR_ID } from "../../../domain/models/Selector";
import type { Selector } from "../../../domain/models/Selector";

function makeSelector(id: string): Selector {
  return {
    id,
    label: `Selector ${id}`,
    color: "#e05c5c",
    expression: "",
  };
}

describe("filterSlice", () => {
  describe("selector CRUD", () => {
    it("addSelector adds to empty state", () => {
      const state = reducer(undefined, addSelector(makeSelector("p1")));
      expect(state.selectors).toHaveLength(1);
      expect(state.selectors[0].id).toBe("p1");
    });

    it("addSelector preserves existing selectors", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, addSelector(makeSelector("p2")));
      expect(s2.selectors).toHaveLength(2);
    });

    it("updateSelector updates matching selector", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const updated = { ...makeSelector("p1"), color: "#00ff00" };
      const s2 = reducer(s1, updateSelector(updated));
      expect(s2.selectors[0].color).toBe("#00ff00");
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
      expect(s2.manuallyFolded).toHaveLength(0);
      expect(s2.manuallyUnfolded).toHaveLength(0);
    });

    it("toggleElementFold adds to manuallyFolded when not folded", () => {
      const state = reducer(
        undefined,
        toggleElementFold({ path: "a.b", currentlyFolded: false }),
      );
      expect(state.manuallyFolded).toContain("a.b");
    });

    it("toggleElementFold adds to manuallyUnfolded when folded", () => {
      const state = reducer(
        undefined,
        toggleElementFold({ path: "a.b", currentlyFolded: true }),
      );
      expect(state.manuallyUnfolded).toContain("a.b");
    });

    it("clearFoldOverrides empties both fold lists", () => {
      const s1 = reducer(
        undefined,
        toggleElementFold({ path: "a", currentlyFolded: false }),
      );
      const s2 = reducer(s1, clearFoldOverrides());
      expect(s2.manuallyFolded).toHaveLength(0);
      expect(s2.manuallyUnfolded).toHaveLength(0);
    });
  });

  describe("moveSelectorUp / moveSelectorDown", () => {
    it("moveSelectorUp swaps with previous", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, addSelector(makeSelector("p2")));
      const s3 = reducer(s2, moveSelectorUp("p2"));
      expect(s3.selectors[0].id).toBe("p2");
      expect(s3.selectors[1].id).toBe("p1");
    });

    it("moveSelectorUp does nothing for first item", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, addSelector(makeSelector("p2")));
      const s3 = reducer(s2, moveSelectorUp("p1"));
      expect(s3.selectors[0].id).toBe("p1");
    });

    it("moveSelectorUp does nothing for unknown id", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, moveSelectorUp("unknown"));
      expect(s2.selectors).toHaveLength(1);
    });

    it("moveSelectorDown swaps with next", () => {
      const s1 = reducer(undefined, addSelector(makeSelector("p1")));
      const s2 = reducer(s1, addSelector(makeSelector("p2")));
      const s3 = reducer(s2, moveSelectorDown("p1"));
      expect(s3.selectors[0].id).toBe("p2");
      expect(s3.selectors[1].id).toBe("p1");
    });

    it("moveSelectorDown does nothing for last item", () => {
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
      expect(sel?.color).toBe("#ff0000");
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
        setSelectorColor({ id: "p1", color: "#abc" }),
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
          modelSelectors: [makeSelector("code1")],
          prevModelSelectorIds: [],
        }),
      );
      expect(s1.selectors.find((s) => s.id === "code1")).toBeDefined();
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

    it("updates existing selector content (same id, new data)", () => {
      const s1 = reducer(
        undefined,
        syncSelectorsFromCode({
          modelSelectors: [makeSelector("code1")],
          prevModelSelectorIds: [],
        }),
      );
      const updated = { ...makeSelector("code1"), color: "#abc123" };
      const s2 = reducer(
        s1,
        syncSelectorsFromCode({
          modelSelectors: [updated],
          prevModelSelectorIds: ["code1"],
        }),
      );
      expect(s2.selectors.find((s) => s.id === "code1")?.color).toBe("#abc123");
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
