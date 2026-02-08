import Editor from "@monaco-editor/react";
import { useAppSelector, useAppDispatch } from "../../application/store/hooks";
import { parseCode } from "../../application/store/diagramSlice";

export function CodeEditor() {
  const code = useAppSelector((state) => state.diagram.code);
  const dispatch = useAppDispatch();

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      dispatch(parseCode(value));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div>
        <h2 className="text-sm font-semibold mb-2">Code Editor</h2>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="plaintext"
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
