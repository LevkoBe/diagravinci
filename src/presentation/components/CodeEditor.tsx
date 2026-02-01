import { useAppSelector, useAppDispatch } from "../../application/store/hooks";
import { setCode } from "../../application/store/diagramSlice";

export function CodeEditor() {
  const code = useAppSelector((state) => state.diagram.code);
  const dispatch = useAppDispatch();

  const handleCodeChange = (newCode: string) => {
    dispatch(setCode(newCode));
    // TODO: trigger sync from code
  };

  return (
    <div className="h-full flex flex-col">
      <div>
        <h2 className="text-sm font-semibold mb-2">Code Editor</h2>
      </div>
      <div className="w-full h-full">
        <textarea
          className="w-full h-full font-mono text-sm border border-gray-300 p-2"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="Type diagram code here"
        />
      </div>
    </div>
  );
}
