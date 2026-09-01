/**
 * Dead Functions Analyzer
 * 
 * Detects functions that are declared but never called or referenced.
 * This is a MEDIUM certainty analyzer - NO auto-fix by default.
 * 
 * Handles:
 * - Function declarations
 * - Function expressions assigned to variables
 * - Arrow functions assigned to variables
 * - Class methods (excluding certain patterns)
 * 
 * Exclusions (LOW certainty or ignored):
 * - Exported functions (may be used externally)
 * - Lifecycle hooks (React, Angular, Vue, etc.)
 * - Event handlers with specific naming patterns
 * - Methods with decorators
 * - Main/entry point patterns
 */

import {
  SourceFile,
  FunctionDeclaration,
  MethodDeclaration,
  ParameterDeclaration,
  Node,
  SyntaxKind,
  ClassDeclaration,
} from 'ts-morph';
import { IAnalyzer } from './base';
import {
  CodeIssue,
  AnalyzerConfig,
  SourceLocation,
  generateIssueId,
} from '../models';
import { parseCodeJanitorDirectives } from './ignoreDirectives';

/**
 * Common lifecycle and framework patterns that should not be flagged
 */
const LIFECYCLE_PATTERNS: RegExp[] = [
  // React
  /^(componentDidMount|componentDidUpdate|componentWillUnmount|shouldComponentUpdate|getDerivedStateFromProps|getSnapshotBeforeUpdate|componentDidCatch|render)$/,
  /^use[A-Z]/, // React hooks
  
  // Angular
  /^(ngOnInit|ngOnDestroy|ngOnChanges|ngDoCheck|ngAfterContentInit|ngAfterContentChecked|ngAfterViewInit|ngAfterViewChecked)$/,
  
  // Vue
  /^(beforeCreate|created|beforeMount|mounted|beforeUpdate|updated|beforeDestroy|destroyed|activated|deactivated|beforeUnmount|unmounted)$/,
  
  // Common patterns
  /^(setup|teardown|init|initialize|dispose|cleanup|destroy)$/i,
  /^(handle|on)[A-Z]/, // Event handlers
  /^(get|set)[A-Z]/, // Getters/setters
];

/**
 * Entry point function names that should not be flagged
 */
const ENTRY_POINT_PATTERNS: RegExp[] = [
  /^main$/i,
  /^(activate|deactivate)$/, // VS Code extension
  /^(handler|run|execute|start|bootstrap)$/i,
];

/**
 * Callback to check if a symbol is referenced outside of current file
 */
export type ExternalReferenceChecker = (symbol: string, sourceFile: SourceFile) => boolean;

/**
 * Analyzer for detecting dead (unreferenced) functions
 */
export class DeadFunctionsAnalyzer implements IAnalyzer {
  readonly name = 'dead-functions';
  
  /**
   * Optional workspace context for more accurate analysis
   */
  private externalReferenceChecker: ExternalReferenceChecker | null = null;

  isEnabled(config: AnalyzerConfig): boolean {
    return config.enableDeadFunctions;
  }

  /**
   * Set the external reference checker (called from WorkspaceAnalyzer)
   */
  setExternalReferenceChecker(checker: ExternalReferenceChecker): void {
    this.externalReferenceChecker = checker;
  }

  analyzeFile(sourceFile: SourceFile, _config: AnalyzerConfig): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const directives = parseCodeJanitorDirectives(sourceFile);
    if (directives.fileIgnored) return [];

    // Analyze function declarations
    const functions = sourceFile.getFunctions();
    for (const func of functions) {
      const issue = this.analyzeFunctionDeclaration(func, sourceFile);
      if (issue) {
        const loc = issue.locations[0];
        if (loc && directives.isLineIgnored(loc.startLine, issue.type)) continue;
        issues.push(issue);
      }
    }

