/**
 * Jenkins Integration
 * 
 * Provides integration with Jenkins for quality gates
 */

import { DeploymentPipelineIntegration, GateEvaluationResult } from '../pipelineIntegration';
import { WorkspaceAnalysisResult } from '../../models/types';

export interface JenkinsConfig {
  jenkinsUrl: string;
  jobName: string;
  buildNumber: string;
}

export class JenkinsIntegration {
  private pipelineIntegration: DeploymentPipelineIntegration;

  constructor(_config: JenkinsConfig) {
    this.pipelineIntegration = new DeploymentPipelineIntegration();
  }

  /**
   * Run quality gate check in Jenkins
   */
  async runQualityGate(
    gateId: string,
    analysisResult: WorkspaceAnalysisResult
  ): Promise<GateEvaluationResult> {
    const result = this.pipelineIntegration.evaluateGate(gateId, analysisResult);

    // Set build description
    this.setBuildDescription(result);

    // Add build badge
    this.addBuildBadge(result.passed);

    // Fail the build if gate failed and blocking is enabled
    if (!result.passed && result.gate.blockOnFailure) {
      throw new Error(`Quality gate failed: ${result.violations.length} violations`);
    }

    return result;
  }

  /**
   * Generate Jenkinsfile
   */
  generateJenkinsfile(): string {
    return `pipeline {
    agent any
    
    environment {
        CODEJANITOR_API_KEY = credentials('codejanitor-api-key')
        QUALITY_GATE_ID = credentials('quality-gate-id')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Code Quality Analysis') {
            steps {
                sh '''
                    npx @codejanitor/cli analyze \\
                        --workspace . \\
                        --output analysis-results.json
                '''
            }
        }
        
        stage('Quality Gate') {
            steps {
                script {
                    def gateResult = sh(
                        script: '''
                            npx @codejanitor/cli gate-check \\
                                --gate-id $QUALITY_GATE_ID \\
                                --results analysis-results.json \\
                                --output gate-result.json
                        ''',
                        returnStatus: true
                    )
                    
                    def result = readJSON file: 'gate-result.json'
                    
                    // Set build description
                    currentBuild.description = "Quality Score: \${result.metrics.codeQualityScore}/100"
                    
                    // Add badge
                    if (result.passed) {
                        addBadge(icon: 'success.gif', text: 'Quality Gate Passed')
                    } else {
                        addBadge(icon: 'error.gif', text: 'Quality Gate Failed')
                    }
                    
                    // Publish results
                    publishHTML([
                        reportDir: '.',
                        reportFiles: 'gate-result.json',
                        reportName: 'Quality Gate Report'
                    ])
                    
                    // Fail build if gate failed
                    if (gateResult != 0 && result.gate.blockOnFailure) {
                        error("Quality gate failed with \${result.violations.length} violations")
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                echo 'Deploying to staging...'
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                echo 'Deploying to production...'
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'analysis-results.json,gate-result.json', allowEmptyArchive: true
        }
        failure {
            emailext(
                subject: "Quality Gate Failed: \${env.JOB_NAME} - Build #\${env.BUILD_NUMBER}",
                body: "Check console output at \${env.BUILD_URL}",
                to: "\${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}
`;
  }

  /**
   * Generate declarative pipeline script
   */
  generateDeclarativePipeline(): string {
    return `@Library('codejanitor-shared-library') _

pipeline {
    agent any
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }
    
    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['development', 'staging', 'production'],
            description: 'Target environment'
        )
        booleanParam(
            name: 'SKIP_QUALITY_GATE',
            defaultValue: false,
            description: 'Skip quality gate check'
        )
    }
    
    stages {
        stage('Quality Check') {
            when {
                expression { !params.SKIP_QUALITY_GATE }
            }
            steps {
                script {
                    codejanitor.analyze()
                    codejanitor.qualityGate(
                        gateId: env.QUALITY_GATE_ID,
                        environment: params.ENVIRONMENT
                    )
                }
            }
        }
        
        stage('Deploy') {
            steps {
                echo "Deploying to \${params.ENVIRONMENT}..."
            }
        }
    }
}
`;
  }

  /**
   * Set Jenkins build description
   */
  private setBuildDescription(result: GateEvaluationResult): void {
    const description = `Quality Score: ${result.metrics.codeQualityScore.toFixed(1)}/100 | ` +
      `Issues: ${result.metrics.criticalIssues + result.metrics.highIssues + result.metrics.mediumIssues}`;
    console.log(`Setting build description: ${description}`);
  }

  /**
   * Add Jenkins build badge
   */
  private addBuildBadge(passed: boolean): void {
    const badge = passed ? '✓ Quality Gate Passed' : '✗ Quality Gate Failed';
    console.log(`Adding build badge: ${badge}`);
  }
}
