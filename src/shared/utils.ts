export function getCSSVariable(name: string): string {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}
