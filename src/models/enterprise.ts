/**
 * Enterprise Data Models
 * 
 * Extended data models for enterprise features including team collaboration,
 * organizational hierarchy, and advanced quality tracking.
 */

import { CodeIssue, QualityMetrics } from './types';

/**
 * Priority level for issues and tasks
 */
export type Priority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Impact category for business impact assessment
 */
export type ImpactCategory = 'security' | 'performance' | 'maintainability' | 'compliance';

/**
 * Impact severity level
 */
export type ImpactSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Risk level assessment
 */
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'negligible';

/**
 * Trend direction for metrics
 */
export type TrendDirection = 'improving' | 'stable' | 'degrading';

/**
 * User role in the system
 */
export type UserRole = 'admin' | 'manager' | 'developer' | 'viewer';

/**
 * Task status
 */
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Subscription tier
 */
export type SubscriptionTier = 'free' | 'team' | 'enterprise';

/**
 * Business impact assessment for code issues
 */
export interface BusinessImpact {
  /** Category of impact */
  category: ImpactCategory;
  /** Severity of impact */
  severity: ImpactSeverity;
  /** Number of users affected (if applicable) */
  affectedUsers?: number;
  /** Estimated cost in dollars (if applicable) */
  estimatedCost?: number;
  /** Overall risk level */
  riskLevel: RiskLevel;
}

/**
 * Effort estimate for fixing an issue
 */
export interface EffortEstimate {
  /** Estimated time in minutes */
  minutes: number;
  /** Confidence in the estimate (0-1) */
  confidence: number;
  /** Complexity of the fix */
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex';
}

/**
 * Resolution information for an issue
 */
export interface Resolution {
  /** How the issue was resolved */
  type: 'fixed' | 'wont_fix' | 'duplicate' | 'false_positive';
  /** Who resolved it */
  resolvedBy: string;
  /** When it was resolved */
  resolvedAt: Date;
  /** Resolution notes */
  notes?: string;
  /** Related commit or PR */
  reference?: string;
}

/**
 * User information
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's email */
  email: string;
  /** User's display name */
  name: string;
  /** User's role */
  role: UserRole;
  /** Avatar URL */
  avatarUrl?: string;
}

/**
 * Enhanced code issue with enterprise features
 */
export interface EnterpriseCodeIssue extends CodeIssue {
  /** Team that owns this code */
  teamId: string;
  /** Project this issue belongs to */
  projectId: string;
  /** Assigned team member */
  assignee?: User;
  /** Priority level */
  priority: Priority;
  /** Business impact assessment */
  businessImpact: BusinessImpact;
  /** Estimated effort to fix */
  estimatedEffort: EffortEstimate;
  /** Related issue IDs */
  relatedIssues: string[];
  /** Policy violations associated with this issue */
  policyViolations: string[];
  /** ML model confidence score (0-1) */
  mlConfidence?: number;
  /** Number of times this issue has occurred historically */
  historicalOccurrences: number;
  /** When this issue was first detected */
  firstDetected: Date;
  /** When this issue was last updated */
  lastUpdated: Date;
  /** Resolution information if resolved */
  resolution?: Resolution;
}

/**
 * Team member with role
 */
export interface TeamMember {
  /** User information */
  user: User;
  /** Role within the team */
  role: 'lead' | 'senior' | 'developer' | 'junior';
  /** When they joined the team */
  joinedAt: Date;
}

/**
 * Repository information
 */
export interface Repository {
  /** Unique repository identifier */
  id: string;
  /** Repository name */
  name: string;
  /** Repository URL */
  url: string;
  /** Default branch */
  defaultBranch: string;
  /** Whether this repo is actively monitored */
  isActive: boolean;
}

/**
 * Integration configuration
 */
export interface Integration {
  /** Integration type */
  type: 'jira' | 'github' | 'slack' | 'teams' | 'gitlab' | 'bitbucket';
  /** Whether this integration is enabled */
  enabled: boolean;
  /** Integration-specific configuration */
  config: Record<string, any>;
}

/**
 * Team settings
 */
export interface TeamSettings {
  /** Default priority for new issues */
  defaultPriority: Priority;
  /** Auto-assign issues to team members */
  autoAssign: boolean;
  /** Notification preferences */
  notifications: {
    email: boolean;
    slack: boolean;
    inApp: boolean;
  };
}

/**
 * Team metrics
 */
export interface TeamMetrics {
  /** Total issues assigned to team */
  totalIssues: number;
  /** Issues resolved this period */
  resolvedIssues: number;
  /** Average resolution time in hours */
  avgResolutionTime: number;
  /** Code quality score (0-100) */
  qualityScore: number;
  /** Technical debt in minutes */
  technicalDebtMinutes: number;
}

/**
 * Team model
 */
export interface Team {
  /** Unique team identifier */
  id: string;
  /** Team name */
  name: string;
  /** Organization this team belongs to */
  organizationId: string;
  /** Team members */
  members: TeamMember[];
  /** Projects owned by this team */
  projects: Project[];
  /** Team-specific policies */
  policies: string[];
  /** Team metrics */
  metrics: TeamMetrics;
  /** Team settings */
  settings: TeamSettings;
  /** When the team was created */
  createdAt: Date;
  /** When the team was last updated */
  updatedAt: Date;
}

