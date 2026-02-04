/**
 * Industry Benchmarking Service
 * 
 * Provides industry standard comparison metrics, benchmarking data collection,
 * and competitive analysis reports.
 */

import { QualityMetrics } from '../models/types';

/**
 * Industry sector
 */
export type IndustrySector =
  | 'fintech'
  | 'healthcare'
  | 'ecommerce'
  | 'saas'
  | 'gaming'
  | 'enterprise'
  | 'startup'
  | 'general';

/**
 * Project size category
 */
export type ProjectSize =
  | 'small'      // < 10k LOC
  | 'medium'     // 10k - 100k LOC
  | 'large'      // 100k - 1M LOC
  | 'enterprise'; // > 1M LOC

/**
 * Technology stack
 */
export type TechStack =
  | 'typescript'
  | 'javascript'
  | 'react'
  | 'vue'
  | 'angular'
  | 'nodejs'
  | 'mixed';

/**
 * Industry benchmark data
 */
export interface IndustryBenchmark {
  /** Industry sector */
  sector: IndustrySector;
  /** Project size category */
  projectSize: ProjectSize;
  /** Technology stack */
  techStack: TechStack;
  /** Benchmark metrics */
  metrics: BenchmarkMetrics;
  /** Sample size */
  sampleSize: number;
  /** Last updated date */
  lastUpdated: Date;
}

/**
 * Benchmark metrics
 */
export interface BenchmarkMetrics {
  /** Average cyclomatic complexity */
  avgComplexity: number;
  /** Average maintainability index */
  avgMaintainability: number;
  /** Average test coverage percentage */
  avgTestCoverage: number;
  /** Average code duplication percentage */
  avgDuplication: number;
  /** Average security risk score */
  avgSecurityRisk: number;
  /** Average technical debt ratio */
  avgTechnicalDebtRatio: number;
  /** Average lines of code per file */
  avgLinesPerFile: number;
  /** Average functions per file */
  avgFunctionsPerFile: number;
}

/**
 * Benchmark comparison result
 */
export interface BenchmarkComparison {
  /** Project metrics */
  projectMetrics: QualityMetrics;
  /** Industry benchmark */
  industryBenchmark: IndustryBenchmark;
  /** Comparison results */
  comparisons: MetricComparison[];
  /** Overall score (0-100) */
  overallScore: number;
  /** Percentile ranking */
  percentile: number;
  /** Areas of strength */
  strengths: string[];
  /** Areas for improvement */
  improvements: string[];
}

/**
 * Metric comparison
 */
export interface MetricComparison {
  /** Metric name */
  metric: string;
  /** Project value */
  projectValue: number;
  /** Industry average */
  industryAverage: number;
  /** Difference percentage */
  differencePercent: number;
  /** Performance rating */
  rating: PerformanceRating;
  /** Description */
  description: string;
}

/**
 * Performance rating
 */
export type PerformanceRating =
  | 'excellent'   // Top 10%
  | 'good'        // Top 25%
  | 'average'     // Middle 50%
  | 'below_average' // Bottom 25%
  | 'poor';       // Bottom 10%

/**
 * Competitive analysis report
 */
export interface CompetitiveAnalysisReport {
  /** Project identifier */
  projectId: string;
  /** Comparison date */
  comparisonDate: Date;
  /** Industry sector */
  sector: IndustrySector;
  /** Project size */
  projectSize: ProjectSize;
  /** Overall ranking */
  overallRanking: PerformanceRating;
  /** Detailed comparisons */
  comparisons: BenchmarkComparison[];
  /** Key insights */
  insights: string[];
  /** Recommendations */
  recommendations: string[];
  /** Competitive advantages */
  advantages: string[];
  /** Competitive disadvantages */
  disadvantages: string[];
}

/**
 * Benchmarking data point
 */
export interface BenchmarkingDataPoint {
  /** Project identifier */
  projectId: string;
  /** Timestamp */
  timestamp: Date;
  /** Sector */
  sector: IndustrySector;
  /** Project size */
  projectSize: ProjectSize;
  /** Tech stack */
  techStack: TechStack;
  /** Quality metrics */
  metrics: QualityMetrics;
  /** Lines of code */
  linesOfCode: number;
  /** Number of files */
  fileCount: number;
}

/**
 * Industry Benchmarking Service
 */
