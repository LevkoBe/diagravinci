import { useEffect, useMemo, useState } from "react";
import { Provider } from "react-redux";
import { C7OneProvider } from "@levkobe/c7one";
import { DynamicPanelRoot } from "@levkobe/c7one";
import type { WindowDef, LayoutNodeDecl, ThemeTokens } from "@levkobe/c7one";
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
    () => createEmbedStore(params.diagram, params.viewMode, params.classDiagram, params.relLineStyle),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const baseColors = params.theme === "dark" ? diagraVinciDark : parchmentTheme;
  const baseTokens = params.theme === "dark" ? darkStateTokens : lightStateTokens;

  const [colors, setColors] = useState<ThemeTokens>(() => ({
    ...baseColors,
    ...params.colorOverrides,
  }));
  const [tokens, setTokens] = useState<Record<string, string>>(() => ({
    ...baseTokens,
    ...params.tokenOverrides,
  }));

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data) return;
      if (event.data.type === "SET_COLORS") {
        const { colors: colorOverrides, tokens: tokenOverrides } = event.data as {
          type: string;
          colors?: Partial<ThemeTokens>;
          tokens?: Record<string, string>;
        };
        if (colorOverrides) setColors((prev) => ({ ...prev, ...colorOverrides }));
        if (tokenOverrides) setTokens((prev) => ({ ...prev, ...tokenOverrides }));
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
