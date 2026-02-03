/**
 * BaselineManager Service
 * 
 * Manages quality baselines for projects including:
 * - Quality baseline establishment and tracking
 * - Regression detection against established baselines
 * - Baseline versioning and historical comparison
 * 
 * Requirements: 4.4
 */

import {
  QualityBaseline,
  BaselineMetrics,
  QualityThresholds,
  TechnicalDebtMetrics,
  DebtBreakdown,
  TrendDirection,
} from '../models/enterprise';
import { QualityMetrics, WorkspaceAnalysisResult } from '../models/types';

/**
 * Baseline comparison result
 */
export interface BaselineComparison {
  /** Current baseline */
  current: QualityBaseline;
  /** Previous baseline for comparison */
  previous?: QualityBaseline;
  /** Detected regressions */
  regressions: Regression[];
  /** Detected improvements */
  improvements: Improvement[];
  /** Overall comparison summary */
  summary: ComparisonSummary;
  /** Timestamp of comparison */
  timestamp: Date;
}

/**
 * Regression detected in quality metrics
 */
export interface Regression {
  /** Metric that regressed */
  metric: string;
  /** Previous value */
  previousValue: number;
  /** Current value */
  currentValue: number;
  /** Change percentage */
  changePercent: number;
  /** Severity of regression */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Description of the regression */
  description: string;
}

/**
 * Improvement detected in quality metrics
 */
export interface Improvement {
  /** Metric that improved */
  metric: string;
  /** Previous value */
  previousValue: number;
  /** Current value */
  currentValue: number;
  /** Change percentage */
  changePercent: number;
  /** Description of the improvement */
  description: string;
}

/**
 * Comparison summary
 */
export interface ComparisonSummary {
  /** Overall quality trend */
  trend: TrendDirection;
  /** Total number of regressions */
  totalRegressions: number;
  /** Total number of improvements */
  totalImprovements: number;
  /** Whether baseline thresholds are met */
  thresholdsMet: boolean;
  /** Failed thresholds */
  failedThresholds: string[];
}

/**
 * Baseline history entry
 */
export interface BaselineHistory {
  /** Project ID */
  projectId: string;
  /** All baselines for this project */
  baselines: QualityBaseline[];
  /** Current active baseline */
  currentBaseline?: QualityBaseline;
}

/**
 * BaselineManager service
 */
export class BaselineManager {
  private baselines: Map<string, QualityBaseline> = new Map();
  private history: Map<string, BaselineHistory> = new Map();

  /**
   * Establish a new quality baseline for a project
   */
  establishBaseline(
    projectId: string,
    metrics: BaselineMetrics,
    thresholds: QualityThresholds,
    notes?: string
  ): QualityBaseline {
    const version = this.generateVersion(projectId);
    
    const baseline: QualityBaseline = {
      projectId,
      establishedDate: new Date(),
      metrics,
      thresholds,
      version,
      notes,
    };

    // Store the baseline
    const baselineId = this.generateBaselineId(projectId, version);
    this.baselines.set(baselineId, baseline);

    // Update history
    this.updateHistory(projectId, baseline);

    return baseline;
  }

  /**
   * Get the current baseline for a project
   */
  getCurrentBaseline(projectId: string): QualityBaseline | undefined {
    const history = this.history.get(projectId);
    return history?.currentBaseline;
  }

  /**
   * Get all baselines for a project
   */
  getProjectBaselines(projectId: string): QualityBaseline[] {
    const history = this.history.get(projectId);
    return history?.baselines || [];
  }

  /**
   * Get a specific baseline by version
   */
  getBaseline(projectId: string, version: string): QualityBaseline | undefined {
    const baselineId = this.generateBaselineId(projectId, version);
    return this.baselines.get(baselineId);
  }

