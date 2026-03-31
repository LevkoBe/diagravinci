import { GeminiService } from "../infrastructure/ai/GeminiService";
import { ResponseValidator } from "../infrastructure/ai/ResponseValidator";
import { buildContextAwareDiagramPrompt } from "../infrastructure/ai/PromptBuilder";
import type { AIService } from "../infrastructure/ai/AIService";
import { store, syncManager } from "./store/store";

export class AIOrchestrator {
  private service: AIService;

  constructor(apiKey: string) {
    this.service = new GeminiService(apiKey);
  }

  async generateFromNaturalLanguage(
    prompt: string,
    withContext = false,
  ): Promise<void> {
    try {
      const effectivePrompt = withContext
        ? buildContextAwareDiagramPrompt(
            prompt,
            store.getState().diagram.code,
          )
        : prompt;

      const result = await this.service.generateDiagram(effectivePrompt, withContext);

      if (!ResponseValidator.isValidDiagramSyntax(result.diagramSyntax)) {
        throw new Error(
          "AI produced invalid diagram syntax - retrying once...",
        );
      }

      syncManager.syncFromAI(result.diagramSyntax);

      console.info("✅ AI generated:", result.explanation);
    } catch (error) {
      console.error("AIOrchestrator failed:", error);
      throw error;
    }
  }

  async analyzeBugs(): Promise<string> {
    const code = store.getState().diagram.code;
    if (!code?.trim()) {
      return "No diagram code found. Generate or write a diagram first.";
    }
    try {
      const result = await this.service.analyzeCode(code, "bugs");
      return result.analysis;
    } catch (error) {
      console.error("AIOrchestrator.analyzeBugs failed:", error);
      throw error;
    }
  }

  async getSuggestions(): Promise<string> {
    const code = store.getState().diagram.code;
    if (!code?.trim()) {
      return "No diagram code found. Generate or write a diagram first.";
    }
    try {
      const result = await this.service.analyzeCode(code, "suggestions");
      return result.analysis;
    } catch (error) {
      console.error("AIOrchestrator.getSuggestions failed:", error);
      throw error;
    }
  }
}

