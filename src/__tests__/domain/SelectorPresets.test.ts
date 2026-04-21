import { describe, it, expect } from "vitest";
import {
  namePreset,
  levelPreset,
} from "../../domain/selector/SelectorPresets";

describe("namePreset", () => {
  it("returns .* for empty name", () => {
    expect(namePreset("")).toBe(".*");
  });

  it("matches a plain name at path end", () => {
    const pat = namePreset("foo");
    expect(new RegExp(pat).test("foo")).toBe(true);
    expect(new RegExp(pat).test("bar.foo")).toBe(true);
    expect(new RegExp(pat).test("foobar")).toBe(true);
  });

  it("does not match across path segments", () => {
    const pat = namePreset("foo");
    expect(new RegExp(pat).test("foo.child")).toBe(false);
  });

  it("escapes regex special characters in name", () => {
    const pat = namePreset("a.b");

    expect(new RegExp(pat).test("axb")).toBe(false);
    expect(new RegExp(pat).test("a.b")).toBe(true);
  });
});

describe("levelPreset", () => {
  it("level 1,1 matches root elements (no dots)", () => {
    const pat = levelPreset(1, 1);
    expect(new RegExp(pat).test("a")).toBe(true);
    expect(new RegExp(pat).test("a.b")).toBe(false);
  });

  it("level 2,2 matches one-dot paths", () => {
    const pat = levelPreset(2, 2);
    expect(new RegExp(pat).test("a.b")).toBe(true);
    expect(new RegExp(pat).test("a")).toBe(false);
    expect(new RegExp(pat).test("a.b.c")).toBe(false);
  });

  it("level range 1,2 matches root and one-dot paths", () => {
    const pat = levelPreset(1, 2);
    expect(new RegExp(pat).test("a")).toBe(true);
    expect(new RegExp(pat).test("a.b")).toBe(true);
    expect(new RegExp(pat).test("a.b.c")).toBe(false);
  });

  it("handles lo === hi case", () => {
    const pat = levelPreset(3, 3);
    expect(new RegExp(pat).test("a.b.c")).toBe(true);
    expect(new RegExp(pat).test("a.b")).toBe(false);
  });

  it("clamps min to 0", () => {
    const pat = levelPreset(0, 1);
    expect(new RegExp(pat).test("a")).toBe(true);
  });
});

