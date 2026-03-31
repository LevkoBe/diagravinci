import Editor from "@monaco-editor/react";
import { useAppSelector } from "../../application/store/hooks";
import { syncManager } from "../../application/store/store";
import { AppConfig } from "../../config/appConfig";

export function CodeEditor() {
  const code = useAppSelector((state) => state.diagram.code);

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      syncManager.syncFromCode(value);
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
            fontSize: AppConfig.editor.FONT_SIZE,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: AppConfig.editor.TAB_SIZE,
          }}
        />
      </div>
    </div>
  );
}
