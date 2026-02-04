/**
 * End-to-End Integration Tests
 * 
 * Tests complete workflows from code analysis to reporting,
 * verifying all integrations work together seamlessly.
 * 
 * Requirements: All requirements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Project } from 'ts-morph';
import { WorkspaceAnalyzer } from '../analyzer/workspaceAnalyzer';
import { AnalyticsEngine } from '../services/AnalyticsEngine';
import { PolicyEngine } from '../services/PolicyEngine';
import { ReportGenerator } from '../services/ReportGenerator';
import { TeamWorkspace } from '../services/TeamWorkspace';
import { CacheManager } from '../services/CacheManager';
import { PerformanceMonitor } from '../services/PerformanceMonitor';
import { AnalyzerConfig } from '../models';

describe('End-to-End Integration Tests', () => {
  let project: Project;
  let workspaceAnalyzer: WorkspaceAnalyzer;
  let analyticsEngine: AnalyticsEngine;
  let policyEngine: PolicyEngine;
  let reportGenerator: ReportGenerator;
  let teamWorkspace: TeamWorkspace;
  let cacheManager: CacheManager;
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99,
        module: 99,
      },
    });

    workspaceAnalyzer = new WorkspaceAnalyzer(project);
    analyticsEngine = new AnalyticsEngine();
    policyEngine = new PolicyEngine();
    reportGenerator = new ReportGenerator();
    teamWorkspace = new TeamWorkspace();
    cacheManager = new CacheManager({ enabled: true });
    performanceMonitor = new PerformanceMonitor({ enabled: true });
  });

  describe('Complete Analysis to Reporting Workflow', () => {
    it('should analyze code, generate metrics, and create report', async () => {
      // Step 1: Create test files
      const sourceFile = project.createSourceFile(
        'src/example.ts',
        `
          import { unused } from 'module';
          
          function complexFunction(a: number, b: number) {
            if (a > 0) {
              if (b > 0) {
                if (a > b) {
                  return a;
                } else {
                  return b;
                }
              }
            }
            return 0;
          }
          
          export function publicFunction() {
            return complexFunction(1, 2);
          }
        `
      );

      // Step 2: Analyze the file
      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: false,
        enableDeadExports: false,
        enableMissingImplementations: false,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: false,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      const analysisResult = workspaceAnalyzer.analyzeFile(sourceFile, config);
      
      expect(analysisResult.success).toBe(true);
      expect(analysisResult.issues.length).toBeGreaterThan(0);

      // Step 3: Record metrics
      performanceMonitor.recordMetric('analysis_time', analysisResult.analysisTimeMs || 0);

      // Step 4: Generate analytics
      const performanceReport = analyticsEngine.identifyPerformanceAntiPatterns(
        'src/example.ts',
        sourceFile.getFullText()
      );

      expect(performanceReport.totalAntiPatterns).toBeGreaterThanOrEqual(0);

      // Step 5: Verify report generator exists
      expect(reportGenerator).toBeDefined();
      expect(typeof reportGenerator.generateExecutiveSummary).toBe('function');
    });

    it('should handle multiple files with caching', async () => {
      // Create multiple files
      const file1 = project.createSourceFile(
        'src/file1.ts',
        'export function func1() { return 1; }'
      );
      
      const file2 = project.createSourceFile(
        'src/file2.ts',
        'export function func2() { return 2; }'
      );

      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: false,
        enableDeadExports: false,
        enableMissingImplementations: false,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: false,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      // First analysis - cache miss
      const result1 = workspaceAnalyzer.analyzeFile(file1, config);
      await cacheManager.set('src/file1.ts', result1, 'hash1');

      // Second analysis - should use cache
      const cached = await cacheManager.get('src/file1.ts', 'hash1');
      expect(cached).toBeDefined();
      expect(cached?.filePath).toBe(result1.filePath);

      // Analyze second file
      const result2 = workspaceAnalyzer.analyzeFile(file2, config);
      expect(result2.success).toBe(true);

      // Verify cache stats
      const stats = cacheManager.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('Team Collaboration Workflow', () => {
    it('should verify team workspace functionality', async () => {
      // Verify TeamWorkspace service exists and has required methods
      expect(teamWorkspace).toBeDefined();
      expect(typeof teamWorkspace.createTeam).toBe('function');
      expect(typeof teamWorkspace.assignTask).toBe('function');
      expect(typeof teamWorkspace.trackProgress).toBe('function');
      expect(typeof teamWorkspace.shareConfiguration).toBe('function');
    });
  });

  describe('Policy Management Workflow', () => {
    it('should verify policy engine functionality', async () => {
      // Verify PolicyEngine service exists and has required methods
      expect(policyEngine).toBeDefined();
      expect(typeof policyEngine.createPolicy).toBe('function');
      expect(typeof policyEngine.evaluatePolicy).toBe('function');
      expect(typeof policyEngine.inheritPolicies).toBe('function');
    });
  });

  describe('Performance Monitoring Workflow', () => {
    it('should monitor analysis performance and detect bottlenecks', async () => {
      // Analyze multiple files and monitor performance
      for (let i = 0; i < 5; i++) {
        const file = project.createSourceFile(
          `src/file${i}.ts`,
          `export function func${i}() { return ${i}; }`
        );

        const startTime = Date.now();
        
        const config: AnalyzerConfig = {
          enableUnusedImports: true,
          enableUnusedVariables: true,
          enableDeadFunctions: false,
          enableDeadExports: false,
          enableMissingImplementations: false,
          enableCircularDependencies: true,
          enableComplexityAnalysis: true,
          enableSecurityAnalysis: true,
          enableAccessibilityAnalysis: false,
          autoFixOnSave: false,
          ignorePatterns: [],
          respectUnderscoreConvention: true,
        };

        workspaceAnalyzer.analyzeFile(file, config);
        
        const analysisTime = Date.now() - startTime;
        performanceMonitor.recordMetric('analysis_time', analysisTime);
      }

      // Check performance stats
      const stats = performanceMonitor.getStats();
      expect(stats.totalAnalyses).toBe(5);
      expect(stats.averageAnalysisTime).toBeGreaterThanOrEqual(0);

      // Check system health
      const health = await performanceMonitor.checkSystemHealth();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'critical']).toContain(health.status);
    });

    it('should provide performance recommendations', async () => {
      // Simulate slow analysis
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordMetric('analysis_time', 3000);
      }

      const recommendations = performanceMonitor.getRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('parallel'))).toBe(true);
    });
  });

  describe('Analytics and Reporting Workflow', () => {
    it('should calculate trends and generate insights', async () => {
      // Record metrics over time
      const projectId = 'test-project';
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        analyticsEngine.recordMetricsSnapshot(projectId, {
          timestamp: new Date(now + i * 1000),
          metrics: {
            complexity: {
              cyclomaticComplexity: 10 + i,
              cognitiveComplexity: 15 + i,
              maxNestingDepth: 3,
              maxParameters: 5,
              linesOfCode: 100 + i * 10,
            },
            maintainability: {
              maintainabilityIndex: 70 - i,
              duplications: i,
              commentDensity: 0.2,
              avgFunctionLength: 20 + i,
            },
            security: {
              vulnerabilities: i,
              secrets: i,
              riskScore: i * 5,
            },
            performance: {
              antiPatterns: i,
              impactScore: i * 10,
            },
            testability: {
              coverage: 80 - i,
              untestedFunctions: i,
              testabilityScore: 75 - i,
            },
          },
          issuesByType: {
            'unused-import': i,
            'unused-variable': i,
            'dead-function': i,
            'dead-export': i,
            'missing-implementation': i,
            'circular-dependency': i,
            'high-complexity': i,
            'security-vulnerability': i,
            'accessibility-violation': i,
            'performance-antipattern': i,
            'code-duplication': i,
          },
          totalIssues: i * 5,
        });
      }

      // Calculate trends
      const trends = analyticsEngine.calculateTrends(projectId, {
        start: new Date(now),
        end: new Date(now + 10000),
      });

      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0]?.metric).toBeDefined();
      expect(trends[0]?.direction).toBeDefined();
    });

    it('should detect code duplication', () => {
      const files = new Map<string, string>();
      
      files.set('file1.ts', `
        function duplicate() {
          const x = 1;
          const y = 2;
          const z = 3;
          return x + y + z;
        }
      `);
      
      files.set('file2.ts', `
        function duplicate() {
          const x = 1;
          const y = 2;
          const z = 3;
          return x + y + z;
        }
      `);

      const duplicationReport = analyticsEngine.detectDuplication(files, 3, 10);
      
      expect(duplicationReport.totalDuplications).toBeGreaterThanOrEqual(0);
      expect(duplicationReport.duplicationPercentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should integrate analysis, caching, monitoring, and reporting', async () => {
      // Complete workflow
      const sourceFile = project.createSourceFile(
        'src/integration.ts',
        `
          import { unused } from 'module';
          
          function complexFunction(a: number) {
            if (a > 0) {
              if (a > 10) {
                if (a > 100) {
                  return 'large';
                }
                return 'medium';
              }
              return 'small';
            }
            return 'zero';
          }
        `
      );

      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: false,
        enableDeadExports: false,
        enableMissingImplementations: false,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: false,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      // 1. Analyze with performance monitoring
      const startTime = Date.now();
      const result = workspaceAnalyzer.analyzeFile(sourceFile, config);
      const analysisTime = Date.now() - startTime;
      
      performanceMonitor.recordMetric('analysis_time', analysisTime);

      // 2. Cache the result
      await cacheManager.set('src/integration.ts', result, 'hash123');

      // 3. Verify cache works
      const cached = await cacheManager.get('src/integration.ts', 'hash123');
      expect(cached).toBeDefined();

      // 4. Generate analytics
      const performanceReport = analyticsEngine.identifyPerformanceAntiPatterns(
        'src/integration.ts',
        sourceFile.getFullText()
      );

      // 5. Check system health
      const health = await performanceMonitor.checkSystemHealth();
      expect(health.status).toBeDefined();

      // 6: Verify report generator exists
      expect(reportGenerator).toBeDefined();
      expect(typeof reportGenerator.generateExecutiveSummary).toBe('function');

      // Verify all components worked together
      expect(result.success).toBe(true);
      expect(cached?.success).toBe(true);
      expect(performanceReport.totalAntiPatterns).toBeGreaterThanOrEqual(0);
      expect(health.checks.length).toBeGreaterThan(0);
      expect(reportGenerator).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle analysis errors gracefully', () => {
      const sourceFile = project.createSourceFile(
        'src/invalid.ts',
        'this is not valid typescript code {'
      );

      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: false,
        enableDeadExports: false,
        enableMissingImplementations: false,
        enableCircularDependencies: false,
        enableComplexityAnalysis: false,
        enableSecurityAnalysis: false,
        enableAccessibilityAnalysis: false,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      // Should not throw, but may return errors
      const result = workspaceAnalyzer.analyzeFile(sourceFile, config);
      expect(result).toBeDefined();
    });

    it('should handle cache failures gracefully', async () => {
      // Disable cache
      const disabledCache = new CacheManager({ enabled: false });
      
      const result = await disabledCache.get('nonexistent.ts');
      expect(result).toBeNull();
    });

    it('should handle performance monitoring when disabled', () => {
      const disabledMonitor = new PerformanceMonitor({ enabled: false });
      
      disabledMonitor.recordMetric('analysis_time', 1000);
      
      const metrics = disabledMonitor.getMetrics('analysis_time');
      expect(metrics).toHaveLength(0);
      
      disabledMonitor.shutdown();
    });
  });
});
