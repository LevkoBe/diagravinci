import { describe, it, expect } from "vitest";
import {
  navigateSelection,
  navigateAlternative,
  navigateParent,
  navigateChild,
  findParentId,
} from "../../application/navigate";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { Element } from "../../domain/models/Element";
import { createElement } from "../../domain/models/Element";
import type { Relationship } from "../../domain/models/Relationship";
import type { NavDirection } from "../../application/navigate";

function makeModel(
  rootChildren: string[],
  elDefs: Record<string, string[]>,
  relDefs: Array<[string, string]> = [],
): DiagramModel {
  const root = createElement("root", "object");
  root.childIds = rootChildren;
  const elements: Record<string, Element> = {};
  for (const [id, children] of Object.entries(elDefs)) {
    const el = createElement(id, "object");
    el.childIds = children;
    elements[id] = el;
  }
  const relationships: Record<string, Relationship> = {};
  for (const [s, t] of relDefs) {
    const id = `rel_${s}_${t}`;
    relationships[id] = { id, source: s, target: t, type: "-->" };
  }
  return {
    root,
    elements,
    relationships,
    metadata: { version: "1.0.0", created: "", modified: "" },
  };
}

describe("findParentId", () => {
  it("root child", () => {
    const m = makeModel(["a", "b"], { a: [], b: [] });
    expect(findParentId("a", m)).toBe(m.root.id);
  });
  it("nested child", () => {
    const m = makeModel(["a"], { a: ["b"], b: [] });
    expect(findParentId("b", m)).toBe("a");
  });
  it("unknown", () => {
    const m = makeModel(["a"], { a: [] });
    expect(findParentId("z", m)).toBeNull();
  });
});

describe("nav: `a(b c) d --> e d --> a.b`", () => {
  const m = makeModel(
    ["a", "d", "e"],
    { a: ["b", "c"], b: [], c: [], d: [], e: [] },
    [
      ["d", "e"],
      ["d", "a.b"],
    ],
  );
  const sel = (id: string, dir: NavDirection) =>
    navigateSelection([id], m, dir);
  const parent = (path: string) => navigateParent([path]);
  const child = (path: string, all = false) => navigateChild([path], m, all);
  const alt = (id: string, dir: "next" | "prev", origin: string | null) =>
    navigateAlternative([id], m, dir, origin);

  it("a  >", () => expect(sel("a", "forward")).toEqual([]));
  it("a  <", () => expect(sel("a", "backward")).toEqual([]));
  it("a  ^", () => expect(parent("a")).toEqual([]));
  it("a  v", () => expect(child("a")).toEqual(["a.b"]));
  it("a S>", () => expect(sel("a", "forward-all")).toEqual([]));
  it("a S<", () => expect(sel("a", "backward-all")).toEqual([]));
  it("a S^", () => expect(parent("a")).toEqual([]));
  it("a Sv", () => expect(child("a", true)).toEqual(["a.b", "a.c"]));
  it("a A>", () => expect(alt("a", "next", null)).toEqual(["d"]));
  it("a A<", () => expect(alt("a", "prev", null)).toEqual(["e"]));

  it("d  >", () => expect(sel("d", "forward")).toEqual(["e"]));
  it("d  <", () => expect(sel("d", "backward")).toEqual([]));
  it("d  ^", () => expect(parent("d")).toEqual([]));
  it("d  v", () => expect(child("d")).toEqual([]));
  it("d S>", () => expect(sel("d", "forward-all")).toEqual(["e", "a.b"]));
  it("d S<", () => expect(sel("d", "backward-all")).toEqual([]));
  it("d S^", () => expect(parent("d")).toEqual([]));
  it("d Sv", () => expect(child("d", true)).toEqual([]));
  it("d A>", () => expect(alt("d", "next", null)).toEqual(["e"]));
  it("d A<", () => expect(alt("d", "prev", null)).toEqual(["a"]));

  it("e  >", () => expect(sel("e", "forward")).toEqual([]));
  it("e  <", () => expect(sel("e", "backward")).toEqual(["d"]));
  it("e  ^", () => expect(parent("e")).toEqual([]));
  it("e  v", () => expect(child("e")).toEqual([]));
  it("e S>", () => expect(sel("e", "forward-all")).toEqual([]));
  it("e S<", () => expect(sel("e", "backward-all")).toEqual(["d"]));
  it("e S^", () => expect(parent("e")).toEqual([]));
  it("e Sv", () => expect(child("e", true)).toEqual([]));
  it("e A>", () => expect(alt("e", "next", null)).toEqual(["a"]));
  it("e A<", () => expect(alt("e", "prev", null)).toEqual(["d"]));

  it("a.b  >", () => expect(sel("a.b", "forward")).toEqual([]));
  it("a.b  <", () => expect(sel("a.b", "backward")).toEqual(["d"]));
  it("a.b  ^", () => expect(parent("a.b")).toEqual(["a"]));
  it("a.b  v", () => expect(child("a.b")).toEqual([]));
  it("a.b S>", () => expect(sel("a.b", "forward-all")).toEqual([]));
  it("a.b S<", () => expect(sel("a.b", "backward-all")).toEqual(["d"]));
  it("a.b S^", () => expect(parent("a.b")).toEqual(["a"]));
  it("a.b Sv", () => expect(child("a.b", true)).toEqual([]));
  it("a.b A>", () => expect(alt("a.b", "next", "d")).toEqual(["e"]));
  it("a.b A<", () => expect(alt("a.b", "prev", "d")).toEqual(["e"]));
  it("a.b A>", () => expect(alt("a.b", "next", null)).toEqual(["a.c"]));
  it("a.b A<", () => expect(alt("a.b", "prev", null)).toEqual(["a.c"]));
  it("a.b A>", () => expect(alt("a.b", "next", "a")).toEqual(["a.c"]));
  it("a.b A<", () => expect(alt("a.b", "prev", "a")).toEqual(["a.c"]));

  it("a.c  >", () => expect(sel("a.c", "forward")).toEqual([]));
  it("a.c  <", () => expect(sel("a.c", "backward")).toEqual([]));
  it("a.c  ^", () => expect(parent("a.c")).toEqual(["a"]));
  it("a.c  v", () => expect(child("a.c")).toEqual([]));
  it("a.c S>", () => expect(sel("a.c", "forward-all")).toEqual([]));
  it("a.c S<", () => expect(sel("a.c", "backward-all")).toEqual([]));
  it("a.c S^", () => expect(parent("a.c")).toEqual(["a"]));
  it("a.c Sv", () => expect(child("a.c", true)).toEqual([]));
  it("a.c A>", () => expect(alt("a.c", "next", null)).toEqual(["a.b"]));
  it("a.c A<", () => expect(alt("a.c", "prev", null)).toEqual(["a.b"]));
  it("a.c A>", () => expect(alt("a.c", "next", "a")).toEqual(["a.b"]));
  it("a.c A<", () => expect(alt("a.c", "prev", "a")).toEqual(["a.b"]));
});
