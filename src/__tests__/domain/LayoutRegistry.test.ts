import { describe, it, expect } from "vitest";
import { getLayout } from "../../domain/layout/LayoutRegistry";
import type { ViewState } from "../../domain/models/ViewState";

type ViewMode = ViewState["viewMode"];

const ALL_VIEW_MODES: ViewMode[] = [
  "basic",
  "hierarchical",
  "timeline",
  "pipeline",
  "circular",
  "radial",
  "execute",
];

describe("getLayout", () => {
  it.each(ALL_VIEW_MODES)("returns a layout algorithm for viewMode=%s", (mode) => {
    const layout = getLayout(mode);
    expect(layout).toBeDefined();
    expect(typeof layout.apply).toBe("function");
  });

  it("basic mode returns the same class as circular (both use CircularLayout)", () => {
    expect(getLayout("basic").constructor).toBe(getLayout("circular").constructor);
  });

  it("each non-aliased mode returns a distinct layout instance", () => {
    const layouts = ["hierarchical", "timeline", "pipeline", "radial", "execute"].map(
      (m) => getLayout(m as ViewMode),
    );
    const unique = new Set(layouts);
    expect(unique.size).toBe(layouts.length);
  });

  it("falls back to circular layout for an unrecognised viewMode", () => {
    const circular = getLayout("circular");
    const fallback = getLayout("unknown" as ViewMode);
    expect(fallback).toBe(circular);
  });
});
