/**
 * Unit tests for CI Integration Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CIIntegration,
  Commit,
  QualityGate,
  GateCondition,
} from '../CIIntegration';
import { WorkspaceAnalysisResult, AnalyzerConfig } from '../../models/types';

describe('CIIntegration', () => {
  let ciIntegration: CIIntegration;

  beforeEach(() => {
    ciIntegration = new CIIntegration();
  });

  describe('registerWebhook', () => {
    it('should register a webhook for a repository', async () => {
      const webhook = await ciIntegration.registerWebhook(
        'repo-123',
        'github-actions',
        ['push', 'pull_request']
      );

      expect(webhook).toBeDefined();
      expect(webhook.repositoryId).toBe('repo-123');
      expect(webhook.platform).toBe('github-actions');
      expect(webhook.events).toEqual(['push', 'pull_request']);
      expect(webhook.enabled).toBe(true);
      expect(webhook.url).toContain('github-actions');
      expect(webhook.secret).toBeDefined();
    });

    it('should generate unique webhook IDs', async () => {
      const webhook1 = await ciIntegration.registerWebhook('repo-1', 'github-actions', ['push']);
      const webhook2 = await ciIntegration.registerWebhook('repo-1', 'github-actions', ['push']);

      expect(webhook1.id).not.toBe(webhook2.id);
    });
  });

  describe('analyzeCommit', () => {
    it('should analyze a commit and return results', async () => {
      const commit: Commit = {
        hash: 'abc123',
        author: 'John Doe',
        email: 'john@example.com',
        message: 'Fix bug',
        timestamp: new Date(),
        branch: 'main',
        changedFiles: ['src/file1.ts', 'src/file2.ts'],
        repositoryId: 'repo-123',
      };

      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: true,
        enableDeadExports: true,
        enableMissingImplementations: true,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: true,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      const result = await ciIntegration.analyzeCommit(commit, config);

      expect(result).toBeDefined();
      expect(result.totalFiles).toBe(2);
      expect(result.fileResults).toHaveLength(2);
    });

    it('should use cached results for identical commits', async () => {
      const commit: Commit = {
        hash: 'abc123',
        author: 'John Doe',
        email: 'john@example.com',
        message: 'Fix bug',
        timestamp: new Date(),
        branch: 'main',
        changedFiles: ['src/file1.ts'],
        repositoryId: 'repo-123',
      };

      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: true,
        enableDeadExports: true,
        enableMissingImplementations: true,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: true,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      // First analysis
      await ciIntegration.analyzeCommit(commit, config);
      const statsBefore = ciIntegration.getCacheStats();

      // Second analysis (should hit cache)
      await ciIntegration.analyzeCommit(commit, config);
      const statsAfter = ciIntegration.getCacheStats();

      expect(statsAfter.hits).toBe(statsBefore.hits + 1);
      expect(statsAfter.hitRate).toBeGreaterThan(0);
    });
  });

  describe('evaluateQualityGate', () => {
    it('should pass when all conditions are met', () => {
      const results: WorkspaceAnalysisResult = {
        fileResults: [],
        totalFiles: 10,
        totalIssues: 5,
        issuesByType: {
          'security-vulnerability': 0,
        } as any,
        issuesByCertainty: {} as any,
        totalTimeMs: 1000,
      };

      const gate: QualityGate = {
        id: 'gate-1',
        name: 'Basic Gate',
        conditions: [
          {
            id: 'cond-1',
            metric: 'new_issues',
            operator: 'lte',
            threshold: 10,
            scope: 'new_code',
          },
          {
            id: 'cond-2',
            metric: 'security_issues',
            operator: 'eq',
            threshold: 0,
            scope: 'overall',
          },
        ],
        blockOnFailure: true,
        notificationChannels: ['email'],
        enabled: true,
      };

      const gateResult = ciIntegration.evaluateQualityGate(results, gate);

      expect(gateResult.passed).toBe(true);
      expect(gateResult.evaluatedConditions).toHaveLength(2);
      expect(gateResult.evaluatedConditions.every(c => c.passed)).toBe(true);
      expect(gateResult.summary).toContain('PASSED');
    });

    it('should fail when any condition is not met', () => {
      const results: WorkspaceAnalysisResult = {
        fileResults: [],
        totalFiles: 10,
        totalIssues: 15,
        issuesByType: {
          'security-vulnerability': 3,
        } as any,
        issuesByCertainty: {} as any,
        totalTimeMs: 1000,
      };

      const gate: QualityGate = {
        id: 'gate-1',
        name: 'Strict Gate',
        conditions: [
          {
            id: 'cond-1',
            metric: 'new_issues',
            operator: 'lte',
            threshold: 10,
            scope: 'new_code',
          },
          {
            id: 'cond-2',
            metric: 'security_issues',
            operator: 'eq',
            threshold: 0,
            scope: 'overall',
          },
        ],
        blockOnFailure: true,
        notificationChannels: ['email'],
        enabled: true,
      };

      const gateResult = ciIntegration.evaluateQualityGate(results, gate);

      expect(gateResult.passed).toBe(false);
      expect(gateResult.summary).toContain('FAILED');
      expect(gateResult.evaluatedConditions.some(c => !c.passed)).toBe(true);
    });

    it('should evaluate different comparison operators correctly', () => {
      const results: WorkspaceAnalysisResult = {
        fileResults: [],
        totalFiles: 10,
        totalIssues: 5,
        issuesByType: {} as any,
        issuesByCertainty: {} as any,
        totalTimeMs: 1000,
      };

      const conditions: GateCondition[] = [
        { id: '1', metric: 'new_issues', operator: 'lt', threshold: 10, scope: 'new_code' },
        { id: '2', metric: 'new_issues', operator: 'lte', threshold: 5, scope: 'new_code' },
        { id: '3', metric: 'new_issues', operator: 'gt', threshold: 3, scope: 'new_code' },
        { id: '4', metric: 'new_issues', operator: 'gte', threshold: 5, scope: 'new_code' },
        { id: '5', metric: 'new_issues', operator: 'eq', threshold: 5, scope: 'new_code' },
        { id: '6', metric: 'new_issues', operator: 'neq', threshold: 10, scope: 'new_code' },
      ];

      for (const condition of conditions) {
        const gate: QualityGate = {
          id: 'test-gate',
          name: 'Test Gate',
          conditions: [condition],
          blockOnFailure: false,
          notificationChannels: [],
          enabled: true,
        };

        const result = ciIntegration.evaluateQualityGate(results, gate);
        expect(result.evaluatedConditions[0]?.passed).toBe(true);
      }
    });
  });

  describe('generateCIReport', () => {
    const sampleResults: WorkspaceAnalysisResult = {
      fileResults: [
        {
          filePath: 'src/file1.ts',
          issues: [
            {
              id: 'issue-1',
              type: 'unused-import',
              certainty: 'high',
              reason: 'Import is never used',
              locations: [{
                filePath: 'src/file1.ts',
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 20,
              }],
              safeFixAvailable: true,
              symbolName: 'unusedImport',
            },
          ],
          analysisTimeMs: 10,
          success: true,
        },
      ],
      totalFiles: 1,
      totalIssues: 1,
      issuesByType: { 'unused-import': 1 } as any,
      issuesByCertainty: { high: 1 } as any,
      totalTimeMs: 10,
    };

    it('should generate JSON report', () => {
      const report = ciIntegration.generateCIReport(sampleResults, 'json');

      expect(report.format).toBe('json');
      expect(report.content).toBeDefined();
      
      const parsed = JSON.parse(report.content);
      expect(parsed.summary.totalFiles).toBe(1);
      expect(parsed.summary.totalIssues).toBe(1);
    });

    it('should generate JUnit report', () => {
      const report = ciIntegration.generateCIReport(sampleResults, 'junit');

      expect(report.format).toBe('junit');
      expect(report.content).toContain('<?xml version="1.0"');
      expect(report.content).toContain('<testsuite');
      expect(report.content).toContain('<testcase');
    });

    it('should generate Checkstyle report', () => {
      const report = ciIntegration.generateCIReport(sampleResults, 'checkstyle');

      expect(report.format).toBe('checkstyle');
      expect(report.content).toContain('<?xml version="1.0"');
      expect(report.content).toContain('<checkstyle');
      expect(report.content).toContain('<file');
      expect(report.content).toContain('<error');
    });

    it('should generate SARIF report', () => {
      const report = ciIntegration.generateCIReport(sampleResults, 'sarif');

      expect(report.format).toBe('sarif');
      
      const parsed = JSON.parse(report.content);
      expect(parsed.version).toBe('2.1.0');
      expect(parsed.runs).toHaveLength(1);
      expect(parsed.runs[0].tool.driver.name).toBe('CodeJanitor');
    });

    it('should include quality gate results in report', () => {
      const gate: QualityGate = {
        id: 'gate-1',
        name: 'Test Gate',
        conditions: [{
          id: 'cond-1',
          metric: 'new_issues',
          operator: 'lte',
          threshold: 10,
          scope: 'new_code',
        }],
        blockOnFailure: true,
        notificationChannels: [],
        enabled: true,
      };

      const gateResult = ciIntegration.evaluateQualityGate(sampleResults, gate);
      const report = ciIntegration.generateCIReport(sampleResults, 'json', gateResult);

      const parsed = JSON.parse(report.content);
      expect(parsed.qualityGate).toBeDefined();
      expect(parsed.qualityGate.passed).toBe(true);
    });
  });

  describe('createQualityGate', () => {
    it('should create a quality gate', () => {
      const gate = ciIntegration.createQualityGate({
        name: 'Production Gate',
        description: 'Gate for production deployments',
        conditions: [
          {
            id: 'cond-1',
            metric: 'security_issues',
            operator: 'eq',
            threshold: 0,
            scope: 'overall',
          },
        ],
        blockOnFailure: true,
        notificationChannels: ['email', 'slack'],
        enabled: true,
      });

      expect(gate.id).toBeDefined();
      expect(gate.name).toBe('Production Gate');
      expect(gate.conditions).toHaveLength(1);
    });

    it('should retrieve created quality gate', () => {
      const created = ciIntegration.createQualityGate({
        name: 'Test Gate',
        conditions: [],
        blockOnFailure: false,
        notificationChannels: [],
        enabled: true,
      });

      const retrieved = ciIntegration.getQualityGate(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Gate');
    });
  });

  describe('cache management', () => {
    it('should track cache statistics', async () => {
      const commit: Commit = {
        hash: 'abc123',
        author: 'John Doe',
        email: 'john@example.com',
        message: 'Fix bug',
        timestamp: new Date(),
        branch: 'main',
        changedFiles: ['src/file1.ts'],
        repositoryId: 'repo-123',
      };

      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: true,
        enableDeadExports: true,
        enableMissingImplementations: true,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: true,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      await ciIntegration.analyzeCommit(commit, config);
      await ciIntegration.analyzeCommit(commit, config);

      const stats = ciIntegration.getCacheStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.totalEntries).toBe(1);
    });

    it('should clear cache', async () => {
      const commit: Commit = {
        hash: 'abc123',
        author: 'John Doe',
        email: 'john@example.com',
        message: 'Fix bug',
        timestamp: new Date(),
        branch: 'main',
        changedFiles: ['src/file1.ts'],
        repositoryId: 'repo-123',
      };

      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: true,
        enableDeadExports: true,
        enableMissingImplementations: true,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: true,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      await ciIntegration.analyzeCommit(commit, config);
      
      ciIntegration.clearCache();
      const stats = ciIntegration.getCacheStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalEntries).toBe(0);
    });

    it('should invalidate cache for specific files', async () => {
      const commit: Commit = {
        hash: 'abc123',
        author: 'John Doe',
        email: 'john@example.com',
        message: 'Fix bug',
        timestamp: new Date(),
        branch: 'main',
        changedFiles: ['src/file1.ts', 'src/file2.ts'],
        repositoryId: 'repo-123',
      };

      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: true,
        enableDeadExports: true,
        enableMissingImplementations: true,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: true,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      await ciIntegration.analyzeCommit(commit, config);
      
      const statsBefore = ciIntegration.getCacheStats();
      expect(statsBefore.totalEntries).toBe(1);

      ciIntegration.invalidateCache(['src/file1.ts']);
      
      const statsAfter = ciIntegration.getCacheStats();
      expect(statsAfter.totalEntries).toBe(0);
    });
  });
});
