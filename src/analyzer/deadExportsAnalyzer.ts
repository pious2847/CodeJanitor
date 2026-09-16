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
} from 'ts-morph';
import { IAnalyzer } from './base';
import {
  CodeIssue,
  AnalyzerConfig,
  Certainty,
  generateIssueId,
} from '../models';
import { parseCodeJanitorDirectives } from './ignoreDirectives';
import { createSourceLocation, getExportKindName } from '../utils/astHelpers';

/**
 * Entry point patterns that should not be flagged
 */
const ENTRY_POINT_PATTERNS: RegExp[] = [
  /(?:^|\/)(index|main|lib|types)\.tsx?$/, // Any index.ts, main.ts, lib.ts, types.ts
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

    const location = createSourceLocation(node, sourceFile, node.getText?.() || symbolName);
    const kindName = getExportKindName(node);

    return {
      id: generateIssueId('dead-export', sourceFile.getFilePath(), symbolName, location.startLine),
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
}

/**
 * Singleton instance
 */
export const deadExportsAnalyzer = new DeadExportsAnalyzer();
