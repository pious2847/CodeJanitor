/**
 * Report Generator Service
 * 
 * Generates comprehensive code quality reports in multiple formats:
 * - Executive summaries with actionable insights
 * - PDF, Excel, and JSON export formats
 * - Machine-readable reports for CI systems
 * 
 * Requirements: 2.3, 2.8, 4.3
 */

import { EnterpriseCodeIssue, TechnicalDebtMetrics } from '../models/enterprise';
import { QualityMetrics } from '../models/types';

/**
 * Report format types
 */
export type ReportFormat = 'pdf' | 'excel' | 'json' | 'html' | 'markdown';

/**
 * Report type
 */
export type ReportType = 'executive' | 'detailed' | 'ci' | 'compliance';

/**
 * Executive summary data
 */
export interface ExecutiveSummary {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Total issues found */
  totalIssues: number;
  /** Critical issues */
  criticalIssues: number;
  /** Technical debt in hours */
  technicalDebtHours: number;
  /** Key insights */
  insights: Insight[];
  /** Recommendations */
  recommendations: Recommendation[];
  /** Trend summary */
  trends: TrendSummary;
  /** Report period */
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Actionable insight
 */
export interface Insight {
  /** Insight type */
  type: 'positive' | 'negative' | 'neutral';
  /** Insight title */
  title: string;
  /** Insight description */
  description: string;
  /** Impact level */
  impact: 'high' | 'medium' | 'low';
  /** Related metrics */
  metrics?: Record<string, number>;
}

/**
 * Actionable recommendation
 */
export interface Recommendation {
  /** Recommendation priority */
  priority: 'high' | 'medium' | 'low';
  /** Recommendation title */
  title: string;
  /** Recommendation description */
  description: string;
  /** Expected impact */
  expectedImpact: string;
  /** Estimated effort in hours */
  estimatedEffort: number;
  /** Related issues */
  relatedIssues: string[];
}

/**
 * Trend summary
 */
export interface TrendSummary {
  /** Quality trend */
  quality: 'improving' | 'stable' | 'declining';
  /** Technical debt trend */
  technicalDebt: 'improving' | 'stable' | 'declining';
  /** Issue count trend */
  issueCount: 'improving' | 'stable' | 'declining';
  /** Percentage changes */
  changes: {
    quality: number;
    technicalDebt: number;
    issueCount: number;
  };
}

/**
 * Detailed report data
 */
export interface DetailedReport {
  /** Executive summary */
  summary: ExecutiveSummary;
  /** All issues */
  issues: EnterpriseCodeIssue[];
  /** Quality metrics */
  metrics: QualityMetrics;
  /** Technical debt breakdown */
  technicalDebt: TechnicalDebtMetrics;
  /** Issues by category */
  issuesByCategory: Record<string, number>;
  /** Issues by severity */
  issuesBySeverity: Record<string, number>;
  /** Issues by file */
  issuesByFile: Record<string, number>;
  /** Top problematic files */
  topProblematicFiles: Array<{
    filePath: string;
    issueCount: number;
    technicalDebt: number;
  }>;
}

/**
 * CI report data (machine-readable)
 */
export interface CIReport {
  /** Report version */
  version: string;
  /** Timestamp */
  timestamp: Date;
  /** Overall status */
  status: 'pass' | 'fail' | 'warning';
  /** Quality gate results */
  qualityGate: {
    passed: boolean;
    conditions: Array<{
      metric: string;
      operator: string;
      threshold: number;
      actual: number;
      passed: boolean;
    }>;
  };
  /** Summary metrics */
  metrics: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    qualityScore: number;
    technicalDebtMinutes: number;
  };
  /** Issues list */
  issues: Array<{
    id: string;
    type: string;
    severity: string;
    file: string;
    line: number;
    message: string;
  }>;
  /** New issues since baseline */
  newIssues: number;
  /** Fixed issues since baseline */
  fixedIssues: number;
}

/**
 * Report generation options
 */
export interface ReportOptions {
  /** Report type */
  type: ReportType;
  /** Output format */
  format: ReportFormat;
  /** Include detailed issue list */
  includeIssues?: boolean;
  /** Include code snippets */
  includeSnippets?: boolean;
  /** Include recommendations */
  includeRecommendations?: boolean;
  /** Include trends */
  includeTrends?: boolean;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
}

/**
 * Generated report
 */
