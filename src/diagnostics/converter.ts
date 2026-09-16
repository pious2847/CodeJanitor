import * as vscode from 'vscode';
import { CodeIssue } from '../models';

/**
 * Converts certainty level to VS Code DiagnosticSeverity
 */
export function certaintyToDiagnosticSeverity(certainty: CodeIssue['certainty']): vscode.DiagnosticSeverity {
  const severityMap: Record<CodeIssue['certainty'], vscode.DiagnosticSeverity> = {
    high: vscode.DiagnosticSeverity.Warning,
    medium: vscode.DiagnosticSeverity.Hint,
    low: vscode.DiagnosticSeverity.Information,
  };
  return severityMap[certainty];
}

/**
 * Truncate long explanation strings for diagnostics
 */
export function truncate(s: string, n: number) {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

/**
 * Build a user-friendly diagnostic message
 */
export function buildDiagnosticMessage(issue: CodeIssue): string {
  // Prepend certainty tag and include a short explanation if available
  const certaintyTag = issue.certainty ? `[${issue.certainty.toUpperCase()}] ` : '';
  const explanation = issue.explanation ? `\n\nExplanation: ${truncate(issue.explanation, 240)}` : '';
  return `${certaintyTag}${issue.reason}${explanation}`;
}

/**
 * Convert CodeIssue to VS Code Diagnostic
 */
export function issueToDiagnostic(issue: CodeIssue): vscode.Diagnostic | null {
  const location = issue.locations[0]; // Use primary location
  if (!location) {
    return null;
  }

  // Convert to 0-based indexing for VS Code
  const range = new vscode.Range(
    new vscode.Position(location.startLine - 1, location.startColumn - 1),
    new vscode.Position(location.endLine - 1, location.endColumn - 1)
  );

  const severity = certaintyToDiagnosticSeverity(issue.certainty);

  // Build the diagnostic message
  const message = buildDiagnosticMessage(issue);

  const diagnostic = new vscode.Diagnostic(range, message, severity);

  // Store the issue data in the diagnostic for later retrieval
  (diagnostic as any).codejanitorIssue = issue;

  // Add code action hints
  if (issue.safeFixAvailable) {
    diagnostic.code = {
      value: issue.id,
      target: vscode.Uri.parse(`codejanitor:fix/${issue.id}`),
    };
  }

  // Set source
  diagnostic.source = 'CodeJanitor';

  // Add related information
  if (issue.explanation && issue.locations.length > 1) {
    diagnostic.relatedInformation = issue.locations
      .slice(1)
      .map((loc) => {
        const uri = vscode.Uri.file(loc.filePath);
        const range = new vscode.Range(
          new vscode.Position(loc.startLine - 1, loc.startColumn - 1),
          new vscode.Position(loc.endLine - 1, loc.endColumn - 1)
        );
        return new vscode.DiagnosticRelatedInformation(
          new vscode.Location(uri, range),
          loc.sourceText || 'Related reference'
        );
      });
  }

  return diagnostic;
}
