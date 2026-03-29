import type { AIService } from "./AIService";
import {
  buildDiagramPrompt,
  buildBugAnalysisPrompt,
  buildArchitectureSuggestionsPrompt,
} from "./PromptBuilder";

const MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string) || "gemini-2.5-flash-lite";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiService implements AIService {
  private apiKey: string;
  private lastCalls: number[] = [];

  constructor() {
    this.apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim();
    if (!this.apiKey) {
      throw new Error("VITE_GEMINI_API_KEY is missing in .env.local");
    }
  }

  async generateDiagram(
    naturalLanguage: string,
    prebuiltPrompt = false,
  ): Promise<{ diagramSyntax: string; explanation: string }> {
    const now = Date.now();
    this.lastCalls = this.lastCalls.filter((t) => now - t < 60000);
    if (this.lastCalls.length >= 5) {
      throw new Error(
        "Rate limit reached (5 requests/min). Please wait 60 seconds.",
      );
    }
    this.lastCalls.push(now);

    const prompt = prebuiltPrompt
      ? naturalLanguage
      : buildDiagramPrompt(naturalLanguage);

    const payload = {
      systemInstruction: {
        parts: [
          {
            text: "You are Diagravinci's AI diagram expert. Answer as requested.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "text/plain",
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    };

    const resp = await fetch(`${API_URL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        throw new Error("Gemini rate limit (429). Wait a minute.");
      if (resp.status === 404)
        throw new Error(
          "Model not found — please check MODEL name in GeminiService.ts",
        );
      throw new Error(`Gemini HTTP ${resp.status}: ${await resp.text()}`);
    }

    const data = await resp.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== "string") {
      throw new Error("Empty response from Gemini");
    }

    const diagram = text.trim();

    return {
      diagramSyntax: diagram,
      explanation: "AI-generated diagram (prompt requested raw DSL only)",
    };
  }

  async analyzeCode(
    code: string,
    mode: "bugs" | "suggestions",
  ): Promise<{ analysis: string }> {
    const now = Date.now();
    this.lastCalls = this.lastCalls.filter((t) => now - t < 60000);
    if (this.lastCalls.length >= 5) {
      throw new Error(
        "Rate limit reached (5 requests/min). Please wait 60 seconds.",
      );
    }
    this.lastCalls.push(now);

    const prompt =
      mode === "bugs"
        ? buildBugAnalysisPrompt(code)
        : buildArchitectureSuggestionsPrompt(code);

    const payload = {
      systemInstruction: {
        parts: [
          {
            text: "You are Diagravinci's AI diagram expert. Answer as requested.",
          },
        ],
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "text/plain",
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    };

    const resp = await fetch(`${API_URL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        throw new Error("Gemini rate limit (429). Wait a minute.");
      throw new Error(`Gemini HTTP ${resp.status}: ${await resp.text()}`);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== "string") {
      throw new Error("Empty response from Gemini");
    }

    return { analysis: text.trim() };
  }
}
