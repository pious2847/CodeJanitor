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

import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import { IAnalyzer } from './base';
import { CodeIssue, AnalyzerConfig, FileAnalysisResult } from '../models';
import { UnusedImportsAnalyzer } from './unusedImportsAnalyzer';
import { UnusedVariablesAnalyzer } from './unusedVariablesAnalyzer';
import { DeadFunctionsAnalyzer } from './deadFunctionsAnalyzer';

/**
 * Tracks symbol references across the workspace
 */
interface SymbolReference {
  symbol: string;
  filePath: string;
  line: number;
  column: number;
  isDeclaration: boolean;
  isExport: boolean;
  isImport: boolean;
}

/**
 * Tracks which symbols are imported where
 */
interface ImportGraph {
  [sourceFile: string]: {
    imports: {
      symbol: string;
      source: string;
    }[];
  };
}

/**
 * Orchestrates analysis across the entire workspace
 */
export class WorkspaceAnalyzer {
  private project: Project;
  private analyzers: IAnalyzer[];
  private importGraph: ImportGraph = {};
  private symbolReferences: Map<string, SymbolReference[]> = new Map();

  constructor(project: Project) {
    this.project = project;
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

    const results: FileAnalysisResult[] = [];
    const sourceFiles = this.project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      // Skip node_modules and declaration files
      const filePath = sourceFile.getFilePath();
      if (filePath.includes('node_modules') || filePath.endsWith('.d.ts')) {
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
      this.extractSymbolsFromFile(sourceFile);
    }

    // Second pass: build import graph
    for (const sourceFile of sourceFiles) {
      this.buildImportGraphForFile(sourceFile);
    }
  }

  /**
   * Extract all symbol declarations and references from a file
   */
  private extractSymbolsFromFile(sourceFile: SourceFile): void {
    const filePath = sourceFile.getFilePath();

    // Get exported symbols
    const exportedDeclarations = sourceFile.getExportedDeclarations();
    for (const [symbolName] of exportedDeclarations) {
      if (!this.symbolReferences.has(symbolName)) {
        this.symbolReferences.set(symbolName, []);
      }

      const refs = this.symbolReferences.get(symbolName)!;
      refs.push({
        symbol: symbolName,
        filePath,
        line: 0,
        column: 0,
        isDeclaration: true,
        isExport: true,
        isImport: false,
      });
    }

    // Get all identifier references
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
    for (const identifier of identifiers) {
      const text = identifier.getText();
      if (!text || text.length === 0) {
        continue;
      }

      if (!this.symbolReferences.has(text)) {
        this.symbolReferences.set(text, []);
      }

      this.symbolReferences.get(text)!.push({
        symbol: text,
        filePath,
        line: identifier.getStartLineNumber(),
        column: 0,
        isDeclaration: false,
        isExport: false,
        isImport: false,
      });
    }
  }

  /**
   * Build import graph for a single file
   */
  private buildImportGraphForFile(sourceFile: SourceFile): void {
    const filePath = sourceFile.getFilePath();
    const imports = sourceFile.getImportDeclarations();

    if (!this.importGraph[filePath]) {
      this.importGraph[filePath] = { imports: [] };
    }

    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (!moduleSpecifier) {
        continue;
      }

      // Get default import
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        this.importGraph[filePath].imports.push({
          symbol: defaultImport.getText(),
          source: moduleSpecifier,
        });
      }

      // Get namespace import
      const namespaceImport = importDecl.getNamespaceImport();
      if (namespaceImport) {
        this.importGraph[filePath].imports.push({
          symbol: namespaceImport.getText(),
          source: moduleSpecifier,
        });
      }

      // Get named imports
      const namedImports = importDecl.getNamedImports();
      for (const named of namedImports) {
        this.importGraph[filePath].imports.push({
          symbol: named.getName(),
          source: moduleSpecifier,
        });
      }
    }
  }

  /**
   * Check if a symbol is referenced in any other file in the workspace
   */
  isSymbolReferencedExternally(symbol: string, sourceFile: SourceFile): boolean {
    const filePath = sourceFile.getFilePath();
    const refs = this.symbolReferences.get(symbol) || [];

    // Check if symbol is referenced in any file OTHER than the one it's declared in
    return refs.some(
      (ref) => ref.filePath !== filePath && !ref.isDeclaration
    );
  }

  /**
   * Get all files that import a specific exported symbol
   */
  getFilesImportingSymbol(symbol: string): string[] {
    const files = new Set<string>();

    for (const [filePath, graph] of Object.entries(this.importGraph)) {
      for (const imp of graph.imports) {
        if (imp.symbol === symbol) {
          // Check if this import actually comes from our source file
          // This requires resolving module paths (simplified check)
          files.add(filePath);
        }
      }
    }

    return Array.from(files);
  }

  /**
   * Get the list of currently enabled analyzers
   */
  getAnalyzers(): IAnalyzer[] {
    return this.analyzers;
  }
}
