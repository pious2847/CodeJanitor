/**
 * Tests for Recommendation Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RecommendationEngine,
  DeveloperActivity,
  CodeOwnership,
} from '../RecommendationEngine';
import { QualityMetrics } from '../../models/types';

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  describe('Refactoring Opportunities', () => {
    it('should identify high complexity refactoring opportunities', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 25,
          cognitiveComplexity: 30,
          maxNestingDepth: 3,
          maxParameters: 4,
          linesOfCode: 200,
        },
        maintainability: {
          maintainabilityIndex: 40,
          duplications: 2,
          commentDensity: 0.15,
          avgFunctionLength: 30,
        },
        security: {
          vulnerabilities: 0,
          secrets: 0,
          riskScore: 10,
        },
        performance: {
          antiPatterns: 0,
          impactScore: 0,
        },
        testability: {
          coverage: 70,
          untestedFunctions: 2,
          testabilityScore: 75,
        },
      };

      const opportunities = await engine.identifyRefactoringOpportunities('test.ts', metrics);

      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);
      expect(opportunities.length).toBeGreaterThan(0);
      
      const complexityOpp = opportunities.find(o => o.type === 'reduce_complexity');
      expect(complexityOpp).toBeDefined();
      expect(complexityOpp?.priority).toBeGreaterThan(0);
      expect(complexityOpp?.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify deep nesting refactoring opportunities', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 8,
          cognitiveComplexity: 12,
          maxNestingDepth: 6,
          maxParameters: 3,
          linesOfCode: 150,
        },
        maintainability: {
          maintainabilityIndex: 50,
          duplications: 1,
          commentDensity: 0.2,
          avgFunctionLength: 25,
        },
        security: {
          vulnerabilities: 0,
          secrets: 0,
          riskScore: 5,
        },
        performance: {
          antiPatterns: 0,
          impactScore: 0,
        },
        testability: {
          coverage: 80,
          untestedFunctions: 1,
          testabilityScore: 85,
        },
      };

      const opportunities = await engine.identifyRefactoringOpportunities('test.ts', metrics);

      const nestingOpp = opportunities.find(o => o.type === 'reduce_nesting');
      expect(nestingOpp).toBeDefined();
      expect(nestingOpp?.description).toContain('nesting');
    });

    it('should identify code duplication opportunities', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 5,
          cognitiveComplexity: 8,
          maxNestingDepth: 2,
          maxParameters: 3,
          linesOfCode: 100,
        },
        maintainability: {
          maintainabilityIndex: 60,
          duplications: 8,
          commentDensity: 0.25,
          avgFunctionLength: 20,
        },
        security: {
          vulnerabilities: 0,
          secrets: 0,
          riskScore: 5,
        },
        performance: {
          antiPatterns: 0,
          impactScore: 0,
        },
        testability: {
          coverage: 75,
          untestedFunctions: 1,
          testabilityScore: 80,
        },
      };

      const opportunities = await engine.identifyRefactoringOpportunities('test.ts', metrics);

      const duplicationOpp = opportunities.find(o => o.type === 'remove_duplication');
      expect(duplicationOpp).toBeDefined();
      expect(duplicationOpp?.description).toContain('duplication');
    });

    it('should identify low test coverage opportunities', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 5,
          cognitiveComplexity: 8,
          maxNestingDepth: 2,
          maxParameters: 3,
          linesOfCode: 100,
        },
        maintainability: {
          maintainabilityIndex: 70,
          duplications: 1,
          commentDensity: 0.3,
          avgFunctionLength: 20,
        },
        security: {
          vulnerabilities: 0,
          secrets: 0,
          riskScore: 5,
        },
        performance: {
          antiPatterns: 0,
          impactScore: 0,
        },
        testability: {
          coverage: 30,
          untestedFunctions: 10,
          testabilityScore: 40,
        },
      };

      const opportunities = await engine.identifyRefactoringOpportunities('test.ts', metrics);

      const testOpp = opportunities.find(o => o.type === 'add_tests');
      expect(testOpp).toBeDefined();
      expect(testOpp?.description).toContain('test coverage');
    });

    it('should sort opportunities by priority', async () => {
      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 25,
          cognitiveComplexity: 30,
          maxNestingDepth: 6,
          maxParameters: 4,
          linesOfCode: 200,
        },
        maintainability: {
          maintainabilityIndex: 30,
          duplications: 8,
          commentDensity: 0.1,
          avgFunctionLength: 60,
        },
        security: {
          vulnerabilities: 0,
          secrets: 0,
          riskScore: 10,
        },
        performance: {
          antiPatterns: 3,
          impactScore: 40,
        },
        testability: {
          coverage: 20,
          untestedFunctions: 15,
          testabilityScore: 30,
        },
      };

      const opportunities = await engine.identifyRefactoringOpportunities('test.ts', metrics);

      // Verify sorted by priority descending
      for (let i = 0; i < opportunities.length - 1; i++) {
        expect(opportunities[i]!.priority).toBeGreaterThanOrEqual(opportunities[i + 1]!.priority);
      }
    });
  });

  describe('Training Opportunities', () => {
    it('should identify complexity training needs', async () => {
      const activities: DeveloperActivity[] = [
        {
          developerId: 'dev1',
          name: 'John Doe',
          filesModified: ['file1.ts', 'file2.ts'],
          issuesCreated: [],
          commonIssueTypes: ['high-complexity', 'high-complexity', 'high-complexity', 'high-complexity'],
          qualityScore: 55,
          productivityScore: 75,
        },
      ];

      const opportunities = await engine.identifyTrainingOpportunities(activities);

      expect(opportunities).toBeDefined();
      expect(opportunities.length).toBeGreaterThan(0);
      
      const complexityTraining = opportunities.find(o => o.topic === 'code_complexity');
      expect(complexityTraining).toBeDefined();
      expect(complexityTraining?.resources.length).toBeGreaterThan(0);
    });

    it('should identify security training needs', async () => {
      const activities: DeveloperActivity[] = [
        {
          developerId: 'dev2',
          name: 'Jane Smith',
          filesModified: ['file1.ts'],
          issuesCreated: [],
          commonIssueTypes: ['security-vulnerability', 'security-vulnerability', 'security-vulnerability'],
          qualityScore: 60,
          productivityScore: 80,
        },
      ];

      const opportunities = await engine.identifyTrainingOpportunities(activities);

      const securityTraining = opportunities.find(o => o.topic === 'security_best_practices');
      expect(securityTraining).toBeDefined();
      expect(securityTraining?.priority).toBe(10);
    });

    it('should identify testing training needs', async () => {
      const activities: DeveloperActivity[] = [
        {
          developerId: 'dev3',
          name: 'Bob Johnson',
          filesModified: ['file1.ts'],
          issuesCreated: [],
          commonIssueTypes: ['low-test-coverage', 'low-test-coverage', 'low-test-coverage'],
          qualityScore: 45,
          productivityScore: 70,
        },
      ];

      const opportunities = await engine.identifyTrainingOpportunities(activities);

      const testingTraining = opportunities.find(o => o.topic === 'testing_strategies');
      expect(testingTraining).toBeDefined();
    });
  });

  describe('Team Structure Recommendations', () => {
    it('should recommend redistributing ownership for overloaded developers', async () => {
      const ownerships: CodeOwnership[] = [];
      
      // Create 60 files owned by one developer
      for (let i = 0; i < 60; i++) {
        ownerships.push({
          filePath: `file${i}.ts`,
          primaryOwner: 'dev1',
          ownershipPercentage: 95,
          contributors: [
            {
              developerId: 'dev1',
              name: 'John Doe',
              contributionPercentage: 95,
              commits: 50,
              linesChanged: 1000,
            },
          ],
          lastModified: new Date(),
        });
      }

      const recommendations = await engine.recommendTeamStructure(ownerships, []);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      
      const redistributeRec = recommendations.find(r => r.type === 'redistribute_ownership');
      expect(redistributeRec).toBeDefined();
      expect(redistributeRec?.affectedDevelopers).toContain('dev1');
    });

    it('should recommend establishing ownership for orphaned files', async () => {
      const ownerships: CodeOwnership[] = [];
      
      // Create 15 files with no clear owner
      for (let i = 0; i < 15; i++) {
        ownerships.push({
          filePath: `file${i}.ts`,
          primaryOwner: 'dev1',
          ownershipPercentage: 25,
          contributors: [
            {
              developerId: 'dev1',
              name: 'John Doe',
              contributionPercentage: 25,
              commits: 5,
              linesChanged: 100,
            },
            {
              developerId: 'dev2',
              name: 'Jane Smith',
              contributionPercentage: 25,
              commits: 5,
              linesChanged: 100,
            },
          ],
          lastModified: new Date(),
        });
      }

      const recommendations = await engine.recommendTeamStructure(ownerships, []);

      const ownershipRec = recommendations.find(r => r.type === 'establish_ownership');
      expect(ownershipRec).toBeDefined();
    });

    it('should recommend reducing knowledge silos', async () => {
      const ownerships: CodeOwnership[] = [];
      
      // Create 25 files with single contributors
      for (let i = 0; i < 25; i++) {
        ownerships.push({
          filePath: `file${i}.ts`,
          primaryOwner: `dev${i % 5}`,
          ownershipPercentage: 95,
          contributors: [
            {
              developerId: `dev${i % 5}`,
              name: `Developer ${i % 5}`,
              contributionPercentage: 95,
              commits: 50,
              linesChanged: 1000,
            },
          ],
          lastModified: new Date(),
        });
      }

      const recommendations = await engine.recommendTeamStructure(ownerships, []);

      const siloRec = recommendations.find(r => r.type === 'reduce_silos');
      expect(siloRec).toBeDefined();
    });

    it('should recommend adding code reviewers for quality issues', async () => {
      const activities: DeveloperActivity[] = [
        {
          developerId: 'dev1',
          name: 'John Doe',
          filesModified: ['file1.ts'],
          issuesCreated: [],
          commonIssueTypes: [],
          qualityScore: 40,
          productivityScore: 70,
        },
        {
          developerId: 'dev2',
          name: 'Jane Smith',
          filesModified: ['file2.ts'],
          issuesCreated: [],
          commonIssueTypes: [],
          qualityScore: 45,
          productivityScore: 75,
        },
      ];

      const recommendations = await engine.recommendTeamStructure([], activities);

      const reviewerRec = recommendations.find(r => r.type === 'add_code_reviewer');
      expect(reviewerRec).toBeDefined();
      expect(reviewerRec?.affectedDevelopers.length).toBeGreaterThan(0);
    });

    it('should sort recommendations by priority', async () => {
      const ownerships: CodeOwnership[] = [];
      
      // Create various scenarios
      for (let i = 0; i < 60; i++) {
        ownerships.push({
          filePath: `file${i}.ts`,
          primaryOwner: 'dev1',
          ownershipPercentage: i < 25 ? 95 : 25,
          contributors: [
            {
              developerId: 'dev1',
              name: 'John Doe',
              contributionPercentage: i < 25 ? 95 : 25,
              commits: 50,
              linesChanged: 1000,
            },
          ],
          lastModified: new Date(),
        });
      }

      const activities: DeveloperActivity[] = [
        {
          developerId: 'dev2',
          name: 'Jane Smith',
          filesModified: ['file1.ts'],
          issuesCreated: [],
          commonIssueTypes: [],
          qualityScore: 40,
          productivityScore: 70,
        },
      ];

      const recommendations = await engine.recommendTeamStructure(ownerships, activities);

      // Verify sorted by priority descending
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i]!.priority).toBeGreaterThanOrEqual(recommendations[i + 1]!.priority);
      }
    });
  });
});
