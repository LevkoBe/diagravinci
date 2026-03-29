export interface AIService {
  generateDiagram(
    naturalLanguage: string,
    prebuiltPrompt?: boolean,
  ): Promise<{ diagramSyntax: string; explanation: string }>;

  analyzeCode(
    code: string,
    mode: "bugs" | "suggestions",
  ): Promise<{ analysis: string }>;
}
