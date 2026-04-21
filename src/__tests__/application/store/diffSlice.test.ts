import { describe, it, expect } from "vitest";
import reducer, {
  setDiff,
  acceptDiffId,
  clearAllAdded,
  clearAllRemoved,
  clearDiff,
} from "../../../application/store/diffSlice";

const initialState = { active: false, addedIds: [], removedIds: [] };

describe("setDiff", () => {
  it("activates diff and sets added and removed ids", () => {
    const s = reducer(initialState, setDiff({ addedIds: ["a", "b"], removedIds: ["c"] }));
    expect(s.active).toBe(true);
    expect(s.addedIds).toEqual(["a", "b"]);
    expect(s.removedIds).toEqual(["c"]);
  });

  it("replaces previously set diff on subsequent call", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["x"], removedIds: [] }));
    s = reducer(s, setDiff({ addedIds: ["y"], removedIds: ["z"] }));
    expect(s.addedIds).toEqual(["y"]);
    expect(s.removedIds).toEqual(["z"]);
  });
});

describe("acceptDiffId", () => {
  it("removes accepted id from addedIds", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["a", "b"], removedIds: [] }));
    s = reducer(s, acceptDiffId("a"));
    expect(s.addedIds).toEqual(["b"]);
    expect(s.active).toBe(true);
  });

  it("removes accepted id from removedIds", () => {
    let s = reducer(initialState, setDiff({ addedIds: [], removedIds: ["x", "y"] }));
    s = reducer(s, acceptDiffId("x"));
    expect(s.removedIds).toEqual(["y"]);
  });

  it("sets active=false when both lists become empty after accept", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["a"], removedIds: [] }));
    s = reducer(s, acceptDiffId("a"));
    expect(s.active).toBe(false);
  });

  it("keeps active=true when one list still has items after accept", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["a"], removedIds: ["b"] }));
    s = reducer(s, acceptDiffId("a"));
    expect(s.active).toBe(true);
  });

  it("does nothing when id not present in either list", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["a"], removedIds: ["b"] }));
    s = reducer(s, acceptDiffId("z"));
    expect(s.addedIds).toEqual(["a"]);
    expect(s.removedIds).toEqual(["b"]);
  });
});

describe("clearAllAdded", () => {
  it("clears addedIds", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["a", "b"], removedIds: ["c"] }));
    s = reducer(s, clearAllAdded());
    expect(s.addedIds).toEqual([]);
  });

  it("keeps active=true when removedIds still has items", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["a"], removedIds: ["b"] }));
    s = reducer(s, clearAllAdded());
    expect(s.active).toBe(true);
  });

  it("sets active=false when removedIds is also empty", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["a"], removedIds: [] }));
    s = reducer(s, clearAllAdded());
    expect(s.active).toBe(false);
  });
});

describe("clearAllRemoved", () => {
  it("clears removedIds", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["a"], removedIds: ["b", "c"] }));
    s = reducer(s, clearAllRemoved());
    expect(s.removedIds).toEqual([]);
  });

  it("keeps active=true when addedIds still has items", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["a"], removedIds: ["b"] }));
    s = reducer(s, clearAllRemoved());
    expect(s.active).toBe(true);
  });

  it("sets active=false when addedIds is also empty", () => {
    let s = reducer(initialState, setDiff({ addedIds: [], removedIds: ["b"] }));
    s = reducer(s, clearAllRemoved());
    expect(s.active).toBe(false);
  });
});

describe("clearDiff", () => {
  it("resets all fields to initial values", () => {
    let s = reducer(initialState, setDiff({ addedIds: ["a"], removedIds: ["b"] }));
    s = reducer(s, clearDiff());
    expect(s).toEqual(initialState);
  });
});
