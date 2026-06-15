import type { Element } from "../../../../domain/models/Element";
import type { DiagramModel } from "../../../../domain/models/DiagramModel";
import type { ViewState } from "../../../../domain/models/ViewState";
import { AppConfig } from "../../../../config/appConfig";

const ANON_PREFIX = AppConfig.parser.ANONYMOUS_ID_PREFIX + "_";

export interface ClassDiagramContent {
  fields: string[];
  methods: string[];
}

export function computeClassDiagramContent(
  element: Element,
  path: string,
  model: DiagramModel,
  hiddenSet: Set<string>,
): ClassDiagramContent {
  const fields: string[] = [];
  const methods: string[] = [];

  for (const childId of element.childIds) {
    if (childId.startsWith(ANON_PREFIX)) continue;
    const childPath = `${path}.${childId}`;
    if (hiddenSet.has(childPath)) continue;
    const child = model.elements[childId];
    if (!child) continue;
    const text = formatClassMember(child, model);
    if (child.type === "object") {
      fields.push(text);
    } else {
      methods.push(text);
    }
  }

  return { fields, methods };
}

function stripSuffix(id: string): string {
  return id.replace(/(\{\}|\[\]|\(\)|\|\||<>|>>)$/, "");
}

function formatClassMember(element: Element, model: DiagramModel): string {
  const name = stripSuffix(element.id);
  switch (element.type) {
    case "object":
      return name;
    case "function": {
      const params = element.childIds
        .map((id) => stripSuffix(model.elements[id]?.id ?? id))
        .join(", ");
      const returnType = getReturnType(element, model);
      return `${name}(${params}): ${returnType}`;
    }
    case "collection": {
      if (element.childIds.length === 0) return `${name}[]`;
      const types = element.childIds
        .map((id) => stripSuffix(model.elements[id]?.id ?? id))
        .join(" | ");
      return `${name}<${types}>[]`;
    }
    case "choice":
      return `${name}(): enum`;
    case "state":
      return `${name}||`;
    case "flow":
      return name;
    default:
      return name;
  }
}

function getReturnType(funcElement: Element, model: DiagramModel): string {
  for (const rel of Object.values(model.relationships)) {
    if (rel.source !== funcElement.id) continue;
    const target = model.elements[rel.target];
    if (!target || target.type !== "flow") continue;
    if (target.childIds.length > 0) {
      return target.childIds
        .map((id) => stripSuffix(model.elements[id]?.id ?? id))
        .join(", ");
    }
  }
  return "void";
}

export function computeTextModeSuppressedPaths(
  model: DiagramModel,
  viewState: ViewState,
  hiddenSet: Set<string>,
  dimmedSet: Set<string>,
): Set<string> {
  const suppressed = new Set<string>();
  const visited = new Set<string>();

  const traverse = (element: Element, path: string) => {
    if (hiddenSet.has(path) || suppressed.has(path)) return;
    if (dimmedSet.has(path)) return;

    if (shouldUseClassDiagramMode(element, path, viewState, hiddenSet, model)) {
      const prefix = path + ".";
      for (const p of Object.keys(viewState.positions)) {
        if (p.startsWith(prefix)) suppressed.add(p);
      }
      return;
    }

    if (visited.has(element.id)) return;
    visited.add(element.id);
    element.childIds.forEach((childId) => {
      const child = model.elements[childId];
      if (child) traverse(child, `${path}.${childId}`);
    });
    visited.delete(element.id);
  };

  model.root.childIds.forEach((id) => {
    const el = model.elements[id];
    if (el) traverse(el, id);
  });

  return suppressed;
}

export function shouldUseClassDiagramMode(
  element: Element,
  path: string,
  viewState: ViewState,
  hiddenSet: Set<string>,
  model: DiagramModel,
): boolean {
  if (element.childIds.length === 0) return false;

  for (const childId of element.childIds) {
    const childPath = `${path}.${childId}`;
    if (hiddenSet.has(childPath)) continue;
    const child = model.elements[childId];
    if (!child || child.childIds.length === 0) continue;
    if (viewState.foldedPaths.includes(childPath)) continue;
    for (const gcId of child.childIds) {
      const gcPath = `${childPath}.${gcId}`;
      if (!hiddenSet.has(gcPath) && gcPath in viewState.positions) return false;
    }
  }
  return true;
}
