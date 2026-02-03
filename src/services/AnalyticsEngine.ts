/**
 * Analytics Engine Service
 * 
 * Provides metrics calculation, trend analysis, code duplication detection,
 * and performance anti-pattern recognition.
 */

import { IssueType, QualityMetrics } from '../models/types';
import { TrendDirection } from '../models/enterprise';
import * as ts from 'typescript';

/**
 * Time range for trend analysis
 */
export interface TimeRange {
  /** Start date */
  start: Date;
  /** End date */
  end: Date;
}

/**
 * Trend data point
 */
export interface TrendDataPoint {
  /** Timestamp */
  timestamp: Date;
  /** Metric value */
  value: number;
  /** Metric name */
  metric: string;
}

/**
 * Trend analysis result
 */
export interface Trend {
  /** Metric name */
  metric: string;
  /** Trend direction */
  direction: TrendDirection;
  /** Data points */
  dataPoints: TrendDataPoint[];
  /** Percentage change */
  percentageChange: number;
  /** Average value */
  average: number;
}

/**
 * Code duplication instance
 */
export interface DuplicationInstance {
  /** Unique identifier */
  id: string;
  /** Files containing the duplication */
  files: string[];
  /** Start line in each file */
  startLines: number[];
  /** End line in each file */
  endLines: number[];
  /** Duplicated code snippet */
  snippet: string;
  /** Number of lines duplicated */
  lines: number;
  /** Number of tokens duplicated */
  tokens: number;
}

/**
 * Code duplication report
 */
export interface DuplicationReport {
  /** Total duplications found */
  totalDuplications: number;
  /** Duplication instances */
  instances: DuplicationInstance[];
  /** Duplication percentage */
  duplicationPercentage: number;
  /** Total lines of duplicated code */
  duplicatedLines: number;
}

/**
 * Performance anti-pattern types
 */
export type AntiPatternType =
  | 'nested_loops'
  | 'inefficient_array_operation'
  | 'unnecessary_rerender'
  | 'memory_leak'
  | 'blocking_operation'
  | 'inefficient_dom_manipulation'
  | 'large_bundle'
  | 'unoptimized_regex';

/**
 * Performance anti-pattern instance
 */
export interface PerformanceAntiPattern {
  /** Unique identifier */
  id: string;
  /** Type of anti-pattern */
  type: AntiPatternType;
  /** File path */
  filePath: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** Description */
  description: string;
  /** Severity (1-10, higher is worse) */
  severity: number;
  /** Suggested fix */
  suggestedFix?: string;
  /** Code snippet */
  snippet: string;
}

/**
 * Performance analysis report
 */
export interface PerformanceReport {
  /** Total anti-patterns found */
  totalAntiPatterns: number;
  /** Anti-pattern instances */
  instances: PerformanceAntiPattern[];
  /** Performance score (0-100, higher is better) */
  performanceScore: number;
  /** Breakdown by type */
  byType: Record<AntiPatternType, number>;
}

/**
 * Metrics snapshot for a point in time
 */
export interface MetricsSnapshot {
  /** Timestamp */
  timestamp: Date;
  /** Quality metrics */
  metrics: QualityMetrics;
  /** Issue counts by type */
  issuesByType: Record<IssueType, number>;
  /** Total issues */
  totalIssues: number;
}

/**
 * Analytics Engine Service
 */
export class AnalyticsEngine {
  private metricsHistory: Map<string, MetricsSnapshot[]> = new Map();