  /**
   * Compare current metrics against baseline
   */
  compareAgainstBaseline(
    projectId: string,
    currentMetrics: BaselineMetrics,
    baselineVersion?: string
  ): BaselineComparison {
    let baseline: QualityBaseline | undefined;

    if (baselineVersion) {
      baseline = this.getBaseline(projectId, baselineVersion);
    } else {
      baseline = this.getCurrentBaseline(projectId);
    }

    if (!baseline) {
      throw new Error(`No baseline found for project ${projectId}`);
    }

    const regressions = this.detectRegressions(baseline.metrics, currentMetrics, baseline.thresholds);
    const improvements = this.detectImprovements(baseline.metrics, currentMetrics);
    const summary = this.generateComparisonSummary(
      regressions,
      improvements,
      currentMetrics,
      baseline.thresholds
    );

    // Get previous baseline for trend analysis
    const previousBaseline = this.getPreviousBaseline(projectId, baseline.version);

    return {
      current: {
        ...baseline,
        metrics: currentMetrics,
        establishedDate: new Date(),
      },
      previous: previousBaseline,
      regressions,
      improvements,
      summary,
      timestamp: new Date(),
    };
  }

  /**
   * Detect regressions in quality metrics
   */
  detectRegressions(
    baselineMetrics: BaselineMetrics,
    currentMetrics: BaselineMetrics,
    _thresholds: QualityThresholds
  ): Regression[] {
    const regressions: Regression[] = [];

    // Check code quality
    if (currentMetrics.codeQuality < baselineMetrics.codeQuality) {
      const changePercent = this.calculateChangePercent(
        baselineMetrics.codeQuality,
        currentMetrics.codeQuality
      );
      regressions.push({
        metric: 'codeQuality',
        previousValue: baselineMetrics.codeQuality,
        currentValue: currentMetrics.codeQuality,
        changePercent,
        severity: this.determineSeverity(changePercent),
        description: `Code quality decreased from ${baselineMetrics.codeQuality} to ${currentMetrics.codeQuality}`,
      });
    }

    // Check technical debt
    if (currentMetrics.technicalDebt.totalMinutes > baselineMetrics.technicalDebt.totalMinutes) {
      const changePercent = this.calculateChangePercent(
        baselineMetrics.technicalDebt.totalMinutes,
        currentMetrics.technicalDebt.totalMinutes
      );
      regressions.push({
        metric: 'technicalDebt',
        previousValue: baselineMetrics.technicalDebt.totalMinutes,
        currentValue: currentMetrics.technicalDebt.totalMinutes,
        changePercent,
        severity: this.determineSeverity(changePercent),
        description: `Technical debt increased from ${baselineMetrics.technicalDebt.totalMinutes} to ${currentMetrics.technicalDebt.totalMinutes} minutes`,
      });
    }

    // Check test coverage
    if (currentMetrics.testCoverage < baselineMetrics.testCoverage) {
      const changePercent = this.calculateChangePercent(
        baselineMetrics.testCoverage,
        currentMetrics.testCoverage
      );
      regressions.push({
        metric: 'testCoverage',
        previousValue: baselineMetrics.testCoverage,
        currentValue: currentMetrics.testCoverage,
        changePercent,
        severity: this.determineSeverity(changePercent),
        description: `Test coverage decreased from ${baselineMetrics.testCoverage}% to ${currentMetrics.testCoverage}%`,
      });
    }

    // Check complexity
    if (currentMetrics.complexity.cyclomaticComplexity > baselineMetrics.complexity.cyclomaticComplexity) {
      const changePercent = this.calculateChangePercent(
        baselineMetrics.complexity.cyclomaticComplexity,
        currentMetrics.complexity.cyclomaticComplexity
      );
      regressions.push({
        metric: 'cyclomaticComplexity',
        previousValue: baselineMetrics.complexity.cyclomaticComplexity,
        currentValue: currentMetrics.complexity.cyclomaticComplexity,
        changePercent,
        severity: this.determineSeverity(changePercent),
        description: `Cyclomatic complexity increased from ${baselineMetrics.complexity.cyclomaticComplexity} to ${currentMetrics.complexity.cyclomaticComplexity}`,
      });
    }

    // Check security issues
    if (currentMetrics.security.vulnerabilities > baselineMetrics.security.vulnerabilities) {
      const changePercent = this.calculateChangePercent(
        baselineMetrics.security.vulnerabilities,
        currentMetrics.security.vulnerabilities
      );
      regressions.push({
        metric: 'securityVulnerabilities',
        previousValue: baselineMetrics.security.vulnerabilities,
        currentValue: currentMetrics.security.vulnerabilities,
        changePercent,
        severity: 'critical',
        description: `Security vulnerabilities increased from ${baselineMetrics.security.vulnerabilities} to ${currentMetrics.security.vulnerabilities}`,
      });
    }

    return regressions;
  }