export class IndustryBenchmarking {
  private benchmarkData: Map<string, IndustryBenchmark> = new Map();
  private collectedData: BenchmarkingDataPoint[] = [];

  constructor() {
    this.initializeDefaultBenchmarks();
  }

  /**
   * Compare project metrics against industry benchmarks
   */
  async compareToIndustry(
    projectMetrics: QualityMetrics,
    sector: IndustrySector,
    projectSize: ProjectSize,
    techStack: TechStack
  ): Promise<BenchmarkComparison> {
    const benchmarkKey = this.getBenchmarkKey(sector, projectSize, techStack);
    const benchmark = this.benchmarkData.get(benchmarkKey);

    if (!benchmark) {
      throw new Error(`No benchmark data available for ${sector}/${projectSize}/${techStack}`);
    }

    const comparisons: MetricComparison[] = [];

    // Compare complexity
    comparisons.push(this.compareMetric(
      'Cyclomatic Complexity',
      projectMetrics.complexity.cyclomaticComplexity,
      benchmark.metrics.avgComplexity,
      false // Lower is better
    ));

    // Compare maintainability
    comparisons.push(this.compareMetric(
      'Maintainability Index',
      projectMetrics.maintainability.maintainabilityIndex,
      benchmark.metrics.avgMaintainability,
      true // Higher is better
    ));

    // Compare test coverage
    comparisons.push(this.compareMetric(
      'Test Coverage',
      projectMetrics.testability.coverage,
      benchmark.metrics.avgTestCoverage,
      true // Higher is better
    ));

    // Compare duplication
    comparisons.push(this.compareMetric(
      'Code Duplication',
      projectMetrics.maintainability.duplications,
      benchmark.metrics.avgDuplication,
      false // Lower is better
    ));

    // Compare security risk
    comparisons.push(this.compareMetric(
      'Security Risk Score',
      projectMetrics.security.riskScore,
      benchmark.metrics.avgSecurityRisk,
      false // Lower is better
    ));

    // Calculate overall score
    const overallScore = this.calculateOverallScore(comparisons);
    const percentile = this.calculatePercentile(overallScore);

    // Identify strengths and improvements
    const strengths = comparisons
      .filter(c => c.rating === 'excellent' || c.rating === 'good')
      .map(c => c.metric);

    const improvements = comparisons
      .filter(c => c.rating === 'below_average' || c.rating === 'poor')
      .map(c => c.metric);

    return {
      projectMetrics,
      industryBenchmark: benchmark,
      comparisons,
      overallScore,
      percentile,
      strengths,
      improvements,
    };
  }