/**
 * Project settings
 */
export interface ProjectSettings {
  /** Enable automatic analysis */
  autoAnalysis: boolean;
  /** Analysis schedule (cron expression) */
  analysisSchedule?: string;
  /** Quality gate configuration */
  qualityGate?: {
    enabled: boolean;
    blockOnFailure: boolean;
    thresholds: Record<string, number>;
  };
}

/**
 * Project model
 */
export interface Project {
  /** Unique project identifier */
  id: string;
  /** Project name */
  name: string;
  /** Team that owns this project */
  teamId: string;
  /** Repositories associated with this project */
  repositories: Repository[];
  /** Quality baseline for this project */
  qualityBaseline?: QualityBaseline;
  /** Project settings */
  settings: ProjectSettings;
  /** External integrations */
  integrations: Integration[];
  /** When the project was created */
  createdAt: Date;
  /** When the project was last updated */
  updatedAt: Date;
}

/**
 * Compliance settings
 */
export interface ComplianceSettings {
  /** SOC 2 compliance enabled */
  soc2: boolean;
  /** GDPR compliance enabled */
  gdpr: boolean;
  /** HIPAA compliance enabled */
  hipaa: boolean;
  /** Custom compliance frameworks */
  custom: string[];
}

/**
 * Subscription information
 */
export interface Subscription {
  /** Subscription tier */
  tier: SubscriptionTier;
  /** Maximum number of teams */
  maxTeams: number;
  /** Maximum number of projects */
  maxProjects: number;
  /** Maximum number of users */
  maxUsers: number;
  /** Subscription start date */
  startDate: Date;
  /** Subscription end date */
  endDate?: Date;
  /** Whether subscription is active */
  isActive: boolean;
}

/**
 * Organization settings
 */
export interface OrganizationSettings {
  /** Default quality thresholds */
  defaultThresholds: Record<string, number>;
  /** Require two-factor authentication */
  require2FA: boolean;
  /** SSO configuration */
  ssoEnabled: boolean;
  /** Data retention period in days */
  dataRetentionDays: number;
}

/**
 * Organization model
 */
export interface Organization {
  /** Unique organization identifier */
  id: string;
  /** Organization name */
  name: string;
  /** Organization settings */
  settings: OrganizationSettings;
  /** Organization-wide policies */
  policies: string[];
  /** Teams in this organization */
  teams: Team[];
  /** Subscription information */
  subscription: Subscription;
  /** Compliance settings */
  compliance: ComplianceSettings;
  /** When the organization was created */
  createdAt: Date;
  /** When the organization was last updated */
  updatedAt: Date;
}

/**
 * Technical debt breakdown by category
 */
export interface DebtBreakdown {
  /** Security-related debt in minutes */
  security: number;
  /** Performance-related debt in minutes */
  performance: number;
  /** Maintainability-related debt in minutes */
  maintainability: number;
  /** Reliability-related debt in minutes */
  reliability: number;
  /** Code duplication debt in minutes */
  duplications: number;
}

/**
 * Debt priority item
 */
export interface DebtPriority {
  /** Issue ID */
  issueId: string;
  /** Priority score (higher = more important) */
  score: number;
  /** Estimated effort in minutes */
  effort: number;
  /** Business impact */
  impact: BusinessImpact;
}

/**
 * Technical debt metrics
 */
export interface TechnicalDebtMetrics {
  /** Total technical debt in minutes */
  totalMinutes: number;
  /** Breakdown by category */
  breakdown: DebtBreakdown;
  /** Trend direction */
  trend: TrendDirection;
  /** Prioritized debt items */
  priority: DebtPriority[];
}

/**
 * Baseline metrics snapshot
 */
export interface BaselineMetrics {
  /** Overall code quality score (0-100) */
  codeQuality: number;
  /** Technical debt metrics */
  technicalDebt: TechnicalDebtMetrics;
  /** Test coverage percentage */
  testCoverage: number;
  /** Complexity metrics */
  complexity: QualityMetrics['complexity'];
  /** Security metrics */
  security: QualityMetrics['security'];
  /** Maintainability index (0-100) */
  maintainability: number;
}

/**
 * Quality thresholds for gates
 */
export interface QualityThresholds {
  /** Minimum code quality score */
  minCodeQuality: number;
  /** Maximum technical debt in minutes */
  maxTechnicalDebt: number;
  /** Minimum test coverage percentage */
  minTestCoverage: number;
  /** Maximum cyclomatic complexity */
  maxComplexity: number;
  /** Maximum security vulnerabilities */
  maxSecurityIssues: number;
}

/**
 * Quality baseline for a project
 */
export interface QualityBaseline {
  /** Project this baseline belongs to */
  projectId: string;
  /** When this baseline was established */
  establishedDate: Date;
  /** Baseline metrics snapshot */
  metrics: BaselineMetrics;
  /** Quality thresholds */
  thresholds: QualityThresholds;
  /** Baseline version identifier */
  version: string;
  /** Notes about this baseline */
  notes?: string;
}
