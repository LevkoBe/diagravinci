import type { Rule } from "../models/Selector";

type CombTK =
  | { k: "id"; v: string }
  | { k: "+" | "|" | "&" | "-" | "lp" | "rp" };

function lexFormula(expr: string): CombTK[] {
  const out: CombTK[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(") {
      out.push({ k: "lp" });
      i++;
      continue;
    }
    if (ch === ")") {
      out.push({ k: "rp" });
      i++;
      continue;
    }
    if (ch === "+") {
      out.push({ k: "+" });
      i++;
      continue;
    }
    if (ch === "|") {
      out.push({ k: "|" });
      i++;
      continue;
    }
    if (ch === "&") {
      out.push({ k: "&" });
      i++;
      continue;
    }
    if (ch === "-") {
      out.push({ k: "-" });
      i++;
      continue;
    }
    if (/[a-zA-Z0-9_]/.test(ch)) {
      let id = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) id += expr[i++];
      out.push({ k: "id", v: id });
      continue;
    }
    i++;
  }
  return out;
}

class FormulaParser {
  private i = 0;
  private tks: CombTK[];
  private results: Map<string, boolean>;
  constructor(tks: CombTK[], results: Map<string, boolean>) {
    this.tks = tks;
    this.results = results;
  }

  parse(): boolean {
    return this.parseOr();
  }

  private parseOr(): boolean {
    let v = this.parseAnd();
    while (this.peek()?.k === "+" || this.peek()?.k === "|") {
      this.advance();
      const rhs = this.parseAnd();
      v = v || rhs;
    }
    return v;
  }

  private parseAnd(): boolean {
    let v = this.parseNot();
    while (this.peek()?.k === "&") {
      this.advance();
      const rhs = this.parseNot();
      v = v && rhs;
    }
    return v;
  }

  private parseNot(): boolean {
    if (this.peek()?.k === "-") {
      this.advance();
      return !this.parseNot();
    }
    return this.parseAtom();
  }

  private parseAtom(): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.k === "id") {
      this.advance();
      return this.results.get(t.v) ?? false;
    }
    if (t.k === "lp") {
      this.advance();
      const v = this.parseOr();
      if (this.peek()?.k === "rp") this.advance();
      return v;
    }
    return false;
  }

  private peek() {
    return this.tks[this.i];
  }
  private advance() {
    return this.tks[this.i++];
  }
}

const KNOWN_SUFFIXES = ["name", "level"] as const;

function matchPatternValue(
  suffix: string,
  value: string,
  path: string,
  depth: number,
): boolean {
  if (suffix === "name") {
    const name = path.split(".").at(-1) ?? path;
    if (value.startsWith("c:")) return name.includes(value.slice(2));
    try {
      return new RegExp(value).test(name);
    } catch {
      return false;
    }
  }
  if (suffix === "level") {
    const dash = value.indexOf("-");
    const min = parseInt(dash === -1 ? value : value.slice(0, dash), 10);
    const max = dash === -1 ? min : parseInt(value.slice(dash + 1), 10);
    return depth >= min && depth <= max;
  }
  try {
    return new RegExp(value).test(path);
  } catch {
    return false;
  }
}

export function matchesRule(
  rule: Rule,
  path: string,
  elementType: string,
): boolean {
  const depth = path.split(".").length;

  for (const [key, value] of Object.entries(rule.patterns)) {
    const underIdx = key.lastIndexOf("_");
    let type: string;
    let suffix: string;

    if (underIdx > 0) {
      const potentialSuffix = key.slice(underIdx + 1);
      if ((KNOWN_SUFFIXES as readonly string[]).includes(potentialSuffix)) {
        type = key.slice(0, underIdx);
        suffix = potentialSuffix;
      } else {
        type = key;
        suffix = "path";
      }
    } else {
      type = key;
      suffix = "path";
    }

    if (type !== "all" && type !== elementType) continue;
    if (matchPatternValue(suffix, value, path, depth)) return true;
  }

  return false;
}

export function evaluateSelector(
  formula: string,
  path: string,
  elementType: string,
  rules: Rule[],
): boolean {
  const trimmed = formula.trim();
  if (!trimmed) return false;

  const results = new Map<string, boolean>();
  for (const rule of rules) {
    results.set(rule.id, matchesRule(rule, path, elementType));
  }

  try {
    return new FormulaParser(lexFormula(trimmed), results).parse();
  } catch {
    return false;
  }
}
