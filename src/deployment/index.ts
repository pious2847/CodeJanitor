/**
 * Deployment Pipeline Integration Module
 * 
 * Main entry point for deployment pipeline integrations
 */

export {
  DeploymentPipelineIntegration,
  QualityGateConfig,
  QualityThresholds,
  DeploymentEnvironment,
  GateEvaluationResult,
  GateViolation,
  GateMetrics,
} from './pipelineIntegration';

export { GitHubActionsIntegration, GitHubActionsConfig } from './platforms/githubActions';
export { GitLabCIIntegration, GitLabCIConfig } from './platforms/gitlabCI';
export { JenkinsIntegration, JenkinsConfig } from './platforms/jenkins';
export { AzureDevOpsIntegration, AzureDevOpsConfig } from './platforms/azureDevOps';

/**
 * Factory function to create platform-specific integration
 */
export function createPlatformIntegration(
  platform: 'github' | 'gitlab' | 'jenkins' | 'azure',
  config: any
): any {
  switch (platform) {
    case 'github':
      const { GitHubActionsIntegration } = require('./platforms/githubActions');
      return new GitHubActionsIntegration(config);
    case 'gitlab':
      const { GitLabCIIntegration } = require('./platforms/gitlabCI');
      return new GitLabCIIntegration(config);
    case 'jenkins':
      const { JenkinsIntegration } = require('./platforms/jenkins');
      return new JenkinsIntegration(config);
    case 'azure':
      const { AzureDevOpsIntegration } = require('./platforms/azureDevOps');
      return new AzureDevOpsIntegration(config);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Create default quality gate configurations for different environments
 */
export function createDefaultGates() {
  const { DeploymentPipelineIntegration } = require('./pipelineIntegration');
  const integration = new DeploymentPipelineIntegration();

  // Development environment - lenient thresholds
  integration.registerGate({
    id: 'dev-gate',
    name: 'Development Quality Gate',
    enabled: true,
    blockOnFailure: false,
    environment: 'development',
    thresholds: {
      maxCriticalIssues: 10,
      maxHighIssues: 50,
      maxMediumIssues: 100,
      minCodeQuality: 50,
      maxTechnicalDebt: 1000,
    },
  });

  // Staging environment - moderate thresholds
  integration.registerGate({
    id: 'staging-gate',
    name: 'Staging Quality Gate',
    enabled: true,
    blockOnFailure: true,
    environment: 'staging',
    thresholds: {
      maxCriticalIssues: 5,
      maxHighIssues: 20,
      maxMediumIssues: 50,
      minCodeQuality: 70,
      maxTechnicalDebt: 500,
    },
  });

  // Production environment - strict thresholds
  integration.registerGate({
    id: 'prod-gate',
    name: 'Production Quality Gate',
    enabled: true,
    blockOnFailure: true,
    environment: 'production',
    thresholds: {
      maxCriticalIssues: 0,
      maxHighIssues: 5,
      maxMediumIssues: 20,
      minCodeQuality: 85,
      maxTechnicalDebt: 200,
    },
  });

  return integration;
}
