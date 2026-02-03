/**
 * Complexity Analyzer
 * 
 * Calculates code complexity metrics for functions and classes:
 * - Cyclomatic complexity: Number of independent paths through code
 * - Cognitive complexity: How difficult code is to understand
 * - Nesting depth: Maximum level of nested control structures
 * 
 * Tracks complexity trends over time to identify degradation.
 */

import {
  SourceFile,
  FunctionDeclaration,
  MethodDeclaration,
  ArrowFunction,
  FunctionExpression,
  Node,
  SyntaxKind,
} from 'ts-morph';
import { BaseEnterpriseAnalyzer } from './base';
import {
  CodeIssue,
  AnalyzerConfig,
  SourceLocation,
  generateIssueId,
  QualityMetrics,
  ComplexityMetrics,
  AnalyzerPriority,
  AnalyzerCategory,
} from '../models';
import { parseCodeJanitorDirectives } from './ignoreDirectives';

type FunctionLike = FunctionDeclaration | MethodDeclaration | ArrowFunction | FunctionExpression;

/**
 * Default complexity thresholds
 */
const DEFAULT_THRESHOLDS = {
  cyclomaticComplexity: 10,
  cognitiveComplexity: 15,
  maxNestingDepth: 4,
};

/**
 * Complexity analysis result for a function
 */
interface FunctionComplexity {
  name: string;
  node: FunctionLike;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maxNestingDepth: number;
  parameters: number;
  linesOfCode: number;
}

/**
 * Analyzer for code complexity metrics
 */
export class ComplexityAnalyzer extends BaseEnterpriseAnalyzer {
  readonly name = 'complexity';
  readonly priority: AnalyzerPriority = 70;
  readonly category: AnalyzerCategory = 'maintainability';

  isEnabled(config: AnalyzerConfig): boolean {
    return config.enableComplexityAnalysis;
  }

  analyzeFile(sourceFile: SourceFile, config: AnalyzerConfig): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const directives = parseCodeJanitorDirectives(sourceFile);
    
    if (directives.fileIgnored) {
      return [];
    }

    const thresholds = config.complexityThresholds || DEFAULT_THRESHOLDS;
    
    // Analyze all functions in the file
    const functions = this.getAllFunctions(sourceFile);
    
    for (const func of functions) {
      const complexity = this.calculateComplexity(func.node);
      
      // Check if complexity exceeds thresholds
      if (
        complexity.cyclomaticComplexity > thresholds.cyclomaticComplexity ||
        complexity.cognitiveComplexity > thresholds.cognitiveComplexity ||
        complexity.maxNestingDepth > thresholds.maxNestingDepth
      ) {
        const issue = this.createIssue(sourceFile, complexity, thresholds);
        const loc = issue.locations[0];
        if (loc && directives.isLineIgnored(loc.startLine, issue.type)) {
          continue;
        }
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Get quality metrics for the file
   */
  getMetrics(sourceFile: SourceFile): QualityMetrics {
    const metrics = super.getMetrics(sourceFile);
    const functions = this.getAllFunctions(sourceFile);
    
    let totalCyclomatic = 0;
    let totalCognitive = 0;
    let maxNesting = 0;
    let maxParams = 0;
    let totalLoc = 0;

    for (const func of functions) {
      const complexity = this.calculateComplexity(func.node);
      totalCyclomatic += complexity.cyclomaticComplexity;
      totalCognitive += complexity.cognitiveComplexity;
      maxNesting = Math.max(maxNesting, complexity.maxNestingDepth);
      maxParams = Math.max(maxParams, complexity.parameters);
      totalLoc += complexity.linesOfCode;
    }

    const complexityMetrics: ComplexityMetrics = {
      cyclomaticComplexity: functions.length > 0 ? Math.round(totalCyclomatic / functions.length) : 0,
      cognitiveComplexity: functions.length > 0 ? Math.round(totalCognitive / functions.length) : 0,
      maxNestingDepth: maxNesting,
      maxParameters: maxParams,
      linesOfCode: sourceFile.getEndLineNumber(),
    };

    metrics.complexity = complexityMetrics;
    
    // Update maintainability index based on complexity
    metrics.maintainability.maintainabilityIndex = this.calculateMaintainabilityIndex(
      complexityMetrics,
      totalLoc
    );

    return metrics;
  }

  /**
   * Get all function-like nodes in the source file
   */
  private getAllFunctions(sourceFile: SourceFile): { name: string; node: FunctionLike }[] {
    const functions: { name: string; node: FunctionLike }[] = [];

    // Function declarations
    sourceFile.getFunctions().forEach((func) => {
      const name = func.getName() || '<anonymous>';
      functions.push({ name, node: func });
    });

    // Class methods
    sourceFile.getClasses().forEach((cls) => {
      cls.getMethods().forEach((method) => {
        const className = cls.getName() || '<anonymous>';
        const methodName = method.getName();
        functions.push({ name: `${className}.${methodName}`, node: method });
      });
    });

    // Arrow functions and function expressions
    sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction).forEach((arrow) => {
      const name = this.getFunctionName(arrow) || '<arrow>';
      functions.push({ name, node: arrow });
    });

    sourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression).forEach((funcExpr) => {
      const name = this.getFunctionName(funcExpr) || '<function>';
      functions.push({ name, node: funcExpr });
    });

    return functions;
  }