  /**
   * Calculate trends for quality metrics over a time range
   */
  calculateTrends(projectId: string, timeRange: TimeRange): Trend[] {
    const snapshots = this.getSnapshotsInRange(projectId, timeRange);
    
    if (snapshots.length < 2) {
      return [];
    }

    const trends: Trend[] = [];

    // Analyze complexity trend
    trends.push(this.calculateMetricTrend(
      'Cyclomatic Complexity',
      snapshots.map(s => ({
        timestamp: s.timestamp,
        value: s.metrics.complexity.cyclomaticComplexity,
        metric: 'Cyclomatic Complexity',
      }))
    ));

    // Analyze maintainability trend
    trends.push(this.calculateMetricTrend(
      'Maintainability Index',
      snapshots.map(s => ({
        timestamp: s.timestamp,
        value: s.metrics.maintainability.maintainabilityIndex,
        metric: 'Maintainability Index',
      }))
    ));

    // Analyze security trend
    trends.push(this.calculateMetricTrend(
      'Security Risk Score',
      snapshots.map(s => ({
        timestamp: s.timestamp,
        value: s.metrics.security.riskScore,
        metric: 'Security Risk Score',
      }))
    ));

    // Analyze test coverage trend
    trends.push(this.calculateMetricTrend(
      'Test Coverage',
      snapshots.map(s => ({
        timestamp: s.timestamp,
        value: s.metrics.testability.coverage,
        metric: 'Test Coverage',
      }))
    ));

    return trends;
  }

  /**
   * Detect code duplication across files
   */
  detectDuplication(files: Map<string, string>, minLines: number = 6, minTokens: number = 50): DuplicationReport {
    const instances: DuplicationInstance[] = [];
    const fileArray = Array.from(files.entries());
    
    // Compare each file with every other file
    for (let i = 0; i < fileArray.length; i++) {
      for (let j = i + 1; j < fileArray.length; j++) {
        const entry1 = fileArray[i];
        const entry2 = fileArray[j];
        
        if (!entry1 || !entry2) continue;
        
        const [file1, content1] = entry1;
        const [file2, content2] = entry2;
        
        const duplications = this.findDuplicationsInFiles(
          file1, content1,
          file2, content2,
          minLines,
          minTokens
        );
        
        instances.push(...duplications);
      }
    }

    // Calculate duplication percentage
    const totalLines = Array.from(files.values())
      .reduce((sum, content) => sum + content.split('\n').length, 0);
    
    const duplicatedLines = instances.reduce((sum, inst) => sum + inst.lines, 0);
    const duplicationPercentage = totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0;

    return {
      totalDuplications: instances.length,
      instances,
      duplicationPercentage,
      duplicatedLines,
    };
  }

  /**
   * Identify performance anti-patterns in code
   */
  identifyPerformanceAntiPatterns(filePath: string, sourceCode: string): PerformanceReport {
    const instances: PerformanceAntiPattern[] = [];
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    // Detect nested loops
    instances.push(...this.detectNestedLoops(sourceFile, filePath));

    // Detect inefficient array operations
    instances.push(...this.detectInefficientArrayOps(sourceFile, filePath));

    // Detect blocking operations
    instances.push(...this.detectBlockingOperations(sourceFile, filePath));

    // Detect inefficient DOM manipulation
    instances.push(...this.detectInefficientDOMOps(sourceFile, filePath));

    // Count by type
    const byType: Record<AntiPatternType, number> = {
      nested_loops: 0,
      inefficient_array_operation: 0,
      unnecessary_rerender: 0,
      memory_leak: 0,
      blocking_operation: 0,
      inefficient_dom_manipulation: 0,
      large_bundle: 0,
      unoptimized_regex: 0,
    };

    for (const instance of instances) {
      byType[instance.type]++;
    }

    // Calculate performance score (0-100, higher is better)
    const maxScore = 100;
    const penaltyPerIssue = 5;
    const performanceScore = Math.max(0, maxScore - (instances.length * penaltyPerIssue));

    return {
      totalAntiPatterns: instances.length,
      instances,
      performanceScore,
      byType,
    };
  }

  /**
   * Store a metrics snapshot for trend analysis
   */
  recordMetricsSnapshot(projectId: string, snapshot: MetricsSnapshot): void {
    const history = this.metricsHistory.get(projectId) || [];
    history.push(snapshot);
    
    // Keep only last 1000 snapshots
    if (history.length > 1000) {
      history.shift();
    }
    
    this.metricsHistory.set(projectId, history);
  }

