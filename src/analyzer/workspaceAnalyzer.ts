/**
 * Workspace Analyzer
 * 
 * Provides workspace-wide analysis capabilities:
 * - Symbol resolution across files
 * - Call graph analysis
 * - Import/export graph tracking
 * - Dead code detection that spans multiple files
 * 
 * This is the orchestration layer for all analyzers.
 */

import { Project, SourceFile } from 'ts-morph';
import { IAnalyzer } from './base';
import { CodeIssue, AnalyzerConfig, FileAnalysisResult } from '../models';
import { UnusedImportsAnalyzer } from './unusedImportsAnalyzer';
import { UnusedVariablesAnalyzer } from './unusedVariablesAnalyzer';
import { DeadFunctionsAnalyzer } from './deadFunctionsAnalyzer';
import { ImportGraphBuilder } from './workspace/importGraphBuilder';
import { SymbolReferenceCache } from './workspace/symbolReferenceCache';

/**
 * Orchestrates analysis across the entire workspace
 */
export class WorkspaceAnalyzer {
  private project: Project;
  private analyzers: IAnalyzer[];
  private uncommittedFiles: Set<string> = new Set();

  private importGraphBuilder: ImportGraphBuilder;
  private symbolReferenceCache: SymbolReferenceCache;

  // optional git metadata cache: filePath -> { hash, author, date }
  private gitMetadata: Map<string, { hash: string; author: string; date: string }> = new Map();

  constructor(project: Project) {
    this.project = project;
    this.importGraphBuilder = new ImportGraphBuilder();
    this.symbolReferenceCache = new SymbolReferenceCache(this.importGraphBuilder, this.gitMetadata);
    this.analyzers = [
      new UnusedImportsAnalyzer(),
      new UnusedVariablesAnalyzer(),
      new DeadFunctionsAnalyzer(),
    ];
  }

  /**
   * Analyze all TypeScript/JavaScript files in the workspace
   */
  async analyzeWorkspace(config: AnalyzerConfig): Promise<FileAnalysisResult[]> {
    // Build symbol and import graphs first
    this.buildSymbolGraphs();

    // If workspace is a git repo, collect uncommitted files and last-commit metadata
    try {
      // lazy import to avoid increasing startup cost when not available
      const { isGitRepository, getUncommittedFiles, getLastCommitInfo } = await import('../git/gitUtils');
      const rootDirs = this.project.getRootDirectories();
      const workspaceRoot = rootDirs.length > 0 ? rootDirs[0]!.getPath() : process.cwd();
      if (await isGitRepository(workspaceRoot)) {
        this.uncommittedFiles = await getUncommittedFiles(workspaceRoot);
        // gather commit info for all files concurrently
        await Promise.all(this.project.getSourceFiles().map(async (sf) => {
          const fp = sf.getFilePath();
          const info = await getLastCommitInfo(workspaceRoot, fp);
          if (info) this.gitMetadata.set(fp, info);
        }));
      }
    } catch (err) {
      // ignore git errors - functionality is best-effort
    }

    const results: FileAnalysisResult[] = [];
    const sourceFiles = this.project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      // Skip node_modules and declaration files
      const filePath = sourceFile.getFilePath();
      if (filePath.includes('node_modules') || filePath.endsWith('.d.ts')) {
        continue;
      }

      // If the file is uncommitted (e.g. working tree changes), skip analysis
      if (this.uncommittedFiles.has(filePath)) {
        continue;
      }

      const result = this.analyzeFile(sourceFile, config);
      results.push(result);
    }

    return results;
  }

  /**
   * Analyze a single file
   */
  analyzeFile(sourceFile: SourceFile, config: AnalyzerConfig): FileAnalysisResult {
    const startTime = Date.now();
    const issues: CodeIssue[] = [];

    try {
      // Run all enabled analyzers
      for (const analyzer of this.analyzers) {
        if (analyzer.isEnabled(config)) {
          const analyzerIssues = analyzer.analyzeFile(sourceFile, config);
          issues.push(...analyzerIssues);
        }
      }

      return {
        filePath: sourceFile.getFilePath(),
        issues,
        analysisTimeMs: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      return {
        filePath: sourceFile.getFilePath(),
        issues: [],
        analysisTimeMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build symbol reference graph and import graph for the workspace
   */
  private buildSymbolGraphs(): void {
    const sourceFiles = this.project.getSourceFiles();

    // First pass: collect all symbols and their references
    for (const sourceFile of sourceFiles) {
      this.symbolReferenceCache.extractFromFile(sourceFile);
    }

    // Second pass: build import graph
    for (const sourceFile of sourceFiles) {
      this.importGraphBuilder.buildForFile(sourceFile);
    }
  }

  /**
   * Check if a symbol is referenced in any other file in the workspace
   */
  isSymbolReferencedExternally(symbol: string, sourceFile: SourceFile): boolean {
    return this.symbolReferenceCache.isSymbolReferencedExternally(symbol, sourceFile);
  }

  /**
   * Get all files that import a specific exported symbol
   */
  getFilesImportingSymbol(symbol: string): string[] {
    return this.importGraphBuilder.getFilesImportingSymbol(symbol);
  }

  /**
   * Get the list of currently enabled analyzers
   */
  getAnalyzers(): IAnalyzer[] {
    return this.analyzers;
  }

  /**
   * Best-effort reference chains for a symbol
   * Returns arrays of file paths representing a chain from declaration -> (imported-from?) -> usage
   */
  getReferenceChains(symbol: string): string[][] {
    return this.symbolReferenceCache.getReferenceChains(symbol);
  }
}
