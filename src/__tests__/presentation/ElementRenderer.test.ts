import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Konva from "konva";
import { ElementRenderer } from "../../presentation/components/rendering/ElementRenderer";
import type { Colors } from "../../presentation/components/rendering/types";
import {
  MockElementFactory,
  ViewStateBuilder,
  KonvaTestHelper,
} from "../utils";
import type { Position } from "../../domain/models/Element";

describe("ElementRenderer", () => {
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

  describe("Basic Rendering", () => {
    it("should render an element and return a group with hover callbacks", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();

      expect(result).toBeDefined();
      expect(result?.group).toBeInstanceOf(Konva.Group);
      expect(typeof result?.onHoverIn).toBe("function");
      expect(typeof result?.onHoverOut).toBe("function");
    });

    it("should add SVG path shape to the group", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();
      const pathShapes = result?.group
        .getChildren()
        .filter((child) => child instanceof Konva.Path);

      expect(pathShapes).toHaveLength(1);
    });

    it("should add text label to the group", () => {
      const element = MockElementFactory.createElement("b", "object");
      const viewState = new ViewStateBuilder()
        .addElement("b", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "b",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();
      const textShapes = result?.group
        .getChildren()
        .filter((child) => child instanceof Konva.Text);

      expect(textShapes?.length).toBeGreaterThan(0);
      const labelText = (textShapes?.[0] as Konva.Text)?.text();
      expect(labelText).toBe("b");
    });

    it("should position group at correct local coordinates", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 200, 150, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();

      expect(result?.group.x()).toBe(200);
      expect(result?.group.y()).toBe(150);
    });

    it("should offset local position relative to parent", () => {
      const element = MockElementFactory.createElement("b", "object");
      const parentPos: Position = { x: 100, y: 100 };
      const viewState = new ViewStateBuilder()
        .addElement("b", 150, 150, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "b",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render(parentPos);

      expect(result?.group.x()).toBe(50);
      expect(result?.group.y()).toBe(50);
    });
  });

  describe("New Element Animation", () => {
    it("should have scale 0 for new elements", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        null,
        defaultColors,
        true,
      );

      const result = renderer.render();

      expect(result?.group.scaleX()).toBe(0);
      expect(result?.group.scaleY()).toBe(0);
    });

    it("should have scale 1 for existing elements", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();

      expect(result?.group.scaleX()).toBe(1);
      expect(result?.group.scaleY()).toBe(1);
    });
  });

  describe("Selection Styling", () => {
    it("should use selected color when element is selected", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        "a",
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();
      const pathShape = result?.group
        .getChildren()
        .find((child) => child instanceof Konva.Path) as Konva.Path;

      expect(pathShape?.stroke()).toBe(defaultColors.selected);
    });

    it("should use accent color when element is not selected", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        "b",
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();
      const pathShape = result?.group
        .getChildren()
        .find((child) => child instanceof Konva.Path) as Konva.Path;

      expect(pathShape?.stroke()).toBe(defaultColors.accent);
    });
  });

  describe("Recursive Indicator", () => {
    it("should add recursive indicator for recursive elements", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, true)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();
      const circles = result?.group
        .getChildren()
        .filter((child) => child instanceof Konva.Circle);
      const texts = result?.group
        .getChildren()
        .filter((child) => child instanceof Konva.Text);

      expect(circles?.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(
        texts?.some((t) => (t as Konva.Text).text().includes("↺")),
      ).toBeTruthy();
    });

    it("should not add recursive indicator for non-recursive elements", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();
      const texts = result?.group
        .getChildren()
        .filter((child) => child instanceof Konva.Text);

      expect(
        texts?.some((t) => (t as Konva.Text).text().includes("↺")),
      ).toBeFalsy();
    });
  });

  describe("Connecting Indicator", () => {
    it("should add connecting indicator when connecting from", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        "a",
        defaultColors,
        false,
      );

      const result = renderer.render();
      const circles = result?.group
        .getChildren()
        .filter((child) => child instanceof Konva.Circle);

      expect(circles?.length ?? 0).toBeGreaterThanOrEqual(1);
    });

    it("should not add connecting indicator when not connecting from", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        "b",
        defaultColors,
        false,
      );

      const result = renderer.render();
      const circles = result?.group
        .getChildren()
        .filter((child) => child instanceof Konva.Circle);

      expect(circles).toHaveLength(0);
    });
  });

  describe("Hover Callbacks", () => {
    it("should return callable hover callbacks", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();

      expect(() => {
        result?.onHoverIn();
        result?.onHoverOut();
      }).not.toThrow();
    });
  });

  describe("Missing Position Handling", () => {
    it("should return undefined when position not in viewState", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder().build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();

      expect(result).toBeUndefined();
    });
  });

  describe("Size and Scaling", () => {
    it("should scale SVG path based on element size", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 100, false)
        .build();

      const renderer = new ElementRenderer(
        element,
        "a",
        viewState,
        null,
        null,
        defaultColors,
        false,
      );

      const result = renderer.render();
      const pathShape = result?.group
        .getChildren()
        .find((child) => child instanceof Konva.Path) as Konva.Path;

      expect(pathShape?.scaleX()).toBeGreaterThan(0);
      expect(pathShape?.scaleY()).toBeGreaterThan(0);
    });
  });
});