  /**
   * Try to get a meaningful name for an arrow function or function expression
   */
  private getFunctionName(node: ArrowFunction | FunctionExpression): string | undefined {
    const parent = node.getParent();
    
    if (Node.isVariableDeclaration(parent)) {
      return parent.getName();
    }
    
    if (Node.isPropertyAssignment(parent)) {
      return parent.getName();
    }
    
    if (Node.isPropertyDeclaration(parent)) {
      return parent.getName();
    }
    
    return undefined;
  }

  /**
   * Calculate complexity metrics for a function
   */
  private calculateComplexity(func: FunctionLike): FunctionComplexity {
    const name = this.getFunctionDisplayName(func);
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(func);
    const cognitiveComplexity = this.calculateCognitiveComplexity(func);
    const maxNestingDepth = this.calculateMaxNestingDepth(func);
    const parameters = this.getParameterCount(func);
    const linesOfCode = this.getLinesOfCode(func);

    return {
      name,
      node: func,
      cyclomaticComplexity,
      cognitiveComplexity,
      maxNestingDepth,
      parameters,
      linesOfCode,
    };
  }

  /**
   * Get display name for a function
   */
  private getFunctionDisplayName(func: FunctionLike): string {
    if (Node.isFunctionDeclaration(func)) {
      return func.getName() || '<anonymous>';
    }
    if (Node.isMethodDeclaration(func)) {
      return func.getName();
    }
    return this.getFunctionName(func as ArrowFunction | FunctionExpression) || '<anonymous>';
  }

  /**
   * Calculate cyclomatic complexity (number of decision points + 1)
   */
  private calculateCyclomaticComplexity(func: FunctionLike): number {
    let complexity = 1; // Base complexity

    func.forEachDescendant((node) => {
      switch (node.getKind()) {
        case SyntaxKind.IfStatement:
        case SyntaxKind.ConditionalExpression:
        case SyntaxKind.CaseClause:
        case SyntaxKind.ForStatement:
        case SyntaxKind.ForInStatement:
        case SyntaxKind.ForOfStatement:
        case SyntaxKind.WhileStatement:
        case SyntaxKind.DoStatement:
        case SyntaxKind.CatchClause:
          complexity++;
          break;
        case SyntaxKind.BinaryExpression:
          // Count logical operators (&&, ||)
          const binExpr = node.asKind(SyntaxKind.BinaryExpression);
          if (binExpr) {
            const operator = binExpr.getOperatorToken().getKind();
            if (operator === SyntaxKind.AmpersandAmpersandToken || 
                operator === SyntaxKind.BarBarToken) {
              complexity++;
            }
          }
          break;
      }
    });

    return complexity;
  }

  /**
   * Calculate cognitive complexity (how hard it is to understand)
   * This is a simplified version of the Cognitive Complexity metric
   */
  private calculateCognitiveComplexity(func: FunctionLike): number {
    let complexity = 0;
    let nestingLevel = 0;

    const traverse = (node: Node, level: number) => {
      const kind = node.getKind();
      
      // Increment for control flow structures
      if (this.isControlFlowNode(kind)) {
        complexity += 1 + level; // Add nesting penalty
      }

      // Increment nesting for certain structures
      const incrementsNesting = this.incrementsNesting(kind);
      if (incrementsNesting) {
        nestingLevel++;
      }

      // Traverse children
      node.forEachChild((child) => traverse(child, nestingLevel));

      if (incrementsNesting) {
        nestingLevel--;
      }
    };

    func.forEachChild((child) => traverse(child, 0));

    return complexity;
  }

  /**
   * Check if a node is a control flow node
   */
  private isControlFlowNode(kind: SyntaxKind): boolean {
    return (
      kind === SyntaxKind.IfStatement ||
      kind === SyntaxKind.ConditionalExpression ||
      kind === SyntaxKind.SwitchStatement ||
      kind === SyntaxKind.ForStatement ||
      kind === SyntaxKind.ForInStatement ||
      kind === SyntaxKind.ForOfStatement ||
      kind === SyntaxKind.WhileStatement ||
      kind === SyntaxKind.DoStatement ||
      kind === SyntaxKind.CatchClause
    );
  }

