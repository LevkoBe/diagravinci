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

function buildModel(setup: (m: DiagramModel) => void): DiagramModel {
  const model = createEmptyDiagram();
  setup(model);
  return model;
}

describe("computeElementSizes", () => {
  it("returns empty maps for model with no root children", () => {
    const model = createEmptyDiagram();
    const result = computeElementSizes(model, 1);
    expect(result.pixelSizes.size).toBe(0);
    expect(result.zoomHidden.size).toBe(0);
    expect(result.zoomDimmed.size).toBe(0);
  });

  it("assigns BASE_PX world size to root elements", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.root.childIds.push("a");
    });
    const result = computeElementSizes(model, 1);
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
    const result = computeElementSizes(model, 1);
    const parentSize = result.pixelSizes.get("a")!;
    const childSize = result.pixelSizes.get("a.b")!;
    expect(childSize).toBeLessThan(parentSize);
  });

  it("marks elements as zoom-hidden when screen size < MIN_SCREEN_PX", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.root.childIds.push("a");
    });

    const tinyZoom = MIN_SCREEN_PX / BASE_PX / 2;
    const result = computeElementSizes(model, tinyZoom);
    expect(result.zoomHidden.has("a")).toBe(true);
  });

  it("marks elements as zoom-dimmed when screen size > MAX_SCREEN_PX", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.root.childIds.push("a");
    });

    const largeZoom = (MAX_SCREEN_PX / BASE_PX) * 2;
    const result = computeElementSizes(model, largeZoom);
    expect(result.zoomDimmed.has("a")).toBe(true);
  });

  it("does not add hidden elements to zoomDimmed", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.root.childIds.push("a");
    });
    const tinyZoom = MIN_SCREEN_PX / BASE_PX / 2;
    const result = computeElementSizes(model, tinyZoom);
    expect(result.zoomDimmed.has("a")).toBe(false);
  });

  it("skips children when parent is zoom-hidden", () => {
    const model = buildModel((m) => {
      m.elements["a"] = { ...createElement("a", "object"), childIds: ["b"] };
      m.elements["b"] = createElement("b", "object");
      m.root.childIds.push("a");
    });
    const tinyZoom = MIN_SCREEN_PX / BASE_PX / 2;
    const result = computeElementSizes(model, tinyZoom);

    expect(result.pixelSizes.has("a.b")).toBe(false);
  });

  it("handles recursive elements gracefully", () => {
    const model = buildModel((m) => {
      m.elements["a"] = { ...createElement("a", "object"), childIds: ["b"] };
      m.elements["b"] = { ...createElement("b", "object"), childIds: ["a"] };
      m.root.childIds.push("a");
    });

    expect(() => computeElementSizes(model, 1)).not.toThrow();
  });

  it("multiple root children each get BASE_PX", () => {
    const model = buildModel((m) => {
      m.elements["a"] = createElement("a", "object");
      m.elements["b"] = createElement("b", "object");
      m.root.childIds.push("a", "b");
    });
    const result = computeElementSizes(model, 1);
    expect(result.pixelSizes.get("a")).toBe(BASE_PX);
    expect(result.pixelSizes.get("b")).toBe(BASE_PX);
  });
});
