import { describe, it, expect } from "vitest";
import {
  shouldUseClassDiagramMode,
  computeClassDiagramContent,
  computeTextModeSuppressedPaths,
} from "../../presentation/components/rendering/elements/classDiagramUtils";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import { createElement } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import type { ViewState } from "../../domain/models/ViewState";
import { ViewStateBuilder } from "../utils";

function makeModel(
  elements: Array<{
    id: string;
    type?: Parameters<typeof createElement>[1];
    children?: string[];
  }>,
  rootChildren: string[],
): DiagramModel {
  const model = createEmptyDiagram();
  for (const { id, type = "object", children = [] } of elements) {
    const el = createElement(id, type);
    el.childIds = children;
    model.elements[id] = el;
  }
  model.root.childIds = rootChildren;
  return model;
}

function makeVS(paths: string[]): ViewState {
  const builder = new ViewStateBuilder();
  paths.forEach((p, i) =>
    builder.addElement(p, 100 + i * 20, 100 + i * 20, 60),
  );
  return builder.build();
}

describe("shouldUseClassDiagramMode", () => {
  const hidden = new Set<string>();

  describe("basic object nesting a{b{c}}", () => {
    const model = makeModel(
      [{ id: "a", children: ["b"] }, { id: "b", children: ["c"] }, { id: "c" }],
      ["a"],
    );
    const vs = makeVS(["a", "a.b", "a.b.c"]);

    it("a has visible grandchild c → does NOT use text mode", () => {
      expect(
        shouldUseClassDiagramMode(model.elements["a"]!, "a", vs, hidden, model),
      ).toBe(false);
    });

    it("b has leaf child c → uses text mode", () => {
      expect(
        shouldUseClassDiagramMode(
          model.elements["b"]!,
          "a.b",
          vs,
          hidden,
          model,
        ),
      ).toBe(true);
    });

    it("leaf c → does NOT use text mode (no children)", () => {
      expect(
        shouldUseClassDiagramMode(
          model.elements["c"]!,
          "a.b.c",
          vs,
          hidden,
          model,
        ),
      ).toBe(false);
    });
  });

  describe("collection nesting d[e[f[g]]]", () => {
    const model = makeModel(
      [
        { id: "d", type: "collection", children: ["e"] },
        { id: "e", type: "collection", children: ["f"] },
        { id: "f", type: "collection", children: ["g"] },
        { id: "g" },
      ],
      ["d"],
    );
    const vs = makeVS(["d", "d.e", "d.e.f", "d.e.f.g"]);

    it("d has grandchild f in positions → does NOT use text mode", () => {
      expect(
        shouldUseClassDiagramMode(model.elements["d"]!, "d", vs, hidden, model),
      ).toBe(false);
    });

    it("e has grandchild g in positions → does NOT use text mode", () => {
      expect(
        shouldUseClassDiagramMode(
          model.elements["e"]!,
          "d.e",
          vs,
          hidden,
          model,
        ),
      ).toBe(false);
    });

    it("f has leaf child g → uses text mode", () => {
      expect(
        shouldUseClassDiagramMode(
          model.elements["f"]!,
          "d.e.f",
          vs,
          hidden,
          model,
        ),
      ).toBe(true);
    });
  });

  describe("function nesting h(i(j(k)))", () => {
    const model = makeModel(
      [
        { id: "h", type: "function", children: ["i"] },
        { id: "i", type: "function", children: ["j"] },
        { id: "j", type: "function", children: ["k"] },
        { id: "k", type: "function" },
      ],
      ["h"],
    );
    const vs = makeVS(["h", "h.i", "h.i.j", "h.i.j.k"]);

    it("h has grandchild j → does NOT use text mode", () => {
      expect(
        shouldUseClassDiagramMode(model.elements["h"]!, "h", vs, hidden, model),
      ).toBe(false);
    });

    it("i has grandchild k → does NOT use text mode", () => {
      expect(
        shouldUseClassDiagramMode(
          model.elements["i"]!,
          "h.i",
          vs,
          hidden,
          model,
        ),
      ).toBe(false);
    });

    it("j has leaf child k → uses text mode", () => {
      expect(
        shouldUseClassDiagramMode(
          model.elements["j"]!,
          "h.i.j",
          vs,
          hidden,
          model,
        ),
      ).toBe(true);
    });
  });

  describe("choice nesting l<m<n>>", () => {
    const model = makeModel(
      [
        { id: "l", type: "choice", children: ["m"] },
        { id: "m", type: "choice", children: ["n"] },
        { id: "n", type: "choice" },
      ],
      ["l"],
    );
    const vs = makeVS(["l", "l.m", "l.m.n"]);

    it("l has grandchild n → does NOT use text mode", () => {
      expect(
        shouldUseClassDiagramMode(model.elements["l"]!, "l", vs, hidden, model),
      ).toBe(false);
    });

    it("m has leaf child n → uses text mode", () => {
      expect(
        shouldUseClassDiagramMode(
          model.elements["m"]!,
          "l.m",
          vs,
          hidden,
          model,
        ),
      ).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("element with no children → false", () => {
      const model = makeModel([{ id: "x" }], ["x"]);
      const vs = makeVS(["x"]);
      expect(
        shouldUseClassDiagramMode(model.elements["x"]!, "x", vs, hidden, model),
      ).toBe(false);
    });

    it("child explicitly hidden → treated as absent, uses text mode", () => {
      const model = makeModel(
        [
          { id: "p", children: ["q"] },
          { id: "q", children: ["r"] },
          { id: "r" },
        ],
        ["p"],
      );
      const vs = makeVS(["p", "p.q", "p.q.r"]);
      const hiddenQ = new Set(["p.q"]);

      expect(
        shouldUseClassDiagramMode(
          model.elements["p"]!,
          "p",
          vs,
          hiddenQ,
          model,
        ),
      ).toBe(true);
    });

    it("child folded → its grandchildren don't block text mode", () => {
      const model = makeModel(
        [
          { id: "p", children: ["q"] },
          { id: "q", children: ["r"] },
          { id: "r" },
        ],
        ["p"],
      );
      const vs: ViewState = {
        ...makeVS(["p", "p.q", "p.q.r"]),
        foldedPaths: ["p.q"],
      };
      expect(
        shouldUseClassDiagramMode(model.elements["p"]!, "p", vs, hidden, model),
      ).toBe(true);
    });

    it("grandchild not in positions → does not block text mode", () => {
      const model = makeModel(
        [
          { id: "p", children: ["q"] },
          { id: "q", children: ["r"] },
          { id: "r" },
        ],
        ["p"],
      );

      const vs = makeVS(["p", "p.q"]);
      expect(
        shouldUseClassDiagramMode(model.elements["p"]!, "p", vs, hidden, model),
      ).toBe(true);
    });
  });
});

describe("computeClassDiagramContent", () => {
  it("returns empty fields and methods when element has no children", () => {
    const model = makeModel([{ id: "cls" }], ["cls"]);
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.fields).toEqual([]);
    expect(content.methods).toEqual([]);
  });

  it("skips anonymous children (anon_ prefix)", () => {
    const model = makeModel(
      [
        { id: "cls", children: ["anon_xyz", "real"] },
        { id: "anon_xyz" },
        { id: "real" },
      ],
      ["cls"],
    );
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.fields).toEqual(["real"]);
  });

  it("skips children absent from the model", () => {
    const model = makeModel(
      [{ id: "cls", children: ["ghost", "real"] }, { id: "real" }],
      ["cls"],
    );

    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.fields).toEqual(["real"]);
  });

  it("formats function child with no params as 'name(): void'", () => {
    const model = makeModel(
      [
        { id: "cls", children: ["fn"] },
        { id: "fn", type: "function" },
      ],
      ["cls"],
    );
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.methods).toEqual(["fn(): void"]);
  });

  it("formats function child with parameters listing their ids", () => {
    const model = makeModel(
      [
        { id: "cls", children: ["fn"] },
        { id: "fn", type: "function", children: ["x", "y"] },
        { id: "x" },
        { id: "y" },
      ],
      ["cls"],
    );
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.methods).toEqual(["fn(x, y): void"]);
  });

  it("resolves return type from a flow element referenced by relationship", () => {
    const model = makeModel(
      [
        { id: "cls", children: ["fn"] },
        { id: "fn", type: "function" },
        { id: "ret", type: "flow", children: ["String"] },
        { id: "String" },
      ],
      ["cls"],
    );
    model.relationships["r1"] = {
      id: "r1",
      source: "fn",
      target: "ret",
      type: "-->",
    };

    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.methods).toEqual(["fn(): String"]);
  });

  it("formats empty collection child as 'name[]'", () => {
    const model = makeModel(
      [
        { id: "cls", children: ["col"] },
        { id: "col", type: "collection" },
      ],
      ["cls"],
    );
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.methods).toEqual(["col[]"]);
  });

  it("formats choice child as 'name(): enum'", () => {
    const model = makeModel(
      [
        { id: "cls", children: ["st"] },
        { id: "st", type: "choice" },
      ],
      ["cls"],
    );
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.methods).toEqual(["st(): enum"]);
  });

  it("formats state child as 'name||'", () => {
    const model = makeModel(
      [
        { id: "cls", children: ["s"] },
        { id: "s", type: "state" },
      ],
      ["cls"],
    );
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.methods).toEqual(["s||"]);
  });

  it("formats flow child as just its id", () => {
    const model = makeModel(
      [
        { id: "cls", children: ["f"] },
        { id: "f", type: "flow" },
      ],
      ["cls"],
    );
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.methods).toEqual(["f"]);
  });

  it("separates object children into fields, others into methods", () => {
    const model = makeModel(
      [
        { id: "cls", children: ["field1", "method1"] },
        { id: "field1" },
        { id: "method1", type: "function" },
      ],
      ["cls"],
    );
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.fields).toEqual(["field1"]);
    expect(content.methods).toContain("method1(): void");
  });

  it("filters out hidden children", () => {
    const model = makeModel(
      [{ id: "cls", children: ["a", "b"] }, { id: "a" }, { id: "b" }],
      ["cls"],
    );
    const hidden = new Set(["cls.b"]);
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      hidden,
    );
    expect(content.fields).toEqual(["a"]);
  });

  it("formats collection child correctly", () => {
    const model = makeModel(
      [
        { id: "cls", children: ["items"] },
        { id: "items", type: "collection", children: ["T"] },
        { id: "T" },
      ],
      ["cls"],
    );
    const content = computeClassDiagramContent(
      model.elements["cls"]!,
      "cls",
      model,
      new Set(),
    );
    expect(content.methods).toEqual(["items<T>[]"]);
  });
});

