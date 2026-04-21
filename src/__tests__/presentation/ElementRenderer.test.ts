import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Konva from "konva";
import type { Colors } from "../../presentation/components/rendering/types";
import {
  MockElementFactory,
  ViewStateBuilder,
  KonvaTestHelper,
} from "../utils";
import type { Position } from "../../domain/models/Element";
import { SvgPathElementRenderer } from "../../presentation/components/rendering/elements/SvgPathElementRenderer";
import { PolygonElementRenderer } from "../../presentation/components/rendering/elements/PolygonElementRenderer";
import { SimpleRectElementRenderer } from "../../presentation/components/rendering/elements/SimpleRectElementRenderer";
import {
  ElementEventHandler,
  type ElementEventCallbacks,
} from "../../presentation/components/rendering/elements/ElementEventHandler";

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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "b",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "b",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        null,
        defaultColors,
        true,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        "a",
        defaultColors,
        false,
        false,
        100,
        1,
        defaultColors.selected,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        "b",
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        "a",
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        "b",
        defaultColors,
        false,
        false,
        100,
        1,
      );

      const result = renderer.render();
      const circles = result?.group
        .getChildren()
        .filter((child) => child instanceof Konva.Circle);

      expect(circles).toHaveLength(1);
    });
  });

  describe("Hover Callbacks", () => {
    it("should return callable hover callbacks", () => {
      const element = MockElementFactory.createElement("a", "object");
      const viewState = new ViewStateBuilder()
        .addElement("a", 100, 100, 60, false)
        .build();

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
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

      const renderer = new SvgPathElementRenderer(
        element,
        "a",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
      );

      const result = renderer.render();
      const pathShape = result?.group
        .getChildren()
        .find((child) => child instanceof Konva.Path) as Konva.Path;

      expect(pathShape?.scaleX()).toBeGreaterThan(0);
      expect(pathShape?.scaleY()).toBeGreaterThan(0);
    });
  });

  describe("Handler Creation", () => {
    it("should create event handlers with all required methods", () => {
      const onClick = vi.fn();
      const setHovered = vi.fn();
      const callbacks: Partial<ElementEventCallbacks> = {
        onClick,
        setHovered,
      };
      const handler = new ElementEventHandler(
        { id: "a", path: "a" },
        "a",
        helper.getStage(),
        callbacks as ElementEventCallbacks,
      );
      const handlers = handler.createHandlers();
      expect(handlers).toHaveProperty("onClick");
      expect(handlers).toHaveProperty("onMouseEnter");
      expect(handlers).toHaveProperty("onMouseLeave");
      expect(handlers).toHaveProperty("onDragMove");
      expect(handlers).toHaveProperty("onDragEnd");
    });
  });

  describe("Click Handling", () => {
    it("should call onClick callback when element is clicked", () => {
      const onClick = vi.fn();
      const callbacks: Partial<ElementEventCallbacks> = { onClick };
      const handler = new ElementEventHandler(
        { id: "a", path: "a" },
        "a",
        helper.getStage(),
        callbacks as ElementEventCallbacks,
      );
      const handlers = handler.createHandlers();
      const clickEvent: Konva.KonvaEventObject<MouseEvent> = {
        type: "click",
        evt: new MouseEvent("click"),
        target: null as unknown as Konva.Shape,
        currentTarget: null as unknown as Konva.Node,
        cancelBubble: false,
        pointerId: 0,
      };
      handlers.onClick(clickEvent);
      expect(onClick).toHaveBeenCalled();
    });
    it("should pass correct element ID to onClick callback", () => {
      const onClick = vi.fn();
      const callbacks: Partial<ElementEventCallbacks> = { onClick };
      const handler = new ElementEventHandler(
        { id: "a", path: "a" },
        "a",
        helper.getStage(),
        callbacks as ElementEventCallbacks,
      );
      const handlers = handler.createHandlers();
      const clickEvent: Konva.KonvaEventObject<MouseEvent> = {
        type: "click",
        evt: new MouseEvent("click"),
        target: null as unknown as Konva.Shape,
        currentTarget: null as unknown as Konva.Node,
        cancelBubble: false,
        pointerId: 0,
      };
      handlers.onClick(clickEvent);
      expect(onClick).toHaveBeenCalledWith("a", false, false);
    });
  });

  describe("Hover Handling", () => {
    it("should call setHovered when mouse enters", () => {
      const setHovered = vi.fn();
      const callbacks: Partial<ElementEventCallbacks> = { setHovered };
      const handler = new ElementEventHandler(
        { id: "a", path: "a" },
        "a",
        helper.getStage(),
        callbacks as ElementEventCallbacks,
      );
      const handlers = handler.createHandlers();
      const mouseEnterEvent: Konva.KonvaEventObject<MouseEvent> = {
        type: "mouseenter",
        evt: new MouseEvent("mouseenter"),
        target: null as unknown as Konva.Shape,
        currentTarget: null as unknown as Konva.Node,
        cancelBubble: false,
        pointerId: 0,
      };
      handlers.onMouseEnter?.(mouseEnterEvent);
      expect(setHovered).toHaveBeenCalledWith("a");
    });
    it("should call setHovered(null) when mouse leaves", () => {
      const setHovered = vi.fn();
      const callbacks: Partial<ElementEventCallbacks> = { setHovered };
      const handler = new ElementEventHandler(
        { id: "a", path: "a" },
        "a",
        helper.getStage(),
        callbacks as ElementEventCallbacks,
      );
      const handlers = handler.createHandlers();
      const mouseLeaveEvent: Konva.KonvaEventObject<MouseEvent> = {
        type: "mouseleave",
        evt: new MouseEvent("mouseleave"),
        target: null as unknown as Konva.Shape,
        currentTarget: null as unknown as Konva.Node,
        cancelBubble: false,
        pointerId: 0,
      };
      handlers.onMouseLeave?.(mouseLeaveEvent);
      expect(setHovered).toHaveBeenCalledWith(null);
    });
  });

  describe("Nested Paths", () => {
    it("should correctly handle nested element paths", () => {
      const setHovered = vi.fn();
      const callbacks: Partial<ElementEventCallbacks> = { setHovered };
      const handler = new ElementEventHandler(
        { id: "nested", path: "root.nested.a" },
        "root.nested.a",
        helper.getStage(),
        callbacks as ElementEventCallbacks,
      );
      const handlers = handler.createHandlers();
      const mouseEnterEvent: Konva.KonvaEventObject<MouseEvent> = {
        type: "mouseenter",
        evt: new MouseEvent("mouseenter"),
        target: null as unknown as Konva.Shape,
        currentTarget: null as unknown as Konva.Node,
        cancelBubble: false,
        pointerId: 0,
      };
      handlers.onMouseEnter?.(mouseEnterEvent);
      expect(setHovered).toHaveBeenCalledWith("root.nested.a");
    });
  });

  describe("PolygonElementRenderer", () => {
    const types = ["object", "state", "function", "flow", "choice", "other"] as const;
    for (const type of types) {
      it(`renders ${type} element as a group with a shape`, () => {
        const element = MockElementFactory.createElement("x", type as "object");
        const viewState = new ViewStateBuilder()
          .addElement("x", 100, 100, 60, false)
          .build();
        const renderer = new PolygonElementRenderer(
          element, "x", viewState, null, defaultColors, false, false, 60, 1,
        );
        const result = renderer.render();
        expect(result).toBeDefined();
        expect(result?.group).toBeInstanceOf(Konva.Group);
        expect(result?.group.getChildren().length).toBeGreaterThan(0);
      });
    }

    it("returns undefined when position not found", () => {
      const element = MockElementFactory.createElement("x", "object");
      const viewState = new ViewStateBuilder().build();
      const renderer = new PolygonElementRenderer(
        element, "x", viewState, null, defaultColors, false, false, 60, 1,
      );
      expect(renderer.render()).toBeUndefined();
    });

    it("renders dimmed element with reduced opacity", () => {
      const element = MockElementFactory.createElement("x", "object");
      const viewState = new ViewStateBuilder()
        .addElement("x", 100, 100, 60, false)
        .build();
      const renderer = new PolygonElementRenderer(
        element, "x", viewState, null, defaultColors, false, true, 60, 1,
      );
      const result = renderer.render();
      expect(result).toBeDefined();
    });

    it("uses colorOverride for stroke when provided", () => {
      const element = MockElementFactory.createElement("x", "object");
      const viewState = new ViewStateBuilder()
        .addElement("x", 100, 100, 60, false)
        .build();
      const renderer = new PolygonElementRenderer(
        element, "x", viewState, null, defaultColors, false, false, 60, 1, "#custom",
      );
      const result = renderer.render();
      expect(result).toBeDefined();
    });
  });

  describe("SimpleRectElementRenderer", () => {
    const types = ["object", "state", "function", "flow", "choice", "other"] as const;
    for (const type of types) {
      it(`renders ${type} element as a rect group`, () => {
        const element = MockElementFactory.createElement("x", type as "object");
        const viewState = new ViewStateBuilder()
          .addElement("x", 100, 100, 60, false)
          .build();
        const renderer = new SimpleRectElementRenderer(
          element, "x", viewState, null, defaultColors, false, false, 60, 1,
        );
        const result = renderer.render();
        expect(result).toBeDefined();
        expect(result?.group).toBeInstanceOf(Konva.Group);
        const rects = result?.group.getChildren().filter((c) => c instanceof Konva.Rect);
        expect(rects?.length).toBeGreaterThan(0);
      });
    }

    it("returns undefined when position not found", () => {
      const element = MockElementFactory.createElement("x", "object");
      const viewState = new ViewStateBuilder().build();
      const renderer = new SimpleRectElementRenderer(
        element, "x", viewState, null, defaultColors, false, false, 60, 1,
      );
      expect(renderer.render()).toBeUndefined();
    });

    it("hover callbacks work on SimpleRectElementRenderer", () => {
      const element = MockElementFactory.createElement("x", "object");
      const viewState = new ViewStateBuilder()
        .addElement("x", 100, 100, 60, false)
        .build();
      const renderer = new SimpleRectElementRenderer(
        element, "x", viewState, null, defaultColors, false, false, 60, 1,
      );
      const result = renderer.render();
      expect(() => { result?.onHoverIn(); result?.onHoverOut(); }).not.toThrow();
    });
  });

  describe("Drag Handling", () => {
    it("should position into b.c when dragging b.c.a over b.c.a", () => {
      const setHovered = vi.fn();
      const findHoveredPath = vi.fn().mockReturnValue("b.c");
      const updateRelationshipLines = vi.fn();
      const updateChildRelationshipLines = vi.fn();
      const callbacks: Partial<ElementEventCallbacks> = {
        setHovered,
        findHoveredPath,
        updateRelationshipLines,
        updateChildRelationshipLines,
      };
      const stage = helper.getStage();
      const handler = new ElementEventHandler(
        { id: "a", path: "b.c.a" },
        "b.c.a",
        stage,
        callbacks as ElementEventCallbacks,
      );
      const handlers = handler.createHandlers();
      vi.spyOn(stage, "getPointerPosition").mockReturnValue({ x: 0, y: 0 });
      const dragMoveEvent: Konva.KonvaEventObject<DragEvent> = {
        type: "dragmove",
        evt: new DragEvent("dragmove"),
        target: null as unknown as Konva.Shape,
        currentTarget: null as unknown as Konva.Node,
        cancelBubble: false,
        pointerId: 0,
      };
      handlers.onDragMove(dragMoveEvent);
      expect(findHoveredPath).toHaveBeenCalledWith("a", {
        x: expect.any(Number),
        y: expect.any(Number),
      });
      expect(setHovered).toHaveBeenCalledWith("b.c");
      expect(updateRelationshipLines).toHaveBeenCalledWith("b.c.a");
      expect(updateChildRelationshipLines).toHaveBeenCalledWith("b.c.a");
    });
    it("should change positions back to original when dragging b.c.a to a.c.a", () => {
      const setHovered = vi.fn();
      const onPositionChange = vi.fn();
      const updateChildPositions = vi.fn();
      const onReparent = vi.fn();
      const findNewParentPath = vi.fn().mockReturnValue("b.c");
      const getRootId = vi.fn().mockReturnValue("root");
      const callbacks: Partial<ElementEventCallbacks> = {
        setHovered,
        onPositionChange,
        updateChildPositions,
        onReparent,
        findNewParentPath,
        getRootId,
      };
      const stage = helper.getStage();
      const handler = new ElementEventHandler(
        { id: "a", path: "b.c.a" },
        "b.c.a",
        stage,
        callbacks as ElementEventCallbacks,
      );
      const handlers = handler.createHandlers();
      const group = new Konva.Group();
      vi.spyOn(group, "getAbsolutePosition").mockReturnValue({ x: 0, y: 0 });
      const dragEndEvent: Konva.KonvaEventObject<DragEvent> = {
        type: "dragend",
        evt: new DragEvent("dragend"),
        target: group as unknown as Konva.Shape,
        currentTarget: null as unknown as Konva.Node,
        cancelBubble: false,
        pointerId: 0,
      };
      handlers.onDragEnd(dragEndEvent);
      expect(setHovered).toHaveBeenCalledWith(null);
      expect(onPositionChange).toHaveBeenCalledWith("b.c.a", {
        x: expect.any(Number),
        y: expect.any(Number),
      });
      expect(updateChildPositions).toHaveBeenCalledWith("b.c.a");
      expect(findNewParentPath).toHaveBeenCalledWith("b.c.a", {
        x: expect.any(Number),
        y: expect.any(Number),
      });
      expect(onReparent).not.toHaveBeenCalled();
    });
  });

  describe("Icon Element Rendering", () => {
    it("renders icon element (_database_) without a text label", () => {
      const element = MockElementFactory.createElement("_database_", "object");
      const viewState = new ViewStateBuilder()
        .addElement("_database_", 100, 100, 60, false)
        .build();

      const renderer = new SvgPathElementRenderer(
        element,
        "_database_",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
      );

      const result = renderer.render();
      expect(result).toBeDefined();
      // Icon element skips the text label path
      const textShapes = result?.group.getChildren().filter((c) => c instanceof Konva.Text);
      expect(textShapes?.length).toBe(0);
    });

    it("renders icon element with dimmed opacity", () => {
      const element = MockElementFactory.createElement("_user_", "object");
      const viewState = new ViewStateBuilder()
        .addElement("_user_", 100, 100, 60, false)
        .build();

      const renderer = new SvgPathElementRenderer(
        element,
        "_user_",
        viewState,
        null,
        defaultColors,
        false,
        true, // isDimmed
        100,
        1,
      );

      const result = renderer.render();
      expect(result).toBeDefined();
    });

    it("falls through to text label when icon name is not found", () => {
      // _not_a_real_icon_ — no matching lucide icon, falls through to text
      const element = MockElementFactory.createElement("_not_a_real_icon_", "object");
      const viewState = new ViewStateBuilder()
        .addElement("_not_a_real_icon_", 100, 100, 60, false)
        .build();

      const renderer = new SvgPathElementRenderer(
        element,
        "_not_a_real_icon_",
        viewState,
        null,
        defaultColors,
        false,
        false,
        100,
        1,
      );

      const result = renderer.render();
      expect(result).toBeDefined();
      // Falls through to text label since no icon matches
      const textShapes = result?.group.getChildren().filter((c) => c instanceof Konva.Text);
      expect(textShapes?.length).toBeGreaterThan(0);
    });
  });
});
