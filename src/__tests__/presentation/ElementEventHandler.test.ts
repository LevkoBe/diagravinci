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
