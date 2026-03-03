import { useState } from "react";
import { Send, Sparkles, Trash2 } from "lucide-react";
import { aiOrchestrator } from "../../application/AIOrchestrator";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function Divider() {
  return <div className="h-px bg-fg-ternary/60 my-2" />;
}

function Pill({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-accent/50 bg-accent/6">
      <span className="text-[9px] font-bold text-accent/70 tracking-widest uppercase mr-1 select-none">
        {label}
      </span>
      {children}
    </div>
  );
}

function Btn({
  children,
  title,
  danger,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        "btn-icon",
        danger ? "danger" : "",
        disabled ? "opacity-40 cursor-not-allowed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export default function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Describe a system and I’ll generate the diagram.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      await aiOrchestrator.generateFromNaturalLanguage(userMsg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Diagram generated and synced." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Describe a system and I’ll generate the diagram.",
      },
    ]);
  };

  return (
    <div className="w-full h-full flex flex-col border-l-2 border-fg-ternary/60 bg-bg-primary">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-fg-ternary/60">
        <Pill label="AI">
          <Sparkles size={14} />
        </Pill>

        <div className="flex-1" />

        <Btn title="Clear conversation" danger onClick={clearChat}>
          <Trash2 size={14} />
        </Btn>
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
              className={`max-w-[85%] px-3 py-2 rounded-lg border ${
                m.role === "user"
                  ? "bg-accent/10 border-accent/40 text-fg-primary"
                  : "bg-bg-secondary border-fg-ternary/40 text-fg-secondary"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-xs text-fg-ternary animate-pulse">Thinking…</div>
        )}
      </div>

      <Divider />

      <div className="px-4 pb-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Describe your diagram..."
            disabled={loading}
            className="flex-1 bg-bg-secondary border border-fg-ternary/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent/60"
          />

          <Btn
            title="Generate diagram"
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
