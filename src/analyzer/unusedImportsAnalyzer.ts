/**
 * Unused Imports Analyzer
 * 
 * Detects imports that are declared but never used in the file.
 * This is a HIGH certainty analyzer with safe auto-fix available.
 * 
 * Handles:
 * - Named imports: import { foo, bar } from 'module'
 * - Default imports: import foo from 'module'
 * - Namespace imports: import * as foo from 'module'
 * - Side-effect imports: import 'module' (these are NEVER flagged)
 * - Type-only imports: import type { Foo } from 'module'
 */

import {
  SourceFile,
  ImportDeclaration,
  ImportSpecifier,
  Node,
  SyntaxKind,
} from 'ts-morph';
import { IAnalyzer } from './base';
import {
  CodeIssue,
  AnalyzerConfig,
  SourceLocation,
  Certainty,
  generateIssueId,
} from '../models';
import { parseCodeJanitorDirectives } from './ignoreDirectives';

/**
 * Result of analyzing a single import
 */
interface ImportAnalysisResult {
  /** The import specifier or identifier name */
  name: string;
  /** Whether this import is used anywhere in the file */
  isUsed: boolean;
  /** The node representing this import */
  node: Node;
  /** Whether this is a type-only import */
  isTypeOnly: boolean;
}

/**
 * Analyzer for detecting unused imports
 */
export class UnusedImportsAnalyzer implements IAnalyzer {
  readonly name = 'unused-imports';

  isEnabled(config: AnalyzerConfig): boolean {
    return config.enableUnusedImports;
  }

  analyzeFile(sourceFile: SourceFile, _config: AnalyzerConfig): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const directives = parseCodeJanitorDirectives(sourceFile);
    if (directives.fileIgnored) return [];
    const imports = sourceFile.getImportDeclarations();

    for (const importDecl of imports) {
      // Skip side-effect imports (import 'module')
      if (this.isSideEffectImport(importDecl)) {
        continue;
      }

      const unusedImports = this.analyzeImportDeclaration(importDecl, sourceFile);
      
      for (const unused of unusedImports) {
        const issue = this.createIssue(unused, sourceFile, importDecl);
        if (!issue) continue;
        const loc = issue.locations[0];
        if (loc && directives.isLineIgnored(loc.startLine, issue.type)) continue;
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Check if this is a side-effect import (import 'module')
   * Side-effect imports are never flagged as unused
   */
  private isSideEffectImport(importDecl: ImportDeclaration): boolean {
    const defaultImport = importDecl.getDefaultImport();
    const namespaceImport = importDecl.getNamespaceImport();
    const namedImports = importDecl.getNamedImports();
    
    return !defaultImport && !namespaceImport && namedImports.length === 0;
  }

  /**
   * Analyze a single import declaration for unused imports
   */
  private analyzeImportDeclaration(
    importDecl: ImportDeclaration,
    sourceFile: SourceFile
  ): ImportAnalysisResult[] {
    const unused: ImportAnalysisResult[] = [];
    const isTypeOnlyImport = importDecl.isTypeOnly();

    // Check default import
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport) {
      const name = defaultImport.getText();
      if (!this.isIdentifierUsed(name, sourceFile, defaultImport)) {
        unused.push({
          name,
          isUsed: false,
          node: defaultImport,
          isTypeOnly: isTypeOnlyImport,
        });
      }
    }

    // Check namespace import (import * as foo)
    const namespaceImport = importDecl.getNamespaceImport();
    if (namespaceImport) {
      const name = namespaceImport.getText();
      if (!this.isIdentifierUsed(name, sourceFile, namespaceImport)) {
        unused.push({
          name,
          isUsed: false,
          node: namespaceImport,
          isTypeOnly: isTypeOnlyImport,
        });
      }
    }

    // Check named imports
    const namedImports = importDecl.getNamedImports();
    for (const namedImport of namedImports) {
      const result = this.analyzeNamedImport(namedImport, sourceFile, isTypeOnlyImport);
      if (!result.isUsed) {
        unused.push(result);
      }
    }

    return unused;
  }

  /**
   * Analyze a single named import specifier
   */
  private analyzeNamedImport(
    namedImport: ImportSpecifier,
    sourceFile: SourceFile,
    parentIsTypeOnly: boolean
  ): ImportAnalysisResult {
    // Handle aliased imports: import { foo as bar }
    const alias = namedImport.getAliasNode();
    const localName = alias ? alias.getText() : namedImport.getName();
    const isTypeOnly = parentIsTypeOnly || namedImport.isTypeOnly();

    return {
      name: localName,
      isUsed: this.isIdentifierUsed(localName, sourceFile, namedImport),
      node: namedImport,
      isTypeOnly,
    };
  }

  /**
   * Check if an identifier is used anywhere in the file (excluding the import itself)
   * 
   * This uses ts-morph's findReferencesAsNodes which properly handles:
   * - Variable references
   * - Type references
   * - JSX element references
   * - Property access
   */
  private isIdentifierUsed(
    name: string,
    sourceFile: SourceFile,
    _importNode: Node
  ): boolean {
    // Get all identifiers in the file with this name
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
      .filter((id: Node) => id.getText() === name);

    // Filter out the import declaration itself
    for (const identifier of identifiers) {
      // Skip if this is the import node itself
      if (this.isPartOfImport(identifier)) {
        continue;
      }
      
      // Found a usage outside of imports
      return true;
    }

    return false;
  }

  /**
   * Check if a node is part of an import declaration
   */
  private isPartOfImport(node: Node): boolean {
    let current: Node | undefined = node;
    while (current) {
      if (Node.isImportDeclaration(current) || 
          Node.isImportSpecifier(current) ||
          Node.isImportClause(current)) {
        return true;
      }
      current = current.getParent();
    }
    return false;
  }

  /**
   * Create a CodeIssue for an unused import
   */
  private createIssue(
    unused: ImportAnalysisResult,
    sourceFile: SourceFile,
    importDecl: ImportDeclaration
  ): CodeIssue {
    const startLine = unused.node.getStartLineNumber();
    const endLine = unused.node.getEndLineNumber();
    const startCol = Math.max(1, unused.node.getStart());
    const endCol = Math.max(1, unused.node.getEnd());

    const location: SourceLocation = {
      filePath: sourceFile.getFilePath(),
      startLine,
      startColumn: startCol,
      endLine,
      endColumn: endCol,
      sourceText: unused.node.getText(),
    };

    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const typeOnlyPrefix = unused.isTypeOnly ? 'type-only ' : '';

    return {
      id: generateIssueId('unused-import', sourceFile.getFilePath(), unused.name, startLine),
      type: 'unused-import',
      certainty: 'high' as Certainty,
      reason: `${typeOnlyPrefix}Import '${unused.name}' from '${moduleSpecifier}' is declared but never used`,
      locations: [location],
      safeFixAvailable: true,
      symbolName: unused.name,
      explanation: `The identifier '${unused.name}' is imported but not referenced anywhere in this file. ` +
        `This import can be safely removed without affecting the code's behavior.`,
      suggestedFix: `Remove unused import '${unused.name}'`,
      tags: unused.isTypeOnly ? ['type-only'] : [],
    };
  }
}

/**
 * Singleton instance
 */
export const unusedImportsAnalyzer = new UnusedImportsAnalyzer();
