import { describe, it, expect, beforeEach } from 'vitest';
import { Project } from 'ts-morph';
import { unusedImportsAnalyzer } from '../unusedImportsAnalyzer';
import { AnalyzerConfig } from '../../models';

describe('UnusedImportsAnalyzer', () => {
  let project: Project;

  const defaultConfig: AnalyzerConfig = {
    enableUnusedImports: true,
    enableUnusedVariables: true,
    enableDeadFunctions: true,
    enableDeadExports: true,
    enableMissingImplementations: true,
    autoFixOnSave: false,
    ignorePatterns: [],
    respectUnderscoreConvention: true,
  };

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
  });

  it('should be enabled when config is true', () => {
    expect(unusedImportsAnalyzer.isEnabled(defaultConfig)).toBe(true);
  });

  it('should be disabled when config is false', () => {
    expect(unusedImportsAnalyzer.isEnabled({ ...defaultConfig, enableUnusedImports: false })).toBe(false);
  });

  it('should report unused default imports', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      import foo from 'module';
      const bar = 1;
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.symbolName).toBe('foo');
    expect(issues[0]?.type).toBe('unused-import');
  });

  it('should not report used default imports', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      import foo from 'module';
      console.log(foo);
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it('should report unused named imports', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      import { foo, bar } from 'module';
      console.log(foo);
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.symbolName).toBe('bar');
  });

  it('should not report used named imports', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      import { foo, bar } from 'module';
      console.log(foo, bar);
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it('should report unused namespace imports', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      import * as foo from 'module';
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.symbolName).toBe('foo');
  });

  it('should not report side-effect imports', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      import 'module';
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it('should correctly handle aliased imports', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      import { foo as bar, baz as qux } from 'module';
      console.log(bar);
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.symbolName).toBe('qux');
  });

  it('should correctly handle type-only imports', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      import type { Foo } from 'module';
      import { type Bar } from 'module';
      let x: string;
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(2);
    expect(issues[0]?.symbolName).toBe('Foo');
    expect(issues[0]?.tags).toContain('type-only');
    expect(issues[1]?.symbolName).toBe('Bar');
    expect(issues[1]?.tags).toContain('type-only');
  });

  it('should not report used type-only imports', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      import type { Foo } from 'module';
      import { type Bar } from 'module';
      let x: Foo;
      let y: Bar;
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it('should respect @codejanitor-ignore-next directives', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      // @codejanitor-ignore-next unused-import
      import foo from 'module';
      import bar from 'module2';
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.symbolName).toBe('bar');
  });

  it('should respect @codejanitor-ignore-file directives', () => {
    const sourceFile = project.createSourceFile('test.ts', `
      // @codejanitor-ignore-file
      import foo from 'module';
      import bar from 'module2';
    `);

    const issues = unusedImportsAnalyzer.analyzeFile(sourceFile, defaultConfig);

    expect(issues).toHaveLength(0);
  });
});
