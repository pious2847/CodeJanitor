/**
 * Policy Engine Service
 * 
 * Manages policy definition, evaluation, inheritance, versioning, and exception management.
 * Supports hierarchical configuration from organization → team → project levels.
 */

import { CodeIssue, Certainty } from '../models/types';

/**
 * Policy scope levels
 */
export type PolicyScope = 'organization' | 'team' | 'project';

/**
 * Rule types supported by the policy engine
 */
export type RuleType =
  | 'complexity_threshold'
  | 'security_pattern'
  | 'naming_convention'
  | 'code_duplication'
  | 'test_coverage'
  | 'accessibility'
  | 'performance'
  | 'custom';

/**
 * Rule condition operators
 */
export type RuleOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'matches';

/**
 * Rule action types
 */
export type RuleAction = 'flag' | 'block' | 'warn' | 'auto_fix';

/**
 * Policy rule condition
 */
export interface RuleCondition {
  /** Field to evaluate */
  field: string;
  /** Comparison operator */
  operator: RuleOperator;
  /** Value to compare against */
  value: any;
}

/**
 * Policy rule definition
 */
export interface PolicyRule {
  /** Unique rule identifier */
  id: string;
  /** Rule type */
  type: RuleType;
  /** Rule severity */
  severity: Certainty;
  /** Rule condition */
  condition: RuleCondition;
  /** Action to take when rule is violated */
  action: RuleAction;
  /** Rule-specific parameters */
  parameters: Record<string, any>;
  /** Whether this rule is enabled */
  enabled: boolean;
}

/**
 * Policy exception
 */
export interface PolicyException {
  /** Unique exception identifier */
  id: string;
  /** Rule this exception applies to */
  ruleId: string;
  /** Scope of the exception */
  scope: 'file' | 'directory' | 'issue';
  /** Target of the exception (file path, directory, or issue ID) */
  target: string;
  /** Reason for the exception */
  reason: string;
  /** Who created the exception */
  createdBy: string;
  /** When the exception was created */
  createdAt: Date;
  /** When the exception expires (undefined = permanent) */
  expiresAt?: Date;
  /** Whether this exception is active */
  isActive: boolean;
}

/**
 * Policy definition
 */
export interface Policy {
  /** Unique policy identifier */
  id: string;
  /** Policy name */
  name: string;
  /** Policy description */
  description: string;
  /** Policy scope */
  scope: PolicyScope;
  /** Rules in this policy */
  rules: PolicyRule[];
  /** Exceptions to this policy */
  exceptions: PolicyException[];
  /** Whether auto-fix is enabled */
  autoFix: boolean;
  /** Whether this policy is enabled */
  enabled: boolean;
  /** Policy version */
  version: string;
  /** When this policy was created */
  createdAt: Date;
  /** When this policy was last updated */
  updatedAt: Date;
  /** Who created this policy */
  createdBy: string;
}

/**
 * Policy violation
 */
export interface PolicyViolation {
  /** Policy that was violated */
  policyId: string;
  /** Rule that was violated */
  ruleId: string;
  /** Issue that caused the violation */
  issueId: string;
  /** Severity of the violation */
  severity: Certainty;
  /** Description of the violation */
  description: string;
  /** Whether an exception applies */
  hasException: boolean;
  /** Exception ID if applicable */
  exceptionId?: string;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluation {
  /** Policy that was evaluated */
  policyId: string;
  /** Issues that were evaluated */
  issues: CodeIssue[];
  /** Violations found */
  violations: PolicyViolation[];
  /** Whether the evaluation passed */
  passed: boolean;
  /** Evaluation timestamp */
  evaluatedAt: Date;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  /** Organization ID */
  organizationId: string;
  /** Report period start */
  periodStart: Date;
  /** Report period end */
  periodEnd: Date;
  /** Policies evaluated */
  policies: Policy[];
  /** Total violations */
  totalViolations: number;
  /** Violations by policy */
  violationsByPolicy: Record<string, number>;
  /** Violations by severity */
  violationsBySeverity: Record<Certainty, number>;
  /** Compliance score (0-100) */
  complianceScore: number;
  /** Generated at timestamp */
  generatedAt: Date;
}

/**
 * Policy version history entry
 */
export interface PolicyVersion {
  /** Version identifier */
  version: string;
  /** Policy snapshot at this version */
  policy: Policy;
  /** Changes made in this version */
  changes: string[];
  /** Who made the changes */
  changedBy: string;
  /** When the changes were made */
  changedAt: Date;
}

/**
 * Policy Engine Service
 */
export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();
  private policyVersions: Map<string, PolicyVersion[]> = new Map();

