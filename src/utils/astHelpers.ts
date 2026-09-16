import {
  Node,
  SourceFile,
  ExportedDeclarations,
  FunctionDeclaration,
  ClassDeclaration,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  VariableDeclaration
} from 'ts-morph';
import { SourceLocation } from '../models';

/**
 * Creates a SourceLocation object from a ts-morph Node
 */
export function createSourceLocation(node: Node, sourceFile: SourceFile, sourceTextOverride?: string): SourceLocation {
  const startLine = node.getStartLineNumber?.() || 1;
  const endLine = node.getEndLineNumber?.() || 1;

  // Fallback columns if ts-morph doesn't perfectly expose columns out of the box in this project's version
  // We'll calculate it simple for now as it was done originally
  const startCol = 1;
  const endCol = 1;

  return {
    filePath: sourceFile.getFilePath(),
    startLine,
    startColumn: startCol,
    endLine,
    endColumn: endCol,
    sourceText: sourceTextOverride ?? (node.getText?.() || ''),
  };
}

/**
 * Get the kind of export (function, class, interface, etc.)
 */
export function getExportKindName(node: ExportedDeclarations): string {
  if (node instanceof FunctionDeclaration) {
    return 'function';
  } else if (node instanceof ClassDeclaration) {
    return 'class';
  } else if (node instanceof InterfaceDeclaration) {
    return 'interface';
  } else if (node instanceof TypeAliasDeclaration) {
    return 'type';
  } else if (node instanceof VariableDeclaration) {
    return 'variable';
  }
  return 'symbol';
}
