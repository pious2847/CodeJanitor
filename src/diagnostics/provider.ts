/**
 * VS Code Diagnostic Provider
 * 
 * Converts CodeJanitor CodeIssue objects into VS Code Diagnostics.
 * Handles severity mapping, message formatting, and source tracking.
 */

import * as vscode from 'vscode';
import { CodeIssue } from '../models';

/**
 * Converts certainty level to VS Code DiagnosticSeverity
 */
function certaintyToDiagnosticSeverity(certainty: CodeIssue['certainty']): vscode.DiagnosticSeverity {
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
function truncate(s: string, n: number) {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

/**
 * Diagnostic provider for CodeJanitor
 */
export class CodeJanitorDiagnosticProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('codejanitor');
  }

  /**
   * Convert CodeIssue to VS Code Diagnostic
   */
  private issueToDiagnostic(issue: CodeIssue): vscode.Diagnostic | null {
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
    const message = this.buildDiagnosticMessage(issue);

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

  /**
   * Build a user-friendly diagnostic message
   */
  private buildDiagnosticMessage(issue: CodeIssue): string {
    // Prepend certainty tag and include a short explanation if available
    const certaintyTag = issue.certainty ? `[${issue.certainty.toUpperCase()}] ` : '';
    const explanation = issue.explanation ? `\n\nExplanation: ${truncate(issue.explanation, 240)}` : '';
    return `${certaintyTag}${issue.reason}${explanation}`;
  }

  /**
   * Truncate long explanation strings for diagnostics
   */
  

  /**
   * Update diagnostics for a file
   */
  updateFileDiagnostics(filePath: string, issues: CodeIssue[]): void {
    const uri = vscode.Uri.file(filePath);
    const diagnostics: vscode.Diagnostic[] = [];

    for (const issue of issues) {
      const diagnostic = this.issueToDiagnostic(issue);
      if (diagnostic) {
        diagnostics.push(diagnostic);
      }
    }

    this.diagnosticCollection.set(uri, diagnostics);
  }

  /**
   * Clear diagnostics for a file
   */
  clearFileDiagnostics(filePath: string): void {
    const uri = vscode.Uri.file(filePath);
    this.diagnosticCollection.delete(uri);
  }

  /**
   * Clear all diagnostics
   */
  clearAllDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Get the diagnostic collection
   */
  getDiagnosticCollection(): vscode.DiagnosticCollection {
    return this.diagnosticCollection;
  }

  /**
   * Get the issue from a diagnostic
   */
  static getIssueFromDiagnostic(diagnostic: vscode.Diagnostic): any {
    return (diagnostic as any).codejanitorIssue;
  }

  /**
   * Dispose the diagnostic provider
   */
  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
