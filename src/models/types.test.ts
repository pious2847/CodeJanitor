import { describe, it, expect } from 'vitest';
import { generateIssueId, IssueType } from './types';

describe('generateIssueId', () => {
  it('should generate a correct issue ID for standard inputs', () => {
    const id = generateIssueId('unused-import', 'src/app.ts', 'React', 10);
    expect(id).toBe('unused-import:src/app.ts:React:10');
  });

  it('should handle different IssueTypes correctly', () => {
    const types: IssueType[] = [
      'unused-import',
      'unused-variable',
      'dead-function',
      'dead-export',
      'missing-implementation'
    ];

    types.forEach(type => {
      const id = generateIssueId(type, 'file.ts', 'symbol', 1);
      expect(id).toBe(`${type}:file.ts:symbol:1`);
    });
  });

  it('should handle empty strings for filePath and symbolName', () => {
    const id = generateIssueId('unused-variable', '', '', 5);
    expect(id).toBe('unused-variable:::5');
  });

  it('should handle special characters in filePath and symbolName', () => {
    const id = generateIssueId('dead-function', 'C:\\some\\path\\file.ts', '@symbol#name!', 42);
    expect(id).toBe('dead-function:C:\\some\\path\\file.ts:@symbol#name!:42');
  });

  it('should handle zero line number', () => {
    const id = generateIssueId('dead-export', 'src/utils.ts', 'helper', 0);
    expect(id).toBe('dead-export:src/utils.ts:helper:0');
  });

  it('should handle negative line number', () => {
    const id = generateIssueId('missing-implementation', 'src/api.ts', 'fetchData', -5);
    expect(id).toBe('missing-implementation:src/api.ts:fetchData:-5');
  });

  it('should handle large line numbers', () => {
    const id = generateIssueId('unused-import', 'src/main.ts', 'init', 999999);
    expect(id).toBe('unused-import:src/main.ts:init:999999');
  });
});
