import { describe, expect, it } from 'vitest';
import { buildHtmlReport } from './report';
import { FileAnalysisResult } from '../models';

describe('buildHtmlReport', () => {
  it('should generate an empty report for 0 files and 0 issues', () => {
    const report = {
      generatedAt: '2023-01-01T00:00:00.000Z',
      workspace: '/fake/workspace',
      summary: {
        filesAnalyzed: 0,
        totalIssues: 0,
      },
      results: [] as FileAnalysisResult[],
    };

    const html = buildHtmlReport(report);

    expect(html).toContain('Files analyzed: 0');
    expect(html).toContain('Issues: 0');
    expect(html).toContain('Workspace: /fake/workspace');
    expect(html).toContain('Generated: 2023-01-01T00:00:00.000Z');
    expect(html).not.toContain('<li>'); // No issues
  });

  it('should format issues correctly for a single file', () => {
    const report = {
      generatedAt: '2023-01-01T00:00:00.000Z',
      workspace: '/fake/workspace',
      summary: {
        filesAnalyzed: 1,
        totalIssues: 2,
      },
      results: [
        {
          filePath: '/fake/workspace/src/file1.ts',
          analysisTimeMs: 10,
          success: true,
          issues: [
            { type: 'unused_import', certainty: 'high', reason: 'Import is unused', startLine: 1, startCol: 1, endLine: 1, endCol: 10, nodeText: 'import X from "y"' },
            { type: 'dead_function', certainty: 'medium', reason: 'Function is dead', startLine: 2, startCol: 1, endLine: 5, endCol: 2, nodeText: 'function foo() {}' },
          ],
        },
      ] as unknown as FileAnalysisResult[],
    };

    const html = buildHtmlReport(report);

    expect(html).toContain('Files analyzed: 1');
    expect(html).toContain('Issues: 2');
    expect(html).toContain('<td>/fake/workspace/src/file1.ts</td>');
    expect(html).toContain('<td>2</td>');
    expect(html).toContain('<li><strong>unused_import</strong> [high] - Import is unused</li>');
    expect(html).toContain('<li><strong>dead_function</strong> [medium] - Function is dead</li>');
  });

  it('should format issues correctly for multiple files', () => {
    const report = {
      generatedAt: '2023-01-01T00:00:00.000Z',
      workspace: '/fake/workspace',
      summary: {
        filesAnalyzed: 2,
        totalIssues: 3,
      },
      results: [
        {
          filePath: '/fake/workspace/src/file1.ts',
          analysisTimeMs: 10,
          success: true,
          issues: [
            { type: 'unused_import', certainty: 'high', reason: 'Import is unused', startLine: 1, startCol: 1, endLine: 1, endCol: 10, nodeText: 'import X from "y"' },
          ],
        },
        {
          filePath: '/fake/workspace/src/file2.ts',
          analysisTimeMs: 10,
          success: true,
          issues: [
             { type: 'dead_function', certainty: 'medium', reason: 'Function is dead', startLine: 2, startCol: 1, endLine: 5, endCol: 2, nodeText: 'function foo() {}' },
             { type: 'dead_export', certainty: 'high', reason: 'Export is dead', startLine: 10, startCol: 1, endLine: 10, endCol: 20, nodeText: 'export const X = 1;' },
          ],
        },
      ] as unknown as FileAnalysisResult[],
    };

    const html = buildHtmlReport(report);

    expect(html).toContain('Files analyzed: 2');
    expect(html).toContain('Issues: 3');
    expect(html).toContain('<td>/fake/workspace/src/file1.ts</td>');
    expect(html).toContain('<td>1</td>');
    expect(html).toContain('<td>/fake/workspace/src/file2.ts</td>');
    expect(html).toContain('<td>2</td>');
    expect(html).toContain('<li><strong>unused_import</strong> [high] - Import is unused</li>');
    expect(html).toContain('<li><strong>dead_function</strong> [medium] - Function is dead</li>');
    expect(html).toContain('<li><strong>dead_export</strong> [high] - Export is dead</li>');
  });

  it('should properly escape HTML characters to prevent injection', () => {
    const report = {
      generatedAt: '<script>alert(1)</script>',
      workspace: '<script>alert("workspace")</script>',
      summary: {
        filesAnalyzed: 1,
        totalIssues: 1,
      },
      results: [
        {
          filePath: '<img src=x onerror=alert(1)>',
          analysisTimeMs: 10,
          success: true,
          issues: [
            {
              type: 'type<&"\'>',
              certainty: 'certainty<&"\'>',
              reason: 'reason<&"\'>',
              startLine: 1, startCol: 1, endLine: 1, endCol: 10, nodeText: 'dummy'
            }
          ]
        }
      ] as unknown as FileAnalysisResult[]
    };

    const html = buildHtmlReport(report);

    // Should not contain raw malicious characters in the substituted slots
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');

    // Should contain escaped versions
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;script&gt;alert(&quot;workspace&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('type&lt;&amp;&quot;&#39;&gt;');
    expect(html).toContain('certainty&lt;&amp;&quot;&#39;&gt;');
    expect(html).toContain('reason&lt;&amp;&quot;&#39;&gt;');
  });
});
