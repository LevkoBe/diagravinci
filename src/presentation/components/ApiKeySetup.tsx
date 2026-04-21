import { useState } from "react";
import { Key, ExternalLink } from "lucide-react";
import { setApiKey } from "../../infrastructure/ai/apiKeyStorage";

export default function ApiKeySetup({ onKeySet }: { onKeySet: (key: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const save = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter your API key.");
      return;
    }
    setApiKey(trimmed);
    onKeySet(trimmed);
  };

  return (
    <div className="w-full h-full flex flex-col bg-bg-base">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-border/60">
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-accent/50 bg-accent/6">
          <span className="text-[9px] font-bold text-accent/70 tracking-widest uppercase mr-1 select-none">
            AI
          </span>
          <Key size={14} />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 gap-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-fg-primary">Gemini API key required</p>
          <p className="text-xs text-fg-muted leading-relaxed">
            AI features use the Google Gemini API. Your key is stored in your
            browser only and sent directly to Google — it never touches any
            server we operate.
          </p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Get a free key at Google AI Studio
            <ExternalLink size={11} />
          </a>
        </div>

        <div className="space-y-2">
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="AIza…"
            className="w-full bg-bg-elevated border border-border/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent/60"
          />
          {error && <p className="text-xs text-error">{error}</p>}
          <button
            onClick={save}
            className="w-full px-3 py-2 rounded-md bg-accent/15 border border-accent/40 text-sm text-accent hover:bg-accent/25 transition-colors"
          >
            Save key
          </button>
        </div>
      </div>
    </div>
  );
}
