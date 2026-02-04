/**
 * Recommendation Engine Service
 * 
 * Provides refactoring opportunity identification, training opportunity detection,
 * and team structure optimization recommendations.
 */

import { QualityMetrics, CodeIssue } from '../models/types';

/**
 * Refactoring opportunity
 */
export interface RefactoringOpportunity {
  /** Unique identifier */
  id: string;
  /** Type of refactoring */
  type: RefactoringType;
  /** File path */
  filePath: string;
  /** Line number */
  line: number;
  /** Priority (1-10, higher is more important) */
  priority: number;
  /** Description */
  description: string;
  /** Estimated effort in hours */
  estimatedEffort: number;
  /** Expected benefit */
  expectedBenefit: string;
  /** Specific recommendations */
  recommendations: string[];
  /** Code snippet */
  snippet?: string;
}

/**
 * Refactoring types
 */
export type RefactoringType =
  | 'extract_method'
  | 'extract_class'
  | 'simplify_conditional'
  | 'reduce_nesting'
  | 'remove_duplication'
  | 'improve_naming'
  | 'add_tests'
  | 'reduce_complexity'
  | 'optimize_performance';

/**
 * Training opportunity for developers
 */
export interface TrainingOpportunity {
  /** Unique identifier */
  id: string;
  /** Developer identifier */
  developerId: string;
  /** Developer name */
  developerName: string;
  /** Training topic */
  topic: TrainingTopic;
  /** Priority (1-10, higher is more important) */
  priority: number;
  /** Reason for recommendation */
  reason: string;
  /** Suggested resources */
  resources: TrainingResource[];
  /** Expected impact */
  expectedImpact: string;
  /** Related issues */
  relatedIssues: string[];
}

/**
 * Training topics
 */
export type TrainingTopic =
  | 'code_complexity'
  | 'security_best_practices'
  | 'testing_strategies'
  | 'performance_optimization'
  | 'design_patterns'
  | 'clean_code'
  | 'accessibility'
  | 'typescript_advanced';

/**
 * Training resource
 */
export interface TrainingResource {
  /** Resource title */
  title: string;
  /** Resource type */
  type: 'article' | 'video' | 'course' | 'book' | 'documentation';
  /** Resource URL */
  url?: string;
  /** Estimated time to complete */
  estimatedTime?: string;
}

/**
 * Team structure optimization recommendation
 */
export interface TeamStructureRecommendation {
  /** Unique identifier */
  id: string;
  /** Recommendation type */
  type: TeamOptimizationType;
  /** Priority (1-10, higher is more important) */
  priority: number;
  /** Description */
  description: string;
  /** Current situation */
  currentSituation: string;
  /** Proposed changes */
  proposedChanges: string[];
  /** Expected benefits */
  expectedBenefits: string[];
  /** Affected teams */
  affectedTeams: string[];
  /** Affected developers */
  affectedDevelopers: string[];
}

/**
 * Team optimization types
 */
export type TeamOptimizationType =
  | 'redistribute_ownership'
  | 'create_specialized_team'
  | 'merge_teams'
  | 'add_code_reviewer'
  | 'rotate_responsibilities'
  | 'establish_ownership'
  | 'reduce_silos';

/**
 * Code ownership information
 */
export interface CodeOwnership {
  /** File path */
  filePath: string;
  /** Primary owner */
  primaryOwner: string;
  /** Ownership percentage */
  ownershipPercentage: number;
  /** Contributors */
  contributors: ContributorInfo[];
  /** Last modified date */
  lastModified: Date;
}

/**
 * Contributor information
 */
export interface ContributorInfo {
  /** Developer identifier */
  developerId: string;
  /** Developer name */
  name: string;
  /** Contribution percentage */
  contributionPercentage: number;
  /** Number of commits */
  commits: number;
  /** Lines changed */
  linesChanged: number;
}

/**
 * Developer activity pattern
 */
export interface DeveloperActivity {
  /** Developer identifier */
  developerId: string;
  /** Developer name */
  name: string;
  /** Files modified */
  filesModified: string[];
  /** Issues created */
  issuesCreated: CodeIssue[];
  /** Common issue types */
  commonIssueTypes: string[];
  /** Quality score */
  qualityScore: number;
  /** Productivity score */
  productivityScore: number;
}

