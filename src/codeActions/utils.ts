import * as vscode from 'vscode';

/**
 * Convert a SourceLocation to a VS Code Range
 */
export function locationToRange(location: any): vscode.Range {
  return new vscode.Range(
    new vscode.Position(location.startLine - 1, location.startColumn - 1),
    new vscode.Position(location.endLine - 1, location.endColumn - 1)
  );
}
