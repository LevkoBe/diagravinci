import { describe, it, expect } from "vitest";
import reducer, {
  openFilterModal,
  closeFilterModal,
  setActiveModalPreset,
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
} from "../../../application/store/filterSlice";
import type { FilterPreset } from "../../../domain/models/Selector";

function makePreset(id: string, active = false): FilterPreset {
  return {
    id,
    label: `Preset ${id}`,
    mode: "hide",
    isActive: active,
    color: "#e05c5c",
    selector: { atoms: [], combiner: "" },
  };
}

describe("filterSlice", () => {
  it("has correct initial state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.presets).toEqual([]);
    expect(state.isModalOpen).toBe(false);
    expect(state.foldLevel).toBe(1);
    expect(state.foldActive).toBe(false);
    expect(state.manuallyFolded).toEqual([]);
    expect(state.manuallyUnfolded).toEqual([]);
    expect(state._rev).toBe(0);
  });

  describe("modal actions", () => {
    it("openFilterModal sets isModalOpen to true", () => {
      const state = reducer(undefined, openFilterModal());
      expect(state.isModalOpen).toBe(true);
    });

    it("closeFilterModal sets isModalOpen to false", () => {
      const s1 = reducer(undefined, openFilterModal());
      const s2 = reducer(s1, closeFilterModal());
      expect(s2.isModalOpen).toBe(false);
    });

    it("setActiveModalPreset updates activeModalPresetId", () => {
      const state = reducer(undefined, setActiveModalPreset("p1"));
      expect(state.activeModalPresetId).toBe("p1");
    });

    it("setActiveModalPreset can set null", () => {
      const s1 = reducer(undefined, setActiveModalPreset("p1"));
      const s2 = reducer(s1, setActiveModalPreset(null));
      expect(s2.activeModalPresetId).toBeNull();
    });
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

    it("removePreset removes preset and clears activeModalPresetId if it matches", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, setActiveModalPreset("p1"));
      const s3 = reducer(s2, removePreset("p1"));
      expect(s3.presets).toHaveLength(0);
      expect(s3.activeModalPresetId).toBeNull();
    });

    it("removePreset does not change activeModalPresetId for other presets", () => {
      const s1 = reducer(undefined, addPreset(makePreset("p1")));
      const s2 = reducer(s1, addPreset(makePreset("p2")));
      const s3 = reducer(s2, setActiveModalPreset("p2"));
      const s4 = reducer(s3, removePreset("p1"));
      expect(s4.activeModalPresetId).toBe("p2");
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
