/**
 * Azure DevOps Integration
 * 
 * Provides integration with Azure DevOps Pipelines for quality gates
 */

import { DeploymentPipelineIntegration, GateEvaluationResult } from '../pipelineIntegration';
import { WorkspaceAnalysisResult } from '../../models/types';

export interface AzureDevOpsConfig {
  organization: string;
  project: string;
  pipelineId: string;
  token: string;
}

export class AzureDevOpsIntegration {
  private pipelineIntegration: DeploymentPipelineIntegration;

  constructor(_config: AzureDevOpsConfig) {
    this.pipelineIntegration = new DeploymentPipelineIntegration();
  }

  /**
   * Run quality gate check in Azure DevOps
   */
  async runQualityGate(
    gateId: string,
    analysisResult: WorkspaceAnalysisResult
  ): Promise<GateEvaluationResult> {
    const result = this.pipelineIntegration.evaluateGate(gateId, analysisResult);

    // Set pipeline variables
    this.setVariable('GatePassed', result.passed.toString());
    this.setVariable('GateViolations', result.violations.length.toString());
    this.setVariable('CodeQualityScore', result.metrics.codeQualityScore.toFixed(1));

    // Log issues
    for (const violation of result.violations) {
      this.logIssue(violation.severity, violation.message);
    }

    // Update build tags
    this.addBuildTag(result.passed ? 'quality-passed' : 'quality-failed');

    // Fail the pipeline if gate failed and blocking is enabled
    if (!result.passed && result.gate.blockOnFailure) {
      this.logError(`Quality gate failed: ${result.violations.length} violations`);
      process.exit(1);
    }

    return result;
  }

  /**
   * Generate Azure Pipelines YAML
   */
  generatePipelineYAML(): string {
    return `trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: codejanitor-variables
  - name: qualityGateId
    value: $(QUALITY_GATE_ID)

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
            displayName: 'Install Node.js'
          
          - script: npm ci
            displayName: 'Install dependencies'
          
          - script: npm run build
            displayName: 'Build project'

  - stage: QualityCheck
    dependsOn: Build
    jobs:
      - job: QualityGate
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
            displayName: 'Install Node.js'
          
          - script: |
              npx @codejanitor/cli analyze \\
                --workspace . \\
                --output $(Build.ArtifactStagingDirectory)/analysis-results.json
            displayName: 'Run code analysis'
          
          - script: |
              npx @codejanitor/cli gate-check \\
                --gate-id $(qualityGateId) \\
                --results $(Build.ArtifactStagingDirectory)/analysis-results.json \\
                --output $(Build.ArtifactStagingDirectory)/gate-result.json
            displayName: 'Evaluate quality gate'
            continueOnError: true
          
          - task: PublishBuildArtifacts@1
            inputs:
              pathToPublish: '$(Build.ArtifactStagingDirectory)'
              artifactName: 'quality-reports'
            displayName: 'Publish quality reports'
          
          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '$(Build.ArtifactStagingDirectory)/gate-result.xml'
              testRunTitle: 'Quality Gate Results'
            condition: always()
            displayName: 'Publish gate results'

  - stage: DeployStaging
    dependsOn: QualityCheck
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/develop'))
    jobs:
      - deployment: DeployToStaging
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to staging..."
                  displayName: 'Deploy to staging'

  - stage: DeployProduction
    dependsOn: QualityCheck
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployToProduction
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to production..."
                  displayName: 'Deploy to production'
`;
  }

  /**
   * Set Azure DevOps pipeline variable
   */
  private setVariable(name: string, value: string): void {
    console.log(`##vso[task.setvariable variable=${name}]${value}`);
  }

  /**
   * Log issue in Azure DevOps
   */
  private logIssue(severity: string, message: string): void {
    const issueType = severity === 'critical' ? 'error' : 'warning';
    console.log(`##vso[task.logissue type=${issueType}]${message}`);
  }

  /**
   * Add build tag
   */
  private addBuildTag(tag: string): void {
    console.log(`##vso[build.addbuildtag]${tag}`);
  }

  /**
   * Log error
   */
  private logError(message: string): void {
    console.log(`##vso[task.logissue type=error]${message}`);
    console.log(`##vso[task.complete result=Failed;]${message}`);
  }
}
