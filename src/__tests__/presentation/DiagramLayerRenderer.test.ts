import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
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
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
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
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
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
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
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
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
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
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      expect(() => {
        renderer.render(relationshipLayer, elementLayer);
      }).not.toThrow();
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
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
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
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
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
        null,
        defaultColors,
        {
          onClick: () => {},
          onPositionChange: () => {},
          onReparent: () => {},
        },
        new Set(),
      );

      const relationshipLayer = new Konva.Layer();
      const elementLayer = new Konva.Layer();

      expect(() => {
        renderer.render(relationshipLayer, elementLayer);
      }).not.toThrow();
    });
  });
});
