import { useMemo, useState } from "react";
import { Bug, KeyRound, Lightbulb, Send, Trash2 } from "lucide-react";
import { Button } from "@levkobe/c7one";
import { DangerIconBtn } from "./DangerIconBtn";
import { AIOrchestrator } from "../../application/AIOrchestrator";
import { GeminiService } from "../../infrastructure/ai/GeminiService";
import {
  clearApiKey,
  getApiKey,
} from "../../infrastructure/ai/apiKeyStorage";
import ApiKeySetup from "./ApiKeySetup";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function Divider() {
  return <div className="h-px bg-border/60 my-2" />;
}

function Btn({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      title={title}
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      size="sm"
      className="w-9 h-9 p-0 rounded-full shrink-0"
    >
      {children}
    </Button>
  );
}

const INITIAL_MSG: Message = {
  role: "assistant",
  content: "Describe a system and I'll generate the diagram.",
};

export default function AIPanel() {
  const [apiKey, setApiKey] = useState<string | null>(() => getApiKey());
  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useContext, setUseContext] = useState(false);

  const orchestrator = useMemo(
    () => (apiKey ? new AIOrchestrator(new GeminiService(apiKey)) : null),
    [apiKey],
  );

  if (!apiKey || !orchestrator) {
    return <ApiKeySetup onKeySet={setApiKey} />;
  }

  const pushAssistant = (content: string) =>
    setMessages((prev) => [...prev, { role: "assistant", content }]);

  const runAction = async (action: () => Promise<string | void>) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await action();
      if (result) pushAssistant(result);
    } catch (err) {
      pushAssistant(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    runAction(async () => {
      await orchestrator.generateFromNaturalLanguage(userMsg, useContext);
      return useContext
        ? "Diagram updated with your changes."
        : "Diagram generated and synced.";
    });
  };

  const fixBugs = () => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Analyse for bugs & issues…" },
    ]);
    runAction(() => orchestrator.analyzeBugs());
  };

  const getSuggestions = () => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Suggest architectural improvements…" },
    ]);
    runAction(() => orchestrator.getSuggestions());
  };

  const clearChat = () => setMessages([INITIAL_MSG]);

  const handleClearKey = () => {
    clearApiKey();
    setApiKey(null);
    setMessages([INITIAL_MSG]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-bg-base">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-border/60">
        <Btn title="Analyse for bugs & issues" onClick={fixBugs} disabled={loading}>
          <Bug size={14} />
        </Btn>

        <Btn
          title="Suggest architectural improvements"
          onClick={getSuggestions}
          disabled={loading}
        >
          <Lightbulb size={14} />
        </Btn>

        <div className="w-px h-4 bg-border/40 mx-1" />

        <label
          className="flex items-center gap-1.5 cursor-pointer select-none"
          title="Use current diagram as context instead of generating a new one"
        >
          <input
            type="checkbox"
            checked={useContext}
            onChange={(e) => setUseContext(e.target.checked)}
            className="accent-accent w-3 h-3"
          />
          <span className="text-[10px] font-medium text-fg-muted uppercase tracking-wide">
            Use context
          </span>
        </label>

        <div className="flex-1" />

        <Btn title="Change API key" onClick={handleClearKey} disabled={loading}>
          <KeyRound size={14} />
        </Btn>

        <DangerIconBtn title="Clear conversation" onClick={clearChat} className="p-1.5! shrink-0">
          <Trash2 size={14} />
        </DangerIconBtn>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg border whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-accent/10 border-accent/40 text-fg-primary"
                  : "bg-bg-elevated border-border/40 text-fg-muted"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-xs text-fg-disabled animate-pulse">
            Thinking…
          </div>
        )}
      </div>

      <Divider />

      <div className="px-4 pb-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={
              useContext
                ? "Describe changes to the diagram…"
                : "Describe your diagram…"
            }
            disabled={loading}
            className="flex-1 bg-bg-elevated border border-border/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent/60"
          />

          <Btn
            title={useContext ? "Update diagram" : "Generate diagram"}
            onClick={send}
            disabled={loading || !input.trim()}
          >
            <Send size={14} />
          </Btn>
        </div>
      </div>
    </div>
  );
}
