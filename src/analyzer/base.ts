/**
 * Base Analyzer Infrastructure
 * 
 * Provides the foundation for all CodeJanitor analyzers.
 * Uses ts-morph for TypeScript Compiler API access with better ergonomics.
 */

import { Project, SourceFile } from 'ts-morph';
import { CodeIssue, FileAnalysisResult, AnalyzerConfig } from '../models';

/**
 * Interface that all analyzers must implement
 */
export interface IAnalyzer {
  /** Name of the analyzer for logging/debugging */
  readonly name: string;
  
  /** Whether this analyzer is enabled based on config */
  isEnabled(config: AnalyzerConfig): boolean;
  
  /** Analyze a single source file */
  analyzeFile(sourceFile: SourceFile, config: AnalyzerConfig): CodeIssue[];
}

/**
 * Manages the ts-morph Project instance for the workspace
 */
export class ProjectManager {
  private project: Project | null = null;
  private projectPath: string | null = null;
  
  /**
   * Initialize or get the project for a given workspace path
   */
  getProject(workspacePath: string, tsConfigPath?: string): Project {
    // If we have a project for a different path, reinitialize
    if (this.project && this.projectPath !== workspacePath) {
      this.project = null;
    }
    
    if (!this.project) {
      this.project = new Project({
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: !tsConfigPath,
        compilerOptions: tsConfigPath ? undefined : {
          allowJs: true,
          checkJs: true,
          noEmit: true,
          strict: false, // We don't want to fail on type errors
          skipLibCheck: true,
        },
      });
      this.projectPath = workspacePath;
    }
    
    return this.project;
  }
  
  /**
   * Add a file to the project for analysis
   */
  addSourceFile(filePath: string): SourceFile | undefined {
    if (!this.project) {
      return undefined;
    }
    
    // Check if file already exists in project
    let sourceFile = this.project.getSourceFile(filePath);
    if (!sourceFile) {
      sourceFile = this.project.addSourceFileAtPath(filePath);
    }
    
    return sourceFile;
  }
  
  /**
   * Get a source file by path
   */
  getSourceFile(filePath: string): SourceFile | undefined {
    return this.project?.getSourceFile(filePath);
  }
  
  /**
   * Update a source file's content (for live document sync)
   */
  updateSourceFile(filePath: string, content: string): SourceFile | undefined {
    if (!this.project) {
      return undefined;
    }
    
    let sourceFile = this.project.getSourceFile(filePath);
    if (sourceFile) {
      sourceFile.replaceWithText(content);
    } else {
      sourceFile = this.project.createSourceFile(filePath, content, { overwrite: true });
    }
    
    return sourceFile;
  }
  
  /**
   * Remove a file from the project
   */
  removeSourceFile(filePath: string): void {
    const sourceFile = this.project?.getSourceFile(filePath);
    if (sourceFile) {
      this.project?.removeSourceFile(sourceFile);
    }
  }
  
  /**
   * Get all source files in the project
   */
  getAllSourceFiles(): SourceFile[] {
    return this.project?.getSourceFiles() ?? [];
  }
  
  /**
   * Clear the project (force re-initialization)
   */
  clearProject(): void {
    this.project = null;
    this.projectPath = null;
  }
}

/**
 * Singleton project manager instance
 */
export const projectManager = new ProjectManager();

/**
 * Run all enabled analyzers on a source file
 */
export function analyzeSourceFile(
  sourceFile: SourceFile,
  analyzers: IAnalyzer[],
  config: AnalyzerConfig
): FileAnalysisResult {
  const startTime = Date.now();
  const issues: CodeIssue[] = [];
  
  try {
    for (const analyzer of analyzers) {
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