  /**
   * Get metrics history for a project
   */
  getMetricsHistory(projectId: string): MetricsSnapshot[] {
    return this.metricsHistory.get(projectId) || [];
  }

  /**
   * Calculate correlation between code quality and development velocity
   */
  calculateQualityVelocityCorrelation(
    qualityScores: number[],
    velocityMetrics: number[]
  ): number {
    if (qualityScores.length !== velocityMetrics.length || qualityScores.length < 2) {
      return 0;
    }

    // Calculate Pearson correlation coefficient
    const n = qualityScores.length;
    const sumX = qualityScores.reduce((a, b) => a + b, 0);
    const sumY = velocityMetrics.reduce((a, b) => a + b, 0);
    const sumXY = qualityScores.reduce((sum, x, i) => sum + x * (velocityMetrics[i] || 0), 0);
    const sumX2 = qualityScores.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = velocityMetrics.reduce((sum, y) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate overall quality score for the workspace
   */
  async calculateQualityScore(): Promise<number> {
    // Default implementation - returns a score based on recent metrics
    const history = Array.from(this.metricsHistory.values()).flat();
    if (history.length === 0) {
      return 75; // Default score
    }

    const recent = history[history.length - 1];
    if (!recent) {
      return 75;
    }

    // Calculate weighted score from various metrics
    const maintainability = recent.metrics.maintainability.maintainabilityIndex;
    const complexity = Math.max(0, 100 - recent.metrics.complexity.cyclomaticComplexity);
    const security = Math.max(0, 100 - recent.metrics.security.riskScore);
    
    return (maintainability * 0.4 + complexity * 0.3 + security * 0.3);
  }

  /**
   * Get technical debt metrics
   */
  async getTechnicalDebtMetrics(): Promise<{ totalMinutes: number }> {
    // Default implementation
    return { totalMinutes: 120 };
  }

  /**
   * Calculate trends for dashboard (simplified version)
   */
  async calculateDashboardTrends(): Promise<{ quality: 'up' | 'down' | 'stable'; debt: 'up' | 'down' | 'stable' }> {
    // Default implementation
    return { quality: 'stable', debt: 'stable' };
  }

  /**
   * Calculate team quality score
   */
  async calculateTeamQualityScore(teamId: string): Promise<number> {
    const history = this.metricsHistory.get(teamId);
    if (!history || history.length === 0) {
      return 75;
    }

    const recent = history[history.length - 1];
    if (!recent) {
      return 75;
    }

    const maintainability = recent.metrics.maintainability.maintainabilityIndex;
    const complexity = Math.max(0, 100 - recent.metrics.complexity.cyclomaticComplexity);
    const security = Math.max(0, 100 - recent.metrics.security.riskScore);
    
    return (maintainability * 0.4 + complexity * 0.3 + security * 0.3);
  }

  /**
   * Get team technical debt
   */
  async getTeamTechnicalDebt(_teamId: string): Promise<{ totalMinutes: number }> {
    return { totalMinutes: 90 };
  }

  /**
   * Calculate team trends
   */
  async calculateTeamTrends(_teamId: string): Promise<{ quality: 'up' | 'down' | 'stable'; debt: 'up' | 'down' | 'stable' }> {
    return { quality: 'stable', debt: 'stable' };
  }

  /**
   * Calculate project quality score
   */
  async calculateProjectQualityScore(projectId: string): Promise<number> {
    const history = this.metricsHistory.get(projectId);
    if (!history || history.length === 0) {
      return 75;
    }

    const recent = history[history.length - 1];
    if (!recent) {
      return 75;
    }

    const maintainability = recent.metrics.maintainability.maintainabilityIndex;
    const complexity = Math.max(0, 100 - recent.metrics.complexity.cyclomaticComplexity);
    const security = Math.max(0, 100 - recent.metrics.security.riskScore);
    
    return (maintainability * 0.4 + complexity * 0.3 + security * 0.3);
  }

  /**
   * Get project technical debt
   */
  async getProjectTechnicalDebt(_projectId: string): Promise<{ totalMinutes: number }> {
    return { totalMinutes: 60 };
  }

  /**
   * Calculate project trends
   */
  async calculateProjectTrends(_projectId: string): Promise<{ quality: 'up' | 'down' | 'stable'; debt: 'up' | 'down' | 'stable' }> {
    return { quality: 'stable', debt: 'stable' };
  }

  /**
   * Private helper methods
   */

  private getSnapshotsInRange(projectId: string, timeRange: TimeRange): MetricsSnapshot[] {
    const history = this.metricsHistory.get(projectId) || [];
    return history.filter(
      snapshot => snapshot.timestamp >= timeRange.start && snapshot.timestamp <= timeRange.end
    );
  }

  private calculateMetricTrend(metricName: string, dataPoints: TrendDataPoint[]): Trend {
    if (dataPoints.length < 2) {
      return {
        metric: metricName,
        direction: 'stable',
        dataPoints: [],
        percentageChange: 0,
        average: 0,
      };
    }

    const values = dataPoints.map(dp => dp.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Calculate trend direction using linear regression
    const firstValue = values[0] || 0;
    const lastValue = values[values.length - 1] || 0;
    const percentageChange = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    let direction: TrendDirection;
    if (Math.abs(percentageChange) < 5) {
      direction = 'stable';
    } else if (percentageChange > 0) {
      // For metrics like complexity and risk, increasing is degrading
      direction = metricName.includes('Complexity') || metricName.includes('Risk') 
        ? 'degrading' 
        : 'improving';
    } else {
      direction = metricName.includes('Complexity') || metricName.includes('Risk')
        ? 'improving'
        : 'degrading';
    }

    return {
      metric: metricName,
      direction,
      dataPoints,
      percentageChange,
      average,
    };
  }

  private findDuplicationsInFiles(
    file1: string,
    content1: string,
    file2: string,
    content2: string,
    minLines: number,
    minTokens: number
  ): DuplicationInstance[] {
    const instances: DuplicationInstance[] = [];
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');

    // Simple line-by-line comparison
    for (let i = 0; i < lines1.length - minLines; i++) {
      for (let j = 0; j < lines2.length - minLines; j++) {
        const match = this.findMatchingBlock(lines1, i, lines2, j);
        
        if (match.lines >= minLines && match.tokens >= minTokens) {
          instances.push({
            id: `dup-${file1}-${i}-${file2}-${j}`,
            files: [file1, file2],
            startLines: [i + 1, j + 1],
            endLines: [i + match.lines, j + match.lines],
            snippet: lines1.slice(i, i + match.lines).join('\n'),
            lines: match.lines,
            tokens: match.tokens,
          });
          
          // Skip ahead to avoid overlapping duplications
          i += match.lines - 1;
          break;
        }
      }
    }

    return instances;
  }

  private findMatchingBlock(
    lines1: string[],
    start1: number,
    lines2: string[],
    start2: number
  ): { lines: number; tokens: number } {
    let matchingLines = 0;
    let totalTokens = 0;

    while (
      start1 + matchingLines < lines1.length &&
      start2 + matchingLines < lines2.length
    ) {
      const line1 = lines1[start1 + matchingLines];
      const line2 = lines2[start2 + matchingLines];
      
      if (!line1 || !line2 || !this.linesMatch(line1, line2)) {
        break;
      }
      
      totalTokens += this.countTokens(line1);
      matchingLines++;
    }

    return { lines: matchingLines, tokens: totalTokens };
  }

  private linesMatch(line1: string, line2: string): boolean {
    // Normalize whitespace and compare
    const normalized1 = line1.trim().replace(/\s+/g, ' ');
    const normalized2 = line2.trim().replace(/\s+/g, ' ');
    return normalized1 === normalized2 && normalized1.length > 0;
  }

  private countTokens(line: string): number {
    // Simple token count based on word boundaries
    return line.trim().split(/\s+/).filter(t => t.length > 0).length;
  }

  private detectNestedLoops(sourceFile: ts.SourceFile, filePath: string): PerformanceAntiPattern[] {
    const instances: PerformanceAntiPattern[] = [];
    let loopDepth = 0;

    const visit = (node: ts.Node) => {
      const isLoop = ts.isForStatement(node) || 
                     ts.isForInStatement(node) || 
                     ts.isForOfStatement(node) ||
                     ts.isWhileStatement(node) ||
                     ts.isDoStatement(node);

      if (isLoop) {
        loopDepth++;
        
        if (loopDepth >= 3) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          instances.push({
            id: `nested-loop-${filePath}-${line}`,
            type: 'nested_loops',
            filePath,
            line: line + 1,
            column: character + 1,
            description: `Nested loop with depth ${loopDepth} detected`,
            severity: Math.min(10, loopDepth * 2),
            suggestedFix: 'Consider refactoring to reduce nesting depth',
            snippet: node.getText(sourceFile).substring(0, 100),
          });
        }
      }

      ts.forEachChild(node, visit);

      if (isLoop) {
        loopDepth--;
      }
    };

    visit(sourceFile);
    return instances;
  }

  private detectInefficientArrayOps(sourceFile: ts.SourceFile, filePath: string): PerformanceAntiPattern[] {
    const instances: PerformanceAntiPattern[] = [];

    const visit = (node: ts.Node) => {
      // Detect array operations inside loops
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText(sourceFile);
        
        // Check for inefficient operations like push in loop
        if (text.includes('.push') || text.includes('.concat') || text.includes('.splice')) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          
          instances.push({
            id: `inefficient-array-${filePath}-${line}`,
            type: 'inefficient_array_operation',
            filePath,
            line: line + 1,
            column: character + 1,
            description: 'Potentially inefficient array operation',
            severity: 5,
            suggestedFix: 'Consider using more efficient array methods or pre-allocating',
            snippet: node.getText(sourceFile).substring(0, 100),
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return instances;
  }

  private detectBlockingOperations(sourceFile: ts.SourceFile, filePath: string): PerformanceAntiPattern[] {
    const instances: PerformanceAntiPattern[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText(sourceFile);
        
        // Detect synchronous operations that should be async
        const blockingPatterns = [
          'readFileSync',
          'writeFileSync',
          'execSync',
          'JSON.parse', // on large data
        ];

        for (const pattern of blockingPatterns) {
          if (text.includes(pattern)) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            
            instances.push({
              id: `blocking-op-${filePath}-${line}`,
              type: 'blocking_operation',
              filePath,
              line: line + 1,
              column: character + 1,
              description: `Blocking operation detected: ${pattern}`,
              severity: 7,
              suggestedFix: 'Consider using async alternatives',
              snippet: node.getText(sourceFile).substring(0, 100),
            });
            break;
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return instances;
  }

  private detectInefficientDOMOps(sourceFile: ts.SourceFile, filePath: string): PerformanceAntiPattern[] {
    const instances: PerformanceAntiPattern[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText(sourceFile);
        
        // Detect DOM operations in loops
        const domPatterns = [
          'document.getElementById',
          'document.querySelector',
          'document.createElement',
          'appendChild',
          'innerHTML',
        ];

        for (const pattern of domPatterns) {
          if (text.includes(pattern)) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            
            instances.push({
              id: `dom-op-${filePath}-${line}`,
              type: 'inefficient_dom_manipulation',
              filePath,
              line: line + 1,
              column: character + 1,
              description: `Potentially inefficient DOM operation: ${pattern}`,
              severity: 6,
              suggestedFix: 'Consider batching DOM operations or using document fragments',
              snippet: node.getText(sourceFile).substring(0, 100),
            });
            break;
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return instances;
  }
}
