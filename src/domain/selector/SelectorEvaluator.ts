import type {
  Selector,
  SelectorAtom,
  ElementTypeKey,
} from "../models/Selector";

type TK =
  | { k: "num"; v: number }
  | { k: "and" | "or" | "xor" | "not" | "lp" | "rp" };

function lex(expr: string): TK[] {
  const out: TK[] = [];
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
    if (/\d/.test(ch)) {
      let n = "";
      while (i < expr.length && /\d/.test(expr[i])) n += expr[i++];
      out.push({ k: "num", v: +n });
      continue;
    }
    let matched = false;
    for (const k of ["xor", "and", "not", "or"] as string[]) {
      if (expr.startsWith(k, i) && !/\w/.test(expr[i + k.length] ?? "")) {
        out.push({ k } as TK);
        i += k.length;
        matched = true;
        break;
      }
    }
    if (!matched) i++;
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
    while (this.peek()?.k === "or" || this.peek()?.k === "xor") {
      const op = this.advance()!;
      const right = this.parseAnd();
      v = op.k === "xor" ? v !== right : v || right;
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
      return this.r[(t as { k: "num"; v: number }).v - 1] ?? false;
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

export function matchesAtom(
  atom: SelectorAtom,
  path: string,
  type: string,
): boolean {
  if (atom.types.length > 0 && !atom.types.includes(type as ElementTypeKey))
    return false;
  const pat = !atom.path || atom.path === "*" ? ".*" : atom.path;
  try {
    return new RegExp(pat).test(path);
  } catch {
    return false;
  }
}

export function evaluateSelector(
  selector: Selector,
  path: string,
  type: string,
): boolean {
  if (selector.atoms.length === 0) return true;
  const results = selector.atoms.map((a) => matchesAtom(a, path, type));
  const expr =
    selector.combiner.trim() || results.map((_, i) => i + 1).join(" or ");
  try {
    return new CombinerParser(lex(expr), results).parse();
  } catch {
    return true;
  }
}
