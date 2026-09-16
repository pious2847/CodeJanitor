import * as vscode from 'vscode';
import { CodeIssue } from '../../models';
import { locationToRange } from '../utils';

/**
 * Create an action to remove an unused variable
 */
export function createRemoveVariableAction(
  document: vscode.TextDocument,
  issue: CodeIssue
): vscode.CodeAction | null {
  if (issue.locations.length === 0 || !issue.safeFixAvailable) {
    return null;
  }

  const location = issue.locations[0];
  const range = locationToRange(location);

  // For variables, only offer removal for non-parameters
  if (issue.tags?.includes('parameter')) {
    // For parameters, offer prefixing with underscore instead
    return createPrefixUnderscoreAction(document, issue, range);
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
export function createPrefixUnderscoreAction(
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
