/**
 * Deployment Pipeline Integration
 * 
 * Integrates quality gates into deployment pipelines for various platforms
 */

import { WorkspaceAnalysisResult } from '../models/types';
import { QualityBaseline } from '../models/enterprise';

export interface QualityGateConfig {
  id: string;
  name: string;
  enabled: boolean;
  blockOnFailure: boolean;
  thresholds: QualityThresholds;
  environment: DeploymentEnvironment;
}

export interface QualityThresholds {
  maxCriticalIssues: number;
  maxHighIssues: number;
  maxMediumIssues: number;
  minCodeQuality: number;
  maxTechnicalDebt: number;
  minTestCoverage?: number;
  maxComplexity?: number;
}

export type DeploymentEnvironment = 'development' | 'staging' | 'production';

export interface GateEvaluationResult {
  passed: boolean;
  gate: QualityGateConfig;
  violations: GateViolation[];
  metrics: GateMetrics;
  timestamp: Date;
}

export interface GateViolation {
  threshold: string;
  expected: number;
  actual: number;
  severity: 'critical' | 'high' | 'medium';
  message: string;
}

export interface GateMetrics {
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  codeQualityScore: number;
  technicalDebtMinutes: number;
  testCoverage?: number;
  avgComplexity?: number;
}

export class DeploymentPipelineIntegration {
  private gates: Map<string, QualityGateConfig> = new Map();

  /**
   * Register a quality gate
   */
  registerGate(gate: QualityGateConfig): void {
    this.gates.set(gate.id, gate);
  }

