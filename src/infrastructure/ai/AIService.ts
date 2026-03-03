export interface AIService {
  generateDiagram(
    naturalLanguage: string,
  ): Promise<{ diagramSyntax: string; explanation: string }>;
}
