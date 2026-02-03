import * as path from 'path';
import { projectManager } from '../analyzer/base';
import { WorkspaceAnalyzer } from '../analyzer/workspaceAnalyzer';
import { AnalyzerConfig } from '../models';
import { exportReport } from '../commands/report';

async function main() {
  const workspaceRoot = process.argv[2] || process.cwd();
  const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');

  try {
    const project = projectManager.getProject(workspaceRoot, tsconfigPath);
    const analyzer = new WorkspaceAnalyzer(project);

    const config: AnalyzerConfig = {
      enableUnusedImports: true,
      enableUnusedVariables: true,
      enableDeadFunctions: true,
      enableDeadExports: true,
      enableMissingImplementations: false,
      enableCircularDependencies: true,
      enableComplexityAnalysis: true,
      enableSecurityAnalysis: true,
      enableAccessibilityAnalysis: true,
      autoFixOnSave: false,
      ignorePatterns: ['node_modules/**', '**/dist/**'],
      respectUnderscoreConvention: true,
    };

    const { jsonPath, htmlPath } = await exportReport(analyzer, config, workspaceRoot);
    console.log('Report written:', jsonPath, htmlPath);
  } catch (err) {
    console.error('CI run failed:', err);
    process.exitCode = 2;
  }
}

main();
