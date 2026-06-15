import type { ElementTypeKey } from "../models/Selector";

export type GroupExpr =
  | { kind: "or";      left: GroupExpr; right: GroupExpr }
  | { kind: "and";     left: GroupExpr; right: GroupExpr }
  | { kind: "not";     expr: GroupExpr }
  | { kind: "ref";     id: string }
  | { kind: "level";   min: number; max: number }
  | { kind: "pattern"; name: NameMatcher; type: ElementTypeKey | "any"; children: ChildConstraint };

export type NameMatcher =
  | { kind: "literal"; value: string }
  | { kind: "regex";   source: string }
  | { kind: "any" };

export type ChildConstraint =
  | { kind: "none" }
  | { kind: "required"; items: GroupExpr[] };

type Tk =
  | { t: "ident";   v: string }
  | { t: "regex";   v: string }
  | { t: "wild" }
  | { t: "or" }
  | { t: "and" }
  | { t: "not" }
  | { t: "dollar" }
  | { t: "eq" }
  | { t: "open";    v: string }
  | { t: "close";   v: string }
  | { t: "space" };

function tokenize(src: string): Tk[] {
  const tks: Tk[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];

    if (ch === "'") {
      let s = "";
      i++;
      while (i < src.length && src[i] !== "'") {
        if (src[i] === "\\" && i + 1 < src.length) {
          s += src[i + 1];
          i += 2;
        } else {
          s += src[i++];
        }
      }
      if (src[i] === "'") i++;
      tks.push({ t: "regex", v: s });
      continue;
    }

    if (ch === "/") { tks.push({ t: "or" });     i++; continue; }
    if (ch === "&") { tks.push({ t: "and" });    i++; continue; }
    if (ch === "-") { tks.push({ t: "not" });    i++; continue; }
    if (ch === "$") { tks.push({ t: "dollar" }); i++; continue; }
    if (ch === "=") { tks.push({ t: "eq" });     i++; continue; }
    if (ch === "?") { tks.push({ t: "wild" });   i++; continue; }

    if (ch === "{") { tks.push({ t: "open", v: "{" });  i++; continue; }
    if (ch === "[") { tks.push({ t: "open", v: "[" });  i++; continue; }
    if (ch === "(") { tks.push({ t: "open", v: "(" });  i++; continue; }
    if (ch === "}") { tks.push({ t: "close", v: "}" }); i++; continue; }
    if (ch === "]") { tks.push({ t: "close", v: "]" }); i++; continue; }
    if (ch === ")") { tks.push({ t: "close", v: ")" }); i++; continue; }

    // || (state) — open/close share the same char; treat each | as an opener
    if (ch === "|") {
      tks.push({ t: "open", v: "|" });
      i++;
      continue;
    }

    // <> (choice) — < is opener; > is ambiguous with >> (flow) so handled specially
    if (ch === "<") { tks.push({ t: "open", v: "<" }); i++; continue; }
    if (ch === ">") {
      if (src[i + 1] === ">") { // >> flow wrapper
        tks.push({ t: "open", v: ">>" });
        i += 2;
      } else {
        tks.push({ t: "close", v: ">" });
        i++;
      }
      continue;
    }

    // whitespace is a child-separator inside wrappers
    if (/\s/.test(ch)) {
      tks.push({ t: "space" });
      while (i < src.length && /\s/.test(src[i])) i++;
      continue;
    }

    if (/[a-zA-Z0-9_]/.test(ch)) {
      let s = "";
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) s += src[i++];
      tks.push({ t: "ident", v: s });
      continue;
    }

    i++;
  }
  return tks;
}

export class ParseError extends Error {
  constructor(msg: string) { super(`GroupExprParser: ${msg}`); }
}

class Parser {
  private i = 0;
  private tks: Tk[];
  constructor(tks: Tk[]) {
    this.tks = tks;
  }

  private skipWs(): void {
    while (this.tks[this.i]?.t === "space") this.i++;
  }

  private peek(skip = true): Tk | undefined {
    if (skip) this.skipWs();
    return this.tks[this.i];
  }

  private next(): Tk | undefined {
    this.skipWs();
    return this.tks[this.i++];
  }

  parse(): GroupExpr {
    const expr = this.parseOr();
    this.skipWs();
    if (this.i < this.tks.length)
      throw new ParseError(`unexpected token '${this.tks[this.i]?.t}' at position ${this.i}`);
    return expr;
  }

  private parseOr(): GroupExpr {
    let left = this.parseAnd();
    while (this.peek()?.t === "or") {
      this.next();
      const right = this.parseAnd();
      left = { kind: "or", left, right };
    }
    return left;
  }

  private parseAnd(): GroupExpr {
    let left = this.parseNot();
    while (this.peek()?.t === "and") {
      this.next();
      const right = this.parseNot();
      left = { kind: "and", left, right };
    }
    return left;
  }

