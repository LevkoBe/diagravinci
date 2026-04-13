import { DynamicPanelRoot } from "@levkobe/c7one";
import type { WindowDef, LayoutNodeDecl } from "@levkobe/c7one";
import {
  Code2,
  Bot,
  LayoutPanelLeft,
  Settings2,
  BookOpen,
  Wrench,
  ListFilter,
  SlidersHorizontal,
} from "lucide-react";
import { useUndoRedo } from "./presentation/hooks/useUndoRedo";
import { CodeEditor } from "./presentation/components/CodeEditor";
import { VisualCanvas } from "./presentation/components/VisualCanvas";
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
    id: "canvas",
    title: "Visual Canvas",
    icon: <LayoutPanelLeft size={16} aria-hidden="true" />,
    component: VisualCanvas,
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
    title: "Filters",
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
  direction: "vertical",
  sizes: [12, 88],
  children: [
    { type: "leaf", windowId: "toolbar" },
    {
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
        { type: "leaf", windowId: "canvas", isDefault: true },
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
    },
  ],
};

export default function App() {
  useUndoRedo();

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg-base text-fg-primary">
      <DynamicPanelRoot
        windows={WINDOWS}
        layout={DEFAULT_LAYOUT}
        storageKey="diagravinci-layout-v2"
        className="w-full h-full"
      />
    </div>
  );
}
