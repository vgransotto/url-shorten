export interface ValidationIssue {
  path: string;
  message: string;
}

export class ValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super("Validation failed");
  }
}
