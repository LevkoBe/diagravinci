import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Konva from "konva";
import type { Node } from "konva/lib/Node";
import type { Shape } from "konva/lib/Shape";
import type { Stage } from "konva/lib/Stage";

import { KonvaTestHelper } from "../utils";
import {
  type ElementEventCallbacks,
  ElementEventHandler,
} from "../../presentation/components/rendering/elements/ElementEventHandler";

describe("ElementEventHandler", () => {
  let helper: KonvaTestHelper;

  beforeEach(() => {
    helper = new KonvaTestHelper();
    helper.createStage();
  });

  afterEach(() => {
    helper.cleanup();
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
        target: null as unknown as Shape | Stage,
        currentTarget: null as unknown as Node,
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
        target: null as unknown as Shape | Stage,
        currentTarget: null as unknown as Node,
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
        target: null as unknown as Shape | Stage,
        currentTarget: null as unknown as Node,
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
        target: null as unknown as Shape | Stage,
        currentTarget: null as unknown as Node,
        cancelBubble: false,
        pointerId: 0,
      };

      handlers.onMouseLeave?.(mouseLeaveEvent);
      expect(setHovered).toHaveBeenCalledWith(null);
    });
  });

  describe("Drag End Handling", () => {
    it("calls onReparent when element is dropped on a different parent", () => {
      const onReparent = vi.fn();
      const callbacks: ElementEventCallbacks = {
        onClick: vi.fn(),
        onPositionChange: vi.fn(),
        onReparent,
        setHovered: vi.fn(),
        findHoveredPath: vi.fn().mockReturnValue(null),
        findNewParentPath: vi.fn().mockReturnValue("new-parent"),
        updateRelationshipLines: vi.fn(),
        updateChildRelationshipLines: vi.fn(),
        updateChildPositions: vi.fn(),
        getRootId: vi.fn().mockReturnValue("root"),
      };

      // path = "old-parent.child" → oldParentPath = "old-parent"
      // findNewParentPath returns "new-parent" → reparent is triggered
      const handler = new ElementEventHandler(
        { id: "child", path: "old-parent.child" },
        "old-parent.child",
        helper.getStage(),
        callbacks,
      );
      const handlers = handler.createHandlers();

      const group = new Konva.Group();
      handlers.onDragEnd({
        cancelBubble: false,
        evt: {} as DragEvent,
        target: group,
        type: "dragend",
        currentTarget: group,
        pointerId: 0,
      } as Konva.KonvaEventObject<DragEvent>);

      expect(onReparent).toHaveBeenCalledWith("child", "old-parent", "new-parent");
    });

    it("does not call onReparent when parent is unchanged", () => {
      const onReparent = vi.fn();
      const callbacks: ElementEventCallbacks = {
        onClick: vi.fn(),
        onPositionChange: vi.fn(),
        onReparent,
        setHovered: vi.fn(),
        findHoveredPath: vi.fn().mockReturnValue(null),
        findNewParentPath: vi.fn().mockReturnValue("parent"),
        updateRelationshipLines: vi.fn(),
        updateChildRelationshipLines: vi.fn(),
        updateChildPositions: vi.fn(),
        getRootId: vi.fn().mockReturnValue("root"),
      };

      const handler = new ElementEventHandler(
        { id: "child", path: "parent.child" },
        "parent.child",
        helper.getStage(),
        callbacks,
      );
      const handlers = handler.createHandlers();

      const group = new Konva.Group();
      handlers.onDragEnd({
        cancelBubble: false,
        evt: {} as DragEvent,
        target: group,
        type: "dragend",
        currentTarget: group,
        pointerId: 0,
      } as Konva.KonvaEventObject<DragEvent>);

      expect(onReparent).not.toHaveBeenCalled();
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
        target: null as unknown as Shape | Stage,
        currentTarget: null as unknown as Node,
        cancelBubble: false,
        pointerId: 0,
      };

      handlers.onMouseEnter?.(mouseEnterEvent);
      expect(setHovered).toHaveBeenCalledWith("root.nested.a");
    });
  });
});
