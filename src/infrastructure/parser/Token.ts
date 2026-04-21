export const PARTIAL_RELATIONSHIPS = ["..", "--"] as const;
export const OPENING_WRAPPERS = ["{", "[", "(", "<", ">", "|"] as const;
export const CLOSING_WRAPPERS = ["}", "]", ")", ">", "|"] as const;
export const RELATIONSHIPS = [
  "-->",
  "..>",
  "--|>",
  "..|>",
  "o--",
  "*--",
  "--o",
  "--*",
  "<--",
  "<..",
  "<|--",
  "<|..",
] as const;

export const TOKEN_LITERALS = [
  ...RELATIONSHIPS,
  ...PARTIAL_RELATIONSHIPS,
  ...OPENING_WRAPPERS,
  ...CLOSING_WRAPPERS,
] as const;

export const COMMENT_CHAR = "#";
export const FLAG_CHAR = ":";
export const DIRECTIVE_CHAR = "!";

export type RelationshipType =
  | (typeof PARTIAL_RELATIONSHIPS)[number]
  | (typeof RELATIONSHIPS)[number];
export type OpeningWrapper = (typeof OPENING_WRAPPERS)[number];
export type ClosingWrapper = (typeof CLOSING_WRAPPERS)[number];
export type NameType = "IDENTIFIER";
export type TokenKind = "-" | ">" | "{" | "}" | "x" | "!";

export type TokenType =
  | (typeof TOKEN_LITERALS)[number]
  | NameType
  | "NEWLINE"
  | "FLAG"
  | "DIRECTIVE";

export interface Token {
  type: TokenType;
  kind: TokenKind;
  value: string;
  line: number;
  column: number;
}

const getKindByType = (type: TokenType): TokenKind =>
  type === "DIRECTIVE"
    ? "!"
    : /^(\.\.|--)$/.test(type)
      ? "-"
      : /\.\.|--/.test(type)
        ? ">"
        : /[[{(<]/.test(type)
          ? "{"
          : /[\]})>|]/.test(type)
            ? "}"
            : "x";

export function isRelationshipType(value?: unknown): value is RelationshipType {
  return (
    [...RELATIONSHIPS, ...PARTIAL_RELATIONSHIPS] as readonly string[]
  ).includes(value as string);
}
export function defaultRelationshipType(type?: TokenType): RelationshipType {
  return isRelationshipType(type) ? type : "-->";
}

export function isOpeningWrapper(value?: unknown): value is OpeningWrapper {
  return (OPENING_WRAPPERS as readonly string[]).includes(value as string);
}
export function defaultOpeningWrapper(type?: TokenType): OpeningWrapper {
  return isOpeningWrapper(type) ? type : "{";
}

export function createToken(
  type: TokenType,
  value: string,
  line: number,
  column: number,
): Token {
  return {
    type,
    kind: getKindByType(type),
    value,
    line,
    column,
  };
}
