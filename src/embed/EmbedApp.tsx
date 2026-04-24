import { useMemo } from "react";
import { Provider } from "react-redux";
import { C7OneProvider } from "@levkobe/c7one";
import { DynamicPanelRoot } from "@levkobe/c7one";
import type { WindowDef, LayoutNodeDecl } from "@levkobe/c7one";
import { LayoutPanelLeft } from "lucide-react";
import { VisualCanvas } from "../presentation/components/VisualCanvas";
import {
  parchmentTheme,
  diagraVinciDark,
  lightStateTokens,
  darkStateTokens,
} from "../themes";
import { parseEmbedParams } from "./embedParams";
import { createEmbedStore } from "./embedStore";
import { useEmbedMessages } from "./useEmbedMessages";

const EMBED_WINDOWS: WindowDef[] = [
  {
    id: "canvas",
    title: "Visual Canvas",
    icon: <LayoutPanelLeft size={16} aria-hidden="true" />,
    component: VisualCanvas,
  },
];

const EMBED_LAYOUT: LayoutNodeDecl = {
  type: "leaf",
  windowId: "canvas",
  isDefault: true,
};

function EmbedCanvas() {
  useEmbedMessages();
  return (
    <div className="fixed inset-0 overflow-hidden bg-bg-base text-fg-primary">
      <DynamicPanelRoot
        windows={EMBED_WINDOWS}
        layout={EMBED_LAYOUT}
      />
    </div>
  );
}

export default function EmbedApp() {
  const params = useMemo(() => parseEmbedParams(), []);
  const store = useMemo(
    () => createEmbedStore(params.diagram, params.viewMode, params.classDiagram),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const colors = params.theme === "dark" ? diagraVinciDark : parchmentTheme;
  const tokens = params.theme === "dark" ? darkStateTokens : lightStateTokens;

  return (
    <Provider store={store}>
      <C7OneProvider
        defaultMode="classic"
        config={{ colors, tokens }}
      >
        <EmbedCanvas />
      </C7OneProvider>
    </Provider>
  );
}
