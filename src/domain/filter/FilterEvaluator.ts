import type { FilterRule } from "../models/FilterRule";

type TK = { k: "num"; v: number } | { k: "and" | "or" | "not" | "lp" | "rp" };

function lex(expr: string): TK[] {
  const out: TK[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === " " || ch === "\t") {
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
    if (/\d/.test(ch)) {
      let n = "";
      while (i < expr.length && /\d/.test(expr[i])) n += expr[i++];
      out.push({ k: "num", v: +n });
      continue;
    }
    if (expr.startsWith("and", i) && !/\w/.test(expr[i + 3] ?? "")) {
      out.push({ k: "and" });
      i += 3;
      continue;
    }
    if (expr.startsWith("or", i) && !/\w/.test(expr[i + 2] ?? "")) {
      out.push({ k: "or" });
      i += 2;
      continue;
    }
    if (expr.startsWith("not", i) && !/\w/.test(expr[i + 3] ?? "")) {
      out.push({ k: "not" });
      i += 3;
      continue;
    }
    i++;
  }
  return out;
}

class CombinerParser {
  private i = 0;
  private tks: TK[];
  private r: boolean[];
  constructor(tks: TK[], r: boolean[]) {
    this.tks = tks;
    this.r = r;
  }

  parse(): boolean {
    return this.parseOr();
  }

  private parseOr(): boolean {
    let v = this.parseAnd();
    while (this.peek()?.k === "or") {
      this.advance();
      v = v || this.parseAnd();
    }
    return v;
  }

  private parseAnd(): boolean {
    let v = this.parseNot();
    while (this.peek()?.k === "and") {
      this.advance();
      v = v && this.parseNot();
    }
    return v;
  }

  private parseNot(): boolean {
    if (this.peek()?.k === "not") {
      this.advance();
      return !this.parseNot();
    }
    return this.parseAtom();
  }

  private parseAtom(): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.k === "num" && "v" in t) {
      this.advance();
      return this.r[t.v - 1] ?? false;
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

export function matchesRule(
  rule: FilterRule,
  path: string,
  type: string,
): boolean {
  if (rule.types.length > 0 && !rule.types.includes(type as never))
    return false;
  const pat = !rule.path || rule.path === "*" ? ".*" : rule.path;
  try {
    return new RegExp(pat).test(path);
  } catch {
    return false;
  }
}

export function evaluateCombiner(
  combiner: string,
  rules: FilterRule[],
  path: string,
  type: string,
): boolean {
  if (rules.length === 0) return true;
  const results = rules.map((r) => matchesRule(r, path, type));
  const expr = combiner.trim() || results.map((_, i) => i + 1).join(" or ");
  try {
    return new CombinerParser(lex(expr), results).parse();
  } catch {
    return true;
  }
}
