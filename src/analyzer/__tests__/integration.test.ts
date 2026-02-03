/**
 * Integration tests for analyzer framework
 * Verifies that all analyzers work together correctly
 */

import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { WorkspaceAnalyzer } from '../workspaceAnalyzer';
import { AnalyzerConfig } from '../../models';

describe('Analyzer Integration', () => {
  it('should load all analyzers without errors', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99,
        module: 99,
      },
    });

    const analyzer = new WorkspaceAnalyzer(project);
    const analyzers = analyzer.getAnalyzers();

    // Should have all 7 analyzers (3 basic + 4 enterprise)
    expect(analyzers.length).toBe(7);
    expect(analyzers.map(a => a.name)).toContain('unused-imports');
    expect(analyzers.map(a => a.name)).toContain('unused-variables');
    expect(analyzers.map(a => a.name)).toContain('dead-functions');
    expect(analyzers.map(a => a.name)).toContain('circular-dependency');
    expect(analyzers.map(a => a.name)).toContain('complexity');
    expect(analyzers.map(a => a.name)).toContain('security');
    expect(analyzers.map(a => a.name)).toContain('accessibility');
  });

  it('should analyze a simple file with all analyzers enabled', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99,
        module: 99,
      },
    });

    const sourceFile = project.createSourceFile(
      'test.ts',
      `
        function simpleFunction() {
          return 42;
        }
      `
    );

    const analyzer = new WorkspaceAnalyzer(project);
    const config: AnalyzerConfig = {
      enableUnusedImports: true,
      enableUnusedVariables: true,
      enableDeadFunctions: true,
      enableDeadExports: false,
      enableMissingImplementations: false,
      enableCircularDependencies: true,
      enableComplexityAnalysis: true,
      enableSecurityAnalysis: true,
      enableAccessibilityAnalysis: true,
      autoFixOnSave: false,
      ignorePatterns: [],
      respectUnderscoreConvention: true,
    };

    const result = analyzer.analyzeFile(sourceFile, config);

    expect(result.success).toBe(true);
    expect(result.filePath).toContain('test.ts');
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('should respect analyzer enable flags', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99,
        module: 99,
      },
    });

    const sourceFile = project.createSourceFile(
      'test.ts',
      `
        import { unused } from 'module';
        function test() { return 1; }
      `
    );

    const analyzer = new WorkspaceAnalyzer(project);
    
    // Disable all analyzers
    const config: AnalyzerConfig = {
      enableUnusedImports: false,
      enableUnusedVariables: false,
      enableDeadFunctions: false,
      enableDeadExports: false,
      enableMissingImplementations: false,
      enableCircularDependencies: false,
      enableComplexityAnalysis: false,
      enableSecurityAnalysis: false,
      enableAccessibilityAnalysis: false,
      autoFixOnSave: false,
      ignorePatterns: [],
      respectUnderscoreConvention: true,
    };

    const result = analyzer.analyzeFile(sourceFile, config);

    expect(result.success).toBe(true);
    expect(result.issues.length).toBe(0);
  });
});
