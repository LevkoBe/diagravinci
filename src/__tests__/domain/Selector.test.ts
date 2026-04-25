import { describe, it, expect } from "vitest";
import { toSelectorId, FOLD_SELECTOR_ID, SELECTION_SELECTOR_ID } from "../../domain/models/Selector";

describe("toSelectorId", () => {
  it("converts a plain label to lowercase slug", () => {
    expect(toSelectorId("MyLabel")).toBe("mylabel");
  });

  it("replaces spaces and special characters with underscores", () => {
    expect(toSelectorId("My Label!")).toBe("my_label");
  });

  it("trims leading and trailing underscores", () => {
    expect(toSelectorId("  !foo!  ")).toBe("foo");
  });

  it("collapses consecutive special characters into one underscore", () => {
    expect(toSelectorId("a--b__c")).toBe("a_b_c");
  });

  it("returns 'selector' for a blank string", () => {
    expect(toSelectorId("")).toBe("selector");
  });

  it("returns 'selector' for a string of only special characters", () => {
    expect(toSelectorId("!@#$%")).toBe("selector");
  });

  it("preserves digits in the slug", () => {
    expect(toSelectorId("Rule 42")).toBe("rule_42");
  });

  it("handles already-valid slug without change", () => {
    expect(toSelectorId("my_rule")).toBe("my_rule");
  });
});

describe("selector constants", () => {
  it("FOLD_SELECTOR_ID is a non-empty string", () => {
    expect(typeof FOLD_SELECTOR_ID).toBe("string");
    expect(FOLD_SELECTOR_ID.length).toBeGreaterThan(0);
  });

  it("SELECTION_SELECTOR_ID is a non-empty string", () => {
    expect(typeof SELECTION_SELECTOR_ID).toBe("string");
    expect(SELECTION_SELECTOR_ID.length).toBeGreaterThan(0);
  });

  it("FOLD_SELECTOR_ID and SELECTION_SELECTOR_ID are distinct", () => {
    expect(FOLD_SELECTOR_ID).not.toBe(SELECTION_SELECTOR_ID);
  });
});
