import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@levkobe/c7one";
import { sendZoomCommand } from "../../application/store/uiSlice";
import { useAppDispatch } from "../../application/store/hooks";

export function CanvasControls() {
  const dispatch = useAppDispatch();

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 bg-bg-elevated [border-width:var(--border-width)] border-border rounded-2xl shadow-c7-xl">
      <Button
        title="Zoom in"
        variant="ghost"
        size="sm"
        className="w-9 h-9 p-0 rounded-full shrink-0"
        onClick={() => dispatch(sendZoomCommand("in"))}
      >
        <ZoomIn size={15} />
      </Button>
      <Button
        title="Zoom out"
        variant="ghost"
        size="sm"
        className="w-9 h-9 p-0 rounded-full shrink-0"
        onClick={() => dispatch(sendZoomCommand("out"))}
      >
        <ZoomOut size={15} />
      </Button>
      <Button
        title="Reset view"
        variant="ghost"
        size="sm"
        className="w-9 h-9 p-0 rounded-full shrink-0"
        onClick={() => dispatch(sendZoomCommand("reset"))}
      >
        <Maximize2 size={15} />
      </Button>
    </div>
  );
}