  private parseNot(): GroupExpr {
    if (this.peek()?.t === "not") {
      this.next();
      return { kind: "not", expr: this.parseNot() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): GroupExpr {
    const tok = this.peek();
    if (!tok) throw new ParseError("unexpected end of expression");

    if (tok.t === "dollar") {
      this.next();
      const idTok = this.peek(false);
      if (!idTok || idTok.t !== "ident")
        throw new ParseError("expected identifier after $");
      this.next();
      const id = (idTok as { t: "ident"; v: string }).v;

      // "2-5" tokenizes as ident("2"), not("-"), ident("5") — parse $level range manually
      if (id === "level" && this.peek()?.t === "eq") {
        this.next(); // consume =
        const minTok = this.next();
        if (!minTok || minTok.t !== "ident")
          throw new ParseError("expected level number after $level=");
        const min = parseInt((minTok as { t: "ident"; v: string }).v, 10);
        if (isNaN(min)) throw new ParseError("invalid level min");

        let max = min;
        if (this.tks[this.i]?.t === "not") { // -M suffix tokenizes as "not" then ident
          this.i++; // consume "-"
          const maxTok = this.next();
          if (!maxTok || maxTok.t !== "ident")
            throw new ParseError("expected max level after '-'");
          max = parseInt((maxTok as { t: "ident"; v: string }).v, 10);
          if (isNaN(max)) throw new ParseError("invalid level max");
        }

        return { kind: "level", min, max };
      }

      return { kind: "ref", id };
    }

    return this.parsePattern();
  }

  private parsePattern(): GroupExpr {
    const name = this.parseName();
    const { type, opener } = this.parseType();
    const children = opener ? this.parseChildren(closerFor(opener)) : { kind: "none" as const };

    const resolvedType: ElementTypeKey | "any" =
      type === "none"
        ? "object"  // bare identifier or ? with no wrapper → defaults to object
        : type === "any"
          ? "any"
          : type as ElementTypeKey;

    return { kind: "pattern", name, type: resolvedType, children };
  }

  private parseName(): NameMatcher {
    const tok = this.peek();
    if (!tok) return { kind: "any" };

    if (tok.t === "ident") {
      this.next();
      return { kind: "literal", value: (tok as { t: "ident"; v: string }).v };
    }
    if (tok.t === "regex") {
      this.next();
      return { kind: "regex", source: (tok as { t: "regex"; v: string }).v };
    }
    if (tok.t === "wild") {
      // ? is ambiguous: name-wildcard + type, or standalone type-wildcard
      // peek without skipping ws (no spaces allowed inside expressions)
      const next = this.tks[this.i + 1];
      const isTypeNext = next?.t === "open" || next?.t === "wild"; // ?? = name-wild + type-wild
      if (isTypeNext) {
        this.next(); // consume name ?
        return { kind: "any" };
      }
      this.next();
      return { kind: "any" };
    }

    return { kind: "any" };
  }

  private parseType(): { type: ElementTypeKey | "any" | "none"; opener: string } {
    const tok = this.peek();
    if (!tok) return { type: "none", opener: "" };

    if (tok.t === "wild") {
      this.next();
      return { type: "any", opener: "" }; // type wildcard — no children body
    }
    if (tok.t === "open") {
      const v = (tok as { t: "open"; v: string }).v;
      this.next(); // consume opener
      const mapped = OPENER_TO_TYPE[v];
      return { type: mapped ?? "none", opener: v };
    }
    return { type: "none", opener: "" };
  }

  private parseChildren(closer: string): ChildConstraint {
    if (!closer) return { kind: "none" };

    const items: GroupExpr[] = [];

    while (this.i < this.tks.length) {
      while (this.tks[this.i]?.t === "space") this.i++;

      const tok = this.tks[this.i];
      if (!tok) break;

      if (tok.t === "close" && (tok as { t: "close"; v: string }).v === closer) {
        this.i++;
        break;
      }
      // | closer is ambiguous with a new state opener — treat new | as end of children
      if (closer === "|" && tok.t === "open" && (tok as { t: "open"; v: string }).v === "|") {
        this.i++;
        break;
      }

      items.push(this.parsePattern());
    }

    if (items.length === 0) return { kind: "none" };
    return { kind: "required", items };
  }
}

const OPENER_TO_TYPE: Record<string, ElementTypeKey | "any"> = {
  "{":  "object",
  "[":  "collection",
  "(":  "function",
  "|":  "state",
  "<":  "choice",
  ">>": "flow",
};

function closerFor(opener: string): string {
  const map: Record<string, string> = {
    "{": "}",
    "[": "]",
    "(": ")",
    "|": "|",
    "<": ">",
    ">>": ">",
  };
  return map[opener] ?? "";
}

export function parseGroupExpr(rule: string): GroupExpr {
  const trimmed = rule.trim();
  if (!trimmed) throw new ParseError("empty expression");
  const tks = tokenize(trimmed);
  return new Parser(tks).parse();
}

export function tryParseGroupExpr(rule: string): GroupExpr | null {
  try {
    return parseGroupExpr(rule);
  } catch {
    return null;
  }
}
