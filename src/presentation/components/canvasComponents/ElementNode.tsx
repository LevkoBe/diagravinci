import type { DiagramModel } from "../../../domain/models/DiagramModel";
import type { Element } from "../../../domain/models/Element";

export function ElementNode({
  element,
  model,
  path = new Set<string>(),
}: {
  element: Element;
  model: DiagramModel;
  path?: Set<string>;
}) {
  const isCycle = path.has(element.id);

  return (
    <div>
      <div className="bg-gray-800 border border-gray-600 rounded p-3 shadow-sm">
        <div className="font-semibold text-gray-400">
          {element.id}{" "}
          <span className="text-xs text-gray-400">{element.type}</span>
          {isCycle && (
            <span className="ml-2 text-xs text-red-500">
              ↺ circular reference
            </span>
          )}
        </div>

        {!isCycle && (
          <div className="mt-2 space-y-2">
            {Array.from(element.childIds)
              .map((id) => model.elements[id])
              .filter((child): child is Element => child !== undefined)
              .map((child) => (
                <ElementNode
                  key={child.id}
                  element={child}
                  model={model}
                  path={new Set(path).add(element.id)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
