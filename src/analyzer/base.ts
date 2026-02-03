/**
 * Base Analyzer Infrastructure
 * 
 * Provides the foundation for all CodeJanitor analyzers.
 * Uses ts-morph for TypeScript Compiler API access with better ergonomics.
 */

import { Project, SourceFile } from 'ts-morph';
import { 
  CodeIssue, 
  FileAnalysisResult, 
  AnalyzerConfig,
  AnalyzerCategory,
  AnalyzerPriority,
  Framework,
  AnalysisContext,
  QualityMetrics
} from '../models';

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
 * Extended interface for enterprise analyzers with additional capabilities
 */
export interface IEnterpriseAnalyzer extends IAnalyzer {
  /** Priority for execution order (higher = runs first) */
  readonly priority: AnalyzerPriority;
  
  /** Category for grouping and filtering */
  readonly category: AnalyzerCategory;
  
  /** Frameworks this analyzer supports (empty = all frameworks) */
  readonly supportedFrameworks: Framework[];
  
  /** Analyze with full workspace context */
  analyzeWithContext(
    sourceFile: SourceFile,
    config: AnalyzerConfig,
    context: AnalysisContext
  ): Promise<CodeIssue[]>;
  
  /** Get quality metrics for a source file */
  getMetrics(sourceFile: SourceFile): QualityMetrics;
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

/**
 * Create a default analysis context for workspace analysis
 */
export function createDefaultAnalysisContext(workspacePath: string): AnalysisContext {
  return {
    workspaceInfo: {
      rootPath: workspacePath,
      frameworks: ['none'],
      tsConfigPath: undefined,
      packageInfo: undefined,
    },
    gitContext: undefined,
    dependencyGraph: {
      dependencies: new Map(),
      dependents: new Map(),
      circularDependencies: [],
    },
    previousResults: [],
    teamPolicies: [],
  };
}

/**
 * Create default quality metrics (all zeros)
 */
export function createDefaultQualityMetrics(): QualityMetrics {
  return {
    complexity: {
      cyclomaticComplexity: 0,
      cognitiveComplexity: 0,
      maxNestingDepth: 0,
      maxParameters: 0,
      linesOfCode: 0,
    },
    maintainability: {
      maintainabilityIndex: 100,
      duplications: 0,
      commentDensity: 0,
      avgFunctionLength: 0,
    },
    security: {
      vulnerabilities: 0,
      secrets: 0,
      riskScore: 0,
    },
    performance: {
      antiPatterns: 0,
      impactScore: 0,
    },
    testability: {
      coverage: 0,
      untestedFunctions: 0,
      testabilityScore: 100,
    },
  };
}

/**
 * Base class for enterprise analyzers with default implementations
 */
export abstract class BaseEnterpriseAnalyzer implements IEnterpriseAnalyzer {
  abstract readonly name: string;
  abstract readonly priority: AnalyzerPriority;
  abstract readonly category: AnalyzerCategory;
  readonly supportedFrameworks: Framework[] = []; // Empty = supports all
  
  abstract isEnabled(config: AnalyzerConfig): boolean;
  abstract analyzeFile(sourceFile: SourceFile, config: AnalyzerConfig): CodeIssue[];
  
  /**
   * Default implementation delegates to analyzeFile
   * Override this for analyzers that need workspace context
   */
  async analyzeWithContext(
    sourceFile: SourceFile,
    config: AnalyzerConfig,
    _context: AnalysisContext
  ): Promise<CodeIssue[]> {
    return this.analyzeFile(sourceFile, config);
  }
  
  /**
   * Default implementation returns zero metrics
   * Override this for analyzers that calculate metrics
   */
  getMetrics(_sourceFile: SourceFile): QualityMetrics {
    return createDefaultQualityMetrics();
  }
  
  /**
   * Check if this analyzer supports the given framework
   */
  supportsFramework(framework: Framework): boolean {
    // Empty supportedFrameworks means supports all
    if (this.supportedFrameworks.length === 0) {
      return true;
    }
    return this.supportedFrameworks.includes(framework);
  }
}