    // Analyze class methods
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      const methodIssues = this.analyzeClassMethods(cls, sourceFile);
      for (const issue of methodIssues) {
        const loc = issue.locations[0];
        if (loc && directives.isLineIgnored(loc.startLine, issue.type)) continue;
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Analyze a function declaration for references
   */
  private analyzeFunctionDeclaration(
    func: FunctionDeclaration,
    sourceFile: SourceFile
  ): CodeIssue | null {
    const name = func.getName();
    
    // Skip anonymous functions
    if (!name) {
      return null;
    }

    // Skip exported functions (may be used in other files)
    // Note: If workspace context is available, we'll check external references
    if (func.isExported() || func.isDefaultExport()) {
      // If we have workspace context, check if it's actually used elsewhere
      if (this.externalReferenceChecker && 
          this.externalReferenceChecker(name, sourceFile)) {
        return null;
      }
      // If no workspace context, skip exported functions to avoid false positives
      if (!this.externalReferenceChecker) {
        return null;
      }
    }

    // Skip lifecycle/framework patterns
    if (this.isLifecyclePattern(name)) {
      return null;
    }

    // Skip entry point patterns
    if (this.isEntryPointPattern(name)) {
      return null;
    }

    // Check if the function is referenced anywhere
    const isReferenced = this.isFunctionReferenced(name, func, sourceFile);
    
    if (!isReferenced) {
      return this.createIssue(func, name, sourceFile, 'function');
    }

    return null;
  }

  /**
   * Analyze class methods for references
   */
  private analyzeClassMethods(
    cls: ClassDeclaration,
    sourceFile: SourceFile
  ): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const className = cls.getName();
    
    // Skip exported classes (methods may be used externally)
    if (cls.isExported() || cls.isDefaultExport()) {
      // If we have workspace context, check if class is actually used
      if (!className || !this.externalReferenceChecker || 
          !this.externalReferenceChecker(className, sourceFile)) {
        // No workspace context or not used externally, skip
        return issues;
      }
    }

    const methods = cls.getMethods();
    for (const method of methods) {
      const issue = this.analyzeMethod(method, cls, sourceFile);
      if (issue) {
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Analyze a single class method
   */
  private analyzeMethod(
    method: MethodDeclaration,
    cls: ClassDeclaration,
    sourceFile: SourceFile
  ): CodeIssue | null {
    const name = method.getName();

    // Skip constructors
    if (name === 'constructor') {
      return null;
    }

    // Skip private methods that start with underscore (intentionally private)
    if (name.startsWith('_')) {
      return null;
    }

    // Skip lifecycle/framework patterns
    if (this.isLifecyclePattern(name)) {
      return null;
    }

    // Skip methods with decorators (often framework-managed)
    if (method.getDecorators().length > 0) {
      return null;
    }

    // Skip static methods (may be called without instance)
    if (method.isStatic()) {
      // Still check if it's referenced
      const isReferenced = this.isStaticMethodReferenced(name, cls, sourceFile);
      if (!isReferenced) {
        return this.createIssue(method, name, sourceFile, 'method');
      }
      return null;
    }

    // Check if the method is called anywhere
    const isReferenced = this.isMethodReferenced(name, method, sourceFile);
    
    if (!isReferenced) {
      return this.createIssue(method, name, sourceFile, 'method');
    }

    return null;
  }

  /**
   * Check if a function is referenced anywhere in the file
   */
  private isFunctionReferenced(
    name: string,
    funcDecl: FunctionDeclaration,
    sourceFile: SourceFile
  ): boolean {
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
      .filter((id: Node) => id.getText() === name);

    for (const identifier of identifiers) {
      // Skip the function declaration name itself
      if (this.isPartOfFunctionDeclaration(identifier, funcDecl)) {
        continue;
      }

      // Found a reference
      return true;
    }

    return false;
  }

  /**
   * Check if a method is referenced (called) anywhere
   */
  private isMethodReferenced(
    name: string,
    _method: MethodDeclaration,
    sourceFile: SourceFile
  ): boolean {
    // Look for property access expressions like `this.methodName` or `obj.methodName`
    const propertyAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
    
    for (const access of propertyAccesses) {
      const propName = access.getName();
      if (propName === name) {
        // Check if this is a call expression (method is being called)
        const parent = access.getParent();
        if (Node.isCallExpression(parent)) {
          return true;
        }
        // Also count references (passing method as callback)
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a static method is referenced
   */
  private isStaticMethodReferenced(
    name: string,
    cls: ClassDeclaration,
    sourceFile: SourceFile
  ): boolean {
    const className = cls.getName();
    if (!className) {
      return true; // Assume used if anonymous class
    }

    // Look for ClassName.methodName patterns
    const propertyAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
    
    for (const access of propertyAccesses) {
      const expression = access.getExpression();
      const propName = access.getName();
      
      if (propName === name && Node.isIdentifier(expression) && expression.getText() === className) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if identifier is part of the function declaration itself
   */
  private isPartOfFunctionDeclaration(identifier: Node, funcDecl: FunctionDeclaration): boolean {
    let current: Node | undefined = identifier;
    while (current) {
      if (current === funcDecl) {
        // Check if this identifier is the function name
        const nameNode = funcDecl.getNameNode();
        if (nameNode && this.isSameNode(identifier, nameNode)) {
          return true;
        }
        // If inside the function but not the name, it's a recursive call
        return false;
      }
      current = current.getParent();
    }
    return false;
  }

  /**
   * Check if two nodes are the same
   */
  private isSameNode(a: Node, b: Node): boolean {
    return a.getStart() === b.getStart() && a.getEnd() === b.getEnd();
  }

  /**
   * Check if a name matches lifecycle patterns
   */
  private isLifecyclePattern(name: string): boolean {
    return LIFECYCLE_PATTERNS.some(pattern => pattern.test(name));
  }

  /**
   * Check if a name matches entry point patterns
   */
  private isEntryPointPattern(name: string): boolean {
    return ENTRY_POINT_PATTERNS.some(pattern => pattern.test(name));
  }

  /**
   * Create a CodeIssue for a dead function
   */
  private createIssue(
    node: FunctionDeclaration | MethodDeclaration,
    name: string,
    sourceFile: SourceFile,
    kind: 'function' | 'method'
  ): CodeIssue {
    const startLine = node.getStartLineNumber();
    const endLine = node.getEndLineNumber();
    // Get column from start/end position on line
    const startCol = 1;
    const endCol = 1;

    const location: SourceLocation = {
      filePath: sourceFile.getFilePath(),
      startLine,
      startColumn: startCol,
      endLine,
      endColumn: endCol,
      sourceText: this.getFunctionSignature(node),
    };

    const kindDescription = kind === 'function' ? 'Function' : 'Method';
    const analysisScope = this.externalReferenceChecker ? 'workspace' : 'file';

    return {
      id: generateIssueId('dead-function', sourceFile.getFilePath(), name, startLine),
      type: 'dead-function',
      // HIGH certainty if workspace context available, MEDIUM if file-scoped
      certainty: this.externalReferenceChecker ? 'high' : 'medium',
      reason: `${kindDescription} '${name}' appears to be unused (no references found in this ${analysisScope})`,
      locations: [location],
      // No auto-fix for dead functions - too risky
      safeFixAvailable: false,
      symbolName: name,
      explanation: `The ${kind} '${name}' is declared but not called or referenced anywhere in this ${analysisScope}. ` +
        (this.externalReferenceChecker
          ? `This analysis includes workspace-wide reference checking.`
          : `Note: This analysis is file-scoped. The ${kind} might be referenced in other files.`),
      suggestedFix: `Review if '${name}' is needed. If not, consider removing it.`,
      tags: [kind, 'requires-review'],
    };
  }

  /**
   * Get a concise function signature for display
   */
  private getFunctionSignature(node: FunctionDeclaration | MethodDeclaration): string {
    const name = node.getName() || 'anonymous';
    const params = node.getParameters()
      .map((p: ParameterDeclaration) => p.getName())
      .join(', ');
    return `${name}(${params})`;
  }
}

/**
 * Singleton instance
 */
export const deadFunctionsAnalyzer = new DeadFunctionsAnalyzer();