export interface GeneratedReport {
  /** Report format */
  format: ReportFormat;
  /** Report content (format-specific) */
  content: string | Buffer;
  /** File name */
  fileName: string;
  /** Generation timestamp */
  generatedAt: Date;
  /** Report metadata */
  metadata: {
    type: ReportType;
    issueCount: number;
    qualityScore: number;
  };
}

/**
 * Report Generator Service
 */
export class ReportGenerator {
  /**
   * Generate an executive summary report
   */
  async generateExecutiveSummary(
    issues: EnterpriseCodeIssue[],
    metrics: QualityMetrics,
    technicalDebt: TechnicalDebtMetrics,
    period: { start: Date; end: Date }
  ): Promise<ExecutiveSummary> {
    const criticalIssues = issues.filter(i => i.priority === 'critical').length;
    const totalIssues = issues.length;
    const technicalDebtHours = technicalDebt.totalMinutes / 60;

    // Calculate overall score
    const overallScore = this.calculateOverallScore(metrics, totalIssues);

    // Generate insights
    const insights = this.generateInsights(issues, metrics, technicalDebt);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, metrics, technicalDebt);

    // Calculate trends
    const trends = this.calculateTrends(issues, metrics);

    return {
      overallScore,
      totalIssues,
      criticalIssues,
      technicalDebtHours,
      insights,
      recommendations,
      trends,
      period,
    };
  }

  /**
   * Generate a detailed report
   */
  async generateDetailedReport(
    issues: EnterpriseCodeIssue[],
    metrics: QualityMetrics,
    technicalDebt: TechnicalDebtMetrics,
    period: { start: Date; end: Date }
  ): Promise<DetailedReport> {
    const summary = await this.generateExecutiveSummary(issues, metrics, technicalDebt, period);

    // Group issues by category
    const issuesByCategory: Record<string, number> = {};
    for (const issue of issues) {
      const category = issue.type;
      issuesByCategory[category] = (issuesByCategory[category] || 0) + 1;
    }

    // Group issues by severity
    const issuesBySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const issue of issues) {
      const severity = issue.priority || 'medium';
      issuesBySeverity[severity] = (issuesBySeverity[severity] || 0) + 1;
    }

    // Group issues by file
    const issuesByFile: Record<string, number> = {};
    for (const issue of issues) {
      for (const location of issue.locations) {
        const file = location.filePath;
        issuesByFile[file] = (issuesByFile[file] || 0) + 1;
      }
    }

    // Find top problematic files
    const topProblematicFiles = Object.entries(issuesByFile)
      .map(([filePath, issueCount]) => ({
        filePath,
        issueCount,
        technicalDebt: issueCount * 15, // Estimate 15 minutes per issue
      }))
      .sort((a, b) => b.issueCount - a.issueCount)
      .slice(0, 10);

    return {
      summary,
      issues,
      metrics,
      technicalDebt,
      issuesByCategory,
      issuesBySeverity,
      issuesByFile,
      topProblematicFiles,
    };
  }

  /**
   * Generate a CI-compatible report
   */
  async generateCIReport(
    issues: EnterpriseCodeIssue[],
    metrics: QualityMetrics,
    technicalDebt: TechnicalDebtMetrics,
    qualityGate?: {
      conditions: Array<{
        metric: string;
        operator: string;
        threshold: number;
      }>;
    }
  ): Promise<CIReport> {
    const criticalIssues = issues.filter(i => i.priority === 'critical').length;
    const highIssues = issues.filter(i => i.priority === 'high').length;
    const mediumIssues = issues.filter(i => i.priority === 'medium').length;
    const lowIssues = issues.filter(i => i.priority === 'low').length;

    const qualityScore = this.calculateOverallScore(metrics, issues.length);

    // Evaluate quality gate
    let qualityGatePassed = true;
    const evaluatedConditions: CIReport['qualityGate']['conditions'] = [];

    if (qualityGate) {
      for (const condition of qualityGate.conditions) {
        const actual = this.getMetricValue(condition.metric, metrics, issues, technicalDebt);
        const passed = this.evaluateCondition(actual, condition.operator, condition.threshold);
        
        if (!passed) {
          qualityGatePassed = false;
        }

        evaluatedConditions.push({
          metric: condition.metric,
          operator: condition.operator,
          threshold: condition.threshold,
          actual,
          passed,
        });
      }
    }

    // Determine overall status
    let status: 'pass' | 'fail' | 'warning' = 'pass';
    if (!qualityGatePassed || criticalIssues > 0) {
      status = 'fail';
    } else if (highIssues > 5) {
      status = 'warning';
    }

    // Format issues for CI
    const formattedIssues = issues.map(issue => ({
      id: issue.id,
      type: issue.type,
      severity: issue.priority || 'medium',
      file: issue.locations[0]?.filePath || 'unknown',
      line: issue.locations[0]?.startLine || 0,
      message: issue.reason || `${issue.type} issue detected`,
    }));

    return {
      version: '1.0.0',
      timestamp: new Date(),
      status,
      qualityGate: {
        passed: qualityGatePassed,
        conditions: evaluatedConditions,
      },
      metrics: {
        totalIssues: issues.length,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
        qualityScore,
        technicalDebtMinutes: technicalDebt.totalMinutes,
      },
      issues: formattedIssues,
      newIssues: 0, // Would compare against baseline
      fixedIssues: 0, // Would compare against baseline
    };
  }

  /**
   * Export report in specified format
   */
  async exportReport(
    report: ExecutiveSummary | DetailedReport | CIReport,
    format: ReportFormat,
    options?: ReportOptions
  ): Promise<GeneratedReport> {
    const timestamp = new Date();
    const fileName = this.generateFileName(format, options?.type || 'executive', timestamp);

    let content: string | Buffer;

    switch (format) {
      case 'json':
        content = JSON.stringify(report, null, 2);
        break;

      case 'html':
        content = this.generateHTML(report, options);
        break;

      case 'markdown':
        content = this.generateMarkdown(report, options);
        break;

      case 'pdf':
        content = await this.generatePDF(report, options);
        break;

      case 'excel':
        content = await this.generateExcel(report, options);
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return {
      format,
      content,
      fileName,
      generatedAt: timestamp,
      metadata: {
        type: options?.type || 'executive',
        issueCount: this.getIssueCount(report),
        qualityScore: this.getQualityScore(report),
      },
    };
  }

  /**
   * Private helper methods
   */

  private calculateOverallScore(metrics: QualityMetrics, issueCount: number): number {
    // Calculate weighted score from various metrics
    const maintainability = metrics.maintainability.maintainabilityIndex;
    const complexity = Math.max(0, 100 - metrics.complexity.cyclomaticComplexity);
    const security = Math.max(0, 100 - metrics.security.riskScore);
    
    // Penalize for issues
    const issuePenalty = Math.min(30, issueCount * 0.5);
    
    const baseScore = (maintainability * 0.4 + complexity * 0.3 + security * 0.3);
    return Math.max(0, Math.min(100, baseScore - issuePenalty));
  }

  private generateInsights(
    _issues: EnterpriseCodeIssue[],
    metrics: QualityMetrics,
    technicalDebt: TechnicalDebtMetrics
  ): Insight[] {
    const insights: Insight[] = [];

    // Security insights
    if (metrics.security.riskScore > 70) {
      insights.push({
        type: 'negative',
        title: 'High Security Risk',
        description: `Security risk score is ${metrics.security.riskScore.toFixed(1)}, indicating potential vulnerabilities.`,
        impact: 'high',
        metrics: { riskScore: metrics.security.riskScore },
      });
    }

    // Complexity insights
    if (metrics.complexity.cyclomaticComplexity > 20) {
      insights.push({
        type: 'negative',
        title: 'High Code Complexity',
        description: `Average cyclomatic complexity is ${metrics.complexity.cyclomaticComplexity.toFixed(1)}, making code harder to maintain.`,
        impact: 'medium',
        metrics: { complexity: metrics.complexity.cyclomaticComplexity },
      });
    }

    // Technical debt insights
    if (technicalDebt.totalMinutes > 480) {
      insights.push({
        type: 'negative',
        title: 'Significant Technical Debt',
        description: `Estimated ${(technicalDebt.totalMinutes / 60).toFixed(1)} hours of technical debt accumulated.`,
        impact: 'high',
        metrics: { debtHours: technicalDebt.totalMinutes / 60 },
      });
    }

    // Positive insights
    if (metrics.maintainability.maintainabilityIndex > 80) {
      insights.push({
        type: 'positive',
        title: 'Good Maintainability',
        description: `Maintainability index is ${metrics.maintainability.maintainabilityIndex.toFixed(1)}, indicating well-structured code.`,
        impact: 'medium',
        metrics: { maintainability: metrics.maintainability.maintainabilityIndex },
      });
    }

    return insights;
  }

  private generateRecommendations(
    _issues: EnterpriseCodeIssue[],
    _metrics: QualityMetrics,
    _technicalDebt: TechnicalDebtMetrics
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Group issues by type
    const issuesByType: Record<string, EnterpriseCodeIssue[]> = {};
    for (const issue of _issues) {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type]?.push(issue);
    }

    // Generate recommendations based on issue patterns
    for (const [type, typeIssues] of Object.entries(issuesByType)) {
      if (typeIssues.length > 5) {
        recommendations.push({
          priority: 'high',
          title: `Address ${type} Issues`,
          description: `Found ${typeIssues.length} ${type} issues. Consider a focused cleanup effort.`,
          expectedImpact: `Reduce technical debt by ~${(typeIssues.length * 15 / 60).toFixed(1)} hours`,
          estimatedEffort: typeIssues.length * 0.25, // 15 minutes per issue
          relatedIssues: typeIssues.slice(0, 5).map(i => i.id),
        });
      }
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  private calculateTrends(
    _issues: EnterpriseCodeIssue[],
    _metrics: QualityMetrics
  ): TrendSummary {
    // Simplified trend calculation - would use historical data in production
    return {
      quality: 'stable',
      technicalDebt: 'stable',
      issueCount: 'stable',
      changes: {
        quality: 0,
        technicalDebt: 0,
        issueCount: 0,
      },
    };
  }

  private getMetricValue(
    metric: string,
    metrics: QualityMetrics,
    issues: EnterpriseCodeIssue[],
    technicalDebt: TechnicalDebtMetrics
  ): number {
    switch (metric) {
      case 'totalIssues':
        return issues.length;
      case 'criticalIssues':
        return issues.filter(i => i.priority === 'critical').length;
      case 'qualityScore':
        return this.calculateOverallScore(metrics, issues.length);
      case 'technicalDebt':
        return technicalDebt.totalMinutes;
      case 'complexity':
        return metrics.complexity.cyclomaticComplexity;
      case 'security':
        return metrics.security.riskScore;
      default:
        return 0;
    }
  }

  private evaluateCondition(actual: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'less_than':
      case '<':
        return actual < threshold;
      case 'less_than_or_equal':
      case '<=':
        return actual <= threshold;
      case 'greater_than':
      case '>':
        return actual > threshold;
      case 'greater_than_or_equal':
      case '>=':
        return actual >= threshold;
      case 'equals':
      case '==':
        return actual === threshold;
      default:
        return false;
    }
  }

  private generateFileName(format: ReportFormat, type: ReportType, timestamp: Date): string {
    const dateStr = timestamp.toISOString().split('T')[0];
    return `codejanitor-${type}-report-${dateStr}.${format}`;
  }

  private generateHTML(report: any, options?: ReportOptions): string {
    const title = options?.title || 'CodeJanitor Report';
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    .metric { display: inline-block; margin: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .metric-value { font-size: 32px; font-weight: bold; }
    .metric-label { color: #666; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <pre>${JSON.stringify(report, null, 2)}</pre>
</body>
</html>`;
  }

  private generateMarkdown(report: any, options?: ReportOptions): string {
    const title = options?.title || 'CodeJanitor Report';
    
    return `# ${title}

\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`
`;
  }

  private async generatePDF(_report: any, _options?: ReportOptions): Promise<Buffer> {
    // Placeholder - would use a PDF library like pdfkit or puppeteer
    return Buffer.from('PDF generation not yet implemented');
  }

  private async generateExcel(_report: any, _options?: ReportOptions): Promise<Buffer> {
    // Placeholder - would use a library like exceljs
    return Buffer.from('Excel generation not yet implemented');
  }

  private getIssueCount(report: any): number {
    if ('totalIssues' in report) {
      return report.totalIssues;
    }
    if ('issues' in report && Array.isArray(report.issues)) {
      return report.issues.length;
    }
    if ('metrics' in report && 'totalIssues' in report.metrics) {
      return report.metrics.totalIssues;
    }
    return 0;
  }

  private getQualityScore(report: any): number {
    if ('overallScore' in report) {
      return report.overallScore;
    }
    if ('metrics' in report && 'qualityScore' in report.metrics) {
      return report.metrics.qualityScore;
    }
    return 0;
  }
}