  /**
   * Evaluate quality gate against analysis results
   */
  evaluateGate(
    gateId: string,
    analysisResult: WorkspaceAnalysisResult,
    _baseline?: QualityBaseline
  ): GateEvaluationResult {
    const gate = this.gates.get(gateId);
    if (!gate) {
      throw new Error(`Quality gate not found: ${gateId}`);
    }

    if (!gate.enabled) {
      return {
        passed: true,
        gate,
        violations: [],
        metrics: this.calculateMetrics(analysisResult),
        timestamp: new Date(),
      };
    }

    const metrics = this.calculateMetrics(analysisResult);
    const violations = this.checkThresholds(gate.thresholds, metrics);

    return {
      passed: violations.length === 0,
      gate,
      violations,
      metrics,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate metrics from analysis results
   */
  private calculateMetrics(analysisResult: WorkspaceAnalysisResult): GateMetrics {
    const issuesBySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    // Count issues by certainty (mapping to severity)
    for (const [certainty, count] of Object.entries(analysisResult.issuesByCertainty)) {
      if (certainty === 'high') {
        issuesBySeverity.critical += count;
      } else if (certainty === 'medium') {
        issuesBySeverity.high += count;
      } else {
        issuesBySeverity.low += count;
      }
    }

    // Calculate code quality score (0-100)
    const totalIssues = analysisResult.totalIssues;
    const totalFiles = analysisResult.totalFiles;
    const issuesPerFile = totalFiles > 0 ? totalIssues / totalFiles : 0;
    const codeQualityScore = Math.max(0, Math.min(100, 100 - issuesPerFile * 10));

    // Estimate technical debt (5 minutes per issue on average)
    const technicalDebtMinutes = totalIssues * 5;

    return {
      criticalIssues: issuesBySeverity.critical,
      highIssues: issuesBySeverity.high,
      mediumIssues: issuesBySeverity.medium,
      lowIssues: issuesBySeverity.low,
      codeQualityScore,
      technicalDebtMinutes,
    };
  }

  /**
   * Check thresholds and return violations
   */
  private checkThresholds(
    thresholds: QualityThresholds,
    metrics: GateMetrics
  ): GateViolation[] {
    const violations: GateViolation[] = [];

    // Check critical issues
    if (metrics.criticalIssues > thresholds.maxCriticalIssues) {
      violations.push({
        threshold: 'maxCriticalIssues',
        expected: thresholds.maxCriticalIssues,
        actual: metrics.criticalIssues,
        severity: 'critical',
        message: `Critical issues (${metrics.criticalIssues}) exceed threshold (${thresholds.maxCriticalIssues})`,
      });
    }

    // Check high issues
    if (metrics.highIssues > thresholds.maxHighIssues) {
      violations.push({
        threshold: 'maxHighIssues',
        expected: thresholds.maxHighIssues,
        actual: metrics.highIssues,
        severity: 'high',
        message: `High severity issues (${metrics.highIssues}) exceed threshold (${thresholds.maxHighIssues})`,
      });
    }

    // Check medium issues
    if (metrics.mediumIssues > thresholds.maxMediumIssues) {
      violations.push({
        threshold: 'maxMediumIssues',
        expected: thresholds.maxMediumIssues,
        actual: metrics.mediumIssues,
        severity: 'medium',
        message: `Medium severity issues (${metrics.mediumIssues}) exceed threshold (${thresholds.maxMediumIssues})`,
      });
    }

    // Check code quality score
    if (metrics.codeQualityScore < thresholds.minCodeQuality) {
      violations.push({
        threshold: 'minCodeQuality',
        expected: thresholds.minCodeQuality,
        actual: metrics.codeQualityScore,
        severity: 'high',
        message: `Code quality score (${metrics.codeQualityScore.toFixed(1)}) below threshold (${thresholds.minCodeQuality})`,
      });
    }

    // Check technical debt
    if (metrics.technicalDebtMinutes > thresholds.maxTechnicalDebt) {
      violations.push({
        threshold: 'maxTechnicalDebt',
        expected: thresholds.maxTechnicalDebt,
        actual: metrics.technicalDebtMinutes,
        severity: 'medium',
        message: `Technical debt (${metrics.technicalDebtMinutes} min) exceeds threshold (${thresholds.maxTechnicalDebt} min)`,
      });
    }

    return violations;
  }

  /**
   * Get all registered gates
   */
  getGates(): QualityGateConfig[] {
    return Array.from(this.gates.values());
  }

  /**
   * Get gate by ID
   */
  getGate(gateId: string): QualityGateConfig | undefined {
    return this.gates.get(gateId);
  }

  /**
   * Update gate configuration
   */
  updateGate(gateId: string, updates: Partial<QualityGateConfig>): void {
    const gate = this.gates.get(gateId);
    if (!gate) {
      throw new Error(`Quality gate not found: ${gateId}`);
    }

    this.gates.set(gateId, { ...gate, ...updates });
  }

  /**
   * Delete gate
   */
  deleteGate(gateId: string): void {
    this.gates.delete(gateId);
  }

  /**
   * Generate gate report
   */
  generateGateReport(result: GateEvaluationResult): string {
    let report = `Quality Gate Evaluation Report\n`;
    report += `================================\n\n`;
    report += `Gate: ${result.gate.name}\n`;
    report += `Environment: ${result.gate.environment}\n`;
    report += `Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}\n`;
    report += `Timestamp: ${result.timestamp.toISOString()}\n\n`;

    report += `Metrics:\n`;
    report += `--------\n`;
    report += `Critical Issues: ${result.metrics.criticalIssues}\n`;
    report += `High Issues: ${result.metrics.highIssues}\n`;
    report += `Medium Issues: ${result.metrics.mediumIssues}\n`;
    report += `Low Issues: ${result.metrics.lowIssues}\n`;
    report += `Code Quality Score: ${result.metrics.codeQualityScore.toFixed(1)}/100\n`;
    report += `Technical Debt: ${result.metrics.technicalDebtMinutes} minutes\n\n`;

    if (result.violations.length > 0) {
      report += `Violations:\n`;
      report += `-----------\n`;
      for (const violation of result.violations) {
        report += `[${violation.severity.toUpperCase()}] ${violation.message}\n`;
      }
    }

    return report;
  }
}
