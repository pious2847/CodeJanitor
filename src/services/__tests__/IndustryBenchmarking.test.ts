/**
 * Tests for Industry Benchmarking Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IndustryBenchmarking } from '../IndustryBenchmarking';
import { QualityMetrics } from '../../models/types';

describe('IndustryBenchmarking', () => {
  let service: IndustryBenchmarking;

  beforeEach(() => {
    service = new IndustryBenchmarking();
  });

  describe('Benchmark Comparison', () => {
    it('should compare project metrics to industry benchmarks', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 10,
          cognitiveComplexity: 15,
          maxNestingDepth: 4,
          maxParameters: 4,
          linesOfCode: 200,
        },
        maintainability: {
          maintainabilityIndex: 70,
          duplications: 3,
          commentDensity: 0.2,
          avgFunctionLength: 25,
        },
        security: {
          vulnerabilities: 1,
          secrets: 0,
          riskScore: 12,
        },
        performance: {
          antiPatterns: 2,
          impactScore: 15,
        },
        testability: {
          coverage: 75,
          untestedFunctions: 5,
          testabilityScore: 80,
        },
      };

      const comparison = await service.compareToIndustry(
        metrics,
        'saas',
        'medium',
        'typescript'
      );

      expect(comparison).toBeDefined();
      expect(comparison.projectMetrics).toBe(metrics);
      expect(comparison.industryBenchmark).toBeDefined();
      expect(comparison.comparisons.length).toBeGreaterThan(0);
      expect(comparison.overallScore).toBeGreaterThanOrEqual(0);
      expect(comparison.overallScore).toBeLessThanOrEqual(100);
      expect(comparison.percentile).toBeGreaterThanOrEqual(0);
      expect(comparison.percentile).toBeLessThanOrEqual(100);
    });

    it('should identify strengths and improvements', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 5, // Excellent
          cognitiveComplexity: 8,
          maxNestingDepth: 2,
          maxParameters: 3,
          linesOfCode: 150,
        },
        maintainability: {
          maintainabilityIndex: 85, // Excellent
          duplications: 1,
          commentDensity: 0.3,
          avgFunctionLength: 20,
        },
        security: {
          vulnerabilities: 0,
          secrets: 0,
          riskScore: 5, // Excellent
        },
        performance: {
          antiPatterns: 0,
          impactScore: 5,
        },
        testability: {
          coverage: 90, // Excellent
          untestedFunctions: 1,
          testabilityScore: 95,
        },
      };

      const comparison = await service.compareToIndustry(
        metrics,
        'saas',
        'medium',
        'typescript'
      );

      expect(comparison.strengths.length).toBeGreaterThan(0);
      expect(Array.isArray(comparison.strengths)).toBe(true);
      expect(Array.isArray(comparison.improvements)).toBe(true);
    });

    it('should rate metrics correctly', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 8,
          cognitiveComplexity: 12,
          maxNestingDepth: 3,
          maxParameters: 4,
          linesOfCode: 180,
        },
        maintainability: {
          maintainabilityIndex: 65,
          duplications: 5,
          commentDensity: 0.2,
          avgFunctionLength: 25,
        },
        security: {
          vulnerabilities: 1,
          secrets: 0,
          riskScore: 15,
        },
        performance: {
          antiPatterns: 1,
          impactScore: 10,
        },
        testability: {
          coverage: 70,
          untestedFunctions: 3,
          testabilityScore: 75,
        },
      };

      const comparison = await service.compareToIndustry(
        metrics,
        'general',
        'medium',
        'typescript'
      );

      for (const comp of comparison.comparisons) {
        expect(['excellent', 'good', 'average', 'below_average', 'poor']).toContain(comp.rating);
        expect(comp.description).toBeDefined();
        expect(typeof comp.differencePercent).toBe('number');
      }
    });
  });

  describe('Competitive Analysis', () => {
    it('should generate competitive analysis report', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 12,
          cognitiveComplexity: 18,
          maxNestingDepth: 5,
          maxParameters: 5,
          linesOfCode: 250,
        },
        maintainability: {
          maintainabilityIndex: 55,
          duplications: 8,
          commentDensity: 0.15,
          avgFunctionLength: 35,
        },
        security: {
          vulnerabilities: 3,
          secrets: 1,
          riskScore: 25,
        },
        performance: {
          antiPatterns: 4,
          impactScore: 30,
        },
        testability: {
          coverage: 50,
          untestedFunctions: 10,
          testabilityScore: 55,
        },
      };

      const report = await service.generateCompetitiveAnalysis(
        'project-1',
        metrics,
        'ecommerce',
        'large',
        'react'
      );

      expect(report).toBeDefined();
      expect(report.projectId).toBe('project-1');
      expect(report.sector).toBe('ecommerce');
      expect(report.projectSize).toBe('large');
      expect(['excellent', 'good', 'average', 'below_average', 'poor']).toContain(report.overallRanking);
      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.advantages)).toBe(true);
      expect(Array.isArray(report.disadvantages)).toBe(true);
    });

    it('should provide actionable recommendations', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 20,
          cognitiveComplexity: 25,
          maxNestingDepth: 6,
          maxParameters: 6,
          linesOfCode: 300,
        },
        maintainability: {
          maintainabilityIndex: 40,
          duplications: 12,
          commentDensity: 0.1,
          avgFunctionLength: 50,
        },
        security: {
          vulnerabilities: 5,
          secrets: 2,
          riskScore: 40,
        },
        performance: {
          antiPatterns: 6,
          impactScore: 45,
        },
        testability: {
          coverage: 30,
          untestedFunctions: 20,
          testabilityScore: 35,
        },
      };

      const report = await service.generateCompetitiveAnalysis(
        'project-2',
        metrics,
        'fintech',
        'enterprise',
        'typescript'
      );

      expect(report.recommendations.length).toBeGreaterThan(0);
      for (const recommendation of report.recommendations) {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Benchmarking Data Collection', () => {
    it('should collect benchmarking data', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 8,
          cognitiveComplexity: 12,
          maxNestingDepth: 3,
          maxParameters: 4,
          linesOfCode: 180,
        },
        maintainability: {
          maintainabilityIndex: 65,
          duplications: 4,
          commentDensity: 0.2,
          avgFunctionLength: 25,
        },
        security: {
          vulnerabilities: 1,
          secrets: 0,
          riskScore: 12,
        },
        performance: {
          antiPatterns: 2,
          impactScore: 15,
        },
        testability: {
          coverage: 70,
          untestedFunctions: 4,
          testabilityScore: 75,
        },
      };

      await service.collectBenchmarkingData(
        'project-1',
        'saas',
        'medium',
        'typescript',
        metrics,
        50000,
        250
      );

      // Should not throw
      expect(true).toBe(true);
    });

    it('should update benchmarks after collecting enough data', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 8,
          cognitiveComplexity: 12,
          maxNestingDepth: 3,
          maxParameters: 4,
          linesOfCode: 180,
        },
        maintainability: {
          maintainabilityIndex: 65,
          duplications: 4,
          commentDensity: 0.2,
          avgFunctionLength: 25,
        },
        security: {
          vulnerabilities: 1,
          secrets: 0,
          riskScore: 12,
        },
        performance: {
          antiPatterns: 2,
          impactScore: 15,
        },
        testability: {
          coverage: 70,
          untestedFunctions: 4,
          testabilityScore: 75,
        },
      };

      // Collect 10 data points
      for (let i = 0; i < 10; i++) {
        await service.collectBenchmarkingData(
          `project-${i}`,
          'startup',
          'small',
          'javascript',
          metrics,
          10000,
          100
        );
      }

      const benchmark = service.getBenchmark('startup', 'small', 'javascript');
      expect(benchmark).toBeDefined();
    });
  });

  describe('Benchmark Management', () => {
    it('should provide available benchmarks', () => {
      const benchmarks = service.getAvailableBenchmarks();

      expect(benchmarks).toBeDefined();
      expect(Array.isArray(benchmarks)).toBe(true);
      expect(benchmarks.length).toBeGreaterThan(0);
    });

    it('should retrieve specific benchmark', () => {
      const benchmark = service.getBenchmark('fintech', 'large', 'typescript');

      expect(benchmark).toBeDefined();
      expect(benchmark?.sector).toBe('fintech');
      expect(benchmark?.projectSize).toBe('large');
      expect(benchmark?.techStack).toBe('typescript');
      expect(benchmark?.metrics).toBeDefined();
    });

    it('should have realistic benchmark values', () => {
      const benchmark = service.getBenchmark('healthcare', 'medium', 'typescript');

      expect(benchmark).toBeDefined();
      if (benchmark) {
        expect(benchmark.metrics.avgComplexity).toBeGreaterThan(0);
        expect(benchmark.metrics.avgMaintainability).toBeGreaterThan(0);
        expect(benchmark.metrics.avgMaintainability).toBeLessThanOrEqual(100);
        expect(benchmark.metrics.avgTestCoverage).toBeGreaterThan(0);
        expect(benchmark.metrics.avgTestCoverage).toBeLessThanOrEqual(100);
        expect(benchmark.metrics.avgDuplication).toBeGreaterThanOrEqual(0);
        expect(benchmark.metrics.avgSecurityRisk).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Industry-Specific Benchmarks', () => {
    it('should have higher quality standards for fintech', () => {
      const fintechBenchmark = service.getBenchmark('fintech', 'medium', 'typescript');
      const generalBenchmark = service.getBenchmark('general', 'medium', 'typescript');

      expect(fintechBenchmark).toBeDefined();
      expect(generalBenchmark).toBeDefined();

      if (fintechBenchmark && generalBenchmark) {
        // Fintech should have higher test coverage
        expect(fintechBenchmark.metrics.avgTestCoverage).toBeGreaterThan(
          generalBenchmark.metrics.avgTestCoverage
        );
        // Fintech should have lower security risk
        expect(fintechBenchmark.metrics.avgSecurityRisk).toBeLessThan(
          generalBenchmark.metrics.avgSecurityRisk
        );
      }
    });

    it('should have higher quality standards for healthcare', () => {
      const healthcareBenchmark = service.getBenchmark('healthcare', 'medium', 'typescript');
      const generalBenchmark = service.getBenchmark('general', 'medium', 'typescript');

      expect(healthcareBenchmark).toBeDefined();
      expect(generalBenchmark).toBeDefined();

      if (healthcareBenchmark && generalBenchmark) {
        // Healthcare should have higher test coverage
        expect(healthcareBenchmark.metrics.avgTestCoverage).toBeGreaterThan(
          generalBenchmark.metrics.avgTestCoverage
        );
      }
    });
  });
});
