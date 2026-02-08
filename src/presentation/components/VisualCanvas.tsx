import { useAppSelector } from "../../application/store/hooks";
import { ElementNode } from "./canvasComponents/ElementNode";

export function VisualCanvas() {
  const model = useAppSelector((state) => state.diagram.model);
  const elements = Array.from(Object.values(model.elements));

  const rootElements = elements.filter((e) =>
    model.root.childIds.includes(e.id),
  );

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-600">
        <h2 className="text-sm font-semibold text-gray-400">
          Visual Canvas ({elements.length} elements)
        </h2>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="space-y-4">
          {rootElements.map((element) => (
            <ElementNode key={element.id} element={element} model={model} />
          ))}

          {Array.from(Object.values(model.relationships)).map((rel) => (
            <div
              key={rel.id}
              className="text-sm text-gray-400 border-gray-400 bg-gray-900 p-2 rounded mb-1"
            >
              {rel.source} {rel.type} {rel.target}
              {rel.label && <span className="text-xs ml-2">({rel.label})</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
