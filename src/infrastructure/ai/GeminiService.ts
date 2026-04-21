import type { AIService } from "./AIService";
import {
  buildDiagramPrompt,
  buildBugAnalysisPrompt,
  buildArchitectureSuggestionsPrompt,
} from "./PromptBuilder";
import { AppConfig } from "../../config/appConfig";

const AI = AppConfig.ai;

const MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string) || "gemini-2.5-flash-lite";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiService implements AIService {
  private apiKey: string;
  private lastCalls: number[] = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
    if (!this.apiKey) {
      throw new Error("Gemini API key is required");
    }
  }

  async generateDiagram(
    naturalLanguage: string,
    prebuiltPrompt = false,
  ): Promise<{ diagramSyntax: string; explanation: string }> {
    const now = Date.now();
    this.lastCalls = this.lastCalls.filter((t) => now - t < AI.RATE_LIMIT_WINDOW_MS);
    if (this.lastCalls.length >= AI.RATE_LIMIT_MAX_REQUESTS) {
      throw new Error(
        `Rate limit reached (${AI.RATE_LIMIT_MAX_REQUESTS} requests/min). Please wait ${AI.RATE_LIMIT_WINDOW_MS / 1000} seconds.`,
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
        temperature: AI.DIAGRAM_TEMPERATURE,
        maxOutputTokens: AI.DIAGRAM_MAX_TOKENS,
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
    this.lastCalls = this.lastCalls.filter((t) => now - t < AI.RATE_LIMIT_WINDOW_MS);
    if (this.lastCalls.length >= AI.RATE_LIMIT_MAX_REQUESTS) {
      throw new Error(
        `Rate limit reached (${AI.RATE_LIMIT_MAX_REQUESTS} requests/min). Please wait ${AI.RATE_LIMIT_WINDOW_MS / 1000} seconds.`,
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
        temperature: AI.ANALYSIS_TEMPERATURE,
        maxOutputTokens: AI.ANALYSIS_MAX_TOKENS,
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
