import { describe, it, expect } from "vitest";
import {
  computeElementSizes,
  BASE_PX,
  MIN_SCREEN_PX,
  MAX_SCREEN_PX,
} from "../../presentation/components/rendering/elementSizing";
import { createElement } from "../../domain/models/Element";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";

function buildModel(setup: (m: DiagramModel) => void): DiagramModel {
  const model = createEmptyDiagram();
  setup(model);
  return model;
}

export function createEmptyViewState(): ViewState {
  return {
    positions: {},
    relationships: [],
    viewMode: "basic",
    zoom: 1,
    pan: { x: 0, y: 0 },
    hiddenPaths: [],
    dimmedPaths: [],
    foldedPaths: [],
    coloredPaths: {},
  };
}

describe("computeElementSizes", () => {
  it("returns empty maps for model with no root children", () => {
    const model = createEmptyDiagram();
    const viewState = createEmptyViewState();
    const result = computeElementSizes(model, viewState, 1);
    expect(result.pixelSizes.size).toBe(0);
    expect(result.zoomHidden.size).toBe(0);
    expect(result.zoomDimmed.size).toBe(0);
  });

  it("assigns BASE_PX world size to root elements", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.root.childIds.push("a");
    });
    const viewState = createEmptyViewState();
    const result = computeElementSizes(model, viewState, 1);
    expect(result.pixelSizes.get("a")).toBe(BASE_PX);
  });

  it("children get smaller world size than parent when there are multiple children", () => {
    const model = buildModel((m) => {
      m.elements["a"] = {
        ...createElement("a", "object"),
        childIds: ["b", "c"],
      };
      m.elements["b"] = createElement("b", "object");
      m.elements["c"] = createElement("c", "object");
      m.root.childIds.push("a");
    });
    const viewState = createEmptyViewState();
    const result = computeElementSizes(model, viewState, 1);
    const parentSize = result.pixelSizes.get("a")!;
    const childSize = result.pixelSizes.get("a.b")!;
    expect(childSize).toBeLessThan(parentSize);
  });

  it("marks elements as zoom-hidden when screen size < MIN_SCREEN_PX", () => {
    const model = buildModel((m) => {
      m.elements["a"] = { ...createElement("a", "object"), childIds: ["b"] };
      m.elements["b"] = createElement("b", "object");
      m.root.childIds.push("a");
    });

    const tinyZoom = MIN_SCREEN_PX / BASE_PX / 2;
    const viewState = createEmptyViewState();
    const result = computeElementSizes(model, viewState, tinyZoom);
    expect(result.zoomHidden.has("a")).toBe(false);
    expect(result.zoomHidden.has("a.b")).toBe(true);
  });

  it("marks elements as zoom-dimmed when screen size > MAX_SCREEN_PX", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.root.childIds.push("a");
    });

    const largeZoom = (MAX_SCREEN_PX / BASE_PX) * 2;
    const viewState = createEmptyViewState();
    const result = computeElementSizes(model, viewState, largeZoom);
    expect(result.zoomDimmed.has("a")).toBe(true);
  });

  it("does not add hidden elements to zoomDimmed", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.root.childIds.push("a");
    });
    const tinyZoom = MIN_SCREEN_PX / BASE_PX / 2;
    const viewState = createEmptyViewState();
    const result = computeElementSizes(model, viewState, tinyZoom);
    expect(result.zoomDimmed.has("a")).toBe(false);
  });

  it("skips children when parent is zoom-hidden", () => {
    const model = buildModel((m) => {
      m.elements["a"] = { ...createElement("a", "object"), childIds: ["b"] };
      m.elements["b"] = { ...createElement("b", "object"), childIds: ["c"] };
      m.elements["c"] = createElement("c", "object");
      m.root.childIds.push("a");
    });
    const tinyZoom = MIN_SCREEN_PX / BASE_PX / 2;
    const viewState = createEmptyViewState();
    const result = computeElementSizes(model, viewState, tinyZoom);
    expect(result.zoomHidden.has("a.b")).toBe(true);
    expect(result.pixelSizes.has("a.b.c")).toBe(false);
  });

  it("handles recursive elements gracefully", () => {
    const model = buildModel((m) => {
      m.elements["a"] = { ...createElement("a", "object"), childIds: ["b"] };
      m.elements["b"] = { ...createElement("b", "object"), childIds: ["a"] };
      m.root.childIds.push("a");
    });
    const viewState = createEmptyViewState();

    expect(() => computeElementSizes(model, viewState, 1)).not.toThrow();
  });

  it("multiple root children each get BASE_PX", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.elements["b"] = createElement("b", "object");
      m.root.childIds.push("a", "b");
    });
    const viewState = createEmptyViewState();
    const result = computeElementSizes(model, viewState, 1);
    expect(result.pixelSizes.get("a")).toBe(BASE_PX);
    expect(result.pixelSizes.get("b")).toBe(BASE_PX);
  });
});
