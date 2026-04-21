import type { ThemeTokens } from "@levkobe/c7one";

export const parchmentTheme: ThemeTokens = {
  "--color-bg-base": "#e9cc8c",
  "--color-bg-elevated": "#d9bd7a",
  "--color-bg-overlay": "#f2dda8",
  "--color-fg-primary": "#4a3821",
  "--color-fg-muted": "#726a63",
  "--color-fg-disabled": "#978d84",
  "--color-accent": "#a06527",
  "--color-accent-hover": "#8a5520",
  "--color-success": "#5b8e4e",
  "--color-warning": "#c47835",
  "--color-error": "#b41e1e",
  "--color-border": "#978d84",
  "--color-shadow": "#6a594c",
};

export const diagraVinciDark: ThemeTokens = {
  "--color-bg-base": "#0b0d10",
  "--color-bg-elevated": "#151820",
  "--color-bg-overlay": "#1f2329",
  "--color-fg-primary": "#e8f2ff",
  "--color-fg-muted": "#8b98ab",
  "--color-fg-disabled": "#5a6478",
  "--color-accent": "#4a9eff",
  "--color-accent-hover": "#6ab4ff",
  "--color-success": "#6fcf97",
  "--color-warning": "#ffb84d",
  "--color-error": "#ff4d4d",
  "--color-border": "#5a6478",
  "--color-shadow": "#ffffff",
};

export const lightStateTokens: Record<string, string> = {
  "--color-state-selected": "#3773d5",
  "--color-state-child": "#c47835",
  "--color-state-parent": "#6b8e4e",
  "--color-state-anchored": "#8b6b9d",
  "--color-state-secondary": "#5b7c9e",
};

export const darkStateTokens: Record<string, string> = {
  "--color-state-selected": "#ffb84d",
  "--color-state-child": "#ff8c42",
  "--color-state-parent": "#6fcf97",
  "--color-state-anchored": "#bb6bd9",
  "--color-state-secondary": "#4a9eff",
};
