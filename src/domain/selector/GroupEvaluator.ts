import type { Group } from "../models/Selector";

// Auto-escape empty type-wrapper sequences that are regex metacharacters.
// Only the empty variants ({}, [], (), ||) are replaced — non-empty constructs
// like [abc] or (x|y) are left intact so users can still write regex groups and
// character classes in the name portion of their rules.
export function compileRule(rule: string): string {
  return rule
    .replace(/\{\}/g, "\\{\\}")
    .replace(/\[\]/g, "\\[\\]")
    .replace(/\(\)/g, "\\(\\)")
    .replace(/\|\|/g, "\\|\\|");
}

// --- Compose expression tokenizer + recursive descent evaluator ---
// Grammar (lowest → highest precedence):
//   expr   := term ("|" term)*
//   term   := factor (("&" | "," | "-") factor)*      comma = alias for &
//   factor := ID | "(" expr ")"
//
// "-" is AND-NOT: the right operand is negated before ANDing.

type Tok =
  | { t: "id"; v: string }
  | { t: "or" }
  | { t: "and" }
  | { t: "not" }   // "-" operator
  | { t: "lp" }
  | { t: "rp" };

function tokenize(expr: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "|") { toks.push({ t: "or" }); i++; }
    else if (ch === "&" || ch === ",") { toks.push({ t: "and" }); i++; }
    else if (ch === "-") { toks.push({ t: "not" }); i++; }
    else if (ch === "(") { toks.push({ t: "lp" }); i++; }
    else if (ch === ")") { toks.push({ t: "rp" }); i++; }
    else if (/[a-z0-9_]/i.test(ch)) {
      let id = "";
      while (i < expr.length && /[a-z0-9_]/i.test(expr[i])) id += expr[i++];
      toks.push({ t: "id", v: id });
    } else {
      i++;
    }
  }
  return toks;
}

function evalExpr(
  toks: Tok[],
  pos: { i: number },
  path: string,
  allGroups: Group[],
  visited: ReadonlySet<string>,
): boolean {
  let result = evalTerm(toks, pos, path, allGroups, visited);
  while (pos.i < toks.length && toks[pos.i].t === "or") {
    pos.i++;
    const right = evalTerm(toks, pos, path, allGroups, visited);
    result = result || right;
  }
  return result;
}

function evalTerm(
  toks: Tok[],
  pos: { i: number },
  path: string,
  allGroups: Group[],
  visited: ReadonlySet<string>,
): boolean {
  let result = evalFactor(toks, pos, path, allGroups, visited);
  while (pos.i < toks.length && (toks[pos.i].t === "and" || toks[pos.i].t === "not")) {
    const negate = toks[pos.i].t === "not";
    pos.i++;
    const right = evalFactor(toks, pos, path, allGroups, visited);
    result = negate ? result && !right : result && right;
  }
  return result;
}

function evalFactor(
  toks: Tok[],
  pos: { i: number },
  path: string,
  allGroups: Group[],
  visited: ReadonlySet<string>,
): boolean {
  if (pos.i >= toks.length) return false;
  const tok = toks[pos.i];
  if (tok.t === "lp") {
    pos.i++;
    const result = evalExpr(toks, pos, path, allGroups, visited);
    if (pos.i < toks.length && toks[pos.i].t === "rp") pos.i++;
    return result;
  }
  if (tok.t === "id") {
    pos.i++;
    const group = allGroups.find((g) => g.id === tok.v);
    if (!group || visited.has(group.id)) return false;
    return matchesGroup(group, path, allGroups, visited);
  }
  return false;
}

export function matchesGroup(
  group: Group,
  path: string,
  allGroups: Group[] = [],
  _visited: ReadonlySet<string> = new Set(),
): boolean {
  if (_visited.has(group.id)) return false;
  const visited: Set<string> = new Set(_visited);
  visited.add(group.id);

  const hasRegex = !!group.regex;
  const hasCompose = !!group.compose;
  if (!hasRegex && !hasCompose) return false;

  if (hasRegex) {
    try {
      if (!new RegExp(compileRule(group.regex)).test(path)) return false;
    } catch {
      return false;
    }
  }

  if (hasCompose) {
    const toks = tokenize(group.compose!);
    if (!evalExpr(toks, { i: 0 }, path, allGroups, visited)) return false;
  }

  return true;
}