  /**
   * Detect improvements in quality metrics
   */
  detectImprovements(
    baselineMetrics: BaselineMetrics,
    currentMetrics: BaselineMetrics
  ): Improvement[] {
    const improvements: Improvement[] = [];

    // Check code quality
    if (currentMetrics.codeQuality > baselineMetrics.codeQuality) {
      const changePercent = this.calculateChangePercent(
        baselineMetrics.codeQuality,
        currentMetrics.codeQuality
      );
      improvements.push({
        metric: 'codeQuality',
        previousValue: baselineMetrics.codeQuality,
        currentValue: currentMetrics.codeQuality,
        changePercent,
        description: `Code quality improved from ${baselineMetrics.codeQuality} to ${currentMetrics.codeQuality}`,
      });
    }

    // Check technical debt
    if (currentMetrics.technicalDebt.totalMinutes < baselineMetrics.technicalDebt.totalMinutes) {
      const changePercent = this.calculateChangePercent(
        baselineMetrics.technicalDebt.totalMinutes,
        currentMetrics.technicalDebt.totalMinutes
      );
      improvements.push({
        metric: 'technicalDebt',
        previousValue: baselineMetrics.technicalDebt.totalMinutes,
        currentValue: currentMetrics.technicalDebt.totalMinutes,
        changePercent,
        description: `Technical debt reduced from ${baselineMetrics.technicalDebt.totalMinutes} to ${currentMetrics.technicalDebt.totalMinutes} minutes`,
      });
    }

    // Check test coverage
    if (currentMetrics.testCoverage > baselineMetrics.testCoverage) {
      const changePercent = this.calculateChangePercent(
        baselineMetrics.testCoverage,
        currentMetrics.testCoverage
      );
      improvements.push({
        metric: 'testCoverage',
        previousValue: baselineMetrics.testCoverage,
        currentValue: currentMetrics.testCoverage,
        changePercent,
        description: `Test coverage improved from ${baselineMetrics.testCoverage}% to ${currentMetrics.testCoverage}%`,
      });
    }

    return improvements;
  }

  /**
   * Update baseline for a project
   */
  updateBaseline(
    projectId: string,
    metrics: BaselineMetrics,
    thresholds?: QualityThresholds,
    notes?: string
  ): QualityBaseline {
    const currentBaseline = this.getCurrentBaseline(projectId);
    
    if (!currentBaseline) {
      throw new Error(`No baseline found for project ${projectId}`);
    }

    return this.establishBaseline(
      projectId,
      metrics,
      thresholds || currentBaseline.thresholds,
      notes
    );
  }

  /**
   * Get baseline history for a project
   */
  getBaselineHistory(projectId: string): BaselineHistory | undefined {
    return this.history.get(projectId);
  }

  /**
   * Calculate metrics from analysis results
   */
  calculateMetricsFromAnalysis(
    results: WorkspaceAnalysisResult,
    qualityMetrics: QualityMetrics[]
  ): BaselineMetrics {
    // Calculate aggregate metrics
    const avgComplexity = this.calculateAverageComplexity(qualityMetrics);
    const avgSecurity = this.calculateAverageSecurity(qualityMetrics);
    const technicalDebt = this.calculateTechnicalDebt(results);

    // Calculate code quality score (0-100)
    const codeQuality = this.calculateCodeQualityScore(results, qualityMetrics);

    return {
      codeQuality,
      technicalDebt,
      testCoverage: 75, // Placeholder - would come from coverage reports
      complexity: avgComplexity,
      security: avgSecurity,
      maintainability: this.calculateMaintainabilityIndex(qualityMetrics),
    };
  }

