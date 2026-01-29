/**
 * Unused Variables Analyzer
 * 
 * Detects variables, constants, and parameters that are declared but never read.
 * This is a HIGH certainty analyzer with safe auto-fix available.
 * 
 * Handles:
 * - let/const/var declarations
 * - Function parameters
 * - Destructured variables
 * - For loop variables
 * - Catch clause parameters
 * 
 * Special cases:
 * - Underscore prefix (_) convention: ignored by default
 * - Rest parameters: require careful analysis
 * - Destructuring with defaults: check all bindings
 */

import {
  SourceFile,
  VariableDeclaration,
  ParameterDeclaration,
  Node,
  SyntaxKind,
  BindingElement,
  CatchClause,
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
 * Types of variable declarations we analyze
 */
type VariableKind = 'variable' | 'parameter' | 'destructured' | 'catch' | 'for-loop';

/**
 * Result of analyzing a variable
 */
interface VariableAnalysisResult {
  name: string;
  kind: VariableKind;
  node: Node;
  isUsed: boolean;
  isExported: boolean;
}

/**
 * Analyzer for detecting unused variables
 */
export class UnusedVariablesAnalyzer implements IAnalyzer {
  readonly name = 'unused-variables';

  isEnabled(config: AnalyzerConfig): boolean {
    return config.enableUnusedVariables;
  }

  analyzeFile(sourceFile: SourceFile, config: AnalyzerConfig): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const directives = parseCodeJanitorDirectives(sourceFile);
    if (directives.fileIgnored) return [];

    // Analyze variable declarations
    const variableDeclarations = sourceFile.getVariableDeclarations();
    for (const varDecl of variableDeclarations) {
      const results = this.analyzeVariableDeclaration(varDecl, sourceFile, config);
      for (const result of results) {
        if (!result.isUsed && !result.isExported) {
          const issue = this.createIssue(result, sourceFile);
          if (!issue) continue;
          const loc = issue.locations[0];
          if (loc && directives.isLineIgnored(loc.startLine, issue.type)) continue;
          issues.push(issue);
        }
      }
    }

    // Analyze function parameters
    const functions = sourceFile.getFunctions();
    for (const func of functions) {
      const params = func.getParameters();
      for (const param of params) {
        const result = this.analyzeParameter(param, config);
        if (result && !result.isUsed) {
          const issue = this.createIssue(result, sourceFile);
          if (!issue) continue;
          const loc = issue.locations[0];
          if (loc && directives.isLineIgnored(loc.startLine, issue.type)) continue;
          issues.push(issue);
        }
      }
    }

    // Analyze method parameters
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      for (const method of cls.getMethods()) {
        const params = method.getParameters();
        for (const param of params) {
          const result = this.analyzeParameter(param, config);
          if (result && !result.isUsed) {
            const issue = this.createIssue(result, sourceFile);
            if (!issue) continue;
            const loc = issue.locations[0];
            if (loc && directives.isLineIgnored(loc.startLine, issue.type)) continue;
            issues.push(issue);
          }
        }
      }
    }

    // Analyze arrow functions and function expressions
    const arrowFunctions = sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction);
    for (const arrow of arrowFunctions) {
      const params = arrow.getParameters();
      for (const param of params) {
        const result = this.analyzeParameter(param, config);
        if (result && !result.isUsed) {
          const issue = this.createIssue(result, sourceFile);
          if (!issue) continue;
          const loc = issue.locations[0];
          if (loc && directives.isLineIgnored(loc.startLine, issue.type)) continue;
          issues.push(issue);
        }
      }
    }

    // Analyze catch clause parameters
    const catchClauses = sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause);
    for (const catchClause of catchClauses) {
      const result = this.analyzeCatchClause(catchClause as CatchClause, config);
      if (result && !result.isUsed) {
        const issue = this.createIssue(result, sourceFile);
        if (!issue) continue;
        const loc = issue.locations[0];
        if (loc && directives.isLineIgnored(loc.startLine, issue.type)) continue;
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Analyze a variable declaration (handles destructuring)
   */
  private analyzeVariableDeclaration(
    varDecl: VariableDeclaration,
    sourceFile: SourceFile,
    config: AnalyzerConfig
  ): VariableAnalysisResult[] {
    const results: VariableAnalysisResult[] = [];
    const nameNode = varDecl.getNameNode();

    // Check if the variable is exported
    const isExported = this.isVariableExported(varDecl);

    // Handle simple identifier
    if (Node.isIdentifier(nameNode)) {
      const name = nameNode.getText();
      
      // Check underscore convention
      if (this.shouldIgnoreByConvention(name, config)) {
        return results;
      }

      results.push({
        name,
        kind: 'variable',
        node: varDecl,
        isUsed: this.isVariableUsed(name, varDecl, sourceFile),
        isExported,
      });
    }
    // Handle destructuring patterns
    else if (Node.isArrayBindingPattern(nameNode) || Node.isObjectBindingPattern(nameNode)) {
      const bindings = nameNode.getElements();
      for (const binding of bindings) {
        if (Node.isBindingElement(binding)) {
          const bindingResults = this.analyzeBindingElement(binding, sourceFile, config, isExported);
          results.push(...bindingResults);
        }
      }
    }

    return results;
  }

  /**
   * Analyze a binding element from destructuring
   */
  private analyzeBindingElement(
    binding: BindingElement,
    sourceFile: SourceFile,
    config: AnalyzerConfig,
    isExported: boolean
  ): VariableAnalysisResult[] {
    const results: VariableAnalysisResult[] = [];
    const nameNode = binding.getNameNode();

    if (Node.isIdentifier(nameNode)) {
      const name = nameNode.getText();
      
      if (this.shouldIgnoreByConvention(name, config)) {
        return results;
      }

      results.push({
        name,
        kind: 'destructured',
        node: binding,
        isUsed: this.isVariableUsed(name, binding, sourceFile),
        isExported,
      });
    }
    // Handle nested destructuring
    else if (Node.isArrayBindingPattern(nameNode) || Node.isObjectBindingPattern(nameNode)) {
      const nestedBindings = nameNode.getElements();
      for (const nested of nestedBindings) {
        if (Node.isBindingElement(nested)) {
          results.push(...this.analyzeBindingElement(nested, sourceFile, config, isExported));
        }
      }
    }

    return results;
  }

  /**
   * Analyze a function/method parameter
   */
  private analyzeParameter(
    param: ParameterDeclaration,
    config: AnalyzerConfig
  ): VariableAnalysisResult | null {
    const nameNode = param.getNameNode();

    // Handle simple identifier parameter
    if (Node.isIdentifier(nameNode)) {
      const name = nameNode.getText();

      // Check underscore convention
      if (this.shouldIgnoreByConvention(name, config)) {
        return null;
      }

      // Check if this is a rest parameter - these are often intentionally unused
      if (param.isRestParameter()) {
        return null;
      }

      return {
        name,
        kind: 'parameter',
        node: param,
        isUsed: this.isParameterUsed(name, param),
        isExported: false,
      };
    }

    return null;
  }

  /**
   * Analyze a catch clause parameter
   */
  private analyzeCatchClause(
    catchClause: CatchClause,
    config: AnalyzerConfig
  ): VariableAnalysisResult | null {
    const variableDecl = catchClause.getVariableDeclaration();
    if (!variableDecl) {
      return null;
    }

    const name = variableDecl.getName();

    // Check underscore convention
    if (this.shouldIgnoreByConvention(name, config)) {
      return null;
    }

    // Get the catch block
    const block = catchClause.getBlock();
    const isUsed = this.isIdentifierUsedInScope(name, block, variableDecl);

    return {
      name,
      kind: 'catch',
      node: variableDecl,
      isUsed,
      isExported: false,
    };
  }

  /**
   * Check if a variable is used (read) after declaration
   */
  private isVariableUsed(
    name: string,
    declarationNode: Node,
    sourceFile: SourceFile
  ): boolean {
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
      .filter((id: Node) => id.getText() === name);

    for (const identifier of identifiers) {
      // Skip the declaration itself
      if (this.isSameOrChildOf(identifier, declarationNode)) {
        continue;
      }

      // Skip if this is part of the variable's own initializer
      if (this.isPartOfOwnInitializer(identifier, declarationNode)) {
        continue;
      }

      // Skip property accesses where this is not the leftmost identifier
      // e.g., in `obj.name`, we only care if `name` is used, not as a property
      if (this.isPropertyNameInAccess(identifier)) {
        continue;
      }

      // Found a usage
      return true;
    }

    return false;
  }

  private isParameterUsed(
    name: string,
    param: ParameterDeclaration
  ): boolean {
    // Get the function body
    const funcLike = param.getParent();
    if (!funcLike) {
      return true; // Assume used if we can't find the function
    }

    // Get the body of the function
    let body: Node | undefined;
    if (Node.isFunctionDeclaration(funcLike) || Node.isMethodDeclaration(funcLike)) {
      body = funcLike.getBody();
    } else if (Node.isArrowFunction(funcLike) || Node.isFunctionExpression(funcLike)) {
      body = funcLike.getBody();
    }

    if (!body) {
      return true; // Assume used if no body (e.g., abstract method)
    }

    return this.isIdentifierUsedInScope(name, body, param);
  }

  /**
   * Check if an identifier is used within a specific scope
   */
  private isIdentifierUsedInScope(
    name: string,
    scope: Node,
    declarationNode: Node
  ): boolean {
    const identifiers = scope.getDescendantsOfKind(SyntaxKind.Identifier)
      .filter((id: Node) => id.getText() === name);

    for (const identifier of identifiers) {
      if (!this.isSameOrChildOf(identifier, declarationNode)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if node is the same as or a child of another node
   */
  private isSameOrChildOf(node: Node, potentialParent: Node): boolean {
    let current: Node | undefined = node;
    while (current) {
      if (current === potentialParent) {
        return true;
      }
      current = current.getParent();
    }
    return false;
  }

  /**
   * Check if identifier is part of the variable's own initializer
   * e.g., `const x = x + 1` - the right-hand `x` refers to outer scope
   */
  private isPartOfOwnInitializer(identifier: Node, declarationNode: Node): boolean {
    if (!Node.isVariableDeclaration(declarationNode)) {
      return false;
    }

    const initializer = declarationNode.getInitializer();
    if (!initializer) {
      return false;
    }

    return this.isSameOrChildOf(identifier, initializer);
  }

  /**
   * Check if identifier is a property name in property access
   * e.g., `foo.bar` - `bar` is a property name, not a reference
   */
  private isPropertyNameInAccess(identifier: Node): boolean {
    const parent = identifier.getParent();
    if (Node.isPropertyAccessExpression(parent)) {
      // Check if this identifier is the name part (right side)
      const name = parent.getNameNode();
      return name === identifier;
    }
    return false;
  }

  /**
   * Check if variable is exported
   */
  private isVariableExported(varDecl: VariableDeclaration): boolean {
    const statement = varDecl.getVariableStatement();
    if (!statement) {
      return false;
    }
    return statement.isExported();
  }

  /**
   * Check if a name should be ignored based on naming convention
   */
  private shouldIgnoreByConvention(name: string, config: AnalyzerConfig): boolean {
    if (config.respectUnderscoreConvention) {
      return name.startsWith('_');
    }
    return false;
  }

  /**
   * Create a CodeIssue for an unused variable
   */
  private createIssue(result: VariableAnalysisResult, sourceFile: SourceFile): CodeIssue {
    const startLine = result.node.getStartLineNumber();
    const endLine = result.node.getEndLineNumber();
    // Get column from start/end position
    const startCol = 1;
    const endCol = 1;

    const location: SourceLocation = {
      filePath: sourceFile.getFilePath(),
      startLine,
      startColumn: startCol,
      endLine,
      endColumn: endCol,
      sourceText: result.node.getText(),
    };

    const kindDescription = this.getKindDescription(result.kind);

    return {
      id: generateIssueId('unused-variable', sourceFile.getFilePath(), result.name, startLine),
      type: 'unused-variable',
      certainty: 'high' as Certainty,
      reason: `${kindDescription} '${result.name}' is declared but never used`,
      locations: [location],
      safeFixAvailable: result.kind !== 'parameter', // Don't auto-remove parameters
      symbolName: result.name,
      explanation: `The ${kindDescription.toLowerCase()} '${result.name}' is declared but never read. ` +
        (result.kind === 'parameter'
          ? `Consider prefixing with underscore (_${result.name}) if intentionally unused.`
          : `This can be safely removed.`),
      suggestedFix: result.kind === 'parameter'
        ? `Prefix with underscore: _${result.name}`
        : `Remove unused ${kindDescription.toLowerCase()} '${result.name}'`,
      tags: [result.kind],
    };
  }

  /**
   * Get human-readable description of variable kind
   */
  private getKindDescription(kind: VariableKind): string {
    switch (kind) {
      case 'variable':
        return 'Variable';
      case 'parameter':
        return 'Parameter';
      case 'destructured':
        return 'Destructured variable';
      case 'catch':
        return 'Catch parameter';
      case 'for-loop':
        return 'Loop variable';
      default:
        return 'Variable';
    }
  }
}

/**
 * Singleton instance
 */
export const unusedVariablesAnalyzer = new UnusedVariablesAnalyzer();
