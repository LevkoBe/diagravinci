import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Konva from "konva";
import { RelationshipRenderer } from "../../presentation/components/rendering/relationships/RelationshipRenderer";
import type { ViewState } from "../../domain/models/ViewState";
import { createEmptyViewState } from "../../domain/models/ViewState";
import type { Colors } from "../../presentation/components/rendering/types";
import { KonvaTestHelper, ViewStateBuilder } from "../utils";

const defaultColors: Colors = {
  accent: "#000000",
  fgPrimary: "#ffffff",
  selected: "#ff0000",
  bgSecondary: "#cccccc",
  relationship: "#0000ff",
};

function makeViewState(overrides: Partial<ViewState> = {}): ViewState {
  return { ...createEmptyViewState(), ...overrides };
}

describe("RelationshipRenderer", () => {
  let helper: KonvaTestHelper;
  let layer: Konva.Layer;

  beforeEach(() => {
    helper = new KonvaTestHelper();
    helper.createStage();
    layer = new Konva.Layer();
    helper.getStage().add(layer);
  });

  afterEach(() => {
    helper.cleanup();
  });

  it("renders nothing when there are no relationships", () => {
    const viewState = makeViewState();
    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);
    expect(layer.getChildren().length).toBe(0);
  });

  it("renders a basic --> relationship", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);
    expect(layer.getChildren().length).toBeGreaterThan(0);
  });

  it("skips relationship when source is hidden", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(["a"]), new Set());
    renderer.render(layer);
    expect(layer.getChildren().length).toBe(0);
  });

  it("skips relationship when target is hidden", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(["b"]), new Set());
    renderer.render(layer);
    expect(layer.getChildren().length).toBe(0);
  });

  it("renders with reduced opacity when source is dimmed", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set(["a"]));
    renderer.render(layer);
    const group = layer.getChildren()[0] as Konva.Group;
    expect(group.opacity()).toBeLessThan(1);
  });

  it("renders relationship with a label", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->", "uses")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);
    const group = layer.getChildren()[0] as Konva.Group;
    const texts = group.getChildren().filter((c) => c instanceof Konva.Text);
    expect(texts.length).toBeGreaterThan(0);
  });

  it("renders relationship with source decoration (<--)", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "<--")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);
    expect(layer.getChildren().length).toBeGreaterThan(0);
  });

  it("renders dashed relationship (..>)", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "..>")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);
    expect(layer.getChildren().length).toBeGreaterThan(0);
  });

  it("renders filled-diamond relationship (*--)", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "*--")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);
    expect(layer.getChildren().length).toBeGreaterThan(0);
  });

  it("renders inheritance (--|>)", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "--|>")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);
    expect(layer.getChildren().length).toBeGreaterThan(0);
  });

  it("skips relationship when source position is missing", () => {
    const viewState = new ViewStateBuilder()
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);
    expect(layer.getChildren().length).toBe(0);
  });

  it("updateLinePosition rebuilds line for changed path", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);

    expect(() => {
      renderer.updateLinePosition("a", (path) => {
        if (path === "a") return { x: 150, y: 100 };
        if (path === "b") return { x: 300, y: 100 };
        return null;
      });
    }).not.toThrow();
  });

  it("updateLinePosition with a labeled relationship", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->", "calls")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);

    renderer.updateLinePosition("a", (path) => {
      if (path === "a") return { x: 120, y: 100 };
      if (path === "b") return { x: 300, y: 100 };
      return null;
    });
    // The group should still have children after update
    const group = layer.getChildren()[0] as Konva.Group;
    expect(group.getChildren().length).toBeGreaterThan(0);
  });

  it("updateLinePosition with source decoration (<--)", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "<--")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);

    expect(() => {
      renderer.updateLinePosition("a", (path) => {
        if (path === "a") return { x: 150, y: 100 };
        if (path === "b") return { x: 300, y: 100 };
        return null;
      });
    }).not.toThrow();
  });

  it("updateLinePosition does nothing when relationship not found", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);

    expect(() => {
      renderer.updateLinePosition("c", () => null);
    }).not.toThrow();
  });

  it("updateLinePosition with null positions skips rebuild", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);

    expect(() => {
      renderer.updateLinePosition("a", () => null);
    }).not.toThrow();
  });

  it("skips same-position relationship (zero-length line)", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addRelationship("r1", "a", "a", "-->")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);
    // Zero-length line returns null points, so no group should be added
    expect(layer.getChildren().length).toBe(0);
  });

  it("clear empties the rel groups map", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
    renderer.render(layer);
    renderer.clear();

    // After clear, updateLinePosition should do nothing (no group stored)
    expect(() => {
      renderer.updateLinePosition("a", () => ({ x: 200, y: 100 }));
    }).not.toThrow();
  });
});
