import { describe, it, expect } from "vitest";
import reducer, {
  addPreset,
  updatePreset,
  removePreset,
  togglePresetActive,
  setPresetMode,
  setPresetColor,
  setFoldLevel,
  setFoldActive,
  toggleFoldActive,
  toggleElementFold,
  clearFoldOverrides,
  movePresetUp,
  movePresetDown,
  cyclePreset,
  syncPresetsFromTab,
  setSelectionPreset,
  restoreFilterState,
} from "../../../application/store/filterSlice";
import { SELECTION_PRESET_ID } from "../../../domain/models/Selector";
import type { FilterPreset } from "../../../domain/models/Selector";

function makePreset(id: string, active = false): FilterPreset {
  return {
    id,
    label: `Preset ${id}`,
    mode: "hide",
    isActive: active,
    color: "#e05c5c",
    selector: { combiner: "" },
  };
}

describe("filterSlice", () => {
  it("has correct initial state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.presets).toEqual([]);
    expect(state.foldLevel).toBe(1);
    expect(state.foldActive).toBe(false);
    expect(state.manuallyFolded).toEqual([]);
    expect(state.manuallyUnfolded).toEqual([]);
    expect(state._rev).toBe(0);
  });

  describe("preset CRUD", () => {
    it("addPreset appends a preset and increments _rev", () => {
      const state = reducer(undefined, addPreset(makePreset("p1")));
      expect(state.presets).toHaveLength(1);
      expect(state.presets[0].id).toBe("p1");
      expect(state._rev).toBe(1);
    });

    it("updatePreset replaces preset by id", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const updated = { ...makePreset("p1"), label: "Updated" };
      const s2 = reducer(s1, updatePreset(updated));
      expect(s2.presets[0].label).toBe("Updated");
    });

    it("updatePreset does nothing for unknown id", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, updatePreset(makePreset("unknown")));
      expect(s2.presets).toHaveLength(1);
    });

    it("removePreset removes the preset", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, removePreset("p1"));
      expect(s2.presets).toHaveLength(0);
    });

    it("togglePresetActive flips isActive", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1", false)));
      const s2 = reducer(s1, togglePresetActive("p1"));
      expect(s2.presets[0].isActive).toBe(true);
      const s3 = reducer(s2, togglePresetActive("p1"));
      expect(s3.presets[0].isActive).toBe(false);
    });

    it("setPresetMode changes mode", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, setPresetMode({ id: "p1", mode: "dim" }));
      expect(s2.presets[0].mode).toBe("dim");
    });

    it("setPresetColor changes color", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, setPresetColor({ id: "p1", color: "#00ff00" }));
      expect(s2.presets[0].color).toBe("#00ff00");
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

  describe("preset ordering", () => {
    it("movePresetUp swaps preset with the one above", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, addPreset(makePreset("p2")));
      const s3 = reducer(s2, movePresetUp("p2"));
      expect(s3.presets[0].id).toBe("p2");
      expect(s3.presets[1].id).toBe("p1");
    });

    it("movePresetUp does nothing when already at top", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, addPreset(makePreset("p2")));
      const s3 = reducer(s2, movePresetUp("p1"));
      expect(s3.presets[0].id).toBe("p1");
    });

    it("movePresetDown swaps preset with the one below", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, addPreset(makePreset("p2")));
      const s3 = reducer(s2, movePresetDown("p1"));
      expect(s3.presets[0].id).toBe("p2");
      expect(s3.presets[1].id).toBe("p1");
    });

    it("movePresetDown does nothing when already at bottom", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, addPreset(makePreset("p2")));
      const s3 = reducer(s2, movePresetDown("p2"));
      expect(s3.presets[1].id).toBe("p2");
    });

    it("movePresetDown does nothing for unknown id", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, movePresetDown("unknown"));
      expect(s2.presets).toHaveLength(1);
    });
  });

  describe("cyclePreset", () => {
    it("activates inactive preset in color mode", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1", false)));
      const s2 = reducer(s1, cyclePreset("p1"));
      expect(s2.presets[0].isActive).toBe(true);
      expect(s2.presets[0].mode).toBe("color");
    });

    it("cycles color → dim", () => {
      const s1 = reducer(
        undefined,
        addPreset({ ...makePreset("p1"), mode: "color", isActive: true }),
      );
      const s2 = reducer(s1, cyclePreset("p1"));
      expect(s2.presets[0].mode).toBe("dim");
      expect(s2.presets[0].isActive).toBe(true);
    });

    it("cycles dim → hide", () => {
      const s1 = reducer(
        undefined,
        addPreset({ ...makePreset("p1"), mode: "dim", isActive: true }),
      );
      const s2 = reducer(s1, cyclePreset("p1"));
      expect(s2.presets[0].mode).toBe("hide");
    });

    it("cycles hide → inactive", () => {
      const s1 = reducer(
        undefined,
        addPreset({ ...makePreset("p1"), mode: "hide", isActive: true }),
      );
      const s2 = reducer(s1, cyclePreset("p1"));
      expect(s2.presets[0].isActive).toBe(false);
    });

    it("does nothing for unknown id", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, cyclePreset("unknown"));
      expect(s2.presets).toHaveLength(1);
    });
  });

  describe("syncPresetsFromTab", () => {
    it("syncs presets preserving local active state", () => {
      const s1 = reducer(
        undefined,
        addPreset({ ...makePreset("p1"), isActive: true }),
      );
      const s2 = reducer(
        s1,
        syncPresetsFromTab([
          {
            id: "p1",
            label: "Updated P1",
            mode: "dim",
            color: "#ff0000",
            selector: { combiner: "" },
          },
          {
            id: "p2",
            label: "New P2",
            mode: "hide",
            color: "#00ff00",
            selector: { combiner: "" },
          },
        ]),
      );
      expect(s2.presets).toHaveLength(2);
      expect(s2.presets[0].isActive).toBe(true);
      expect(s2.presets[0].label).toBe("Updated P1");
      expect(s2.presets[1].isActive).toBe(false);
    });

    it("new presets default to inactive", () => {
      const s1 = reducer(
        undefined,
        syncPresetsFromTab([
          {
            id: "new",
            label: "New",
            mode: "hide",
            color: "#aaa",
            selector: { combiner: "" },
          },
        ]),
      );
      expect(s1.presets[0].isActive).toBe(false);
    });
  });

  describe("setSelectionPreset", () => {
    it("adds a selection preset for given ids", () => {
      const s1 = reducer(
        undefined,
        setSelectionPreset({ ids: ["a", "b"], color: "#ff0000" }),
      );
      const sel = s1.presets.find((p) => p.id === SELECTION_PRESET_ID);
      expect(sel).toBeDefined();
      expect(sel?.mode).toBe("color");
      expect(sel?.isActive).toBe(true);
    });

    it("removes selection preset when ids is empty", () => {
      const s1 = reducer(
        undefined,
        setSelectionPreset({ ids: ["a"], color: "#ff0000" }),
      );
      const s2 = reducer(s1, setSelectionPreset({ ids: [], color: "#ff0000" }));
      expect(
        s2.presets.find((p) => p.id === SELECTION_PRESET_ID),
      ).toBeUndefined();
    });

    it("replaces existing selection preset", () => {
      const s1 = reducer(
        undefined,
        setSelectionPreset({ ids: ["a"], color: "#ff0000" }),
      );
      const s2 = reducer(
        s1,
        setSelectionPreset({ ids: ["b"], color: "#0000ff" }),
      );
      const sels = s2.presets.filter((p) => p.id === SELECTION_PRESET_ID);
      expect(sels).toHaveLength(1);
      expect(sels[0].color).toBe("#0000ff");
    });

    it("handles single id without alternation pattern", () => {
      const s1 = reducer(
        undefined,
        setSelectionPreset({ ids: ["myNode"], color: "#aaa" }),
      );
      const sel = s1.presets.find((p) => p.id === SELECTION_PRESET_ID);
      expect(sel?.selectionPattern).toMatch(/myNode/);
    });
  });

  describe("restoreFilterState", () => {
    it("restores full filter state from payload", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const restored = reducer(
        s1,
        restoreFilterState({
          presets: [makePreset("q1"), makePreset("q2")],
          foldLevel: 3,
          foldActive: true,
          manuallyFolded: ["a.b"],
          manuallyUnfolded: ["c.d"],
        }),
      );
      expect(restored.presets).toHaveLength(2);
      expect(restored.presets[0].id).toBe("q1");
      expect(restored.foldLevel).toBe(3);
      expect(restored.foldActive).toBe(true);
      expect(restored.manuallyFolded).toEqual(["a.b"]);
      expect(restored.manuallyUnfolded).toEqual(["c.d"]);
    });
  });

  describe("preset mutation no-ops for unknown id", () => {
    it("togglePresetActive does nothing for unknown id", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1", true)));
      const s2 = reducer(s1, togglePresetActive("unknown"));
      expect(s2.presets[0].isActive).toBe(true);
    });

    it("setPresetMode does nothing for unknown id", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, setPresetMode({ id: "unknown", mode: "color" }));
      expect(s2.presets[0].mode).toBe("hide");
    });

    it("setPresetColor does nothing for unknown id", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, setPresetColor({ id: "unknown", color: "#fff" }));
      expect(s2.presets[0].color).toBe("#e05c5c");
    });
  });

  describe("cyclePreset — inactive dim and hide start at color:true", () => {
    it("activates inactive dim-mode preset → color:true", () => {
      const s1 = reducer(
        undefined,
        addPreset({ ...makePreset("p1"), mode: "dim", isActive: false }),
      );
      const s2 = reducer(s1, cyclePreset("p1"));
      expect(s2.presets[0].mode).toBe("color");
      expect(s2.presets[0].isActive).toBe(true);
    });

    it("activates inactive hide-mode preset → color:true", () => {
      const s1 = reducer(
        undefined,
        addPreset({ ...makePreset("p1"), mode: "hide", isActive: false }),
      );
      const s2 = reducer(s1, cyclePreset("p1"));
      expect(s2.presets[0].mode).toBe("color");
      expect(s2.presets[0].isActive).toBe(true);
    });
  });

  describe("_rev counter", () => {
    it("increments _rev on every mutating action", () => {
      let state = reducer(undefined, { type: "@@INIT" });
      const actions = [
        addPreset(makePreset("p1")),
        togglePresetActive("p1"),
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
});
