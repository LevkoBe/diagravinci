import type { Group, SelectorMode } from "../../domain/models/Selector";

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function generateGroupLine(group: Group): string {
  const parts = [`!group`, `id=${group.id}`];
  parts.push(`color=${group.color}`);
  if (group.regex) parts.push(`regex=${group.regex}`);
  if (group.compose) parts.push(`compose=${group.compose}`);
  return parts.join("  ");
}

const groupLineRe = (id: string) =>
  new RegExp(`^!group\\s+id=${escapeForRegex(id)}\\b[^\n]*\n?`, "m");

export function upsertGroupInCode(group: Group, code: string): string {
  const line = generateGroupLine(group);
  const re = groupLineRe(group.id);
  return re.test(code) ? code.replace(re, line + "\n") : line + "\n" + code;
}

export function removeGroupFromCode(id: string, code: string): string {
  return code.replace(groupLineRe(id), "");
}

const sessionLineRe = (sessionId: string) =>
  new RegExp(`^(!session\\b[^\n]*\\bid=${escapeForRegex(sessionId)}\\b[^\n]*)$`, "m");

export function upsertSessionModeInCode(
  sessionId: string,
  entityId: string,
  mode: SelectorMode,
  code: string,
): string {
  const re = sessionLineRe(sessionId);
  const match = code.match(re);
  if (!match) {
    if (mode === "off") return code;
    const label = sessionId.charAt(0).toUpperCase() + sessionId.slice(1);
    const quotedLabel = /[^\w-]/.test(label) ? `"${label.replace(/"/g, "'")}"` : label;
    const newLine = `!session  id=${sessionId}  label=${quotedLabel}  groups=${entityId}:${mode}`;
    const sep = code.length > 0 && !code.endsWith("\n") ? "\n" : "";
    return code + sep + newLine + "\n";
  }

  const line = match[1];
  const modesMatch = line.match(/(?:groups|selectors)=(\S+)/); // selectors= for backward compat
  const entries: [string, SelectorMode][] = [];
  if (modesMatch) {
    for (const entry of modesMatch[1].split(",")) {
      const colonIdx = entry.lastIndexOf(":");
      if (colonIdx < 0) continue;
      entries.push([entry.slice(0, colonIdx), entry.slice(colonIdx + 1) as SelectorMode]);
    }
  }

  const idx = entries.findIndex(([id]) => id === entityId);
  if (mode === "off") {
    if (idx >= 0) entries.splice(idx, 1);
  } else if (idx >= 0) {
    entries[idx] = [entityId, mode];
  } else {
    entries.push([entityId, mode]);
  }

  const modesStr = entries.map(([id, m]) => `${id}:${m}`).join(",");
  let newLine: string;
  if (modesMatch) {
    newLine = modesStr
      ? line.replace(/(?:groups|selectors)=\S+/, `groups=${modesStr}`)
      : line.replace(/\s+(?:groups|selectors)=\S+/, "");
  } else if (modesStr) {
    newLine = `${line}  groups=${modesStr}`;
  } else {
    newLine = line;
  }
  return code.replace(re, newLine);
}
