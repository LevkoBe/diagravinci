import type { ViewState } from "../domain/models/ViewState";
import type { ThemeTokens } from "@levkobe/c7one";
import type { RelLineStyle } from "../application/store/uiSlice";

export type EmbedTheme = "light" | "dark";

const VALID_VIEW_MODES: ViewState["viewMode"][] = [
  "basic",
  "hierarchical",
  "timeline",
  "pipeline",
  "circular",
  "radial",
];

const VALID_REL_LINE_STYLES: RelLineStyle[] = [
  "straight",
  "curved",
  "orthogonal",
];

export interface EmbedParams {
  diagram: string;
  theme: EmbedTheme;
  viewMode: ViewState["viewMode"];
  classDiagram: boolean;
  relLineStyle: RelLineStyle;
  colorOverrides: Partial<ThemeTokens> | null;
  tokenOverrides: Record<string, string> | null;
}

function tryParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function parseEmbedParams(): EmbedParams {
  const params = new URLSearchParams(window.location.search);

  const rawViewMode = params.get("viewMode") ?? "";
  const viewMode = (VALID_VIEW_MODES as string[]).includes(rawViewMode)
    ? (rawViewMode as ViewState["viewMode"])
    : "basic";

  const rawRelLineStyle = params.get("relLineStyle") ?? "";
  const relLineStyle = (VALID_REL_LINE_STYLES as string[]).includes(
    rawRelLineStyle,
  )
    ? (rawRelLineStyle as RelLineStyle)
    : "straight";

  return {
    diagram: params.get("diagram") ?? "",
    theme: params.get("theme") === "dark" ? "dark" : "light",
    viewMode,
    classDiagram: params.get("classDiagram") !== "off",
    relLineStyle,
    colorOverrides: tryParseJson<Partial<ThemeTokens>>(params.get("colors")),
    tokenOverrides: tryParseJson<Record<string, string>>(params.get("tokens")),
  };
}