  /**
   * Create a new policy
   */
  async createPolicy(definition: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Policy> {
    const policy: Policy = {
      ...definition,
      id: this.generatePolicyId(definition.name, definition.scope),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(policy.id, policy);
    this.addPolicyVersion(policy, ['Policy created'], policy.createdBy);

    return policy;
  }

  /**
   * Update an existing policy
   */
  async updatePolicy(policyId: string, updates: Partial<Policy>, changedBy: string): Promise<Policy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const changes: string[] = [];
    const updatedPolicy: Policy = {
      ...policy,
      ...updates,
      id: policy.id, // Preserve ID
      createdAt: policy.createdAt, // Preserve creation date
      updatedAt: new Date(),
      version: this.incrementVersion(policy.version),
    };

    // Track changes
    if (updates.name && updates.name !== policy.name) {
      changes.push(`Name changed from "${policy.name}" to "${updates.name}"`);
    }
    if (updates.enabled !== undefined && updates.enabled !== policy.enabled) {
      changes.push(`Policy ${updates.enabled ? 'enabled' : 'disabled'}`);
    }
    if (updates.rules) {
      changes.push(`Rules updated (${updates.rules.length} rules)`);
    }

    this.policies.set(policyId, updatedPolicy);
    this.addPolicyVersion(updatedPolicy, changes, changedBy);

    return updatedPolicy;
  }

  /**
   * Get a policy by ID
   */
  async getPolicy(policyId: string): Promise<Policy | undefined> {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies for a scope
   */
  async getPoliciesByScope(scope: PolicyScope): Promise<Policy[]> {
    return Array.from(this.policies.values()).filter(p => p.scope === scope && p.enabled);
  }

  /**
   * Inherit policies from organization → team → project hierarchy
   */
  inheritPolicies(_projectId: string, _teamId: string, _organizationId: string): Policy[] {
    const inherited: Policy[] = [];

    // Get organization policies
    const orgPolicies = Array.from(this.policies.values()).filter(
      p => p.scope === 'organization' && p.enabled
    );
    inherited.push(...orgPolicies);

    // Get team policies (override organization if same rule type)
    const teamPolicies = Array.from(this.policies.values()).filter(
      p => p.scope === 'team' && p.enabled
    );
    inherited.push(...teamPolicies);

    // Get project policies (override team and organization)
    const projectPolicies = Array.from(this.policies.values()).filter(
      p => p.scope === 'project' && p.enabled
    );
    inherited.push(...projectPolicies);

    // Remove duplicates, keeping the most specific scope
    return this.deduplicatePolicies(inherited);
  }

  /**
   * Evaluate a policy against code issues
   */
  evaluatePolicy(issues: CodeIssue[], policy: Policy): PolicyEvaluation {
    const violations: PolicyViolation[] = [];

    for (const issue of issues) {
      for (const rule of policy.rules) {
        if (!rule.enabled) continue;

        const violation = this.evaluateRule(issue, rule, policy);
        if (violation) {
          // Check for exceptions
          const exception = this.findApplicableException(issue, rule, policy);
          violation.hasException = !!exception;
          violation.exceptionId = exception?.id;

          // Only add violation if no active exception
          if (!exception || !exception.isActive) {
            violations.push(violation);
          }
        }
      }
    }

    return {
      policyId: policy.id,
      issues,
      violations,
      passed: violations.length === 0,
      evaluatedAt: new Date(),
    };
  }

  /**
   * Validate compliance for a set of issues against multiple policies
   */
  validateCompliance(
    issues: CodeIssue[],
    policies: Policy[],
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): ComplianceReport {
    const allViolations: PolicyViolation[] = [];
    const violationsByPolicy: Record<string, number> = {};
    const violationsBySeverity: Record<Certainty, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const policy of policies) {
      const evaluation = this.evaluatePolicy(issues, policy);
      allViolations.push(...evaluation.violations);
      violationsByPolicy[policy.id] = evaluation.violations.length;

      // Count by severity
      for (const violation of evaluation.violations) {
        violationsBySeverity[violation.severity]++;
      }
    }

    // Calculate compliance score (0-100)
    const totalChecks = issues.length * policies.length;
    const complianceScore = totalChecks > 0 
      ? Math.round(((totalChecks - allViolations.length) / totalChecks) * 100)
      : 100;

    return {
      organizationId,
      periodStart,
      periodEnd,
      policies,
      totalViolations: allViolations.length,
      violationsByPolicy,
      violationsBySeverity,
      complianceScore,
      generatedAt: new Date(),
    };
  }

  /**
   * Add a policy exception
   */
  async addException(policyId: string, exception: Omit<PolicyException, 'id' | 'createdAt'>): Promise<PolicyException> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const newException: PolicyException = {
      ...exception,
      id: this.generateExceptionId(policyId, exception.target),
      createdAt: new Date(),
    };

    policy.exceptions.push(newException);
    policy.updatedAt = new Date();
    this.policies.set(policyId, policy);

    return newException;
  }

