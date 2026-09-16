import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkspaceAnalyzer } from '../analyzer/workspaceAnalyzer';
import { AnalyzerConfig, FileAnalysisResult } from '../models';

export async function exportReport(workspaceAnalyzer: WorkspaceAnalyzer, config: AnalyzerConfig, workspaceRoot: string): Promise<{ jsonPath: string; htmlPath: string }> {
  // Run analysis (dry-run)
  const results: FileAnalysisResult[] = await workspaceAnalyzer.analyzeWorkspace(config);

  // Prepare JSON report
  const report = {
    generatedAt: new Date().toISOString(),
    workspace: workspaceRoot,
    summary: {
      filesAnalyzed: results.length,
      totalIssues: results.reduce((s, r) => s + r.issues.length, 0),
    },
    results,
  };

  // Ensure output directory exists (use .codejanitor/report)
  const outDir = path.join(workspaceRoot, '.codejanitor');
  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, `report-${Date.now()}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  // Generate a simple HTML view
  const htmlPath = path.join(outDir, `report-${Date.now()}.html`);
  const html = buildHtmlReport(report);
  await fs.writeFile(htmlPath, html, 'utf8');

  return { jsonPath, htmlPath };
}

function buildHtmlReport(report: any) {
  const rows = report.results
    .map((r: FileAnalysisResult) => {
      const issuesHtml = r.issues
        .map((i: any) => `<li><strong>${escape(i.type)}</strong> [${escape(i.certainty)}] - ${escape(i.reason)}</li>`)
        .join('\n');
      return `<tr><td>${escape(r.filePath)}</td><td>${r.issues.length}</td><td><ul>${issuesHtml}</ul></td></tr>`;
    })
    .join('\n');

  return `<!doctype html>
  <html>
  <head><meta charset="utf-8"><title>CodeJanitor Report</title>
  <style>body{font-family:system-ui,Arial;margin:16px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style>
  </head>
  <body>
    <h1>CodeJanitor Report</h1>
    <p>Generated: ${escape(report.generatedAt)}</p>
    <p>Workspace: ${escape(report.workspace)}</p>
    <p>Files analyzed: ${report.summary.filesAnalyzed} — Issues: ${report.summary.totalIssues}</p>
    <table>
      <thead><tr><th>File</th><th>Issue Count</th><th>Issues</th></tr></thead>
      <tbody>
      ${rows}
      </tbody>
    </table>
  </body>
  </html>`;
}

function escape(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
