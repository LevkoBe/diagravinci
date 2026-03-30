import { describe, it, expect } from "vitest";
import reducer, {
  setInteractionMode,
  setActiveElementType,
  setActiveRelationshipType,
  setConnectingFromId,
  setSelectedElement,
  sendZoomCommand,
  setRenderStyle,
} from "../../../application/store/uiSlice";

describe("uiSlice", () => {
  it("has correct initial state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.interactionMode).toBe("select");
    expect(state.activeElementType).toBe("object");
    expect(state.activeRelationshipType).toBe("-->");
    expect(state.connectingFromId).toBeNull();
    expect(state.selectedElementId).toBeNull();
    expect(state.zoomCommand).toBeNull();
    expect(state.renderStyle).toBe("svg");
  });

  describe("setInteractionMode", () => {
    it("sets interaction mode and clears connectingFromId", () => {
      const s1 = reducer(undefined, setConnectingFromId("x"));
      const s2 = reducer(s1, setInteractionMode("create"));
      expect(s2.interactionMode).toBe("create");
      expect(s2.connectingFromId).toBeNull();
    });
  });

  describe("setActiveElementType", () => {
    it("sets element type and switches to create mode", () => {
      const state = reducer(undefined, setActiveElementType("state"));
      expect(state.activeElementType).toBe("state");
      expect(state.interactionMode).toBe("create");
    });
  });

  describe("setActiveRelationshipType", () => {
    it("sets relationship type, switches to connect mode, and clears connectingFromId", () => {
      const s1 = reducer(undefined, setConnectingFromId("a"));
      const s2 = reducer(s1, setActiveRelationshipType("--|>"));
      expect(s2.activeRelationshipType).toBe("--|>");
      expect(s2.interactionMode).toBe("connect");
      expect(s2.connectingFromId).toBeNull();
    });
  });

  describe("setConnectingFromId", () => {
    it("sets connectingFromId", () => {
      const state = reducer(undefined, setConnectingFromId("node-1"));
      expect(state.connectingFromId).toBe("node-1");
    });

    it("can clear connectingFromId to null", () => {
      const s1 = reducer(undefined, setConnectingFromId("node-1"));
      const s2 = reducer(s1, setConnectingFromId(null));
      expect(s2.connectingFromId).toBeNull();
    });
  });

  describe("setSelectedElement", () => {
    it("sets selectedElementId", () => {
      const state = reducer(undefined, setSelectedElement("el-42"));
      expect(state.selectedElementId).toBe("el-42");
    });

    it("can deselect by passing null", () => {
      const s1 = reducer(undefined, setSelectedElement("el-42"));
      const s2 = reducer(s1, setSelectedElement(null));
      expect(s2.selectedElementId).toBeNull();
    });
  });

  describe("sendZoomCommand", () => {
    it("sets zoom command with type and timestamp", () => {
      const before = Date.now();
      const state = reducer(undefined, sendZoomCommand("in"));
      const after = Date.now();
      expect(state.zoomCommand).not.toBeNull();
      expect(state.zoomCommand!.type).toBe("in");
      expect(state.zoomCommand!.ts).toBeGreaterThanOrEqual(before);
      expect(state.zoomCommand!.ts).toBeLessThanOrEqual(after);
    });

    it("each sendZoomCommand produces a new timestamp", async () => {
      const s1 = reducer(undefined, sendZoomCommand("in"));
      await new Promise((r) => setTimeout(r, 5));
      const s2 = reducer(s1, sendZoomCommand("out"));
      expect(s2.zoomCommand!.ts).toBeGreaterThan(s1.zoomCommand!.ts);
    });
  });

  describe("setRenderStyle", () => {
    it("sets render style to rect", () => {
      const state = reducer(undefined, setRenderStyle("rect"));
      expect(state.renderStyle).toBe("rect");
    });

    it("sets render style to polygon", () => {
      const state = reducer(undefined, setRenderStyle("polygon"));
      expect(state.renderStyle).toBe("polygon");
    });
  });
});
