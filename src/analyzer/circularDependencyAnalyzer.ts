/**
 * Circular Dependency Analyzer
 * 
 * Detects circular imports between modules using dependency graph traversal.
 * Supports both direct cycles (A -> B -> A) and transitive cycles (A -> B -> C -> A).
 * 
 * Provides refactoring suggestions for breaking cycles:
 * - Extract shared code to a new module
 * - Use dependency injection
 * - Restructure module boundaries
 */

import { SourceFile } from 'ts-morph';
import { BaseEnterpriseAnalyzer } from './base';
import {
  CodeIssue,
  AnalyzerConfig,
  SourceLocation,
  generateIssueId,
  AnalysisContext,
  CircularDependency,
  QualityMetrics,
  AnalyzerPriority,
  AnalyzerCategory,
} from '../models';
import { parseCodeJanitorDirectives } from './ignoreDirectives';

/**
 * Analyzer for detecting circular dependencies
 */
export class CircularDependencyAnalyzer extends BaseEnterpriseAnalyzer {
  readonly name = 'circular-dependency';
  readonly priority: AnalyzerPriority = 80; // High priority
  readonly category: AnalyzerCategory = 'maintainability';

  isEnabled(config: AnalyzerConfig): boolean {
    return config.enableCircularDependencies;
  }

  /**
   * Basic analysis without context - returns empty array
   * Circular dependency detection requires workspace context
   */
  analyzeFile(_sourceFile: SourceFile, _config: AnalyzerConfig): CodeIssue[] {
    return [];
  }

  /**
   * Analyze with workspace context to detect circular dependencies
   */
  async analyzeWithContext(
    sourceFile: SourceFile,
    _config: AnalyzerConfig,
    context: AnalysisContext
  ): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    const directives = parseCodeJanitorDirectives(sourceFile);
    
    if (directives.fileIgnored) {
      return [];
    }

    const filePath = sourceFile.getFilePath();
    
    // Check if this file is part of any circular dependencies
    const circularDeps = context.dependencyGraph.circularDependencies.filter(
      (cycle) => cycle.cycle.includes(filePath)
    );

    for (const circularDep of circularDeps) {
      const issue = this.createIssue(sourceFile, circularDep);
      const loc = issue.locations[0];
      if (loc && directives.isLineIgnored(loc.startLine, issue.type)) {
        continue;
      }
      issues.push(issue);
    }

