import { describe, it, expect, beforeEach } from 'vitest';
import { Project } from 'ts-morph';
import { deadExportsAnalyzer } from './deadExportsAnalyzer';
import { AnalyzerConfig } from '../models';

describe('DeadExportsAnalyzer', () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
  });

  const createConfig = (overrides: Partial<AnalyzerConfig> = {}): AnalyzerConfig => ({
    enableUnusedImports: true,
    enableUnusedVariables: true,
    enableDeadFunctions: true,
    enableDeadExports: true,
    enableMissingImplementations: true,
    autoFixOnSave: false,
    ignorePatterns: [],
    respectUnderscoreConvention: true,
    ...overrides
  });

  describe('isEnabled', () => {
    it('returns true if config.enableDeadExports is true', () => {
      expect(deadExportsAnalyzer.isEnabled(createConfig({ enableDeadExports: true }))).toBe(true);
    });

    it('returns false if config.enableDeadExports is false', () => {
      expect(deadExportsAnalyzer.isEnabled(createConfig({ enableDeadExports: false }))).toBe(false);
    });
  });

  describe('analyzeFile', () => {
    it('returns empty array as logic is workspace-wide', () => {
      const sourceFile = project.createSourceFile('test.ts', `export const a = 1;`);
      expect(deadExportsAnalyzer.analyzeFile(sourceFile, createConfig())).toEqual([]);
    });
  });

  describe('analyzeWorkspaceExports', () => {
    it('flags unused exports of different types', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        export const myVar = 1;
        export function myFunction() {}
        export class MyClass {}
        export interface MyInterface {}
        export type MyType = string;
      `);

      const isUsed = () => false; // None are used externally

      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());

      expect(issues).toHaveLength(5);

      const symbols = issues.map(i => i.symbolName);
      expect(symbols).toContain('myVar');
      expect(symbols).toContain('myFunction');
      expect(symbols).toContain('MyClass');
      expect(symbols).toContain('MyInterface');
      expect(symbols).toContain('MyType');

      // Ensure basic structure is correct
      expect(issues[0]?.type).toBe('dead-export');
      expect(issues[0]?.certainty).toBe('medium');
      expect(issues[0]?.safeFixAvailable).toBe(false);
    });

    it('does not flag used exports', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        export const usedVar = 1;
        export const unusedVar = 2;
      `);

      const isUsed = (symbol: string) => symbol === 'usedVar';

      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());

      expect(issues).toHaveLength(1);
      expect(issues[0]?.symbolName).toBe('unusedVar');
    });

    it('does not flag exports in entry point files (index.ts)', () => {
      const sourceFile = project.createSourceFile('index.ts', `
        export const a = 1;
        export function foo() {}
      `);

      const isUsed = () => false; // None are used, but file is an entry point

      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());

      expect(issues).toHaveLength(0);
    });

    it('does not flag exports in entry point files (main.ts)', () => {
      const sourceFile = project.createSourceFile('/main.ts', `
        export const a = 1;
      `);

      const isUsed = () => false;
      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());
      expect(issues).toHaveLength(0);
    });

    it('does not flag exports in entry point files (lib.ts)', () => {
      const sourceFile = project.createSourceFile('/lib.ts', `
        export const a = 1;
      `);

      const isUsed = () => false;
      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());
      expect(issues).toHaveLength(0);
    });

    it('does not flag exports in entry point files (types.ts)', () => {
      const sourceFile = project.createSourceFile('/types.ts', `
        export interface MyType {}
      `);

      const isUsed = () => false;
      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());
      expect(issues).toHaveLength(0);
    });

    it('does not flag exports in nested index files (src/foo/index.ts)', () => {
      const sourceFile = project.createSourceFile('/src/foo/index.ts', `
        export const a = 1;
      `);

      const isUsed = () => false;
      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());
      expect(issues).toHaveLength(0);
    });

    it('honors file-level ignore directive', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        // @codejanitor-ignore-file
        export const unused = 1;
      `);

      const isUsed = () => false;

      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());

      expect(issues).toHaveLength(0);
    });

    it('honors line-level ignore directive for dead-export type', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        // @codejanitor-ignore-next dead-export
        export const unused1 = 1;

        export const unused2 = 2; // @codejanitor-ignore dead-export

        export const unused3 = 3;
      `);

      const isUsed = () => false;

      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());

      expect(issues).toHaveLength(1);
      expect(issues[0]?.symbolName).toBe('unused3');
    });

    it('ignores empty source file exports gracefully', () => {
      const sourceFile = project.createSourceFile('test.ts', ``);
      const isUsed = () => false;

      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());

      expect(issues).toHaveLength(0);
    });

    it('ignores default exports properly if not used', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        export default function() {}
      `);
      const isUsed = () => false;

      const issues = deadExportsAnalyzer.analyzeWorkspaceExports(sourceFile, isUsed, createConfig());

      expect(issues).toHaveLength(1);
      expect(issues[0]?.symbolName).toBe('default');
    });
  });
});
