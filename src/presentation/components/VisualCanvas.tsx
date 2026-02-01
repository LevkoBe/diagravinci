import { useAppSelector } from "../../application/store/hooks";

export function VisualCanvas() {
  const diagram = useAppSelector((state) => state.diagram.visualDiagram);
  return <h2 className="text-sm font-semibold mb-2">Canvas</h2>;
}
