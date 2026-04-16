import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Konva from "konva";
import { RelationshipRenderer, type GeometryCache, type ViewportRect } from "../../presentation/components/rendering/relationships/RelationshipRenderer";
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
    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
    renderer.render(layer);
    expect(layer.getChildren().length).toBe(0);
  });

  it("renders a basic --> relationship", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
    renderer.render(layer);
    expect(layer.getChildren().length).toBeGreaterThan(0);
  });

  it("skips relationship when source is hidden", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(["a"]),
      new Set(),
    );
    renderer.render(layer);
    expect(layer.getChildren().length).toBe(0);
  });

  it("skips relationship when target is hidden", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(["b"]),
      new Set(),
    );
    renderer.render(layer);
    expect(layer.getChildren().length).toBe(0);
  });

  it("renders with reduced opacity when source is dimmed", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(["a"]),
    );
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

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
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

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
    renderer.render(layer);
    expect(layer.getChildren().length).toBeGreaterThan(0);
  });

  it("renders dashed relationship (..>)", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "..>")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
    renderer.render(layer);
    expect(layer.getChildren().length).toBeGreaterThan(0);
  });

  it("renders filled-diamond relationship (*--)", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "*--")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
    renderer.render(layer);
    expect(layer.getChildren().length).toBeGreaterThan(0);
  });

  it("renders inheritance (--|>)", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "--|>")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
    renderer.render(layer);
    expect(layer.getChildren().length).toBeGreaterThan(0);
  });

  it("skips relationship when source position is missing", () => {
    const viewState = new ViewStateBuilder()
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
    renderer.render(layer);
    expect(layer.getChildren().length).toBe(0);
  });

  it("updateLinePosition rebuilds line for changed path", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
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

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
    renderer.render(layer);

    renderer.updateLinePosition("a", (path) => {
      if (path === "a") return { x: 120, y: 100 };
      if (path === "b") return { x: 300, y: 100 };
      return null;
    });

    const group = layer.getChildren()[0] as Konva.Group;
    expect(group.getChildren().length).toBeGreaterThan(0);
  });

  it("updateLinePosition with source decoration (<--)", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "<--")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
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

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
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

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
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

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
    renderer.render(layer);

    expect(layer.getChildren().length).toBe(0);
  });

  it("clear empties the rel groups map", () => {
    const viewState = new ViewStateBuilder()
      .addElement("a", 100, 100, 60)
      .addElement("b", 300, 100, 60)
      .addRelationship("r1", "a", "b", "-->")
      .build();

    const renderer = new RelationshipRenderer(
      viewState,
      defaultColors,
      new Set(),
      new Set(),
    );
    renderer.render(layer);
    renderer.clear();

    expect(() => {
      renderer.updateLinePosition("a", () => ({ x: 200, y: 100 }));
    }).not.toThrow();
  });

  describe("Viewport Culling", () => {
    const viewport: ViewportRect = { x: 0, y: 0, w: 800, h: 600 };

    it("skips edge when both endpoints are outside the viewport", () => {
      const viewState = new ViewStateBuilder()
        .addElement("a", 5000, 5000, 60)
        .addElement("b", 6000, 5000, 60)
        .addRelationship("r1", "a", "b", "-->")
        .build();

      const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set(), viewport);
      renderer.render(layer);
      expect(layer.getChildren().length).toBe(0);
    });

    it("renders edge when source is inside viewport, target is outside", () => {
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .addElement("b", 6000, 6000, 60)
        .addRelationship("r1", "a", "b", "-->")
        .build();

      const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set(), viewport);
      renderer.render(layer);
      expect(layer.getChildren().length).toBeGreaterThan(0);
    });

    it("renders edge when target is inside viewport, source is outside", () => {
      const viewState = new ViewStateBuilder()
        .addElement("a", 6000, 6000, 60)
        .addElement("b", 400, 300, 60)
        .addRelationship("r1", "a", "b", "-->")
        .build();

      const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set(), viewport);
      renderer.render(layer);
      expect(layer.getChildren().length).toBeGreaterThan(0);
    });

    it("renders edge when both endpoints are inside viewport", () => {
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .addElement("b", 300, 200, 60)
        .addRelationship("r1", "a", "b", "-->")
        .build();

      const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set(), viewport);
      renderer.render(layer);
      expect(layer.getChildren().length).toBeGreaterThan(0);
    });

    it("culls only off-screen edges, keeps on-screen ones", () => {
      const builder = new ViewStateBuilder()
        .addElement("on1", 100, 100, 60)
        .addElement("on2", 300, 100, 60)
        .addRelationship("r_visible", "on1", "on2", "-->");

      for (let i = 0; i < 20; i++) {
        builder
          .addElement(`off_a${i}`, 5000 + i * 100, 5000, 60)
          .addElement(`off_b${i}`, 6000 + i * 100, 5000, 60)
          .addRelationship(`r_off${i}`, `off_a${i}`, `off_b${i}`, "-->");
      }

      const renderer = new RelationshipRenderer(builder.build(), defaultColors, new Set(), new Set(), viewport);
      renderer.render(layer);
      expect(layer.getChildren().length).toBe(1);
    });

    it("renders without viewport rect (no culling applied)", () => {
      const viewState = new ViewStateBuilder()
        .addElement("a", 5000, 5000, 60)
        .addElement("b", 6000, 5000, 60)
        .addRelationship("r1", "a", "b", "-->")
        .build();

      const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set());
      renderer.render(layer);
      expect(layer.getChildren().length).toBeGreaterThan(0);
    });
  });

  describe("Geometry Cache", () => {
    it("populates cache after first render", () => {
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .addElement("b", 300, 100, 60)
        .addRelationship("r1", "a", "b", "-->")
        .build();

      const cache: GeometryCache = new Map();
      const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set(), undefined, cache);
      renderer.render(layer);
      expect(cache.size).toBe(1);
    });

    it("produces same layer child count with and without cache", () => {
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .addElement("b", 300, 100, 60)
        .addRelationship("r1", "a", "b", "-->")
        .addRelationship("r2", "b", "a", "<--")
        .build();

      const layer2 = new Konva.Layer();
      helper.getStage().add(layer2);

      const cache: GeometryCache = new Map();
      new RelationshipRenderer(viewState, defaultColors, new Set(), new Set(), undefined, cache).render(layer);
      new RelationshipRenderer(viewState, defaultColors, new Set(), new Set()).render(layer2);

      expect(layer.getChildren().length).toBe(layer2.getChildren().length);
    });

    it("reuses cached geometry on second render call", () => {
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .addElement("b", 300, 100, 60)
        .addRelationship("r1", "a", "b", "-->")
        .build();

      const cache: GeometryCache = new Map();
      const renderer = new RelationshipRenderer(viewState, defaultColors, new Set(), new Set(), undefined, cache);

      const layer2 = new Konva.Layer();
      helper.getStage().add(layer2);

      renderer.render(layer);
      const sizeAfterFirst = cache.size;

      renderer.render(layer2);
      expect(cache.size).toBe(sizeAfterFirst);
    });

    it("cache entry is keyed by position — different positions produce separate entries", () => {
      const viewState1 = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .addElement("b", 300, 100, 60)
        .addRelationship("r1", "a", "b", "-->")
        .build();
      const viewState2 = new ViewStateBuilder()
        .addElement("a", 200, 200, 60)
        .addElement("b", 400, 200, 60)
        .addRelationship("r1", "a", "b", "-->")
        .build();

      const cache: GeometryCache = new Map();
      const layer2 = new Konva.Layer();
      helper.getStage().add(layer2);

      new RelationshipRenderer(viewState1, defaultColors, new Set(), new Set(), undefined, cache).render(layer);
      new RelationshipRenderer(viewState2, defaultColors, new Set(), new Set(), undefined, cache).render(layer2);

      expect(cache.size).toBe(2);
    });
  });
});