  // Private helper methods

  private generateVersion(projectId: string): string {
    const history = this.history.get(projectId);
    const count = history?.baselines.length || 0;
    return `v${count + 1}.0.0`;
  }

  private generateBaselineId(projectId: string, version: string): string {
    return `${projectId}-${version}`;
  }

  private updateHistory(projectId: string, baseline: QualityBaseline): void {
    let history = this.history.get(projectId);
    
    if (!history) {
      history = {
        projectId,
        baselines: [],
      };
      this.history.set(projectId, history);
    }

    history.baselines.push(baseline);
    history.currentBaseline = baseline;
  }

  private getPreviousBaseline(projectId: string, currentVersion: string): QualityBaseline | undefined {
    const history = this.history.get(projectId);
    if (!history || history.baselines.length < 2) {
      return undefined;
    }

    const currentIndex = history.baselines.findIndex(b => b.version === currentVersion);
    if (currentIndex > 0) {
      return history.baselines[currentIndex - 1];
    }

    return undefined;
  }

  private calculateChangePercent(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private determineSeverity(changePercent: number): 'critical' | 'high' | 'medium' | 'low' {
    const absChange = Math.abs(changePercent);
    
    if (absChange >= 50) {
      return 'critical';
    } else if (absChange >= 25) {
      return 'high';
    } else if (absChange >= 10) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private generateComparisonSummary(
    regressions: Regression[],
    improvements: Improvement[],
    currentMetrics: BaselineMetrics,
    thresholds: QualityThresholds
  ): ComparisonSummary {
    // Determine overall trend
    let trend: TrendDirection = 'stable';
    if (regressions.length > improvements.length) {
      trend = 'degrading';
    } else if (improvements.length > regressions.length) {
      trend = 'improving';
    }

    // Check if thresholds are met
    const failedThresholds: string[] = [];
    
    if (currentMetrics.codeQuality < thresholds.minCodeQuality) {
      failedThresholds.push(`codeQuality (${currentMetrics.codeQuality} < ${thresholds.minCodeQuality})`);
    }
    
    if (currentMetrics.technicalDebt.totalMinutes > thresholds.maxTechnicalDebt) {
      failedThresholds.push(`technicalDebt (${currentMetrics.technicalDebt.totalMinutes} > ${thresholds.maxTechnicalDebt})`);
    }
    
    if (currentMetrics.testCoverage < thresholds.minTestCoverage) {
      failedThresholds.push(`testCoverage (${currentMetrics.testCoverage} < ${thresholds.minTestCoverage})`);
    }
    
    if (currentMetrics.complexity.cyclomaticComplexity > thresholds.maxComplexity) {
      failedThresholds.push(`complexity (${currentMetrics.complexity.cyclomaticComplexity} > ${thresholds.maxComplexity})`);
    }
    
    if (currentMetrics.security.vulnerabilities > thresholds.maxSecurityIssues) {
      failedThresholds.push(`securityIssues (${currentMetrics.security.vulnerabilities} > ${thresholds.maxSecurityIssues})`);
    }

    return {
      trend,
      totalRegressions: regressions.length,
      totalImprovements: improvements.length,
      thresholdsMet: failedThresholds.length === 0,
      failedThresholds,
    };
  }

  private calculateAverageComplexity(metrics: QualityMetrics[]): QualityMetrics['complexity'] {
    if (metrics.length === 0) {
      return {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        maxNestingDepth: 0,
        maxParameters: 0,
        linesOfCode: 0,
      };
    }

    const sum = metrics.reduce((acc, m) => ({
      cyclomaticComplexity: acc.cyclomaticComplexity + m.complexity.cyclomaticComplexity,
      cognitiveComplexity: acc.cognitiveComplexity + m.complexity.cognitiveComplexity,
      maxNestingDepth: Math.max(acc.maxNestingDepth, m.complexity.maxNestingDepth),
      maxParameters: Math.max(acc.maxParameters, m.complexity.maxParameters),
      linesOfCode: acc.linesOfCode + m.complexity.linesOfCode,
    }), {
      cyclomaticComplexity: 0,
      cognitiveComplexity: 0,
      maxNestingDepth: 0,
      maxParameters: 0,
      linesOfCode: 0,
    });

    return {
      cyclomaticComplexity: sum.cyclomaticComplexity / metrics.length,
      cognitiveComplexity: sum.cognitiveComplexity / metrics.length,
      maxNestingDepth: sum.maxNestingDepth,
      maxParameters: sum.maxParameters,
      linesOfCode: sum.linesOfCode,
    };
  }

  private calculateAverageSecurity(metrics: QualityMetrics[]): QualityMetrics['security'] {
    if (metrics.length === 0) {
      return {
        vulnerabilities: 0,
        secrets: 0,
        riskScore: 0,
      };
    }

    const sum = metrics.reduce((acc, m) => ({
      vulnerabilities: acc.vulnerabilities + m.security.vulnerabilities,
      secrets: acc.secrets + m.security.secrets,
      riskScore: acc.riskScore + m.security.riskScore,
    }), {
      vulnerabilities: 0,
      secrets: 0,
      riskScore: 0,
    });

    return {
      vulnerabilities: sum.vulnerabilities,
      secrets: sum.secrets,
      riskScore: sum.riskScore / metrics.length,
    };
  }

  private calculateTechnicalDebt(results: WorkspaceAnalysisResult): TechnicalDebtMetrics {
    // Estimate technical debt based on issues
    // Each issue type has an estimated fix time
    const debtEstimates: Record<string, number> = {
      'unused-import': 1,
      'unused-variable': 2,
      'dead-function': 15,
      'dead-export': 10,
      'circular-dependency': 60,
      'high-complexity': 30,
      'security-vulnerability': 120,
      'accessibility-violation': 45,
      'performance-antipattern': 90,
      'code-duplication': 30,
    };

    const breakdown: DebtBreakdown = {
      security: 0,
      performance: 0,
      maintainability: 0,
      reliability: 0,
      duplications: 0,
    };

    let totalMinutes = 0;

    for (const [issueType, count] of Object.entries(results.issuesByType)) {
      const minutes = (debtEstimates[issueType] || 10) * count;
      totalMinutes += minutes;

      // Categorize debt
      if (issueType.includes('security')) {
        breakdown.security += minutes;
      } else if (issueType.includes('performance')) {
        breakdown.performance += minutes;
      } else if (issueType.includes('duplication')) {
        breakdown.duplications += minutes;
      } else if (issueType.includes('complexity')) {
        breakdown.maintainability += minutes;
      } else {
        breakdown.reliability += minutes;
      }
    }

    return {
      totalMinutes,
      breakdown,
      trend: 'stable',
      priority: [],
    };
  }

  private calculateCodeQualityScore(
    results: WorkspaceAnalysisResult,
    _metrics: QualityMetrics[]
  ): number {
    // Simple quality score calculation (0-100)
    // Higher is better
    
    let score = 100;

    // Deduct points for issues
    const issueDeductions: Record<string, number> = {
      'unused-import': 0.1,
      'unused-variable': 0.2,
      'dead-function': 1,
      'dead-export': 0.5,
      'circular-dependency': 5,
      'high-complexity': 2,
      'security-vulnerability': 10,
      'accessibility-violation': 3,
      'performance-antipattern': 5,
      'code-duplication': 2,
    };

    for (const [issueType, count] of Object.entries(results.issuesByType)) {
      const deduction = (issueDeductions[issueType] || 0.5) * count;
      score -= deduction;
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  private calculateMaintainabilityIndex(_metrics: QualityMetrics[]): number {
    if (_metrics.length === 0) {
      return 100;
    }

    // Calculate average maintainability index
    const sum = _metrics.reduce((acc, m) => acc + m.maintainability.maintainabilityIndex, 0);
    return sum / _metrics.length;
  }
}
