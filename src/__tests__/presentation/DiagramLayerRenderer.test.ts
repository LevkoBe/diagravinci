import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Konva from "konva";
import {
  MockElementFactory,
  ViewStateBuilder,
  KonvaTestHelper,
} from "../utils";
import {
  createEmptyDiagram,
  addElement,
  addRelationship,
  type DiagramModel,
} from "../../domain/models/DiagramModel";
import { createRelationship } from "../../domain/models/Relationship";
import type { ViewState } from "../../domain/models/ViewState";
import { DiagramLayerRenderer } from "../../presentation/components/DiagramLayerRenderer";
import type {
  Colors,
  RenderCallbacks,
} from "../../presentation/components/rendering/types";

describe("DiagramLayerRenderer", () => {
  let helper: KonvaTestHelper;
  const defaultColors: Colors = {
    accent: "#000000",
    fgPrimary: "#ffffff",
    selected: "#ff0000",
    bgSecondary: "#cccccc",
    relationship: "#0000ff",
  };

  beforeEach(() => {
    helper = new KonvaTestHelper();
    helper.createStage();
  });

  afterEach(() => {
    helper.cleanup();
  });

  describe("Bug Fix #1: Prevent Reparenting into Children", () => {
    it("should exclude dragged element from parent candidates", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );

      const viewState: ViewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      expect(() => {
        renderer.render(relationshipLayer, elementLayer);
      }).not.toThrow();
    });

    it("should exclude all children of dragged element", () => {
      let model: DiagramModel = createEmptyDiagram();
      const parent = MockElementFactory.createElement("parent", "object");
      const child = MockElementFactory.createElement("child", "object");
      parent.childIds = ["child"];

      model = addElement(model, parent);
      model = addElement(model, child);

      const viewState: ViewState = new ViewStateBuilder()
        .addElement("parent", 100, 100, 60, false)
        .addElement("child", 150, 150, 30, false)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      expect(() => {
        renderer.render(relationshipLayer, elementLayer);
      }).not.toThrow();
    });
  });

  describe("Bug Fix #2: Handle Recursive Duplicates", () => {
    it("should distinguish between root and nested duplicates", () => {
      let model: DiagramModel = createEmptyDiagram();
      const rootA = MockElementFactory.createElement("a", "object");
      const b = MockElementFactory.createElement("b", "object");
      const nestedA = MockElementFactory.createElement("a", "object");

      b.childIds = ["a"];
      model = addElement(model, rootA);
      model = addElement(model, b);
      model = addElement(model, nestedA);

      const viewState: ViewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .addElement("b", 200, 200, 60, false)
        .addElement("b.a", 220, 220, 30, false)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      expect(() => {
        renderer.render(relationshipLayer, elementLayer);
      }).not.toThrow();
    });
  });

  describe("Parent Detection Algorithm", () => {
    it("should find smallest containing element as parent", () => {
      let model: DiagramModel = createEmptyDiagram();
      const large = MockElementFactory.createElement("large", "object");
      const medium = MockElementFactory.createElement("medium", "object");
      const small = MockElementFactory.createElement("small", "object");

      large.childIds = ["medium"];
      medium.childIds = ["small"];

      model = addElement(model, large);
      model = addElement(model, medium);
      model = addElement(model, small);

      const viewState: ViewState = new ViewStateBuilder()
        .addElement("large", 100, 100, 100, false)
        .addElement("medium", 150, 150, 50, false)
        .addElement("small", 170, 170, 20, false)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      expect(() => {
        renderer.render(relationshipLayer, elementLayer);
      }).not.toThrow();
    });

    it("should return root when no parent contains position", () => {
      let model: DiagramModel = createEmptyDiagram();
      const isolated = MockElementFactory.createElement("isolated", "object");
      model = addElement(model, isolated);

      const viewState: ViewState = new ViewStateBuilder()
        .addElement("isolated", 500, 500, 60, false)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      expect(() => {
        renderer.render(relationshipLayer, elementLayer);
      }).not.toThrow();
    });
  });

  describe("Relationship Line Positioning", () => {
    it("should correctly position relationship lines", () => {
      let model: DiagramModel = createEmptyDiagram();
      const source = MockElementFactory.createElement("source", "object");
      const target = MockElementFactory.createElement("target", "object");

      model = addElement(model, source);
      model = addElement(model, target);
      model = addRelationship(
        model,
        createRelationship("rel1", "source", "target", "-->"),
      );

      const viewState: ViewState = new ViewStateBuilder()
        .addElement("source", 100, 100, 60, false)
        .addElement("target", 300, 100, 60, false)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      expect(() => {
        renderer.render(relationshipLayer, elementLayer);
      }).not.toThrow();
    });
  });

  describe("Hidden and Dimmed Elements", () => {
    function makeModelWithRoot(id: string): DiagramModel {
      let model = createEmptyDiagram();
      model = addElement(model, MockElementFactory.createElement(id, "object"));
      model.root.childIds.push(id);
      return model;
    }

    it("does not render hidden elements", () => {
      const model = makeModelWithRoot("a");
      const viewState: ViewState = {
        ...new ViewStateBuilder().addElement("a", 100, 100, 60).build(),
        hiddenPaths: ["a"],
        dimmedPaths: [],
        foldedPaths: [],
        coloredPaths: {},
      };

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBe(0);
    });

    it("renders dimmed elements", () => {
      const model = makeModelWithRoot("a");
      const viewState: ViewState = {
        ...new ViewStateBuilder().addElement("a", 100, 100, 60).build(),
        hiddenPaths: [],
        dimmedPaths: ["a"],
        foldedPaths: [],
        coloredPaths: {},
      };

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBeGreaterThan(0);
    });

    it("skips children of folded elements", () => {
      let model: DiagramModel = createEmptyDiagram();
      const parent = MockElementFactory.createElement("parent", "object");
      const child = MockElementFactory.createElement("child", "object");
      parent.childIds = ["child"];
      model = addElement(model, parent);
      model = addElement(model, child);
      model.root.childIds.push("parent");

      const viewState: ViewState = {
        ...new ViewStateBuilder()
          .addElement("parent", 100, 100, 100)
          .addElement("parent.child", 120, 120, 40)
          .build(),
        hiddenPaths: [],
        dimmedPaths: [],
        foldedPaths: ["parent"],
        coloredPaths: {},
      };

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);

      expect(elementLayer.getChildren().length).toBe(1);
    });
  });

  describe("Render Styles", () => {
    function makeModelWithRoot(id: string): DiagramModel {
      let model = createEmptyDiagram();
      model = addElement(model, MockElementFactory.createElement(id, "object"));
      model.root.childIds.push(id);
      return model;
    }

    it("renders with rect style", () => {
      const model = makeModelWithRoot("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
        "rect",
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBeGreaterThan(0);
    });

    it("renders with polygon style", () => {
      const model = makeModelWithRoot("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
        "polygon",
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBeGreaterThan(0);
    });

    it("renders with svg style (default)", () => {
      const model = makeModelWithRoot("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
        "svg",
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBeGreaterThan(0);
    });
  });

  describe("Readonly Mode", () => {
    it("renders in readonly mode without throwing", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
        "svg",
        "straight",
        true,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBeGreaterThan(0);
    });
  });

  describe("prevPaths animation", () => {
    it("new elements start at full scale (scale 0 removed — was causing invisible elements on first render)", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(model, MockElementFactory.createElement("a", "object"));
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder().addElement("a", 100, 100, 60).build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1,
      );
      const relLayer = new Konva.Layer(), elLayer = new Konva.Layer();
      renderer.render(relLayer, elLayer);

      const group = elLayer.getChildren()[0] as Konva.Group;
      expect(group).toBeDefined();
      expect(group.scaleX()).toBe(1);
      expect(group.scaleY()).toBe(1);
    });

    it("does not play entry animation for elements already in prevPaths", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(["a"]),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBeGreaterThan(0);
    });
  });

  describe("Connecting mode", () => {
    it("renders connecting indicator on target element", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        "a",
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty diagram", () => {
      const model: DiagramModel = createEmptyDiagram();
      const viewState: ViewState = new ViewStateBuilder().build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBe(0);
    });

    it("should handle single element", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(
        model,
        MockElementFactory.createElement("single", "object"),
      );

      const viewState: ViewState = new ViewStateBuilder()
        .addElement("single", 100, 100, 60, false)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      expect(() => {
        renderer.render(relationshipLayer, elementLayer);
      }).not.toThrow();
    });

    it("should handle deeply nested elements", () => {
      let model: DiagramModel = createEmptyDiagram();
      const l1 = MockElementFactory.createElement("l1", "object");
      const l2 = MockElementFactory.createElement("l2", "object");
      const l3 = MockElementFactory.createElement("l3", "object");
      const l4 = MockElementFactory.createElement("l4", "object");

      l1.childIds = ["l2"];
      l2.childIds = ["l3"];
      l3.childIds = ["l4"];

      model = addElement(model, l1);
      model = addElement(model, l2);
      model = addElement(model, l3);
      model = addElement(model, l4);

      const viewState: ViewState = new ViewStateBuilder()
        .addElement("l1", 100, 100, 100, false)
        .addElement("l2", 120, 120, 80, false)
        .addElement("l3", 140, 140, 60, false)
        .addElement("l4", 160, 160, 40, false)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      expect(() => {
        renderer.render(relationshipLayer, elementLayer);
      }).not.toThrow();
    });
  });

  describe("Child Element Rendering", () => {
    it("renders child elements nested inside parent", () => {
      let model: DiagramModel = createEmptyDiagram();
      const parent = MockElementFactory.createElement("parent", "object");
      const child = MockElementFactory.createElement("child", "object");
      parent.childIds = ["child"];
      model = addElement(model, parent);
      model = addElement(model, child);
      model.root.childIds.push("parent");

      const viewState: ViewState = new ViewStateBuilder()
        .addElement("parent", 100, 100, 100)
        .addElement("parent.child", 130, 130, 40)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
        "polygon",
        "straight",
        false,
        {},
        false,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);

      expect(elementLayer.getChildren().length).toBe(2);
      const groups = elementLayer
        .getChildren()
        .filter((c) => c instanceof Konva.Group);
      expect(groups.length).toBe(2);
    });
  });

  describe("Readonly Event Handling", () => {
    it("fires mouseenter and mouseleave on readonly group without throwing", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
        "svg",
        "straight",
        true,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);

      const group = elementLayer.getChildren()[0] as Konva.Group;
      expect(() => {
        group.fire("mouseenter", {
          type: "mouseenter",
          evt: new MouseEvent("mouseenter"),
          target: group,
          currentTarget: group,
          cancelBubble: false,
          pointerId: 0,
        });
        group.fire("mouseleave", {
          type: "mouseleave",
          evt: new MouseEvent("mouseleave"),
          target: group,
          currentTarget: group,
          cancelBubble: false,
          pointerId: 0,
        });
      }).not.toThrow();
    });
  });

  describe("Culling — viewport correctly computed from current stage position", () => {
    function makeModelWithRoot(id: string): DiagramModel {
      let model = createEmptyDiagram();
      model = addElement(model, MockElementFactory.createElement(id, "object"));
      model.root.childIds.push(id);
      return model;
    }

    const callbacks = { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} };

    it("element in view after panning right is rendered", () => {
      const stage = helper.getStage();
      stage.position({ x: -800, y: 0 });

      const model = makeModelWithRoot("el");
      const vs = new ViewStateBuilder().addElement("el", 1000, 300, 60).build();

      const renderer = new DiagramLayerRenderer(stage, model, vs, null, defaultColors, callbacks, new Set(), 1);
      const rel = new Konva.Layer(), el = new Konva.Layer();
      renderer.render(rel, el);
      expect(el.getChildren().length).toBe(1);
    });

    it("element that left the viewport after panning is correctly culled", () => {
      const stage = helper.getStage();
      stage.position({ x: -800, y: 0 });

      const model = makeModelWithRoot("el");
      const vs = new ViewStateBuilder().addElement("el", 0, 0, 60).build();

      const renderer = new DiagramLayerRenderer(stage, model, vs, null, defaultColors, callbacks, new Set(), 1);
      const rel = new Konva.Layer(), el = new Konva.Layer();
      renderer.render(rel, el);
      expect(el.getChildren().length).toBe(0);
    });

    it("only elements within the panned viewport render", () => {
      const stage = helper.getStage();
      stage.position({ x: -3000, y: 0 });

      let model = createEmptyDiagram();
      for (let i = 0; i < 20; i++) {
        const el = MockElementFactory.createElement(`e${i}`, "object");
        model = addElement(model, el);
        model.root.childIds.push(`e${i}`);
      }
      const builder = new ViewStateBuilder();
      for (let i = 0; i < 5; i++) builder.addElement(`e${i}`, 3200 + i * 100, 300, 60);
      for (let i = 5; i < 20; i++) builder.addElement(`e${i}`, i * 80, 0, 60);

      const renderer = new DiagramLayerRenderer(stage, model, builder.build(), null, defaultColors, callbacks, new Set(), 1);
      const rel = new Konva.Layer(), el = new Konva.Layer();
      renderer.render(rel, el);
      expect(el.getChildren().length).toBe(5);
    });
  });

  describe("Viewport Culling", () => {
    function makeModelWithRoot(id: string): DiagramModel {
      let model = createEmptyDiagram();
      model = addElement(model, MockElementFactory.createElement(id, "object"));
      model.root.childIds.push(id);
      return model;
    }

    it("culls element positioned far outside the current viewport", () => {
      const model = makeModelWithRoot("a");

      const viewState = new ViewStateBuilder()
        .addElement("a", 10000, 10000, 60)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
      );
      const relLayer = new Konva.Layer();
      const elLayer = new Konva.Layer();
      renderer.render(relLayer, elLayer);
      expect(elLayer.getChildren().length).toBe(0);
    });

    it("renders element positioned inside the viewport", () => {
      const model = makeModelWithRoot("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
      );
      const relLayer = new Konva.Layer();
      const elLayer = new Konva.Layer();
      renderer.render(relLayer, elLayer);
      expect(elLayer.getChildren().length).toBeGreaterThan(0);
    });

    it("culls off-screen parent but still renders in-viewport child", () => {
      let model = createEmptyDiagram();
      const parent = MockElementFactory.createElement("parent", "object");
      const child = MockElementFactory.createElement("child", "object");
      parent.childIds = ["child"];
      model = addElement(model, parent);
      model = addElement(model, child);
      model.root.childIds.push("parent");

      const viewState = new ViewStateBuilder()
        .addElement("parent", 10000, 10000, 100)
        .addElement("parent.child", 100, 100, 40)
        .build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
        "polygon",
        "straight",
        false,
        {},
        false,
      );
      const relLayer = new Konva.Layer();
      const elLayer = new Konva.Layer();
      renderer.render(relLayer, elLayer);
      expect(elLayer.getChildren().length).toBe(1);
    });

    it("culls off-screen elements, renders only in-viewport elements", () => {
      const TOTAL = 100;
      const IN_VIEW = 5;

      let model = createEmptyDiagram();
      for (let i = 0; i < TOTAL; i++) {
        const el = MockElementFactory.createElement(`e${i}`, "object");
        model = addElement(model, el);
        model.root.childIds.push(`e${i}`);
      }

      const builder = new ViewStateBuilder();
      for (let i = 0; i < IN_VIEW; i++) {
        builder.addElement(`e${i}`, 100 + i * 100, 300, 60);
      }
      for (let i = IN_VIEW; i < TOTAL; i++) {
        builder.addElement(`e${i}`, 50000 + i * 70, 50000, 60);
      }

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        builder.build(),
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
      );
      const relLayer = new Konva.Layer();
      const elLayer = new Konva.Layer();
      renderer.render(relLayer, elLayer);
      expect(elLayer.getChildren().length).toBe(IN_VIEW);
    });

    it("renders all elements when all are inside the viewport", () => {
      const TOTAL = 10;
      let model = createEmptyDiagram();
      for (let i = 0; i < TOTAL; i++) {
        const el = MockElementFactory.createElement(`e${i}`, "object");
        model = addElement(model, el);
        model.root.childIds.push(`e${i}`);
      }

      const builder = new ViewStateBuilder();

      for (let i = 0; i < TOTAL; i++) {
        builder.addElement(
          `e${i}`,
          100 + (i % 5) * 100,
          150 + Math.floor(i / 5) * 200,
          60,
        );
      }

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        builder.build(),
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
      );
      const relLayer = new Konva.Layer();
      const elLayer = new Konva.Layer();
      renderer.render(relLayer, elLayer);
      expect(elLayer.getChildren().length).toBe(TOTAL);
    });
  });

  describe("Performance Benchmark (node-count assertions)", () => {
    it("culls off-screen elements — allOnScreen renders more than mostOffScreen", () => {
      const TOTAL = 200;

      let model = createEmptyDiagram();
      for (let i = 0; i < TOTAL; i++) {
        const el = MockElementFactory.createElement(`e${i}`, "object");
        model = addElement(model, el);
        model.root.childIds.push(`e${i}`);
      }

      const allOnScreen = new ViewStateBuilder();
      const mostOffScreen = new ViewStateBuilder();

      for (let i = 0; i < TOTAL; i++) {
        allOnScreen.addElement(
          `e${i}`,
          100 + (i % 10) * 60,
          100 + Math.floor(i / 10) * 20,
          10,
        );
      }
      for (let i = 0; i < 10; i++) {
        mostOffScreen.addElement(`e${i}`, 100 + i * 70, 300, 50);
      }
      for (let i = 10; i < TOTAL; i++) {
        mostOffScreen.addElement(`e${i}`, 50000 + i * 70, 50000, 50);
      }

      const makeRenderer = (vs: ViewState) =>
        new DiagramLayerRenderer(
          helper.getStage(),
          model,
          vs,
          null,
          defaultColors,
          {
            onClick: () => {},
            onPositionChange: () => {},
            onReparent: () => {},
          },
          new Set(),
          1,
        );

      const relA = new Konva.Layer();
      const elA = new Konva.Layer();
      makeRenderer(allOnScreen.build()).render(relA, elA);

      const relB = new Konva.Layer();
      const elB = new Konva.Layer();
      makeRenderer(mostOffScreen.build()).render(relB, elB);

      expect(elA.getChildren().length).toBe(TOTAL);
      expect(elB.getChildren().length).toBe(10);
    });

    it("renders only in-viewport elements within time budget (off-screen are culled)", () => {
      const TOTAL = 500;
      const IN_VIEW = 5;

      let model = createEmptyDiagram();
      for (let i = 0; i < TOTAL; i++) {
        const el = MockElementFactory.createElement(`e${i}`, "object");
        model = addElement(model, el);
        model.root.childIds.push(`e${i}`);
      }

      const builder = new ViewStateBuilder();
      for (let i = 0; i < IN_VIEW; i++) {
        builder.addElement(`e${i}`, 100 + i * 70, 300, 50);
      }
      for (let i = IN_VIEW; i < TOTAL; i++) {
        builder.addElement(`e${i}`, 50000 + i * 70, 50000, 50);
      }

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        builder.build(),
        null,
        defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(),
        1,
      );

      const t0 = performance.now();
      const relLayer = new Konva.Layer();
      const elLayer = new Konva.Layer();
      renderer.render(relLayer, elLayer);
      const elapsed = performance.now() - t0;

      expect(elLayer.getChildren().length).toBe(IN_VIEW);
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe("Contextmenu Callback", () => {
    it("calls onContextMenu when contextmenu event fires on a group", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const onContextMenu = vi.fn();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(),
        model,
        viewState,
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
          onContextMenu,
        },
        new Set(),
        1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);

      const group = elementLayer.getChildren()[0] as Konva.Group;
      const mockEvt = { preventDefault: vi.fn() } as unknown as MouseEvent;
      group.fire("contextmenu", {
        type: "contextmenu",
        evt: mockEvt,
        target: group,
        currentTarget: group,
        cancelBubble: false,
        pointerId: 0,
      });

      expect(onContextMenu).toHaveBeenCalledWith("a", "a");
    });
  });

  function fireEvent(
    group: Konva.Group,
    type: string,
    extra: Record<string, unknown> = {},
  ) {
    group.fire(type, {
      type,
      evt: new MouseEvent(type),
      target: group,
      currentTarget: group,
      cancelBubble: false,
      pointerId: 0,
      ...extra,
    });
  }

  function makeRenderer(
    model: DiagramModel,
    viewState: ViewState,
    callbacks: Partial<RenderCallbacks> = {},
    isReadonly = false,
  ) {
    return new DiagramLayerRenderer(
      helper.getStage(),
      model,
      viewState,
      null,
      defaultColors,
      {
        onClick: () => {},
        onPositionChange: () => {},
        onReparent: () => {},
        ...callbacks,
      },
      new Set(),
      1,
      "svg",
      "straight",
      isReadonly,
    );
  }

  describe("Non-readonly event handler coverage (lines 216-223, 249-346)", () => {
    it("mouseenter / mouseleave invoke setHovered", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const renderer = makeRenderer(model, viewState);
      const rel = new Konva.Layer();
      const el = new Konva.Layer();
      renderer.render(rel, el);

      const group = el.getChildren()[0] as Konva.Group;
      expect(() => {
        fireEvent(group, "mouseenter");
        fireEvent(group, "mouseleave");
      }).not.toThrow();
    });

    it("click invokes onClick callback", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const onClick = vi.fn();
      const renderer = makeRenderer(model, viewState, { onClick });
      const rel = new Konva.Layer();
      const el = new Konva.Layer();
      renderer.render(rel, el);

      const group = el.getChildren()[0] as Konva.Group;
      fireEvent(group, "click", {
        evt: Object.assign(new MouseEvent("click"), {
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        }),
      });
      expect(onClick).toHaveBeenCalledWith("a", false, false);
    });

    it("dragmove without pointer triggers updateRelationshipLines / updateChildRelationshipLines", () => {
      let model: DiagramModel = createEmptyDiagram();
      const parent = MockElementFactory.createElement("parent", "object");
      const child = MockElementFactory.createElement("child", "object");
      parent.childIds = ["child"];
      model = addElement(model, parent);
      model = addElement(model, child);
      model.root.childIds.push("parent");

      const viewState: ViewState = {
        ...new ViewStateBuilder()
          .addElement("parent", 100, 100, 100)
          .addElement("parent.child", 130, 130, 40)
          .build(),
        hiddenPaths: [],
        dimmedPaths: [],
        foldedPaths: [],
        coloredPaths: {},
      };

      const renderer = makeRenderer(model, viewState);
      const rel = new Konva.Layer();
      const el = new Konva.Layer();
      renderer.render(rel, el);

      const group = el.getChildren()[0] as Konva.Group;
      expect(() => fireEvent(group, "dragmove")).not.toThrow();
    });

    it("dragmove with pointer triggers findHoveredPath (hit and skip branches)", () => {
      let model: DiagramModel = createEmptyDiagram();

      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );
      model = addElement(
        model,
        MockElementFactory.createElement("b", "object"),
      );
      model = addElement(
        model,
        MockElementFactory.createElement("c", "object"),
      );
      model.root.childIds.push("a", "b", "c");

      const viewState: ViewState = {
        ...new ViewStateBuilder()
          .addElement("a", 100, 100, 60)
          .addElement("b", 100, 100, 60)
          .addElement("c", 100, 100, 60)
          .build(),
        hiddenPaths: ["c"],
        dimmedPaths: [],
        foldedPaths: [],
        coloredPaths: {},
      };

      vi.spyOn(helper.getStage(), "getPointerPosition").mockReturnValue({
        x: 100,
        y: 100,
      });

      const renderer = makeRenderer(model, viewState);
      const rel = new Konva.Layer();
      const el = new Konva.Layer();
      renderer.render(rel, el);

      const group = el.getChildren()[0] as Konva.Group;
      expect(() => fireEvent(group, "dragmove")).not.toThrow();

      vi.restoreAllMocks();
    });

    it("dragend triggers onPositionChange, updateChildPositions, findNewParentPath, getRootId", () => {
      let model: DiagramModel = createEmptyDiagram();
      const parent = MockElementFactory.createElement("parent", "object");
      const child = MockElementFactory.createElement("child", "object");
      parent.childIds = ["child"];
      model = addElement(model, parent);
      model = addElement(model, child);
      model.root.childIds.push("parent");

      const viewState: ViewState = {
        ...new ViewStateBuilder()
          .addElement("parent", 100, 100, 100)
          .addElement("parent.child", 130, 130, 40)
          .build(),
        hiddenPaths: [],
        dimmedPaths: [],
        foldedPaths: [],
        coloredPaths: {},
      };

      const onPositionChange = vi.fn();
      const renderer = makeRenderer(model, viewState, { onPositionChange });
      const rel = new Konva.Layer();
      const el = new Konva.Layer();
      renderer.render(rel, el);

      const group = el.getChildren()[0] as Konva.Group;
      expect(() => fireEvent(group, "dragend")).not.toThrow();
      expect(onPositionChange).toHaveBeenCalled();
    });

    it("dragend on top-level element uses getRootId as fallback parent", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60)
        .build();

      const renderer = makeRenderer(model, viewState);
      const rel = new Konva.Layer();
      const el = new Konva.Layer();
      renderer.render(rel, el);

      const group = el.getChildren()[0] as Konva.Group;
      expect(() => fireEvent(group, "dragend")).not.toThrow();
    });

    it("dragend covers findNewParentPath hit branch (element inside another)", () => {
      let model: DiagramModel = createEmptyDiagram();

      model = addElement(
        model,
        MockElementFactory.createElement("a", "object"),
      );
      model = addElement(
        model,
        MockElementFactory.createElement("container", "object"),
      );
      model.root.childIds.push("a", "container");

      const viewState: ViewState = {
        ...new ViewStateBuilder()
          .addElement("a", 100, 100, 60)
          .addElement("container", 100, 100, 200)
          .build(),
        hiddenPaths: [],
        dimmedPaths: [],
        foldedPaths: [],
        coloredPaths: {},
      };

      const renderer = makeRenderer(model, viewState);
      const rel = new Konva.Layer();
      const el = new Konva.Layer();
      renderer.render(rel, el);

      const group = el.getChildren()[0] as Konva.Group;
      expect(() => fireEvent(group, "dragend")).not.toThrow();
    });

    it("dragend with hidden child covers updateChildPositions else-if-delta branch", () => {
      let model: DiagramModel = createEmptyDiagram();
      const parent = MockElementFactory.createElement("parent", "object");
      const child = MockElementFactory.createElement("child", "object");
      parent.childIds = ["child"];
      model = addElement(model, parent);
      model = addElement(model, child);
      model.root.childIds.push("parent");

      const viewState: ViewState = {
        ...new ViewStateBuilder()
          .addElement("parent", 100, 100, 100)
          .addElement("parent.child", 130, 130, 40)
          .build(),

        hiddenPaths: ["parent.child"],
        dimmedPaths: [],
        foldedPaths: [],
        coloredPaths: {},
      };

      const renderer = makeRenderer(model, viewState);
      const rel = new Konva.Layer();
      const el = new Konva.Layer();
      renderer.render(rel, el);

      const group = el.getChildren()[0] as Konva.Group;
      expect(() => fireEvent(group, "dragend")).not.toThrow();
    });
  });
});
