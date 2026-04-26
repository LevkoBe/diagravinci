import { AppShell, PRIMARY_WINDOW_ID } from "@levkobe/c7one";
import type { WindowDef, LayoutNodeDecl } from "@levkobe/c7one";
import {
  Code2,
  Bot,
  Settings2,
  BookOpen,
  Wrench,
  ListFilter,
  SlidersHorizontal,
} from "lucide-react";
import { useUndoRedo } from "./presentation/hooks/useUndoRedo";
import { VisualCanvas } from "./presentation/components/VisualCanvas";
import { CodeEditor } from "./presentation/components/CodeEditor";
import { PropertiesPanel } from "./presentation/components/PropertiesPanel";
import { ToolBar } from "./presentation/components/ToolBar";
import AIPanel from "./presentation/components/AIPanel";
import { TemplatePanel } from "./presentation/components/TemplatePanel";
import { FiltersPanel } from "./presentation/components/FilterModal";
import { AppSettingsPanel } from "./presentation/components/AppSettingsPanel";

const WINDOWS: WindowDef[] = [
  {
    id: "toolbar",
    title: "Toolbar",
    icon: <Wrench size={16} aria-hidden="true" />,
    component: ToolBar,
    headless: true,
  },
  {
    id: "editor",
    title: "Code Editor",
    icon: <Code2 size={16} aria-hidden="true" />,
    component: CodeEditor,
  },
  {
    id: "ai",
    title: "AI Assistant",
    icon: <Bot size={16} aria-hidden="true" />,
    component: AIPanel,
  },
  {
    id: "properties",
    title: "Properties",
    icon: <Settings2 size={16} aria-hidden="true" />,
    component: PropertiesPanel,
  },
  {
    id: "templates",
    title: "Templates",
    icon: <BookOpen size={16} aria-hidden="true" />,
    component: TemplatePanel,
  },
  {
    id: "filters",
    title: "Selectors",
    icon: <ListFilter size={16} aria-hidden="true" />,
    component: FiltersPanel,
  },
  {
    id: "settings",
    title: "Settings",
    icon: <SlidersHorizontal size={16} aria-hidden="true" />,
    component: AppSettingsPanel,
  },
];

const DEFAULT_LAYOUT: LayoutNodeDecl = {
  type: "group",
  direction: "horizontal",
  sizes: [25, 50, 25],
  children: [
    {
      type: "group",
      direction: "vertical",
      sizes: [55, 45],
      children: [
        { type: "leaf", windowId: "editor" },
        { type: "leaf", windowId: "ai" },
      ],
    },
    { type: "leaf", windowId: PRIMARY_WINDOW_ID, isDefault: true },
    {
      type: "group",
      direction: "vertical",
      sizes: [55, 45],
      children: [
        { type: "leaf", windowId: "properties" },
        { type: "leaf", windowId: "templates" },
      ],
    },
  ],
};

export default function App() {
  useUndoRedo();

  return (
    <AppShell
      className="fixed inset-0"
      logo={
        <span className="text-sm font-bold tracking-tight text-fg-primary">
          Diagra<span className="text-accent">Vinci</span>
        </span>
      }
      headerActions={<ToolBar />}
      windows={WINDOWS}
      layout={DEFAULT_LAYOUT}
      storageKey="diagravinci-layout-v4"
    >
      <VisualCanvas />
    </AppShell>
  );
}
