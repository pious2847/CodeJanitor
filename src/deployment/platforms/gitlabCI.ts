/**
 * GitLab CI Integration
 * 
 * Provides integration with GitLab CI for quality gates
 */

import { DeploymentPipelineIntegration, GateEvaluationResult } from '../pipelineIntegration';
import { WorkspaceAnalysisResult } from '../../models/types';

export interface GitLabCIConfig {
  token: string;
  projectId: string;
  pipelineId: string;
}

export class GitLabCIIntegration {
  private pipelineIntegration: DeploymentPipelineIntegration;

  constructor(_config: GitLabCIConfig) {
    this.pipelineIntegration = new DeploymentPipelineIntegration();
  }

  /**
   * Run quality gate check in GitLab CI
   */
  async runQualityGate(
    gateId: string,
    analysisResult: WorkspaceAnalysisResult
  ): Promise<GateEvaluationResult> {
    const result = this.pipelineIntegration.evaluateGate(gateId, analysisResult);

    // Export variables for GitLab CI
    this.exportVariable('GATE_PASSED', result.passed.toString());
    this.exportVariable('GATE_VIOLATIONS', result.violations.length.toString());
    this.exportVariable('CODE_QUALITY_SCORE', result.metrics.codeQualityScore.toFixed(1));

    // Generate code quality report in GitLab format
    this.generateCodeQualityReport(result);

    // Fail the job if gate failed and blocking is enabled
    if (!result.passed && result.gate.blockOnFailure) {
      console.error(`Quality gate failed: ${result.violations.length} violations`);
      process.exit(1);
    }

    return result;
  }

  /**
   * Generate GitLab CI configuration file
   */
  generateCIFile(): string {
    return `stages:
  - test
  - quality
  - deploy

code_quality:
  stage: quality
  image: node:18
  script:
    - npm ci
    - npx @codejanitor/cli analyze --workspace . --output analysis-results.json
    - npx @codejanitor/cli gate-check --gate-id $QUALITY_GATE_ID --results analysis-results.json
  artifacts:
    reports:
      codequality: gl-code-quality-report.json
    paths:
      - analysis-results.json
    expire_in: 1 week
  only:
    - merge_requests
    - main
    - develop

quality_gate_production:
  stage: quality
  image: node:18
  script:
    - npm ci
    - npx @codejanitor/cli analyze --workspace . --output analysis-results.json
    - npx @codejanitor/cli gate-check --gate-id $PRODUCTION_GATE_ID --results analysis-results.json --fail-on-violations
  only:
    - main
  when: manual

deploy_staging:
  stage: deploy
  script:
    - echo "Deploying to staging..."
  needs:
    - code_quality
  only:
    - develop

deploy_production:
  stage: deploy
  script:
    - echo "Deploying to production..."
  needs:
    - quality_gate_production
  only:
    - main
  when: manual
`;
  }

  /**
   * Export variable for GitLab CI
   */
  private exportVariable(name: string, value: string): void {
    console.log(`export ${name}="${value}"`);
  }

  /**
   * Generate code quality report in GitLab format
   */
  private generateCodeQualityReport(result: GateEvaluationResult): void {
    const report = result.violations.map(violation => ({
      description: violation.message,
      severity: this.mapSeverity(violation.severity),
      fingerprint: this.generateFingerprint(violation),
      location: {
        path: 'quality-gate',
        lines: {
          begin: 1,
        },
      },
    }));

    const fs = require('fs');
    fs.writeFileSync('gl-code-quality-report.json', JSON.stringify(report, null, 2));
  }

  /**
   * Map severity to GitLab format
   */
  private mapSeverity(severity: string): string {
    const mapping: Record<string, string> = {
      critical: 'blocker',
      high: 'major',
      medium: 'minor',
    };
    return mapping[severity] || 'info';
  }

  /**
   * Generate fingerprint for violation
   */
  private generateFingerprint(violation: any): string {
    const crypto = require('crypto');
    const data = `${violation.threshold}-${violation.message}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }
}
