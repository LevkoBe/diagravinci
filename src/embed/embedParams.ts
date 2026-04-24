import type { ViewState } from "../domain/models/ViewState";

export type EmbedTheme = "light" | "dark";

const VALID_VIEW_MODES: ViewState["viewMode"][] = [
  "basic",
  "hierarchical",
  "timeline",
  "pipeline",
  "circular",
  "execute",
];

export interface EmbedParams {
  diagram: string;
  theme: EmbedTheme;
  viewMode: ViewState["viewMode"];
  classDiagram: boolean;
}

export function parseEmbedParams(): EmbedParams {
  const params = new URLSearchParams(window.location.search);

  const rawViewMode = params.get("viewMode") ?? "";
  const viewMode = (VALID_VIEW_MODES as string[]).includes(rawViewMode)
    ? (rawViewMode as ViewState["viewMode"])
    : "basic";

  return {
    diagram: params.get("diagram") ?? "",
    theme: params.get("theme") === "dark" ? "dark" : "light",
    viewMode,
    classDiagram: params.get("classDiagram") !== "off",
  };
}
