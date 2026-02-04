/**
 * GitHub Actions Integration
 * 
 * Provides integration with GitHub Actions for quality gates
 */

import { DeploymentPipelineIntegration, GateEvaluationResult } from '../pipelineIntegration';
import { WorkspaceAnalysisResult } from '../../models/types';

export interface GitHubActionsConfig {
  token: string;
  repository: string;
  workflowName: string;
}

export class GitHubActionsIntegration {
  private pipelineIntegration: DeploymentPipelineIntegration;

  constructor(_config: GitHubActionsConfig) {
    this.pipelineIntegration = new DeploymentPipelineIntegration();
  }

  /**
   * Run quality gate check in GitHub Actions
   */
  async runQualityGate(
    gateId: string,
    analysisResult: WorkspaceAnalysisResult
  ): Promise<GateEvaluationResult> {
    const result = this.pipelineIntegration.evaluateGate(gateId, analysisResult);

    // Set GitHub Actions output
    this.setOutput('gate-passed', result.passed.toString());
    this.setOutput('gate-violations', result.violations.length.toString());
    this.setOutput('code-quality-score', result.metrics.codeQualityScore.toFixed(1));

    // Create annotations for violations
    for (const violation of result.violations) {
      this.createAnnotation(violation.severity, violation.message);
    }

    // Fail the workflow if gate failed and blocking is enabled
    if (!result.passed && result.gate.blockOnFailure) {
      this.setFailed(`Quality gate failed: ${result.violations.length} violations`);
    }

    return result;
  }

  /**
   * Generate GitHub Actions workflow file
   */
  generateWorkflowFile(): string {
    return `name: Code Quality Gate

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run CodeJanitor Analysis
        id: analysis
        run: |
          npx @codejanitor/cli analyze \\
            --workspace . \\
            --output analysis-results.json
      
      - name: Evaluate Quality Gate
        id: gate
        run: |
          npx @codejanitor/cli gate-check \\
            --gate-id \${{ secrets.QUALITY_GATE_ID }} \\
            --results analysis-results.json \\
            --fail-on-violations
      
      - name: Upload Analysis Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: analysis-results
          path: analysis-results.json
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('analysis-results.json', 'utf8'));
            
            const comment = \`## Code Quality Report
            
            **Status:** \${results.passed ? '✅ Passed' : '❌ Failed'}
            **Code Quality Score:** \${results.metrics.codeQualityScore}/100
            **Issues Found:** \${results.metrics.criticalIssues + results.metrics.highIssues + results.metrics.mediumIssues}
            
            \${results.violations.length > 0 ? '### Violations\\n' + results.violations.map(v => \`- \${v.message}\`).join('\\n') : ''}
            \`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
`;
  }

  /**
   * Set GitHub Actions output
   */
  private setOutput(name: string, value: string): void {
    console.log(`::set-output name=${name}::${value}`);
  }

  /**
   * Create GitHub Actions annotation
   */
  private createAnnotation(level: string, message: string): void {
    const annotationType = level === 'critical' ? 'error' : level === 'high' ? 'warning' : 'notice';
    console.log(`::${annotationType}::${message}`);
  }

  /**
   * Fail the GitHub Actions workflow
   */
  private setFailed(message: string): void {
    console.log(`::error::${message}`);
    process.exit(1);
  }
}
