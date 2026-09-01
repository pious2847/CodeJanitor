import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeSourceFile, IAnalyzer } from '../base';
import { SourceFile } from 'ts-morph';
import { AnalyzerConfig, CodeIssue } from '../../models';

describe('analyzeSourceFile', () => {
  let mockSourceFile: any;
  let mockConfig: AnalyzerConfig;

  beforeEach(() => {
    mockSourceFile = {
      getFilePath: vi.fn().mockReturnValue('/path/to/test.ts')
    };

    mockConfig = {
      enableUnusedImports: true,
      enableUnusedVariables: true,
      enableDeadFunctions: true,
      enableDeadExports: true,
      enableMissingImplementations: true,
      autoFixOnSave: false,
      ignorePatterns: [],
      respectUnderscoreConvention: true
    };
  });

  it('should run all enabled analyzers and collect their issues', () => {
    const issue1: CodeIssue = { id: '1', type: 'unused-import', certainty: 'high', reason: '', locations: [], safeFixAvailable: false, symbolName: 'a' };
    const issue2: CodeIssue = { id: '2', type: 'dead-function', certainty: 'high', reason: '', locations: [], safeFixAvailable: false, symbolName: 'b' };

    const analyzer1: IAnalyzer = {
      name: 'Analyzer1',
      isEnabled: vi.fn().mockReturnValue(true),
      analyzeFile: vi.fn().mockReturnValue([issue1])
    };

    const analyzer2: IAnalyzer = {
      name: 'Analyzer2',
      isEnabled: vi.fn().mockReturnValue(true),
      analyzeFile: vi.fn().mockReturnValue([issue2])
    };

    const result = analyzeSourceFile(mockSourceFile as SourceFile, [analyzer1, analyzer2], mockConfig);

    expect(analyzer1.isEnabled).toHaveBeenCalledWith(mockConfig);
    expect(analyzer1.analyzeFile).toHaveBeenCalledWith(mockSourceFile, mockConfig);
    expect(analyzer2.isEnabled).toHaveBeenCalledWith(mockConfig);
    expect(analyzer2.analyzeFile).toHaveBeenCalledWith(mockSourceFile, mockConfig);

    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/path/to/test.ts');
    expect(result.issues).toEqual([issue1, issue2]);
    expect(typeof result.analysisTimeMs).toBe('number');
  });

  it('should not run disabled analyzers', () => {
    const analyzer1: IAnalyzer = {
      name: 'Analyzer1',
      isEnabled: vi.fn().mockReturnValue(false),
      analyzeFile: vi.fn()
    };

    const result = analyzeSourceFile(mockSourceFile as SourceFile, [analyzer1], mockConfig);

    expect(analyzer1.isEnabled).toHaveBeenCalledWith(mockConfig);
    expect(analyzer1.analyzeFile).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('should handle errors thrown by analyzers', () => {
    const analyzer1: IAnalyzer = {
      name: 'Analyzer1',
      isEnabled: vi.fn().mockReturnValue(true),
      analyzeFile: vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      })
    };

    const result = analyzeSourceFile(mockSourceFile as SourceFile, [analyzer1], mockConfig);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Test error');
    expect(result.issues).toEqual([]);
    expect(result.filePath).toBe('/path/to/test.ts');
  });

  it('should handle non-Error objects thrown by analyzers', () => {
    const analyzer1: IAnalyzer = {
      name: 'Analyzer1',
      isEnabled: vi.fn().mockReturnValue(true),
      analyzeFile: vi.fn().mockImplementation(() => {
        throw 'String error';
      })
    };

    const result = analyzeSourceFile(mockSourceFile as SourceFile, [analyzer1], mockConfig);

    expect(result.success).toBe(false);
    expect(result.error).toBe('String error');
    expect(result.issues).toEqual([]);
    expect(result.filePath).toBe('/path/to/test.ts');
  });
});
