/**
 * VS Code Code Actions Provider
 * 
 * Provides code actions for safe fixes detected by CodeJanitor.
 * Only provides actions for HIGH certainty issues.
 */

import * as vscode from 'vscode';
import { CodeIssue } from '../models';
import { CodeJanitorDiagnosticProvider } from '../diagnostics/provider';
import { createRemoveImportAction } from './generators/removeImport';
import { createRemoveVariableAction } from './generators/removeVariable';

/**
 * Code actions provider for CodeJanitor
 */
export class CodeJanitorCodeActionsProvider implements vscode.CodeActionProvider {
  /**
   * Provide code actions for a diagnostic
   */
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      // Only handle CodeJanitor diagnostics
      if (diagnostic.source !== 'CodeJanitor') {
        continue;
      }

      const issue = CodeJanitorDiagnosticProvider.getIssueFromDiagnostic(diagnostic);
      if (!issue || !issue.safeFixAvailable) {
        continue;
      }

      const action = this.createFixAction(document, issue);
      if (action) {
        actions.push(action);
      }
    }

    return actions;
  }

  /**
   * Create a code action for fixing an issue
   */
  private createFixAction(
    document: vscode.TextDocument,
    issue: CodeIssue
  ): vscode.CodeAction | null {
    switch (issue.type) {
      case 'unused-import':
        return createRemoveImportAction(document, issue);

      case 'unused-variable':
        return createRemoveVariableAction(document, issue);

      default:
        return null;
    }
  }
}

/**
 * Register code actions provider
 */
export function registerCodeActionsProvider(context: vscode.ExtensionContext): void {
  const provider = new CodeJanitorCodeActionsProvider();

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [
        { language: 'typescript', scheme: 'file' },
        { language: 'typescriptreact', scheme: 'file' },
        { language: 'javascript', scheme: 'file' },
        { language: 'javascriptreact', scheme: 'file' },
      ],
      provider,
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
      }
    )
  );
}
