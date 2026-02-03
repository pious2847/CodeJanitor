/**
 * Unit tests for MonorepoAnalyzer Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MonorepoAnalyzer,
  ChangedFiles,
} from '../MonorepoAnalyzer';
import { AnalyzerConfig } from '../../models/types';
import { QualityGate } from '../CIIntegration';

describe('MonorepoAnalyzer', () => {
  let monorepoAnalyzer: MonorepoAnalyzer;

  beforeEach(() => {
    monorepoAnalyzer = new MonorepoAnalyzer();
  });

  const createSampleConfig = (): AnalyzerConfig => ({
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
  });

  describe('detectMonorepoStructure', () => {
    it('should detect monorepo structure', async () => {
      const structure = await monorepoAnalyzer.detectMonorepoStructure('/test/monorepo');

      expect(structure).toBeDefined();
      expect(structure.rootPath).toBe('/test/monorepo');
      expect(structure.packages).toBeDefined();
      expect(structure.dependencyGraph).toBeDefined();
      expect(structure.type).toBeDefined();
    });

    it('should build dependency graph', async () => {
      const structure = await monorepoAnalyzer.detectMonorepoStructure('/test/monorepo');

      expect(structure.dependencyGraph.dependencies).toBeDefined();
      expect(structure.dependencyGraph.dependents).toBeDefined();
    });
  });

  describe('determineAffectedPackages', () => {
    beforeEach(async () => {
      await monorepoAnalyzer.detectMonorepoStructure('/test/monorepo');
    });

    it('should identify directly affected packages', () => {
      const changedFiles = ['packages/package-a/src/index.ts'];
      const affected = monorepoAnalyzer.determineAffectedPackages(changedFiles);

      expect(affected.directlyAffected).toHaveLength(1);
      expect(affected.directlyAffected[0]?.name).toBe('package-a');
    });

    it('should identify indirectly affected packages through dependencies', () => {
      const changedFiles = ['packages/package-a/src/index.ts'];
      const affected = monorepoAnalyzer.determineAffectedPackages(changedFiles);

      // package-b depends on package-a, so it should be indirectly affected
      expect(affected.indirectlyAffected.length).toBeGreaterThan(0);
      const packageB = affected.indirectlyAffected.find(p => p.name === 'package-b');
      expect(packageB).toBeDefined();
    });

    it('should include all affected packages', () => {
      const changedFiles = ['packages/package-a/src/index.ts'];
      const affected = monorepoAnalyzer.determineAffectedPackages(changedFiles);

      expect(affected.allAffected.length).toBe(
        affected.directlyAffected.length + affected.indirectlyAffected.length
      );
    });

    it('should build affected chains', () => {
      const changedFiles = ['packages/package-a/src/index.ts'];
      const affected = monorepoAnalyzer.determineAffectedPackages(changedFiles);

      expect(affected.affectedChains.size).toBeGreaterThan(0);
      
      // package-a should have a chain of just itself
      const packageAChain = affected.affectedChains.get('package-a');
      expect(packageAChain).toEqual(['package-a']);
    });

    it('should handle multiple changed files', () => {
      const changedFiles = [
        'packages/package-a/src/index.ts',
        'packages/package-b/src/index.ts',
      ];
      const affected = monorepoAnalyzer.determineAffectedPackages(changedFiles);

      expect(affected.directlyAffected.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle no affected packages', () => {
      const changedFiles = ['README.md']; // File not in any package
      const affected = monorepoAnalyzer.determineAffectedPackages(changedFiles);

      expect(affected.directlyAffected).toHaveLength(0);
      expect(affected.indirectlyAffected).toHaveLength(0);
      expect(affected.allAffected).toHaveLength(0);
    });
  });

  describe('analyzeIncremental', () => {
    beforeEach(async () => {
      await monorepoAnalyzer.detectMonorepoStructure('/test/monorepo');
    });

    it('should perform incremental analysis on changed files', async () => {
      const changedFiles: ChangedFiles = {
        files: ['packages/package-a/src/index.ts'],
        changeId: 'commit-123',
        timestamp: new Date(),
      };

      const config = createSampleConfig();
      const result = await monorepoAnalyzer.analyzeIncremental(changedFiles, config);

      expect(result).toBeDefined();
      expect(result.changedFiles).toEqual(changedFiles);
      expect(result.affectedPackages).toBeDefined();
      expect(result.packageResults.length).toBeGreaterThan(0);
    });

    it('should analyze only affected packages', async () => {
      const changedFiles: ChangedFiles = {
        files: ['packages/package-a/src/index.ts'],
        changeId: 'commit-123',
        timestamp: new Date(),
      };

      const config = createSampleConfig();
      const result = await monorepoAnalyzer.analyzeIncremental(changedFiles, config);

      expect(result.summary.analyzedPackages).toBeLessThanOrEqual(result.summary.totalPackages);
      expect(result.summary.analyzedPackages).toBe(result.affectedPackages.allAffected.length);
    });

    it('should generate summary statistics', async () => {
      const changedFiles: ChangedFiles = {
        files: ['packages/package-a/src/index.ts'],
        changeId: 'commit-123',
        timestamp: new Date(),
      };

      const config = createSampleConfig();
      const result = await monorepoAnalyzer.analyzeIncremental(changedFiles, config);

      expect(result.summary.totalPackages).toBeGreaterThan(0);
      expect(result.summary.analyzedPackages).toBeGreaterThan(0);
      expect(result.summary.skippedPackages).toBeGreaterThanOrEqual(0);
      expect(result.summary.totalIssues).toBeGreaterThanOrEqual(0);
    });

    it('should throw error if monorepo structure not detected', async () => {
      const freshAnalyzer = new MonorepoAnalyzer();
      const changedFiles: ChangedFiles = {
        files: ['packages/package-a/src/index.ts'],
        changeId: 'commit-123',
        timestamp: new Date(),
      };

      const config = createSampleConfig();

      await expect(
        freshAnalyzer.analyzeIncremental(changedFiles, config)
      ).rejects.toThrow('Monorepo structure not detected');
    });

    it('should use cache for repeated analysis', async () => {
      const changedFiles: ChangedFiles = {
        files: ['packages/package-a/src/index.ts'],
        changeId: 'commit-123',
        timestamp: new Date(),
      };

      const config = createSampleConfig();

      // First analysis
      const result1 = await monorepoAnalyzer.analyzeIncremental(changedFiles, config);
      
      // Second analysis with same change ID (should use cache)
      const result2 = await monorepoAnalyzer.analyzeIncremental(changedFiles, config);

      expect(result1.packageResults.length).toBe(result2.packageResults.length);
    });
  });

  describe('package quality gates', () => {
    beforeEach(async () => {
      await monorepoAnalyzer.detectMonorepoStructure('/test/monorepo');
    });

    it('should set quality gate for a package', () => {
      const qualityGate: QualityGate = {
        id: 'gate-1',
        name: 'Package A Gate',
        conditions: [],
        blockOnFailure: true,
        notificationChannels: [],
        enabled: true,
      };

      monorepoAnalyzer.setPackageQualityGate('package-a', qualityGate);

      const pkg = monorepoAnalyzer.getPackage('package-a');
      expect(pkg?.qualityGate).toEqual(qualityGate);
    });

    it('should evaluate quality gates during analysis', async () => {
      const qualityGate: QualityGate = {
        id: 'gate-1',
        name: 'Package A Gate',
        conditions: [],
        blockOnFailure: true,
        notificationChannels: [],
        enabled: true,
      };

      monorepoAnalyzer.setPackageQualityGate('package-a', qualityGate);

      const changedFiles: ChangedFiles = {
        files: ['packages/package-a/src/index.ts'],
        changeId: 'commit-123',
        timestamp: new Date(),
      };

      const config = createSampleConfig();
      const result = await monorepoAnalyzer.analyzeIncremental(changedFiles, config);

      const packageAResult = result.packageResults.find(r => r.package.name === 'package-a');
      expect(packageAResult?.qualityGateResult).toBeDefined();
    });
  });

  describe('getPackage', () => {
    beforeEach(async () => {
      await monorepoAnalyzer.detectMonorepoStructure('/test/monorepo');
    });

    it('should retrieve package by name', () => {
      const pkg = monorepoAnalyzer.getPackage('package-a');

      expect(pkg).toBeDefined();
      expect(pkg?.name).toBe('package-a');
    });

    it('should return undefined for non-existent package', () => {
      const pkg = monorepoAnalyzer.getPackage('non-existent');
      expect(pkg).toBeUndefined();
    });
  });

  describe('getAllPackages', () => {
    it('should return empty array before detection', () => {
      const packages = monorepoAnalyzer.getAllPackages();
      expect(packages).toEqual([]);
    });

    it('should return all packages after detection', async () => {
      await monorepoAnalyzer.detectMonorepoStructure('/test/monorepo');
      const packages = monorepoAnalyzer.getAllPackages();

      expect(packages.length).toBeGreaterThan(0);
    });
  });

  describe('getDependencyGraph', () => {
    it('should return undefined before detection', () => {
      const graph = monorepoAnalyzer.getDependencyGraph();
      expect(graph).toBeUndefined();
    });

    it('should return dependency graph after detection', async () => {
      await monorepoAnalyzer.detectMonorepoStructure('/test/monorepo');
      const graph = monorepoAnalyzer.getDependencyGraph();

      expect(graph).toBeDefined();
      expect(graph?.dependencies).toBeDefined();
      expect(graph?.dependents).toBeDefined();
    });
  });

  describe('clearCache', () => {
    beforeEach(async () => {
      await monorepoAnalyzer.detectMonorepoStructure('/test/monorepo');
    });

    it('should clear analysis cache', async () => {
      const changedFiles: ChangedFiles = {
        files: ['packages/package-a/src/index.ts'],
        changeId: 'commit-123',
        timestamp: new Date(),
      };

      const config = createSampleConfig();

      // Perform analysis to populate cache
      await monorepoAnalyzer.analyzeIncremental(changedFiles, config);

      // Clear cache
      monorepoAnalyzer.clearCache();

      // Cache should be empty (we can't directly test this, but it shouldn't throw)
      expect(() => monorepoAnalyzer.clearCache()).not.toThrow();
    });
  });
});
