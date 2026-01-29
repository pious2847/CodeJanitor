/**
 * Dead Exports Analyzer
 * 
 * Detects exported symbols that are never imported or used anywhere in the workspace.
 * This is a MEDIUM certainty analyzer - requires workspace-wide analysis.
 * 
 * Handles:
 * - Named exports
 * - Default exports
 * - Re-exports
 * 
 * Exclusions (LOW certainty or ignored):
 * - Package entry points (index.ts, package.json main)
 * - Publicly exported APIs (may be consumed by external packages)
 * - Symbols with decorators (framework-managed)
 */

import {
  SourceFile,
  ExportedDeclarations,
  FunctionDeclaration,
  ClassDeclaration,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  VariableDeclaration,
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
 * Entry point patterns that should not be flagged
 */
const ENTRY_POINT_PATTERNS: RegExp[] = [
  /^(index|main|lib|types)\.tsx?$/,
  /^[^/]*\/index\.tsx?$/, // Any index.ts file
];

/**
 * Analyzer for detecting dead (unused) exports
 */
export class DeadExportsAnalyzer implements IAnalyzer {
  readonly name = 'dead-exports';

  isEnabled(config: AnalyzerConfig): boolean {
    return config.enableDeadExports;
  }

  analyzeFile(_sourceFile: SourceFile, _config: AnalyzerConfig): CodeIssue[] {
    // Dead exports require workspace-wide analysis
    // This method is a placeholder - actual analysis happens in WorkspaceAnalyzer
    return [];
  }

  /**
   * Analyze dead exports for the entire workspace
   * This is called from WorkspaceAnalyzer with symbol graph context
   */
  analyzeWorkspaceExports(
    sourceFile: SourceFile,
    isSymbolUsedExternally: (symbol: string) => boolean,
    _config: AnalyzerConfig
  ): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const directives = parseCodeJanitorDirectives(sourceFile);
    // Skip file if ignored
    if (directives.fileIgnored) return issues;

    // Skip entry point files
    if (this.isEntryPointFile(sourceFile)) {
      return issues;
    }

    // Get all exported declarations
    const exportedDeclarations = sourceFile.getExportedDeclarations();

    for (const [symbolName, declarations] of exportedDeclarations) {
      // Check if this symbol is used elsewhere
      if (isSymbolUsedExternally(symbolName)) {
        continue;
      }

      // Create an issue for each exported declaration
      for (const decl of declarations) {
        const issue = this.createIssue(decl, symbolName, sourceFile);
        if (issue) {
          const loc = issue.locations[0];
          if (loc && directives.isLineIgnored(loc.startLine, issue.type)) continue;
          issues.push(issue);
        }
      }
    }

    return issues;
  }

  /**
   * Check if this is an entry point file
   */
  private isEntryPointFile(sourceFile: SourceFile): boolean {
    const filePath = sourceFile.getFilePath();
    return ENTRY_POINT_PATTERNS.some((pattern) => pattern.test(filePath));
  }

  /**
   * Create a CodeIssue for a dead export
   */
  private createIssue(
    node: ExportedDeclarations,
    symbolName: string,
    sourceFile: SourceFile
  ): CodeIssue | null {
    if (!node) {
      return null;
    }

    const startLine = node.getStartLineNumber?.() || 1;
    const endLine = node.getEndLineNumber?.() || 1;
    // Simple column calculation - ts-morph doesn't have getLineStarts
    const startCol = 1;
    const endCol = 1;

    const location: SourceLocation = {
      filePath: sourceFile.getFilePath(),
      startLine,
      startColumn: startCol,
      endLine,
      endColumn: endCol,
      sourceText: node.getText?.() || symbolName,
    };

    const kindName = this.getExportKindName(node);

    return {
      id: generateIssueId('dead-export', sourceFile.getFilePath(), symbolName, startLine),
      type: 'dead-export',
      certainty: 'medium' as Certainty,
      reason: `Exported ${kindName} '${symbolName}' is never imported or used anywhere in the workspace`,
      locations: [location],
      // No auto-fix - may be intentional API exports
      safeFixAvailable: false,
      symbolName,
      explanation: `The ${kindName} '${symbolName}' is exported from this file but is not imported ` +
        `or referenced anywhere in the workspace. This may be intentional (e.g., public API), ` +
        `but consider if it's truly needed.`,
      suggestedFix: `Review if '${symbolName}' is part of the public API. If not, consider removing the export.`,
      tags: ['export', 'requires-review'],
    };
  }

  /**
   * Get the kind of export (function, class, interface, etc.)
   */
  private getExportKindName(node: ExportedDeclarations): string {
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
}

/**
 * Singleton instance
 */
export const deadExportsAnalyzer = new DeadExportsAnalyzer();
