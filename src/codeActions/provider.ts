/**
 * VS Code Code Actions Provider
 * 
 * Provides code actions for safe fixes detected by CodeJanitor.
 * Only provides actions for HIGH certainty issues.
 */

import * as vscode from 'vscode';
import { CodeIssue } from '../models';
import { CodeJanitorDiagnosticProvider } from '../diagnostics/provider';

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
        return this.createRemoveImportAction(document, issue);

      case 'unused-variable':
        return this.createRemoveVariableAction(document, issue);

      default:
        return null;
    }
  }

  /**
   * Create an action to remove an unused import
   */
  private createRemoveImportAction(
    document: vscode.TextDocument,
    issue: CodeIssue
  ): vscode.CodeAction | null {
    if (issue.locations.length === 0) {
      return null;
    }

    const location = issue.locations[0];
    const range = this.locationToRange(location);

    const action = new vscode.CodeAction(
      `Remove unused import '${issue.symbolName}'`,
      vscode.CodeActionKind.QuickFix
    );

    action.edit = new vscode.WorkspaceEdit();

    // For imports, we need to remove the entire import statement or just the specifier
    // This is a simplified version - in production, we'd parse the import more carefully
    const line = document.lineAt(range.start.line);
    
    if (line.text.includes(issue.symbolName)) {
      // Simple case: single import
      if (line.text.match(/^import\s+.*\s+from\s+['"`]/)) {
        // Remove the entire line
        action.edit.delete(
          document.uri,
          new vscode.Range(
            new vscode.Position(range.start.line, 0),
            new vscode.Position(range.start.line + 1, 0)
          )
        );
      } else {
        // Try to remove just the specifier (named import)
        action.edit.delete(document.uri, range);
      }
    }

    action.isPreferred = true;

    return action;
  }

  /**
   * Create an action to remove an unused variable
   */
  private createRemoveVariableAction(
    document: vscode.TextDocument,
    issue: CodeIssue
  ): vscode.CodeAction | null {
    if (issue.locations.length === 0 || !issue.safeFixAvailable) {
      return null;
    }

    const location = issue.locations[0];
    const range = this.locationToRange(location);

    // For variables, only offer removal for non-parameters
    if (issue.tags?.includes('parameter')) {
      // For parameters, offer prefixing with underscore instead
      return this.createPrefixUnderscoreAction(document, issue, range);
    }

    const action = new vscode.CodeAction(
      `Remove unused variable '${issue.symbolName}'`,
      vscode.CodeActionKind.QuickFix
    );

    action.edit = new vscode.WorkspaceEdit();
    action.edit.delete(document.uri, range);

    action.isPreferred = true;

    return action;
  }

  /**
   * Create an action to prefix a variable with underscore
   */
  private createPrefixUnderscoreAction(
    document: vscode.TextDocument,
    issue: CodeIssue,
    range: vscode.Range
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Prefix with underscore: _${issue.symbolName}`,
      vscode.CodeActionKind.QuickFix
    );

    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, range, `_${issue.symbolName}`);

    action.isPreferred = true;

    return action;
  }

  /**
   * Convert a SourceLocation to a VS Code Range
   */
  private locationToRange(location: any): vscode.Range {
    return new vscode.Range(
      new vscode.Position(location.startLine - 1, location.startColumn - 1),
      new vscode.Position(location.endLine - 1, location.endColumn - 1)
    );
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
