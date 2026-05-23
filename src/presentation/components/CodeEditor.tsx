import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useAppSelector } from "../../application/store/hooks";
import { syncManager } from "../../application/store/store";
import { AppConfig } from "../../config/appConfig";
import { useC7One, detectIsDark } from "@levkobe/c7one";

const SYNC_DEBOUNCE_MS = 300;
const TYPING_LOCK_MS = 600;

export function CodeEditor() {
  const code = useAppSelector((state) => state.diagram.code);
  const { colors } = useC7One();
  const isDark = detectIsDark(colors["--color-bg-base"]);

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  const pendingExternalCode = useRef<string | null>(null);

  const isTypingRef = useRef(false);
  const typingLockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const syncDebounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() === code) return;
    if (isTypingRef.current) return;
    pendingExternalCode.current = code;
    editor.setValue(code);
    pendingExternalCode.current = null;
  }, [code]);

  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;

    if (pendingExternalCode.current !== null) return;

    isTypingRef.current = true;
    clearTimeout(typingLockTimer.current);
    typingLockTimer.current = setTimeout(() => {
      isTypingRef.current = false;
    }, TYPING_LOCK_MS);

    clearTimeout(syncDebounceTimer.current);
    syncDebounceTimer.current = setTimeout(() => {
      syncManager.syncFromCode(value);
    }, SYNC_DEBOUNCE_MS);
  };

  return (
    <div
      data-code-editor
      className="h-full"
      onKeyDown={(e) => {
        if (e.key === "Escape") (document.activeElement as HTMLElement)?.blur();
        if (!e.ctrlKey && !e.metaKey && !e.altKey) e.stopPropagation();
      }}
    >
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        defaultValue={code}
        onMount={handleMount}
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
    </div>
  );
}
