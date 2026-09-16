import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exportReport } from './report';
import { WorkspaceAnalyzer } from '../analyzer/workspaceAnalyzer';
import { AnalyzerConfig, FileAnalysisResult } from '../models';

vi.mock('fs/promises');

describe('exportReport', () => {
  let mockAnalyzer: any;
  const mockConfig: AnalyzerConfig = {} as any;
  const workspaceRoot = '/mock/workspace';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T12:00:00Z'));
    mockAnalyzer = {
      analyzeWorkspace: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports report correctly for happy path', async () => {
    const mockResults: FileAnalysisResult[] = [
      {
        filePath: 'src/index.ts',
        issues: [
          {
            id: '1',
            type: 'unused-variable',
            certainty: 'high',
            reason: 'Unused variable',
            safeFixAvailable: false,
            symbolName: 'x',
            locations: []
          },
        ],
        analysisTimeMs: 10,
        success: true
      },
    ];
    mockAnalyzer.analyzeWorkspace.mockResolvedValue(mockResults);

    const result = await exportReport(mockAnalyzer as WorkspaceAnalyzer, mockConfig, workspaceRoot);

    const expectedDir = path.join(workspaceRoot, '.codejanitor');
    const timestamp = Date.now();

    expect(fs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledTimes(2);

    const jsonPath = path.join(expectedDir, `report-${timestamp}.json`);
    const htmlPath = path.join(expectedDir, `report-${timestamp}.html`);

    expect(result).toEqual({ jsonPath, htmlPath });

    // Validate JSON content
    const jsonCall = vi.mocked(fs.writeFile).mock.calls.find(c => c[0] === jsonPath);
    expect(jsonCall).toBeDefined();
    const parsedJson = JSON.parse(jsonCall![1] as string);
    expect(parsedJson.workspace).toBe(workspaceRoot);
    expect(parsedJson.summary.filesAnalyzed).toBe(1);
    expect(parsedJson.summary.totalIssues).toBe(1);

    // Validate HTML content
    const htmlCall = vi.mocked(fs.writeFile).mock.calls.find(c => c[0] === htmlPath);
    expect(htmlCall).toBeDefined();
    const htmlContent = htmlCall![1] as string;
    expect(htmlContent).toContain('CodeJanitor Report');
    expect(htmlContent).toContain('src/index.ts');
  });

  it('handles empty results correctly', async () => {
    mockAnalyzer.analyzeWorkspace.mockResolvedValue([]);

    await exportReport(mockAnalyzer as WorkspaceAnalyzer, mockConfig, workspaceRoot);

    const timestamp = Date.now();
    const expectedDir = path.join(workspaceRoot, '.codejanitor');
    const htmlPath = path.join(expectedDir, `report-${timestamp}.html`);

    const htmlCall = vi.mocked(fs.writeFile).mock.calls.find(c => c[0] === htmlPath);
    expect(htmlCall).toBeDefined();
    const htmlContent = htmlCall![1] as string;

    expect(htmlContent).toContain('Files analyzed: 0');
    expect(htmlContent).toContain('Issues: 0');
    expect(htmlContent).not.toContain('<li>');
  });

  it('escapes HTML characters correctly to prevent XSS in the generated HTML report', async () => {
    const xssString = '<script>alert("xss")</script> & \'malicious\'';
    const mockResults: FileAnalysisResult[] = [
      {
        filePath: xssString,
        issues: [
          {
            id: '2',
            type: 'unused-variable' as any, // Using 'unused-variable' but testing string escaping internally
            certainty: xssString as any,
            reason: xssString,
            safeFixAvailable: false,
            symbolName: xssString,
            locations: []
          },
        ],
        analysisTimeMs: 10,
        success: true
      },
    ];
    mockAnalyzer.analyzeWorkspace.mockResolvedValue(mockResults);

    await exportReport(mockAnalyzer as WorkspaceAnalyzer, mockConfig, workspaceRoot);

    const timestamp = Date.now();
    const expectedDir = path.join(workspaceRoot, '.codejanitor');
    const htmlPath = path.join(expectedDir, `report-${timestamp}.html`);

    const htmlCall = vi.mocked(fs.writeFile).mock.calls.find(c => c[0] === htmlPath);
    expect(htmlCall).toBeDefined();
    const htmlContent = htmlCall![1] as string;

    expect(htmlContent).not.toContain('<script>');
    expect(htmlContent).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;malicious&#39;');
  });
});
