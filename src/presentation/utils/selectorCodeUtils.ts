import type { SelectorAtom } from "../../domain/models/Selector";
import type { FilterPreset } from "../../domain/models/Selector";

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function quoteIfNeeded(v: string): string {
  return /\s/.test(v) ? `"${v}"` : v;
}

export function generateAtomLine(atom: SelectorAtom): string {
  const parts = [`!atom`, `id=${atom.id}`];
  if (atom.name) parts.push(`name=${atom.name}`);
  for (const [key, value] of Object.entries(atom.patterns)) {
    parts.push(`${key}=${quoteIfNeeded(value)}`);
  }
  return parts.join("  ");
}

export function generateSelectorLine(preset: FilterPreset): string {
  const parts = [`!selector`, `name=${preset.id}`];
  parts.push(`color=${preset.color}`);
  parts.push(`mode=${preset.mode}`);
  if (preset.selector.combiner) {
    parts.push(`combiner=${quoteIfNeeded(preset.selector.combiner)}`);
  }
  return parts.join("  ");
}

export function upsertAtomInCode(atom: SelectorAtom, code: string): string {
  const line = generateAtomLine(atom);
  const re = new RegExp(`^!atom\\s+id=${escapeForRegex(atom.id)}\\b[^\n]*\n?`, "m");
  return re.test(code) ? code.replace(re, line + "\n") : line + "\n" + code;
}

export function removeAtomFromCode(id: string, code: string): string {
  const re = new RegExp(`^!atom\\s+id=${escapeForRegex(id)}\\b[^\n]*\n?`, "m");
  return code.replace(re, "");
}

export function upsertPresetInCode(preset: FilterPreset, code: string): string {
  const line = generateSelectorLine(preset);
  const re = new RegExp(`^!selector\\s+name=${escapeForRegex(preset.id)}\\b[^\n]*$`, "m");
  return re.test(code) ? code.replace(re, line) : line + "\n" + code;
}

export function removePresetFromCode(id: string, code: string): string {
  const re = new RegExp(`^!selector\\s+name=${escapeForRegex(id)}\\b[^\n]*\n?`, "m");
  return code.replace(re, "");
}
