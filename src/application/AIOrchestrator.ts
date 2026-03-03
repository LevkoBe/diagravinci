import { GeminiService } from "../infrastructure/ai/GeminiService";
import { ResponseValidator } from "../infrastructure/ai/ResponseValidator";
import type { AIService } from "../infrastructure/ai/AIService";
import { syncManager } from "./store/store";

export class AIOrchestrator {
  private service: AIService;

  constructor() {
    this.service = new GeminiService();
  }

  async generateFromNaturalLanguage(prompt: string): Promise<void> {
    try {
      const result = await this.service.generateDiagram(prompt);

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
}

export const aiOrchestrator = new AIOrchestrator();
