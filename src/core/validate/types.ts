// src/core/validate/types.ts

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  path: string;
  fixerId?: string;
  fixable?: boolean;
}

export interface ValidationReport {
  valid: boolean;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
}

export interface ValidateOptions {
  allowlist?: string[];
  strict?: boolean;
}
