/**
 * Unit tests for BaselineManager Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BaselineManager,
} from '../BaselineManager';
import {
  BaselineMetrics,
  QualityThresholds,
} from '../../models/enterprise';
import { WorkspaceAnalysisResult, QualityMetrics } from '../../models/types';

describe('BaselineManager', () => {
  let baselineManager: BaselineManager;

  beforeEach(() => {
    baselineManager = new BaselineManager();
  });

  const createSampleMetrics = (): BaselineMetrics => ({
    codeQuality: 85,
    technicalDebt: {
      totalMinutes: 120,
      breakdown: {
        security: 30,
        performance: 20,
        maintainability: 40,
        reliability: 20,
        duplications: 10,
      },
      trend: 'stable',
      priority: [],
    },
    testCoverage: 75,
    complexity: {
      cyclomaticComplexity: 10,
      cognitiveComplexity: 15,
      maxNestingDepth: 3,
      maxParameters: 4,
      linesOfCode: 1000,
    },
    security: {
      vulnerabilities: 2,
      secrets: 0,
      riskScore: 20,
    },
    maintainability: 80,
  });

  const createSampleThresholds = (): QualityThresholds => ({
    minCodeQuality: 80,
    maxTechnicalDebt: 200,
    minTestCoverage: 70,
    maxComplexity: 15,
    maxSecurityIssues: 5,
  });

  describe('establishBaseline', () => {
    it('should establish a new baseline for a project', () => {
      const metrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      const baseline = baselineManager.establishBaseline(
        'project-1',
        metrics,
        thresholds,
        'Initial baseline'
      );

      expect(baseline).toBeDefined();
      expect(baseline.projectId).toBe('project-1');
      expect(baseline.version).toBe('v1.0.0');
      expect(baseline.metrics).toEqual(metrics);
      expect(baseline.thresholds).toEqual(thresholds);
      expect(baseline.notes).toBe('Initial baseline');
    });

    it('should increment version for subsequent baselines', () => {
      const metrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      const baseline1 = baselineManager.establishBaseline('project-1', metrics, thresholds);
      const baseline2 = baselineManager.establishBaseline('project-1', metrics, thresholds);

      expect(baseline1.version).toBe('v1.0.0');
      expect(baseline2.version).toBe('v2.0.0');
    });
  });

  describe('getCurrentBaseline', () => {
    it('should return the current baseline for a project', () => {
      const metrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', metrics, thresholds);
      const current = baselineManager.getCurrentBaseline('project-1');

      expect(current).toBeDefined();
      expect(current?.projectId).toBe('project-1');
      expect(current?.version).toBe('v1.0.0');
    });

    it('should return undefined for non-existent project', () => {
      const current = baselineManager.getCurrentBaseline('non-existent');
      expect(current).toBeUndefined();
    });

    it('should return the latest baseline when multiple exist', () => {
      const metrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', metrics, thresholds);
      baselineManager.establishBaseline('project-1', metrics, thresholds);
      const current = baselineManager.getCurrentBaseline('project-1');

      expect(current?.version).toBe('v2.0.0');
    });
  });

  describe('getProjectBaselines', () => {
    it('should return all baselines for a project', () => {
      const metrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', metrics, thresholds);
      baselineManager.establishBaseline('project-1', metrics, thresholds);
      baselineManager.establishBaseline('project-1', metrics, thresholds);

      const baselines = baselineManager.getProjectBaselines('project-1');

      expect(baselines).toHaveLength(3);
      expect(baselines[0]?.version).toBe('v1.0.0');
      expect(baselines[1]?.version).toBe('v2.0.0');
      expect(baselines[2]?.version).toBe('v3.0.0');
    });

    it('should return empty array for non-existent project', () => {
      const baselines = baselineManager.getProjectBaselines('non-existent');
      expect(baselines).toEqual([]);
    });
  });

  describe('compareAgainstBaseline', () => {
    it('should detect regressions in code quality', () => {
      const baselineMetrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', baselineMetrics, thresholds);

      const currentMetrics: BaselineMetrics = {
        ...baselineMetrics,
        codeQuality: 70, // Regression
      };

      const comparison = baselineManager.compareAgainstBaseline('project-1', currentMetrics);

      expect(comparison.regressions.length).toBeGreaterThan(0);
      const qualityRegression = comparison.regressions.find(r => r.metric === 'codeQuality');
      expect(qualityRegression).toBeDefined();
      expect(qualityRegression?.currentValue).toBe(70);
      expect(qualityRegression?.previousValue).toBe(85);
    });

    it('should detect improvements in code quality', () => {
      const baselineMetrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', baselineMetrics, thresholds);

      const currentMetrics: BaselineMetrics = {
        ...baselineMetrics,
        codeQuality: 90, // Improvement
      };

      const comparison = baselineManager.compareAgainstBaseline('project-1', currentMetrics);

      expect(comparison.improvements.length).toBeGreaterThan(0);
      const qualityImprovement = comparison.improvements.find(i => i.metric === 'codeQuality');
      expect(qualityImprovement).toBeDefined();
      expect(qualityImprovement?.currentValue).toBe(90);
      expect(qualityImprovement?.previousValue).toBe(85);
    });

    it('should detect technical debt regression', () => {
      const baselineMetrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', baselineMetrics, thresholds);

      const currentMetrics: BaselineMetrics = {
        ...baselineMetrics,
        technicalDebt: {
          ...baselineMetrics.technicalDebt,
          totalMinutes: 250, // Increased debt
        },
      };

      const comparison = baselineManager.compareAgainstBaseline('project-1', currentMetrics);

      const debtRegression = comparison.regressions.find(r => r.metric === 'technicalDebt');
      expect(debtRegression).toBeDefined();
      expect(debtRegression?.currentValue).toBe(250);
    });

    it('should detect security vulnerability regression', () => {
      const baselineMetrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', baselineMetrics, thresholds);

      const currentMetrics: BaselineMetrics = {
        ...baselineMetrics,
        security: {
          ...baselineMetrics.security,
          vulnerabilities: 5, // Increased vulnerabilities
        },
      };

      const comparison = baselineManager.compareAgainstBaseline('project-1', currentMetrics);

      const securityRegression = comparison.regressions.find(r => r.metric === 'securityVulnerabilities');
      expect(securityRegression).toBeDefined();
      expect(securityRegression?.severity).toBe('critical');
    });

    it('should generate correct comparison summary', () => {
      const baselineMetrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', baselineMetrics, thresholds);

      const currentMetrics: BaselineMetrics = {
        ...baselineMetrics,
        codeQuality: 70, // Regression
        testCoverage: 80, // Improvement
      };

      const comparison = baselineManager.compareAgainstBaseline('project-1', currentMetrics);

      expect(comparison.summary).toBeDefined();
      expect(comparison.summary.totalRegressions).toBeGreaterThan(0);
      expect(comparison.summary.totalImprovements).toBeGreaterThan(0);
    });

    it('should identify failed thresholds', () => {
      const baselineMetrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', baselineMetrics, thresholds);

      const currentMetrics: BaselineMetrics = {
        ...baselineMetrics,
        codeQuality: 70, // Below threshold of 80
        testCoverage: 60, // Below threshold of 70
      };

      const comparison = baselineManager.compareAgainstBaseline('project-1', currentMetrics);

      expect(comparison.summary.thresholdsMet).toBe(false);
      expect(comparison.summary.failedThresholds.length).toBeGreaterThan(0);
    });

    it('should throw error when no baseline exists', () => {
      const currentMetrics = createSampleMetrics();

      expect(() => {
        baselineManager.compareAgainstBaseline('non-existent', currentMetrics);
      }).toThrow('No baseline found');
    });
  });

  describe('updateBaseline', () => {
    it('should update baseline with new metrics', () => {
      const initialMetrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', initialMetrics, thresholds);

      const updatedMetrics: BaselineMetrics = {
        ...initialMetrics,
        codeQuality: 90,
      };

      const updated = baselineManager.updateBaseline('project-1', updatedMetrics);

      expect(updated.version).toBe('v2.0.0');
      expect(updated.metrics.codeQuality).toBe(90);
    });

    it('should throw error when updating non-existent baseline', () => {
      const metrics = createSampleMetrics();

      expect(() => {
        baselineManager.updateBaseline('non-existent', metrics);
      }).toThrow('No baseline found');
    });
  });

  describe('calculateMetricsFromAnalysis', () => {
    it('should calculate metrics from analysis results', () => {
      const results: WorkspaceAnalysisResult = {
        fileResults: [],
        totalFiles: 10,
        totalIssues: 5,
        issuesByType: {
          'unused-import': 2,
          'security-vulnerability': 1,
          'high-complexity': 2,
        } as any,
        issuesByCertainty: {} as any,
        totalTimeMs: 1000,
      };

      const qualityMetrics: QualityMetrics[] = [
        {
          complexity: {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            maxNestingDepth: 3,
            maxParameters: 4,
            linesOfCode: 500,
          },
          maintainability: {
            maintainabilityIndex: 80,
            duplications: 2,
            commentDensity: 0.2,
            avgFunctionLength: 20,
          },
          security: {
            vulnerabilities: 1,
            secrets: 0,
            riskScore: 20,
          },
          performance: {
            antiPatterns: 1,
            impactScore: 30,
          },
          testability: {
            coverage: 75,
            untestedFunctions: 5,
            testabilityScore: 70,
          },
        },
      ];

      const metrics = baselineManager.calculateMetricsFromAnalysis(results, qualityMetrics);

      expect(metrics).toBeDefined();
      expect(metrics.codeQuality).toBeGreaterThan(0);
      expect(metrics.codeQuality).toBeLessThanOrEqual(100);
      expect(metrics.technicalDebt.totalMinutes).toBeGreaterThan(0);
      expect(metrics.complexity).toBeDefined();
      expect(metrics.security).toBeDefined();
    });

    it('should handle empty metrics array', () => {
      const results: WorkspaceAnalysisResult = {
        fileResults: [],
        totalFiles: 0,
        totalIssues: 0,
        issuesByType: {} as any,
        issuesByCertainty: {} as any,
        totalTimeMs: 0,
      };

      const metrics = baselineManager.calculateMetricsFromAnalysis(results, []);

      expect(metrics).toBeDefined();
      expect(metrics.complexity.cyclomaticComplexity).toBe(0);
      expect(metrics.security.vulnerabilities).toBe(0);
    });
  });

  describe('getBaseline', () => {
    it('should retrieve specific baseline by version', () => {
      const metrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', metrics, thresholds);
      baselineManager.establishBaseline('project-1', metrics, thresholds);

      const baseline = baselineManager.getBaseline('project-1', 'v1.0.0');

      expect(baseline).toBeDefined();
      expect(baseline?.version).toBe('v1.0.0');
    });

    it('should return undefined for non-existent version', () => {
      const baseline = baselineManager.getBaseline('project-1', 'v99.0.0');
      expect(baseline).toBeUndefined();
    });
  });

  describe('regression severity', () => {
    it('should classify large changes as critical', () => {
      const baselineMetrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', baselineMetrics, thresholds);

      const currentMetrics: BaselineMetrics = {
        ...baselineMetrics,
        codeQuality: 40, // 50%+ decrease
      };

      const comparison = baselineManager.compareAgainstBaseline('project-1', currentMetrics);
      const regression = comparison.regressions.find(r => r.metric === 'codeQuality');

      expect(regression?.severity).toBe('critical');
    });

    it('should classify medium changes appropriately', () => {
      const baselineMetrics = createSampleMetrics();
      const thresholds = createSampleThresholds();

      baselineManager.establishBaseline('project-1', baselineMetrics, thresholds);

      const currentMetrics: BaselineMetrics = {
        ...baselineMetrics,
        codeQuality: 75, // ~12% decrease
      };

      const comparison = baselineManager.compareAgainstBaseline('project-1', currentMetrics);
      const regression = comparison.regressions.find(r => r.metric === 'codeQuality');

      expect(regression?.severity).toBe('medium');
    });
  });
});
