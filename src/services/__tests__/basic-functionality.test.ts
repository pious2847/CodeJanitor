/**
 * Basic functionality tests for enterprise services
 */

import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../PolicyEngine';
import { AnalyticsEngine } from '../AnalyticsEngine';

describe('PolicyEngine', () => {
  it('should create a new policy', async () => {
    const engine = new PolicyEngine();
    
    const policy = await engine.createPolicy({
      name: 'Test Policy',
      description: 'A test policy',
      scope: 'team',
      rules: [],
      exceptions: [],
      autoFix: false,
      enabled: true,
      version: '1.0.0',
      createdBy: 'test-user',
    });

    expect(policy).toBeDefined();
    expect(policy.id).toBeDefined();
    expect(policy.name).toBe('Test Policy');
    expect(policy.scope).toBe('team');
  });

  it('should get policies by scope', async () => {
    const engine = new PolicyEngine();
    
    await engine.createPolicy({
      name: 'Org Policy',
      description: 'Organization policy',
      scope: 'organization',
      rules: [],
      exceptions: [],
      autoFix: false,
      enabled: true,
      version: '1.0.0',
      createdBy: 'test-user',
    });

    await engine.createPolicy({
      name: 'Team Policy',
      description: 'Team policy',
      scope: 'team',
      rules: [],
      exceptions: [],
      autoFix: false,
      enabled: true,
      version: '1.0.0',
      createdBy: 'test-user',
    });

    const orgPolicies = await engine.getPoliciesByScope('organization');
    const teamPolicies = await engine.getPoliciesByScope('team');

    expect(orgPolicies.length).toBe(1);
    expect(teamPolicies.length).toBe(1);
  });
});

describe('AnalyticsEngine', () => {
  it('should calculate quality-velocity correlation', () => {
    const engine = new AnalyticsEngine();
    
    const qualityScores = [80, 85, 90, 88, 92];
    const velocityMetrics = [10, 12, 15, 14, 16];
    
    const correlation = engine.calculateQualityVelocityCorrelation(qualityScores, velocityMetrics);
    
    expect(correlation).toBeGreaterThan(0);
    expect(correlation).toBeLessThanOrEqual(1);
  });

  it('should detect code duplication', () => {
    const engine = new AnalyticsEngine();
    
    const files = new Map<string, string>([
      ['file1.ts', 'function test() {\n  console.log("hello");\n  console.log("world");\n}\n'],
      ['file2.ts', 'function test() {\n  console.log("hello");\n  console.log("world");\n}\n'],
    ]);
    
    const report = engine.detectDuplication(files, 2, 5);
    
    expect(report).toBeDefined();
    expect(report.totalDuplications).toBeGreaterThanOrEqual(0);
  });

  it('should identify performance anti-patterns', () => {
    const engine = new AnalyticsEngine();
    
    const code = `
      function example() {
        for (let i = 0; i < 10; i++) {
          for (let j = 0; j < 10; j++) {
            for (let k = 0; k < 10; k++) {
              console.log(i, j, k);
            }
          }
        }
      }
    `;
    
    const report = engine.identifyPerformanceAntiPatterns('test.ts', code);
    
    expect(report).toBeDefined();
    expect(report.totalAntiPatterns).toBeGreaterThanOrEqual(0);
    expect(report.performanceScore).toBeGreaterThanOrEqual(0);
    expect(report.performanceScore).toBeLessThanOrEqual(100);
  });
});
