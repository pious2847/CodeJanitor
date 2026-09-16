import * as vscode from 'vscode';
import { CodeIssue } from '../../models';
import { locationToRange } from '../utils';

/**
 * Create an action to remove an unused import
 */
export function createRemoveImportAction(
  document: vscode.TextDocument,
  issue: CodeIssue
): vscode.CodeAction | null {
  if (issue.locations.length === 0) {
    return null;
  }

  const location = issue.locations[0];
  const range = locationToRange(location);

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
