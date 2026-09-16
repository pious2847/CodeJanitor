/**
 * VS Code Diagnostic Provider
 * 
 * Converts CodeJanitor CodeIssue objects into VS Code Diagnostics.
 * Handles severity mapping, message formatting, and source tracking.
 */

import * as vscode from 'vscode';
import { CodeIssue } from '../models';
import { issueToDiagnostic } from './converter';

/**
 * Diagnostic provider for CodeJanitor
 */
export class CodeJanitorDiagnosticProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('codejanitor');
  }

  /**
   * Update diagnostics for a file
   */
  updateFileDiagnostics(filePath: string, issues: CodeIssue[]): void {
    const uri = vscode.Uri.file(filePath);
    const diagnostics: vscode.Diagnostic[] = [];

    for (const issue of issues) {
      const diagnostic = issueToDiagnostic(issue);
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
