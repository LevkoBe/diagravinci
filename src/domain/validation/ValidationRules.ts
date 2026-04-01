import type { DiagramModel } from "../models/DiagramModel";

export type ValidationErrorType = "orphaned" | "circular" | "invalid";

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  elementId?: string;
}

export function validateDiagram(_model: DiagramModel): ValidationError[] {
  const errors: ValidationError[] = [];
  // TODO: implement all error validations
  return errors;
}

export function detectOrphanedElements(
  _model: DiagramModel,
): ValidationError[] {
  const errors: ValidationError[] = [];
  // TODO: implement detection
  return errors;
}

export function detectCircularDependencies(
  _model: DiagramModel,
): ValidationError[] {
  const errors: ValidationError[] = [];
  // TODO: implement detection
  return errors;
}
