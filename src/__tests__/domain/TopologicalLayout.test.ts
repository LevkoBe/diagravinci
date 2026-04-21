import { describe, it, expect } from "vitest";
import { TopologicalLayout } from "../../domain/layout/TopologicalLayout";
import type { Element } from "../../domain/models/Element";
import type { DiagramModel } from "../../domain/models/DiagramModel";
import { createEmptyDiagram } from "../../domain/models/DiagramModel";
import { createElement } from "../../domain/models/Element";
import { createRelationship } from "../../domain/models/Relationship";

class TestLayout extends TopologicalLayout {
  name = "test";
  protected viewMode = "basic" as const;
  protected computePositions(children: Element[]) {
    return children.map(() => ({ x: 0, y: 0, size: 100 }));
  }
  runTopoSort(children: Element[], model: DiagramModel) {
    return this.topoSort(children, model);
  }
}

function buildModel(...ids: string[]): DiagramModel {
  const model = createEmptyDiagram();
  for (const id of ids) {
    model.elements[id] = createElement(id, "object");
    model.root.childIds.push(id);
  }
  return model;
}

function addRel(model: DiagramModel, src: string, tgt: string) {
  const id = `${src}__${tgt}`;
  model.relationships[id] = createRelationship(id, src, tgt, "-->");
}

const layout = new TestLayout();

describe("TopologicalLayout.topoSort", () => {
  it("assigns rank 0 to all nodes in an empty graph", () => {
    const model = buildModel("a", "b", "c");
    const children = ["a", "b", "c"].map((id) => model.elements[id]);
    const ranks = layout.runTopoSort(children, model);
    expect(ranks.get("a")).toBe(0);
    expect(ranks.get("b")).toBe(0);
    expect(ranks.get("c")).toBe(0);
  });

  it("assigns sequential ranks in a linear chain a→b→c", () => {
    const model = buildModel("a", "b", "c");
    addRel(model, "a", "b");
    addRel(model, "b", "c");
    const children = ["a", "b", "c"].map((id) => model.elements[id]);
    const ranks = layout.runTopoSort(children, model);
    expect(ranks.get("a")).toBe(0);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(2);
  });

  it("assigns correct ranks in a diamond a→b, a→c, b→d, c→d", () => {
    const model = buildModel("a", "b", "c", "d");
    addRel(model, "a", "b");
    addRel(model, "a", "c");
    addRel(model, "b", "d");
    addRel(model, "c", "d");
    const children = ["a", "b", "c", "d"].map((id) => model.elements[id]);
    const ranks = layout.runTopoSort(children, model);
    expect(ranks.get("a")).toBe(0);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(1);
    expect(ranks.get("d")).toBe(2);
  });

  it("assigns a non-zero rank fallback for nodes in a cycle", () => {
    const model = buildModel("a", "b");
    addRel(model, "a", "b");
    addRel(model, "b", "a");
    const children = ["a", "b"].map((id) => model.elements[id]);
    const ranks = layout.runTopoSort(children, model);
    expect(ranks.has("a")).toBe(true);
    expect(ranks.has("b")).toBe(true);
  });

  it("ignores relationships to elements outside the children list", () => {
    const model = buildModel("a", "b");
    model.elements["external"] = createElement("external", "object");
    addRel(model, "a", "external");
    const children = ["a", "b"].map((id) => model.elements[id]);
    const ranks = layout.runTopoSort(children, model);
    expect(ranks.get("a")).toBe(0);
    expect(ranks.get("b")).toBe(0);
    expect(ranks.has("external")).toBe(false);
  });

  it("handles a single node", () => {
    const model = buildModel("solo");
    const children = [model.elements["solo"]];
    const ranks = layout.runTopoSort(children, model);
    expect(ranks.get("solo")).toBe(0);
  });

  it("handles disconnected sub-graphs independently", () => {
    const model = buildModel("a", "b", "c", "d");
    addRel(model, "a", "b");
    addRel(model, "c", "d");
    const children = ["a", "b", "c", "d"].map((id) => model.elements[id]);
    const ranks = layout.runTopoSort(children, model);
    expect(ranks.get("a")).toBe(0);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(0);
    expect(ranks.get("d")).toBe(1);
  });
});