    return issues;
  }

  /**
   * Get quality metrics - circular dependencies affect maintainability
   */
  getMetrics(sourceFile: SourceFile): QualityMetrics {
    const metrics = super.getMetrics(sourceFile);
    // Metrics would be calculated during workspace analysis
    return metrics;
  }

  /**
   * Create a CodeIssue for a circular dependency
   */
  private createIssue(
    sourceFile: SourceFile,
    circularDep: CircularDependency
  ): CodeIssue {
    const filePath = sourceFile.getFilePath();
    const cycleType = circularDep.isDirect ? 'direct' : 'transitive';
    const cycleDescription = this.formatCycle(circularDep.cycle);

    // Location at the top of the file
    const location: SourceLocation = {
      filePath,
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 1,
      sourceText: '',
    };

    const suggestions = this.generateRefactoringSuggestions(circularDep);

    return {
      id: generateIssueId('circular-dependency', filePath, cycleDescription, 1),
      type: 'circular-dependency',
      certainty: 'high',
      reason: `This file is part of a ${cycleType} circular dependency: ${cycleDescription}`,
      locations: [location],
      safeFixAvailable: false,
      symbolName: 'circular-dependency',
      explanation: 
        `Circular dependencies make code harder to understand, test, and maintain. ` +
        `They can lead to initialization issues and make it difficult to refactor code. ` +
        `Consider restructuring your modules to break the cycle.`,
      suggestedFix: suggestions.join('\n'),
      tags: [cycleType, 'architecture'],
    };
  }

  /**
   * Format the cycle for display
   */
  private formatCycle(cycle: string[]): string {
    const shortNames = cycle.map((path) => {
      const parts = path.split(/[/\\]/);
      return parts[parts.length - 1];
    });
    return shortNames.join(' → ') + ' → ' + shortNames[0];
  }

  /**
   * Generate refactoring suggestions for breaking the cycle
   */
  private generateRefactoringSuggestions(circularDep: CircularDependency): string[] {
    const suggestions: string[] = [];

    if (circularDep.isDirect) {
      suggestions.push(
        '• Extract shared code: Move common functionality to a new module that both files can import'
      );
      suggestions.push(
        '• Use dependency injection: Pass dependencies as parameters instead of importing directly'
      );
      suggestions.push(
        '• Merge modules: If the files are tightly coupled, consider combining them into one module'
      );
    } else {
      suggestions.push(
        '• Restructure module boundaries: Review the architecture and separate concerns more clearly'
      );
      suggestions.push(
        '• Create abstraction layer: Introduce interfaces or abstract classes to break the dependency chain'
      );
      suggestions.push(
        '• Use event-driven architecture: Replace direct dependencies with event emitters/listeners'
      );
    }

    return suggestions;
  }

  /**
   * Build dependency graph from source files
   * This is a utility method that can be called during workspace analysis
   */
  static buildDependencyGraph(sourceFiles: SourceFile[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      const dependencies: string[] = [];

      // Get all import declarations
      const imports = sourceFile.getImportDeclarations();
      
      for (const importDecl of imports) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        
        // Only track relative imports (local files)
        if (moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/')) {
          const resolvedPath = this.resolveImportPath(filePath, moduleSpecifier);
          if (resolvedPath) {
            dependencies.push(resolvedPath);
          }
        }
      }

      graph.set(filePath, dependencies);
    }

    return graph;
  }

  /**
   * Detect circular dependencies in a dependency graph
   */
  static detectCircularDependencies(
    dependencyGraph: Map<string, string[]>
  ): CircularDependency[] {
    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    for (const [node] of dependencyGraph) {
      if (!visited.has(node)) {
        this.detectCyclesFromNode(
          node,
          dependencyGraph,
          visited,
          recursionStack,
          currentPath,
          cycles
        );
      }
    }

    // Remove duplicate cycles
    return this.deduplicateCycles(cycles);
  }

  /**
   * DFS to detect cycles from a starting node
   */
  private static detectCyclesFromNode(
    node: string,
    graph: Map<string, string[]>,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: string[],
    cycles: CircularDependency[]
  ): void {
    visited.add(node);
    recursionStack.add(node);
    currentPath.push(node);

    const neighbors = graph.get(node) || [];
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.detectCyclesFromNode(
          neighbor,
          graph,
          visited,
          recursionStack,
          currentPath,
          cycles
        );
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStartIndex = currentPath.indexOf(neighbor);
        const cycle = currentPath.slice(cycleStartIndex);
        const isDirect = cycle.length === 2;
        
        cycles.push({
          cycle: [...cycle, neighbor], // Complete the cycle
          isDirect,
        });
      }
    }

    currentPath.pop();
    recursionStack.delete(node);
  }

  /**
   * Remove duplicate cycles (same cycle in different order)
   */
  private static deduplicateCycles(cycles: CircularDependency[]): CircularDependency[] {
    const seen = new Set<string>();
    const unique: CircularDependency[] = [];

    for (const cycle of cycles) {
      // Normalize the cycle by sorting and creating a signature
      const normalized = [...cycle.cycle].sort().join('|');
      
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(cycle);
      }
    }

    return unique;
  }

  /**
   * Resolve a relative import path to an absolute path
   */
  private static resolveImportPath(fromFile: string, importPath: string): string | null {
    // This is a simplified implementation
    // In a real implementation, you'd use Node's module resolution algorithm
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));
    
    // Handle relative paths
    if (importPath.startsWith('.')) {
      const parts = importPath.split('/');
      const dirParts = fromDir.split('/');
      
      for (const part of parts) {
        if (part === '..') {
          dirParts.pop();
        } else if (part !== '.') {
          dirParts.push(part);
        }
      }
      
      let resolved = dirParts.join('/');
      
      // Add common extensions if not present
      if (!resolved.match(/\.(ts|tsx|js|jsx)$/)) {
        // Try common extensions
        for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
          // In a real implementation, check if file exists
          return resolved + ext;
        }
      }
      
      return resolved;
    }
    
    return null;
  }
}

/**
 * Singleton instance
 */
export const circularDependencyAnalyzer = new CircularDependencyAnalyzer();
