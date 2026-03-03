import { useState, useRef } from "react";
import { CodeEditor } from "./presentation/components/CodeEditor";
import { VisualCanvas } from "./presentation/components/VisualCanvas";
import { PropertiesPanel } from "./presentation/components/PropertiesPanel";
import { ToolBar } from "./presentation/components/ToolBar";
import AIPanel from "./presentation/components/AIPanel";

export default function App() {
  const [leftWidth, setLeftWidth] = useState(340);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const startDrag = () => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
  };

  const stopDrag = () => {
    isDragging.current = false;
    document.body.style.cursor = "default";
  };

  const onDrag = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const bounds = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - bounds.left;

    const min = 260;
    const max = bounds.width - 400;

    if (newWidth > min && newWidth < max) {
      setLeftWidth(newWidth);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-primary">
      <ToolBar />

      <div
        ref={containerRef}
        onMouseMove={onDrag}
        onMouseUp={stopDrag}
        className="flex flex-1 overflow-hidden gap-2 p-2"
      >
        <div
          style={{ width: leftWidth }}
          className="flex flex-col shrink-0 rounded-lg overflow-hidden border border-fg-ternary/50 shadow-parchment bg-bg-secondary"
        >
          <div className="flex-1 overflow-auto p-3 min-h-0">
            <CodeEditor />
          </div>
          <div className="flex-1 overflow-auto p-3 min-h-0 border-t-2 border-fg-ternary/50">
            <AIPanel />
          </div>
        </div>

        {/* Drag Divider */}
        <div
          onMouseDown={startDrag}
          className="w-1.5 cursor-col-resize bg-fg-ternary/40 hover:bg-accent/60 transition-colors rounded"
        />

        <div className="flex-1 rounded-lg overflow-hidden border border-fg-ternary/50 shadow-parchment bg-bg-primary">
          <VisualCanvas />
        </div>

        <div className="w-72 shrink-0 rounded-lg overflow-hidden border border-fg-ternary/50 shadow-parchment bg-bg-secondary">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
