import { describe, it, expect } from "vitest";
import reducer, { toggleTheme, setTheme } from "../../../application/store/themeSlice";

describe("themeSlice", () => {
  it("initial state is light theme", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.isDark).toBe(false);
  });

  describe("toggleTheme", () => {
    it("toggles from light to dark", () => {
      const state = reducer(undefined, toggleTheme());
      expect(state.isDark).toBe(true);
    });

    it("toggles back to light", () => {
      const s1 = reducer(undefined, toggleTheme());
      const s2 = reducer(s1, toggleTheme());
      expect(s2.isDark).toBe(false);
    });
  });

  describe("setTheme", () => {
    it("sets dark theme", () => {
      const state = reducer(undefined, setTheme(true));
      expect(state.isDark).toBe(true);
    });

    it("sets light theme", () => {
      const s1 = reducer(undefined, setTheme(true));
      const s2 = reducer(s1, setTheme(false));
      expect(s2.isDark).toBe(false);
    });
  });
});