  /**
   * Remove a policy exception
   */
  async removeException(policyId: string, exceptionId: string): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    policy.exceptions = policy.exceptions.filter(e => e.id !== exceptionId);
    policy.updatedAt = new Date();
    this.policies.set(policyId, policy);
  }

  /**
   * Get policy version history
   */
  async getPolicyVersions(policyId: string): Promise<PolicyVersion[]> {
    return this.policyVersions.get(policyId) || [];
  }

  /**
   * Get issues for a specific project
   */
  async getProjectIssues(_projectId: string): Promise<CodeIssue[]> {
    // This would typically query a database or issue store
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Private helper methods
   */

  private generatePolicyId(name: string, scope: PolicyScope): string {
    const timestamp = Date.now();
    const sanitized = name.toLowerCase().replace(/\s+/g, '-');
    return `${scope}-${sanitized}-${timestamp}`;
  }

  private generateExceptionId(policyId: string, _target: string): string {
    const timestamp = Date.now();
    return `exception-${policyId}-${timestamp}`;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0', 10) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private addPolicyVersion(policy: Policy, changes: string[], changedBy: string): void {
    const versions = this.policyVersions.get(policy.id) || [];
    versions.push({
      version: policy.version,
      policy: { ...policy },
      changes,
      changedBy,
      changedAt: new Date(),
    });
    this.policyVersions.set(policy.id, versions);
  }

  private deduplicatePolicies(policies: Policy[]): Policy[] {
    const seen = new Map<string, Policy>();
    
    // Process in reverse order so project overrides team overrides org
    for (let i = policies.length - 1; i >= 0; i--) {
      const policy = policies[i];
      if (!policy) continue;
      
      const key = `${policy.name}-${policy.scope}`;
      if (!seen.has(key)) {
        seen.set(key, policy);
      }
    }

    return Array.from(seen.values());
  }

  private evaluateRule(issue: CodeIssue, rule: PolicyRule, policy: Policy): PolicyViolation | null {
    // Evaluate the rule condition against the issue
    const conditionMet = this.evaluateCondition(issue, rule.condition);
    
    if (!conditionMet) {
      return null;
    }

    return {
      policyId: policy.id,
      ruleId: rule.id,
      issueId: issue.id,
      severity: rule.severity,
      description: `Policy "${policy.name}" violated: ${rule.type}`,
      hasException: false,
    };
  }

  private evaluateCondition(issue: CodeIssue, condition: RuleCondition): boolean {
    const fieldValue = this.getFieldValue(issue, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'matches':
        return typeof fieldValue === 'string' && new RegExp(condition.value).test(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(issue: CodeIssue, field: string): any {
    // Support nested field access with dot notation
    const parts = field.split('.');
    let value: any = issue;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private findApplicableException(issue: CodeIssue, rule: PolicyRule, policy: Policy): PolicyException | undefined {
    const now = new Date();
    
    return policy.exceptions.find(exception => {
      // Check if exception applies to this rule
      if (exception.ruleId !== rule.id) {
        return false;
      }

      // Check if exception is active
      if (!exception.isActive) {
        return false;
      }

      // Check if exception has expired
      if (exception.expiresAt && exception.expiresAt < now) {
        return false;
      }

      // Check if exception applies to this issue
      switch (exception.scope) {
        case 'issue':
          return exception.target === issue.id;
        case 'file':
          return issue.locations.some(loc => loc.filePath === exception.target);
        case 'directory':
          return issue.locations.some(loc => loc.filePath.startsWith(exception.target));
        default:
          return false;
      }
    });
  }
}
