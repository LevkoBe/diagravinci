import Editor from "@monaco-editor/react";
import { useAppSelector } from "../../application/store/hooks";
import { syncManager } from "../../application/store/store";
import { AppConfig } from "../../config/appConfig";
import { useC7One, detectIsDark } from "@levkobe/c7one";

export function CodeEditor() {
  const code = useAppSelector((state) => state.diagram.code);
  const { colors } = useC7One();
  const isDark = detectIsDark(colors["--color-bg-base"]);

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      syncManager.syncFromCode(value);
    }
  };

  return (
    <Editor
      height="100%"
      defaultLanguage="plaintext"
      value={code}
      onChange={handleCodeChange}
      theme={isDark ? "vs-dark" : "vs"}
      options={{
        minimap: { enabled: false },
        fontSize: AppConfig.editor.FONT_SIZE,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: AppConfig.editor.TAB_SIZE,
      }}
    />
  );
}
