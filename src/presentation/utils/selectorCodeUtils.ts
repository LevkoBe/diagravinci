import type { Rule, Selector } from "../../domain/models/Selector";

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function quoteIfNeeded(v: string): string {
  return /\s/.test(v) ? `"${v}"` : v;
}

function quoteLabel(v: string): string {
  if (/[^\w-]/.test(v)) return `"${v.replace(/"/g, "'")}"`;
  return v;
}

export function generateRuleLine(rule: Rule): string {
  const parts = [`!rule`, `id=${rule.id}`];
  for (const [key, value] of Object.entries(rule.patterns)) {
    parts.push(`${key}=${quoteIfNeeded(value)}`);
  }
  return parts.join("  ");
}

export function generateSelectorLine(selector: Selector): string {
  const parts = [`!selector`, `name=${quoteLabel(selector.label)}`];
  parts.push(`color=${selector.color}`);
  parts.push(`mode=${selector.mode}`);
  if (selector.expression) {
    parts.push(`expression=${quoteIfNeeded(selector.expression)}`);
  }
  return parts.join("  ");
}

const ruleLineRe = (id: string) =>
  new RegExp(`^!(?:rule|atom)\\s+id=${escapeForRegex(id)}\\b[^\n]*\n?`, "m");

export function upsertRuleInCode(rule: Rule, code: string): string {
  const line = generateRuleLine(rule);
  const re = ruleLineRe(rule.id);
  return re.test(code) ? code.replace(re, line + "\n") : line + "\n" + code;
}

export function removeRuleFromCode(id: string, code: string): string {
  return code.replace(ruleLineRe(id), "");
}

function selectorNamePattern(label: string): string {
  const escaped = escapeForRegex(label);
  return /\s/.test(label)
    ? `"${escaped}"`
    : `(?:"${escaped}"|${escaped}(?=\\s|$))`;
}

export function upsertSelectorInCode(
  selector: Selector,
  code: string,
  oldLabel?: string,
): string {
  const line = generateSelectorLine(selector);
  const searchLabel = oldLabel ?? selector.label;
  const re = new RegExp(
    `^!selector\\s+name=${selectorNamePattern(searchLabel)}[^\n]*$`,
    "m",
  );
  return re.test(code) ? code.replace(re, line) : line + "\n" + code;
}

export function removeSelectorFromCode(label: string, code: string): string {
  const re = new RegExp(
    `^!selector\\s+name=${selectorNamePattern(label)}[^\n]*\n?`,
    "m",
  );
  return code.replace(re, "");
}