  /**
   * Check if a node increments nesting level
   */
  private incrementsNesting(kind: SyntaxKind): boolean {
    return (
      kind === SyntaxKind.IfStatement ||
      kind === SyntaxKind.ForStatement ||
      kind === SyntaxKind.ForInStatement ||
      kind === SyntaxKind.ForOfStatement ||
      kind === SyntaxKind.WhileStatement ||
      kind === SyntaxKind.DoStatement ||
      kind === SyntaxKind.CatchClause ||
      kind === SyntaxKind.SwitchStatement
    );
  }

  /**
   * Calculate maximum nesting depth
   */
  private calculateMaxNestingDepth(func: FunctionLike): number {
    let maxDepth = 0;
    let currentDepth = 0;

    const traverse = (node: Node) => {
      if (this.incrementsNesting(node.getKind())) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }

      node.forEachChild(traverse);

      if (this.incrementsNesting(node.getKind())) {
        currentDepth--;
      }
    };

    func.forEachChild(traverse);

    return maxDepth;
  }

  /**
   * Get parameter count
   */
  private getParameterCount(func: FunctionLike): number {
    if (Node.isFunctionDeclaration(func) || Node.isMethodDeclaration(func)) {
      return func.getParameters().length;
    }
    if (Node.isArrowFunction(func) || Node.isFunctionExpression(func)) {
      return func.getParameters().length;
    }
    return 0;
  }

  /**
   * Get lines of code for a function
   */
  private getLinesOfCode(func: FunctionLike): number {
    const start = func.getStartLineNumber();
    const end = func.getEndLineNumber();
    return end - start + 1;
  }

  /**
   * Calculate maintainability index (0-100, higher is better)
   * Simplified version of the Maintainability Index formula
   */
  private calculateMaintainabilityIndex(
    complexity: ComplexityMetrics,
    totalLoc: number
  ): number {
    const loc = Math.max(1, totalLoc);
    const cc = Math.max(1, complexity.cyclomaticComplexity);
    
    // Simplified formula: 171 - 5.2 * ln(V) - 0.23 * CC - 16.2 * ln(LOC)
    // Where V is Halstead Volume (approximated here)
    const mi = 171 - 5.2 * Math.log(loc) - 0.23 * cc - 16.2 * Math.log(loc);
    
    // Normalize to 0-100
    return Math.max(0, Math.min(100, mi));
  }

  /**
   * Create a CodeIssue for high complexity
   */
  private createIssue(
    sourceFile: SourceFile,
    complexity: FunctionComplexity,
    thresholds: typeof DEFAULT_THRESHOLDS
  ): CodeIssue {
    const node = complexity.node;
    const startLine = node.getStartLineNumber();
    const endLine = node.getEndLineNumber();

    const location: SourceLocation = {
      filePath: sourceFile.getFilePath(),
      startLine,
      startColumn: node.getStart(),
      endLine,
      endColumn: node.getEnd(),
      sourceText: node.getText().substring(0, 100) + '...',
    };

    const violations: string[] = [];
    if (complexity.cyclomaticComplexity > thresholds.cyclomaticComplexity) {
      violations.push(
        `Cyclomatic complexity: ${complexity.cyclomaticComplexity} (threshold: ${thresholds.cyclomaticComplexity})`
      );
    }
    if (complexity.cognitiveComplexity > thresholds.cognitiveComplexity) {
      violations.push(
        `Cognitive complexity: ${complexity.cognitiveComplexity} (threshold: ${thresholds.cognitiveComplexity})`
      );
    }
    if (complexity.maxNestingDepth > thresholds.maxNestingDepth) {
      violations.push(
        `Nesting depth: ${complexity.maxNestingDepth} (threshold: ${thresholds.maxNestingDepth})`
      );
    }

    return {
      id: generateIssueId('high-complexity', sourceFile.getFilePath(), complexity.name, startLine),
      type: 'high-complexity',
      certainty: 'medium',
      reason: `Function '${complexity.name}' has high complexity: ${violations.join(', ')}`,
      locations: [location],
      safeFixAvailable: false,
      symbolName: complexity.name,
      explanation:
        `High complexity makes code harder to understand, test, and maintain. ` +
        `Consider breaking this function into smaller, more focused functions.`,
      suggestedFix:
        `• Extract complex logic into separate functions\n` +
        `• Reduce nesting by using early returns\n` +
        `• Simplify conditional logic\n` +
        `• Consider using design patterns (Strategy, Command, etc.)`,
      tags: ['complexity', 'maintainability'],
    };
  }
}

/**
 * Singleton instance
 */
export const complexityAnalyzer = new ComplexityAnalyzer();