/**
 * Recommendation Engine Service
 */
export class RecommendationEngine {
  /**
   * Identify refactoring opportunities
   */
  async identifyRefactoringOpportunities(
    filePath: string,
    metrics: QualityMetrics
  ): Promise<RefactoringOpportunity[]> {
    const opportunities: RefactoringOpportunity[] = [];

    // Check for high complexity
    if (metrics.complexity.cyclomaticComplexity > 10) {
      opportunities.push({
        id: `refactor-complexity-${filePath}`,
        type: 'reduce_complexity',
        filePath,
        line: 1,
        priority: this.calculatePriority(metrics.complexity.cyclomaticComplexity, 10, 30),
        description: 'High cyclomatic complexity detected',
        estimatedEffort: Math.ceil(metrics.complexity.cyclomaticComplexity / 5),
        expectedBenefit: 'Improved maintainability and reduced bug risk',
        recommendations: [
          'Break down complex functions into smaller, focused functions',
          'Extract conditional logic into separate methods',
          'Consider using design patterns like Strategy or State',
        ],
      });
    }

    // Check for deep nesting
    if (metrics.complexity.maxNestingDepth > 4) {
      opportunities.push({
        id: `refactor-nesting-${filePath}`,
        type: 'reduce_nesting',
        filePath,
        line: 1,
        priority: this.calculatePriority(metrics.complexity.maxNestingDepth, 4, 8),
        description: 'Deep nesting detected',
        estimatedEffort: 2,
        expectedBenefit: 'Improved code readability',
        recommendations: [
          'Use early returns to reduce nesting',
          'Extract nested logic into separate functions',
          'Consider using guard clauses',
        ],
      });
    }

    // Check for code duplication
    if (metrics.maintainability.duplications > 3) {
      opportunities.push({
        id: `refactor-duplication-${filePath}`,
        type: 'remove_duplication',
        filePath,
        line: 1,
        priority: this.calculatePriority(metrics.maintainability.duplications, 3, 10),
        description: 'Code duplication detected',
        estimatedEffort: metrics.maintainability.duplications,
        expectedBenefit: 'Reduced maintenance burden and improved consistency',
        recommendations: [
          'Extract common code into reusable functions',
          'Consider using inheritance or composition',
          'Create utility functions for repeated patterns',
        ],
      });
    }

    // Check for low test coverage
    if (metrics.testability.coverage < 60) {
      opportunities.push({
        id: `refactor-tests-${filePath}`,
        type: 'add_tests',
        filePath,
        line: 1,
        priority: this.calculatePriority(60 - metrics.testability.coverage, 10, 60),
        description: 'Low test coverage',
        estimatedEffort: Math.ceil(metrics.testability.untestedFunctions / 2),
        expectedBenefit: 'Increased confidence in code changes and reduced regression risk',
        recommendations: [
          'Add unit tests for untested functions',
          'Implement integration tests for critical paths',
          'Consider property-based testing for complex logic',
        ],
      });
    }

    // Check for long functions
    if (metrics.maintainability.avgFunctionLength > 50) {
      opportunities.push({
        id: `refactor-extract-method-${filePath}`,
        type: 'extract_method',
        filePath,
        line: 1,
        priority: this.calculatePriority(metrics.maintainability.avgFunctionLength, 50, 100),
        description: 'Long functions detected',
        estimatedEffort: 3,
        expectedBenefit: 'Improved code organization and reusability',
        recommendations: [
          'Extract logical sections into separate methods',
          'Follow Single Responsibility Principle',
          'Aim for functions under 30 lines',
        ],
      });
    }

    // Check for performance issues
    if (metrics.performance.antiPatterns > 0) {
      opportunities.push({
        id: `refactor-performance-${filePath}`,
        type: 'optimize_performance',
        filePath,
        line: 1,
        priority: this.calculatePriority(metrics.performance.impactScore, 10, 50),
        description: 'Performance anti-patterns detected',
        estimatedEffort: metrics.performance.antiPatterns * 2,
        expectedBenefit: 'Improved application performance and user experience',
        recommendations: [
          'Optimize inefficient algorithms',
          'Reduce unnecessary computations',
          'Consider caching strategies',
        ],
      });
    }

    // Sort by priority
    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Identify training opportunities for developers
   */
  async identifyTrainingOpportunities(
    activities: DeveloperActivity[]
  ): Promise<TrainingOpportunity[]> {
    const opportunities: TrainingOpportunity[] = [];

    for (const activity of activities) {
      // Check for complexity issues
      const complexityIssues = activity.commonIssueTypes.filter(
        type => type.includes('complexity') || type.includes('nesting')
      );
      
      if (complexityIssues.length > 3) {
        opportunities.push({
          id: `training-complexity-${activity.developerId}`,
          developerId: activity.developerId,
          developerName: activity.name,
          topic: 'code_complexity',
          priority: 8,
          reason: 'Frequent complexity-related issues in code',
          resources: [
            {
              title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
              type: 'book',
              estimatedTime: '20 hours',
            },
            {
              title: 'Refactoring: Improving the Design of Existing Code',
              type: 'book',
              estimatedTime: '15 hours',
            },
            {
              title: 'Cyclomatic Complexity and Code Quality',
              type: 'article',
              url: 'https://example.com/complexity',
              estimatedTime: '30 minutes',
            },
          ],
          expectedImpact: 'Reduced complexity in future code contributions',
          relatedIssues: activity.issuesCreated.map(i => i.id),
        });
      }

      // Check for security issues
      const securityIssues = activity.commonIssueTypes.filter(
        type => type.includes('security') || type.includes('vulnerability')
      );
      
      if (securityIssues.length > 2) {
        opportunities.push({
          id: `training-security-${activity.developerId}`,
          developerId: activity.developerId,
          developerName: activity.name,
          topic: 'security_best_practices',
          priority: 10,
          reason: 'Security vulnerabilities detected in code',
          resources: [
            {
              title: 'OWASP Top 10 Security Risks',
              type: 'documentation',
              url: 'https://owasp.org/top10',
              estimatedTime: '2 hours',
            },
            {
              title: 'Secure Coding in JavaScript',
              type: 'course',
              estimatedTime: '8 hours',
            },
          ],
          expectedImpact: 'Improved security awareness and fewer vulnerabilities',
          relatedIssues: activity.issuesCreated.map(i => i.id),
        });
      }

      // Check for testing issues
      const testingIssues = activity.commonIssueTypes.filter(
        type => type.includes('test') || type.includes('coverage')
      );
      
      if (testingIssues.length > 2 || activity.qualityScore < 60) {
        opportunities.push({
          id: `training-testing-${activity.developerId}`,
          developerId: activity.developerId,
          developerName: activity.name,
          topic: 'testing_strategies',
          priority: 7,
          reason: 'Low test coverage or testing-related issues',
          resources: [
            {
              title: 'Test-Driven Development: By Example',
              type: 'book',
              estimatedTime: '12 hours',
            },
            {
              title: 'Unit Testing Best Practices',
              type: 'article',
              estimatedTime: '45 minutes',
            },
          ],
          expectedImpact: 'Better test coverage and more reliable code',
          relatedIssues: activity.issuesCreated.map(i => i.id),
        });
      }

      // Check for performance issues
      const performanceIssues = activity.commonIssueTypes.filter(
        type => type.includes('performance') || type.includes('optimization')
      );
      
      if (performanceIssues.length > 2) {
        opportunities.push({
          id: `training-performance-${activity.developerId}`,
          developerId: activity.developerId,
          developerName: activity.name,
          topic: 'performance_optimization',
          priority: 6,
          reason: 'Performance anti-patterns in code',
          resources: [
            {
              title: 'High Performance JavaScript',
              type: 'book',
              estimatedTime: '10 hours',
            },
            {
              title: 'Web Performance Optimization',
              type: 'course',
              estimatedTime: '6 hours',
            },
          ],
          expectedImpact: 'More performant code and better user experience',
          relatedIssues: activity.issuesCreated.map(i => i.id),
        });
      }
    }

    // Sort by priority
    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Recommend team structure optimizations
   */
  async recommendTeamStructure(
    ownerships: CodeOwnership[],
    activities: DeveloperActivity[]
  ): Promise<TeamStructureRecommendation[]> {
    const recommendations: TeamStructureRecommendation[] = [];

    // Analyze code ownership distribution
    const ownershipMap = new Map<string, CodeOwnership[]>();
    for (const ownership of ownerships) {
      const existing = ownershipMap.get(ownership.primaryOwner) || [];
      existing.push(ownership);
      ownershipMap.set(ownership.primaryOwner, existing);
    }

    // Check for overloaded developers
    for (const [owner, files] of ownershipMap.entries()) {
      if (files.length > 50) {
        recommendations.push({
          id: `team-redistribute-${owner}`,
          type: 'redistribute_ownership',
          priority: 8,
          description: 'Developer owns too many files',
          currentSituation: `${owner} owns ${files.length} files, which may lead to bottlenecks`,
          proposedChanges: [
            'Redistribute ownership of less critical files',
            'Identify files that can be transferred to other team members',
            'Establish shared ownership for some components',
          ],
          expectedBenefits: [
            'Reduced single points of failure',
            'Better knowledge distribution',
            'Improved team velocity',
          ],
          affectedTeams: ['team-1'],
          affectedDevelopers: [owner],
        });
      }
    }

    // Check for files with no clear owner
    const orphanedFiles = ownerships.filter(o => o.ownershipPercentage < 30);
    if (orphanedFiles.length > 10) {
      recommendations.push({
        id: 'team-establish-ownership',
        type: 'establish_ownership',
        priority: 7,
        description: 'Many files lack clear ownership',
        currentSituation: `${orphanedFiles.length} files have no clear owner`,
        proposedChanges: [
          'Assign primary owners to orphaned files',
          'Create CODEOWNERS file',
          'Establish ownership guidelines',
        ],
        expectedBenefits: [
          'Clearer responsibility',
          'Faster code reviews',
          'Better code quality',
        ],
        affectedTeams: ['team-1'],
        affectedDevelopers: [],
      });
    }

    // Check for knowledge silos
    const soloOwners = ownerships.filter(
      o => o.contributors.length === 1 && o.ownershipPercentage > 90
    );
    
    if (soloOwners.length > 20) {
      recommendations.push({
        id: 'team-reduce-silos',
        type: 'reduce_silos',
        priority: 9,
        description: 'Knowledge silos detected',
        currentSituation: `${soloOwners.length} files have only one contributor`,
        proposedChanges: [
          'Implement pair programming for critical components',
          'Rotate code review responsibilities',
          'Encourage cross-team contributions',
        ],
        expectedBenefits: [
          'Reduced bus factor',
          'Better knowledge sharing',
          'Improved team resilience',
        ],
        affectedTeams: ['team-1'],
        affectedDevelopers: soloOwners.map(o => o.primaryOwner),
      });
    }

    // Check for quality patterns
    const lowQualityDevelopers = activities.filter(a => a.qualityScore < 50);
    if (lowQualityDevelopers.length > 0) {
      recommendations.push({
        id: 'team-add-reviewer',
        type: 'add_code_reviewer',
        priority: 8,
        description: 'Quality issues detected in some contributions',
        currentSituation: `${lowQualityDevelopers.length} developers have quality scores below 50`,
        proposedChanges: [
          'Assign senior developers as code reviewers',
          'Implement mandatory code review process',
          'Provide mentorship and training',
        ],
        expectedBenefits: [
          'Improved code quality',
          'Better learning opportunities',
          'Reduced technical debt',
        ],
        affectedTeams: ['team-1'],
        affectedDevelopers: lowQualityDevelopers.map(d => d.developerId),
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate priority based on metric value
   */
  private calculatePriority(value: number, minThreshold: number, maxThreshold: number): number {
    if (value <= minThreshold) {
      return 1;
    }
    if (value >= maxThreshold) {
      return 10;
    }
    
    // Linear interpolation between 1 and 10
    const range = maxThreshold - minThreshold;
    const position = value - minThreshold;
    return Math.round(1 + (position / range) * 9);
  }
}