  /**
   * Generate competitive analysis report
   */
  async generateCompetitiveAnalysis(
    projectId: string,
    projectMetrics: QualityMetrics,
    sector: IndustrySector,
    projectSize: ProjectSize,
    techStack: TechStack
  ): Promise<CompetitiveAnalysisReport> {
    const comparison = await this.compareToIndustry(
      projectMetrics,
      sector,
      projectSize,
      techStack
    );

    // Determine overall ranking
    const overallRanking = this.getRatingFromScore(comparison.overallScore);

    // Generate insights
    const insights: string[] = [];
    if (comparison.percentile >= 75) {
      insights.push('Your project is in the top quartile for code quality in your industry');
    } else if (comparison.percentile <= 25) {
      insights.push('Your project has significant room for improvement compared to industry standards');
    }

    if (comparison.strengths.length > 0) {
      insights.push(`Strong performance in: ${comparison.strengths.join(', ')}`);
    }

    if (comparison.improvements.length > 0) {
      insights.push(`Focus areas: ${comparison.improvements.join(', ')}`);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    for (const comp of comparison.comparisons) {
      if (comp.rating === 'below_average' || comp.rating === 'poor') {
        recommendations.push(
          `Improve ${comp.metric}: Currently ${comp.projectValue.toFixed(1)}, ` +
          `industry average is ${comp.industryAverage.toFixed(1)}`
        );
      }
    }

    // Identify advantages and disadvantages
    const advantages = comparison.comparisons
      .filter(c => c.rating === 'excellent')
      .map(c => `${c.metric}: ${c.differencePercent.toFixed(1)}% better than average`);

    const disadvantages = comparison.comparisons
      .filter(c => c.rating === 'poor')
      .map(c => `${c.metric}: ${Math.abs(c.differencePercent).toFixed(1)}% worse than average`);

    return {
      projectId,
      comparisonDate: new Date(),
      sector,
      projectSize,
      overallRanking,
      comparisons: [comparison],
      insights,
      recommendations,
      advantages,
      disadvantages,
    };
  }

  /**
   * Collect benchmarking data from a project
   */
  async collectBenchmarkingData(
    projectId: string,
    sector: IndustrySector,
    projectSize: ProjectSize,
    techStack: TechStack,
    metrics: QualityMetrics,
    linesOfCode: number,
    fileCount: number
  ): Promise<void> {
    const dataPoint: BenchmarkingDataPoint = {
      projectId,
      timestamp: new Date(),
      sector,
      projectSize,
      techStack,
      metrics,
      linesOfCode,
      fileCount,
    };

    this.collectedData.push(dataPoint);

    // Update benchmarks if we have enough data
    if (this.collectedData.length >= 10) {
      await this.updateBenchmarks();
    }
  }

  /**
   * Get available benchmarks
   */
  getAvailableBenchmarks(): IndustryBenchmark[] {
    return Array.from(this.benchmarkData.values());
  }

  /**
   * Get benchmark for specific criteria
   */
  getBenchmark(
    sector: IndustrySector,
    projectSize: ProjectSize,
    techStack: TechStack
  ): IndustryBenchmark | undefined {
    const key = this.getBenchmarkKey(sector, projectSize, techStack);
    return this.benchmarkData.get(key);
  }

  /**
   * Private helper methods
   */

  private initializeDefaultBenchmarks(): void {
    // Initialize with industry standard benchmarks
    const sectors: IndustrySector[] = ['fintech', 'healthcare', 'ecommerce', 'saas', 'general'];
    const sizes: ProjectSize[] = ['small', 'medium', 'large', 'enterprise'];
    const stacks: TechStack[] = ['typescript', 'javascript', 'react', 'nodejs'];

    for (const sector of sectors) {
      for (const size of sizes) {
        for (const stack of stacks) {
          const benchmark = this.createDefaultBenchmark(sector, size, stack);
          const key = this.getBenchmarkKey(sector, size, stack);
          this.benchmarkData.set(key, benchmark);
        }
      }
    }
  }

  private createDefaultBenchmark(
    sector: IndustrySector,
    projectSize: ProjectSize,
    techStack: TechStack
  ): IndustryBenchmark {
    // Base metrics
    let avgComplexity = 8;
    let avgMaintainability = 65;
    let avgTestCoverage = 70;
    let avgDuplication = 5;
    let avgSecurityRisk = 15;
    let avgTechnicalDebtRatio = 0.05;
    let avgLinesPerFile = 150;
    let avgFunctionsPerFile = 8;

    // Adjust based on sector
    if (sector === 'fintech' || sector === 'healthcare') {
      avgTestCoverage = 80;
      avgSecurityRisk = 10;
      avgMaintainability = 70;
    } else if (sector === 'startup') {
      avgTestCoverage = 60;
      avgTechnicalDebtRatio = 0.08;
    }

    // Adjust based on project size
    if (projectSize === 'enterprise') {
      avgComplexity = 10;
      avgDuplication = 8;
      avgLinesPerFile = 200;
    } else if (projectSize === 'small') {
      avgComplexity = 6;
      avgTestCoverage = 75;
      avgLinesPerFile = 100;
    }

    // Adjust based on tech stack
    if (techStack === 'typescript') {
      avgMaintainability = avgMaintainability + 5;
      avgSecurityRisk = avgSecurityRisk - 2;
    }

    return {
      sector,
      projectSize,
      techStack,
      metrics: {
        avgComplexity,
        avgMaintainability,
        avgTestCoverage,
        avgDuplication,
        avgSecurityRisk,
        avgTechnicalDebtRatio,
        avgLinesPerFile,
        avgFunctionsPerFile,
      },
      sampleSize: 100,
      lastUpdated: new Date(),
    };
  }

  private compareMetric(
    name: string,
    projectValue: number,
    industryAverage: number,
    higherIsBetter: boolean
  ): MetricComparison {
    const difference = projectValue - industryAverage;
    const differencePercent = industryAverage !== 0 
      ? (difference / industryAverage) * 100 
      : 0;

    let rating: PerformanceRating;

    if (higherIsBetter) {
      if (differencePercent >= 20) rating = 'excellent';
      else if (differencePercent >= 10) rating = 'good';
      else if (differencePercent >= -10) rating = 'average';
      else if (differencePercent >= -20) rating = 'below_average';
      else rating = 'poor';
    } else {
      if (differencePercent <= -20) rating = 'excellent';
      else if (differencePercent <= -10) rating = 'good';
      else if (differencePercent <= 10) rating = 'average';
      else if (differencePercent <= 20) rating = 'below_average';
      else rating = 'poor';
    }

    let description = '';
    if (rating === 'excellent') {
      description = `Significantly ${higherIsBetter ? 'above' : 'below'} industry average`;
    } else if (rating === 'good') {
      description = `${higherIsBetter ? 'Above' : 'Below'} industry average`;
    } else if (rating === 'average') {
      description = 'Close to industry average';
    } else if (rating === 'below_average') {
      description = `${higherIsBetter ? 'Below' : 'Above'} industry average`;
    } else {
      description = `Significantly ${higherIsBetter ? 'below' : 'above'} industry average`;
    }

    return {
      metric: name,
      projectValue,
      industryAverage,
      differencePercent,
      rating,
      description,
    };
  }

  private calculateOverallScore(comparisons: MetricComparison[]): number {
    const ratingScores: Record<PerformanceRating, number> = {
      excellent: 100,
      good: 80,
      average: 60,
      below_average: 40,
      poor: 20,
    };

    const totalScore = comparisons.reduce(
      (sum, comp) => sum + ratingScores[comp.rating],
      0
    );

    return totalScore / comparisons.length;
  }

  private calculatePercentile(score: number): number {
    // Convert score (0-100) to percentile
    return score;
  }

  private getRatingFromScore(score: number): PerformanceRating {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'average';
    if (score >= 30) return 'below_average';
    return 'poor';
  }

  private getBenchmarkKey(
    sector: IndustrySector,
    projectSize: ProjectSize,
    techStack: TechStack
  ): string {
    return `${sector}:${projectSize}:${techStack}`;
  }

  private async updateBenchmarks(): Promise<void> {
    // Group data by sector, size, and stack
    const groups = new Map<string, BenchmarkingDataPoint[]>();

    for (const dataPoint of this.collectedData) {
      const key = this.getBenchmarkKey(
        dataPoint.sector,
        dataPoint.projectSize,
        dataPoint.techStack
      );
      
      const group = groups.get(key) || [];
      group.push(dataPoint);
      groups.set(key, group);
    }

    // Update benchmarks with collected data
    for (const [key, dataPoints] of groups.entries()) {
      if (dataPoints.length >= 5) {
        const updatedBenchmark = this.calculateBenchmarkFromData(dataPoints);
        this.benchmarkData.set(key, updatedBenchmark);
      }
    }
  }

  private calculateBenchmarkFromData(dataPoints: BenchmarkingDataPoint[]): IndustryBenchmark {
    const first = dataPoints[0];
    if (!first) {
      throw new Error('No data points provided');
    }

    const avgComplexity = this.average(
      dataPoints.map(d => d.metrics.complexity.cyclomaticComplexity)
    );
    const avgMaintainability = this.average(
      dataPoints.map(d => d.metrics.maintainability.maintainabilityIndex)
    );
    const avgTestCoverage = this.average(
      dataPoints.map(d => d.metrics.testability.coverage)
    );
    const avgDuplication = this.average(
      dataPoints.map(d => d.metrics.maintainability.duplications)
    );
    const avgSecurityRisk = this.average(
      dataPoints.map(d => d.metrics.security.riskScore)
    );
    const avgLinesPerFile = this.average(
      dataPoints.map(d => d.linesOfCode / d.fileCount)
    );

    return {
      sector: first.sector,
      projectSize: first.projectSize,
      techStack: first.techStack,
      metrics: {
        avgComplexity,
        avgMaintainability,
        avgTestCoverage,
        avgDuplication,
        avgSecurityRisk,
        avgTechnicalDebtRatio: 0.05,
        avgLinesPerFile,
        avgFunctionsPerFile: 8,
      },
      sampleSize: dataPoints.length,
      lastUpdated: new Date(),
    };
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}
