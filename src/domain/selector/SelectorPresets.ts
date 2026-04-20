function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function namePreset(name: string): string {
  if (!name) return ".*";
  return `[^.]*${escapeRx(name)}[^.]*$`;
}

export function levelPreset(min: number, max: number): string {
  const lo = Math.max(0, min - 1);
  const hi = Math.max(lo, max - 1);
  if (lo === 0 && hi === 0) return "^[^.]+$";
  if (lo === hi) return `^([^.]*\\.){${lo}}[^.]+$`;
  return `^([^.]*\\.){${lo},${hi}}[^.]+$`;
}
