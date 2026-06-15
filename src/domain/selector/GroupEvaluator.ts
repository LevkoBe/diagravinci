import type { Group } from "../models/Selector";
import type { Element } from "../models/Element";
import {
  type GroupExpr,
  type NameMatcher,
  type ChildConstraint,
  tryParseGroupExpr,
} from "./GroupExprParser";

export function matchesExpr(
  expr: GroupExpr,
  path: string,
  elementType: string,
  elements: Record<string, Element>,
  groups: Group[],
): boolean {
  switch (expr.kind) {
    case "or":
      return (
        matchesExpr(expr.left, path, elementType, elements, groups) ||
        matchesExpr(expr.right, path, elementType, elements, groups)
      );
    case "and":
      return (
        matchesExpr(expr.left, path, elementType, elements, groups) &&
        matchesExpr(expr.right, path, elementType, elements, groups)
      );
    case "not":
      return !matchesExpr(expr.expr, path, elementType, elements, groups);
    case "level": {
      const depth = path.split(".").length;
      return depth >= expr.min && depth <= expr.max;
    }
    case "ref": {
      const group = groups.find((g) => g.id === expr.id);
      if (!group) return false;
      const parsed = tryParseGroupExpr(group.rule);
      if (!parsed) return false;
      return matchesExpr(parsed, path, elementType, elements, groups);
    }
    case "pattern":
      return matchesPattern(expr, path, elementType, elements, groups);
  }
}

function matchesPattern(
  expr: Extract<GroupExpr, { kind: "pattern" }>,
  path: string,
  elementType: string,
  elements: Record<string, Element>,
  groups: Group[],
): boolean {
  if (expr.type !== "any" && elementType !== expr.type) return false;
  const name = path.split(".").at(-1) ?? path;
  if (!matchesName(expr.name, name)) return false;
  return matchesChildren(expr.children, path, elements, groups);
}

function matchesName(matcher: NameMatcher, name: string): boolean {
  switch (matcher.kind) {
    case "any":
      return true;
    case "literal":
      return matcher.value === name;
    case "regex":
      try {
        return new RegExp(matcher.source).test(name);
      } catch {
        return false;
      }
  }
}

function matchesChildren(
  constraint: ChildConstraint,
  parentPath: string,
  elements: Record<string, Element>,
  groups: Group[],
): boolean {
  if (constraint.kind === "none") return true;

  const parentId = parentPath.split(".").at(-1) ?? parentPath;
  const parent = elements[parentId];
  const childIds = parent?.childIds ?? [];

  if (constraint.kind === "required") {
    // each constraint item must match at least one child (AND-over-items semantics)
    return constraint.items.every((itemExpr) =>
      childIds.some((cid) => {
        const childEl = elements[cid];
        if (!childEl) return false;
        const childPath = parentPath ? `${parentPath}.${cid}` : cid;
        return matchesExpr(itemExpr, childPath, childEl.type, elements, groups);
      }),
    );
  }

  return true;
}

export function matchesGroup(
  group: Group,
  path: string,
  elementType: string,
  elements: Record<string, Element>,
  allGroups: Group[],
): boolean {
  const parsed = tryParseGroupExpr(group.rule);
  if (!parsed) return false;
  return matchesExpr(parsed, path, elementType, elements, allGroups);
}

// conservative: returns false when subsumption is undecidable (e.g. regex vs regex)
export function isA(
  specific: GroupExpr,
  general: GroupExpr,
  groups?: Group[],
): boolean {
  return subsumes(general, specific, groups ?? []);
}

function subsumes(general: GroupExpr, specific: GroupExpr, groups: Group[]): boolean {
  const g = resolveRef(general, groups);
  const s = resolveRef(specific, groups);
  if (!g || !s) return false;

  if (
    g.kind === "pattern" &&
    g.type === "any" &&
    g.name.kind === "any" &&
    g.children.kind === "none"
  )
    return true;

  if (g.kind === "or")
    return subsumes(g.left, s, groups) || subsumes(g.right, s, groups);
  if (g.kind === "and")
    return subsumes(g.left, s, groups) && subsumes(g.right, s, groups);

  if (s.kind === "or")
    return subsumes(g, s.left, groups) && subsumes(g, s.right, groups);
  // specific is AND: conservative — at least one branch must be subsumed
  if (s.kind === "and")
    return subsumes(g, s.left, groups) || subsumes(g, s.right, groups);

  if (g.kind === "pattern" && s.kind === "pattern")
    return patternSubsumes(g, s, groups);

  return false;
}

function patternSubsumes(
  g: Extract<GroupExpr, { kind: "pattern" }>,
  s: Extract<GroupExpr, { kind: "pattern" }>,
  groups: Group[],
): boolean {
  if (g.type !== "any" && s.type !== g.type) return false;
  if (!nameSubsumes(g.name, s.name)) return false;

  if (g.children.kind === "required") {
    if (s.children.kind === "none") return false;
    if (s.children.kind === "required") {
      return g.children.items.every((gItem) =>
        s.children.items.some((sItem) => subsumes(gItem, sItem, groups)),
      );
    }
    return false;
  }

  return true;
}

function nameSubsumes(g: NameMatcher, s: NameMatcher): boolean {
  if (g.kind === "any") return true;                           // any name ⊇ anything
  if (s.kind === "any") return false;                          // specific any ⊄ non-any general
  if (g.kind === "regex" || s.kind === "regex") return false; // regex subsumption undecidable
  return g.value === s.value;
}

function resolveRef(expr: GroupExpr, groups: Group[]): GroupExpr | null {
  if (expr.kind !== "ref") return expr;
  const group = groups.find((g) => g.id === expr.id);
  if (!group) return null;
  return tryParseGroupExpr(group.rule);
}

export function buildPatternFromElement(
  element: Element,
  id: string,
  elements: Record<string, Element>,
): GroupExpr {
  const baseSeg = id.split(".").at(-1) ?? id;
  const name: NameMatcher = baseSeg.startsWith("anon_")
    ? { kind: "any" }
    : { kind: "regex", source: baseSeg };

  const childIds = element.childIds ?? [];
  const children: ChildConstraint =
    childIds.length === 0
      ? { kind: "none" }
      : {
          kind: "required",
          items: childIds.map((cid) => {
            const child = elements[cid];
            if (!child)
              return { kind: "pattern", name: { kind: "literal", value: cid }, type: "object" as const, children: { kind: "none" as const } };
            return buildPatternFromElement(child, cid, elements);
          }),
        };

  return {
    kind: "pattern",
    name,
    type: element.type as import("../models/Selector").ElementTypeKey,
    children,
  };
}
