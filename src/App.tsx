import { CodeEditor } from "./presentation/components/CodeEditor";
import { VisualCanvas } from "./presentation/components/VisualCanvas";
import { AIPanel } from "./presentation/components/AIPanel";
import { PropertiesPanel } from "./presentation/components/PropertiesPanel";
import { ToolBar } from "./presentation/components/ToolBar";

export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <ToolBar />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-col w-80 bg-bg-secondary border-r border-fg-ternary">
          <div className="flex-1 p-4 overflow-auto">
            <CodeEditor />
          </div>
          <div className="flex-1 p-4 overflow-auto border-t border-fg-ternary">
            <AIPanel />
          </div>
        </div>
        <div className="flex-1 bg-bg-primary">
          <VisualCanvas />
        </div>
        <div className="w-80 bg-bg-secondary border-l border-fg-ternary p-4 overflow-auto">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
