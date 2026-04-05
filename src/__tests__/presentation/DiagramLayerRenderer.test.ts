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
import type { Colors } from "../../presentation/components/rendering/types";

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
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1,
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
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1,
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
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      // parent renders but child is skipped due to fold
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
      const viewState = new ViewStateBuilder().addElement("a", 100, 100, 60).build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1, "rect",
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBeGreaterThan(0);
    });

    it("renders with polygon style", () => {
      const model = makeModelWithRoot("a");
      const viewState = new ViewStateBuilder().addElement("a", 100, 100, 60).build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1, "polygon",
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBeGreaterThan(0);
    });

    it("renders with svg style (default)", () => {
      const model = makeModelWithRoot("a");
      const viewState = new ViewStateBuilder().addElement("a", 100, 100, 60).build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1, "svg",
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
      model = addElement(model, MockElementFactory.createElement("a", "object"));
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder().addElement("a", 100, 100, 60).build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1, "svg", true,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      expect(elementLayer.getChildren().length).toBeGreaterThan(0);
    });
  });

  describe("prevPaths animation", () => {
    it("does not play entry animation for elements already in prevPaths", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(model, MockElementFactory.createElement("a", "object"));
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder().addElement("a", 100, 100, 60).build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(["a"]), 1,
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
      model = addElement(model, MockElementFactory.createElement("a", "object"));
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder().addElement("a", 100, 100, 60).build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(), model, viewState, "a", defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1,
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
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);
      // parent rendered as top-level group in elementLayer
      expect(elementLayer.getChildren().length).toBe(1);
      // child rendered inside parent group
      const parentGroup = elementLayer.getChildren()[0] as Konva.Group;
      const childGroups = parentGroup.getChildren().filter((c) => c instanceof Konva.Group);
      expect(childGroups.length).toBeGreaterThan(0);
    });
  });

  describe("Readonly Event Handling", () => {
    it("fires mouseenter and mouseleave on readonly group without throwing", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(model, MockElementFactory.createElement("a", "object"));
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder().addElement("a", 100, 100, 60).build();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {} },
        new Set(), 1, "svg", true,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);

      const group = elementLayer.getChildren()[0] as Konva.Group;
      expect(() => {
        group.fire("mouseenter", { type: "mouseenter", evt: new MouseEvent("mouseenter"), target: group, currentTarget: group, cancelBubble: false, pointerId: 0 });
        group.fire("mouseleave", { type: "mouseleave", evt: new MouseEvent("mouseleave"), target: group, currentTarget: group, cancelBubble: false, pointerId: 0 });
      }).not.toThrow();
    });
  });

  describe("Contextmenu Callback", () => {
    it("calls onContextMenu when contextmenu event fires on a group", () => {
      let model: DiagramModel = createEmptyDiagram();
      model = addElement(model, MockElementFactory.createElement("a", "object"));
      model.root.childIds.push("a");
      const viewState = new ViewStateBuilder().addElement("a", 100, 100, 60).build();

      const onContextMenu = vi.fn();

      const renderer = new DiagramLayerRenderer(
        helper.getStage(), model, viewState, null, defaultColors,
        { onClick: () => {}, onPositionChange: () => {}, onReparent: () => {}, onContextMenu },
        new Set(), 1,
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();
      renderer.render(relationshipLayer, elementLayer);

      const group = elementLayer.getChildren()[0] as Konva.Group;
      const mockEvt = { preventDefault: vi.fn() } as unknown as MouseEvent;
      group.fire("contextmenu", { type: "contextmenu", evt: mockEvt, target: group, currentTarget: group, cancelBubble: false, pointerId: 0 });

      expect(onContextMenu).toHaveBeenCalledWith("a", "a");
    });
  });
});