describe("computeTextModeSuppressedPaths", () => {
  const emptyDimmed = new Set<string>();

  it("suppresses children of the text-mode element", () => {
    const model = makeModel([{ id: "b", children: ["c"] }, { id: "c" }], ["b"]);
    const vs = makeVS(["b", "b.c"]);
    const suppressed = computeTextModeSuppressedPaths(
      model,
      vs,
      new Set(),
      emptyDimmed,
    );
    expect(suppressed.has("b.c")).toBe(true);
  });

  it("a{b{c}}: only a.b.c is suppressed (b uses text mode, not a)", () => {
    const model = makeModel(
      [{ id: "a", children: ["b"] }, { id: "b", children: ["c"] }, { id: "c" }],
      ["a"],
    );
    const vs = makeVS(["a", "a.b", "a.b.c"]);
    const suppressed = computeTextModeSuppressedPaths(
      model,
      vs,
      new Set(),
      emptyDimmed,
    );
    expect(suppressed.has("a.b.c")).toBe(true);
    expect(suppressed.has("a.b")).toBe(false);
  });

  it("d[e[f[g]]]: only d.e.f.g is suppressed (f uses text mode)", () => {
    const model = makeModel(
      [
        { id: "d", type: "collection", children: ["e"] },
        { id: "e", type: "collection", children: ["f"] },
        { id: "f", type: "collection", children: ["g"] },
        { id: "g" },
      ],
      ["d"],
    );
    const vs = makeVS(["d", "d.e", "d.e.f", "d.e.f.g"]);
    const suppressed = computeTextModeSuppressedPaths(
      model,
      vs,
      new Set(),
      emptyDimmed,
    );
    expect(suppressed.has("d.e.f.g")).toBe(true);
    expect(suppressed.has("d.e.f")).toBe(false);
    expect(suppressed.has("d.e")).toBe(false);
  });

  it("dimmed elements are not suppressed and traversal skips them", () => {
    const model = makeModel(
      [{ id: "a", children: ["b"] }, { id: "b", children: ["c"] }, { id: "c" }],
      ["a"],
    );
    const vs = makeVS(["a", "a.b", "a.b.c"]);
    const dimmed = new Set(["a.b"]);
    const suppressed = computeTextModeSuppressedPaths(
      model,
      vs,
      new Set(),
      dimmed,
    );

    expect(suppressed.has("a.b.c")).toBe(false);
  });

  it("already-hidden paths are not added to suppressed", () => {
    const model = makeModel([{ id: "b", children: ["c"] }, { id: "c" }], ["b"]);
    const vs = makeVS(["b", "b.c"]);
    const alreadyHidden = new Set(["b"]);
    const suppressed = computeTextModeSuppressedPaths(
      model,
      vs,
      alreadyHidden,
      emptyDimmed,
    );
    expect(suppressed.size).toBe(0);
  });
});
