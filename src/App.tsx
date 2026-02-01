import { CodeEditor } from "./presentation/components/CodeEditor";
import { VisualCanvas } from "./presentation/components/VisualCanvas";
import { AIPanel } from "./presentation/components/AIPanel";
import { PropertiesPanel } from "./presentation/components/PropertiesPanel";
import { ToolBar } from "./presentation/components/ToolBar";

export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <ToolBar />
      <div className="flex-1 flex text-yellow-400">
        <div className="flex flex-col w-80 bg-gray-700 border-r border-gray-700 p-4">
          <div className="flex-1">
            <CodeEditor />
          </div>
          <div className="flex-1">
            <AIPanel />
          </div>
        </div>
        <div className="flex-1 bg-gray-800 p-4">
          <VisualCanvas />
        </div>
        <div className="w-80 bg-gray-700 border-l border-gray-700 p-4">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
