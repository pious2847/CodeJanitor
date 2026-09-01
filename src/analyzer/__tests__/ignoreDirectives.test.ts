import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { parseCodeJanitorDirectives } from '../ignoreDirectives';

describe('parseCodeJanitorDirectives', () => {
  const project = new Project({ useInMemoryFileSystem: true });

  function createSourceFile(content: string) {
    return project.createSourceFile('test.ts', content, { overwrite: true });
  }

  it('should not ignore anything if there are no directives', () => {
    const sourceFile = createSourceFile(`const a = 1;\nconst b = 2;\n`);

    const result = parseCodeJanitorDirectives(sourceFile);

    expect(result.fileIgnored).toBe(false);
    expect(result.isLineIgnored(1)).toBe(false);
    expect(result.isLineIgnored(2)).toBe(false);
    expect(result.isLineIgnored(3)).toBe(false);
  });

  it('should ignore the entire file with @codejanitor-ignore-file', () => {
    const sourceFile = createSourceFile(`// @codejanitor-ignore-file\nconst a = 1;\nconst b = 2;`);

    const result = parseCodeJanitorDirectives(sourceFile);

    expect(result.fileIgnored).toBe(true);
    expect(result.isLineIgnored(1)).toBe(true);
    expect(result.isLineIgnored(2)).toBe(true);
    expect(result.isLineIgnored(3)).toBe(true);
    expect(result.isLineIgnored(1, 'unused-import')).toBe(true);
  });

  it('should ignore the entire file with @codejanitor-ignore-file with specific types', () => {
    // Note: the regex in the code parses `unused-import,dead-function` successfully without space
    const sourceFile = createSourceFile(`// @codejanitor-ignore-file unused-import,dead-function\nconst a = 1;`);

    const result = parseCodeJanitorDirectives(sourceFile);

    expect(result.fileIgnored).toBe(true);
    // isLineIgnored returns true for all if fileIgnored is true.
    expect(result.isLineIgnored(2, 'unused-variable')).toBe(true);
  });

  it('should ignore the current line with @codejanitor-ignore', () => {
    const sourceFile = createSourceFile(`const a = 1;\nconst b = 2; // @codejanitor-ignore\nconst c = 3;`);

    const result = parseCodeJanitorDirectives(sourceFile);

    expect(result.fileIgnored).toBe(false);
    expect(result.isLineIgnored(1)).toBe(false);
    expect(result.isLineIgnored(2)).toBe(true); // line index 1 is 1-based index 2
    expect(result.isLineIgnored(3)).toBe(false);
  });

  it('should ignore specific types on the current line with @codejanitor-ignore', () => {
    const sourceFile = createSourceFile(`const a = 1;\nconst b = 2; // @codejanitor-ignore unused-variable\nconst c = 3;`);

    const result = parseCodeJanitorDirectives(sourceFile);

    expect(result.fileIgnored).toBe(false);
    expect(result.isLineIgnored(2, 'unused-variable')).toBe(true);
    expect(result.isLineIgnored(2, 'dead-function')).toBe(false); // only unused-variable is ignored
  });

  it('should ignore the next line with @codejanitor-ignore-next', () => {
    const sourceFile = createSourceFile(`const a = 1;\n// @codejanitor-ignore-next\nconst b = 2;\nconst c = 3;`);

    const result = parseCodeJanitorDirectives(sourceFile);

    expect(result.fileIgnored).toBe(false);
    expect(result.isLineIgnored(1)).toBe(false);
    expect(result.isLineIgnored(2)).toBe(false);
    expect(result.isLineIgnored(3)).toBe(true); // line index 1 is 1-based index 3 because of `next` (i+2)
    expect(result.isLineIgnored(4)).toBe(false);
  });

  it('should ignore specific types on the next line with @codejanitor-ignore-next', () => {
    // Note: the regex in the original code `/@codejanitor-ignore(?:-(next|file))?(?:\s+([\w\-,]+))?/`
    // doesn't support spaces between comma-separated values.
    // e.g., "unused-import,dead-function" matches "unused-import,dead-function"
    const sourceFile = createSourceFile(`// @codejanitor-ignore-next unused-import,dead-function\nimport { a } from 'b';\nconst c = 3;`);

    const result = parseCodeJanitorDirectives(sourceFile);

    expect(result.fileIgnored).toBe(false);
    expect(result.isLineIgnored(2, 'unused-import')).toBe(true);
    expect(result.isLineIgnored(2, 'dead-function')).toBe(true);
    expect(result.isLineIgnored(2, 'unused-variable')).toBe(false); // not ignored
    expect(result.isLineIgnored(3, 'unused-import')).toBe(false);
  });
});
