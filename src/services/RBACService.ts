/**
 * Role-Based Access Control (RBAC) Service
 * 
 * Implements comprehensive role-based access control for enterprise features.
 * Supports organization and team-level access controls with resource-based permissions.
 */

import { UserRole } from '../models/enterprise';

/**
 * Resource types that can be protected by RBAC
 */
export type ResourceType = 
  | 'organization'
  | 'team'
  | 'project'
  | 'report'
  | 'policy'
  | 'user'
  | 'integration'
  | 'baseline';

/**
 * Actions that can be performed on resources
 */
export type Action = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'approve'
  | 'assign';

/**
 * Permission definition
 */
export interface Permission {
  /** Resource type this permission applies to */
  resourceType: ResourceType;
  /** Action allowed on the resource */
  action: Action;
  /** Optional: specific resource ID (null = all resources of this type) */
  resourceId?: string;
  /** Optional: conditions that must be met */
  conditions?: PermissionCondition[];
}

/**
 * Permission condition
 */
export interface PermissionCondition {
  /** Field to check */
  field: string;
  /** Operator for comparison */
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains';
  /** Value to compare against */
  value: any;
}

/**
 * Role definition with permissions
 */
export interface Role {
  /** Role identifier */
  id: string;
  /** Role name */
  name: UserRole;
  /** Role description */
  description: string;
  /** Permissions granted to this role */
  permissions: Permission[];
  /** Whether this is a system role (cannot be modified) */
  isSystem: boolean;
}

/**
 * Access control entry
 */
export interface AccessControlEntry {
  /** User ID */
  userId: string;
  /** Role assigned */
  role: UserRole;
  /** Scope of access */
  scope: AccessScope;
  /** When this access was granted */
  grantedAt: Date;
  /** Who granted this access */
  grantedBy: string;
}

/**
 * Access scope definition
 */
export interface AccessScope {
  /** Scope type */
  type: 'organization' | 'team' | 'project';
  /** ID of the scoped resource */
  resourceId: string;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /** Whether permission is granted */
  granted: boolean;
  /** Reason for denial (if not granted) */
  reason?: string;
  /** Role that granted permission (if granted) */
  grantedByRole?: UserRole;
}

/**
 * RBAC Service
 */
export class RBACService {
  private roles: Map<UserRole, Role> = new Map();
  private accessControlList: Map<string, AccessControlEntry[]> = new Map();

  constructor() {
    this.initializeSystemRoles();
  }

  /**
   * Initialize system roles with default permissions
   */
  private initializeSystemRoles(): void {
    // Admin role - full access to everything
    this.roles.set('admin', {
      id: 'role-admin',
      name: 'admin',
      description: 'Full system access',
      isSystem: true,
      permissions: [
        { resourceType: 'organization', action: 'create' },
        { resourceType: 'organization', action: 'read' },
        { resourceType: 'organization', action: 'update' },
        { resourceType: 'organization', action: 'delete' },
        { resourceType: 'team', action: 'create' },
        { resourceType: 'team', action: 'read' },
        { resourceType: 'team', action: 'update' },
        { resourceType: 'team', action: 'delete' },
        { resourceType: 'project', action: 'create' },
        { resourceType: 'project', action: 'read' },
        { resourceType: 'project', action: 'update' },
        { resourceType: 'project', action: 'delete' },
        { resourceType: 'report', action: 'create' },
        { resourceType: 'report', action: 'read' },
        { resourceType: 'report', action: 'update' },
        { resourceType: 'report', action: 'delete' },
        { resourceType: 'policy', action: 'create' },
        { resourceType: 'policy', action: 'read' },
        { resourceType: 'policy', action: 'update' },
        { resourceType: 'policy', action: 'delete' },
        { resourceType: 'policy', action: 'approve' },
        { resourceType: 'user', action: 'create' },
        { resourceType: 'user', action: 'read' },
        { resourceType: 'user', action: 'update' },
        { resourceType: 'user', action: 'delete' },
        { resourceType: 'integration', action: 'create' },
        { resourceType: 'integration', action: 'read' },
        { resourceType: 'integration', action: 'update' },
        { resourceType: 'integration', action: 'delete' },
        { resourceType: 'baseline', action: 'create' },
        { resourceType: 'baseline', action: 'read' },
        { resourceType: 'baseline', action: 'update' },
        { resourceType: 'baseline', action: 'delete' },
      ],
    });

    // Manager role - team and project management
    this.roles.set('manager', {
      id: 'role-manager',
      name: 'manager',
      description: 'Team and project management access',
      isSystem: true,
      permissions: [
        { resourceType: 'organization', action: 'read' },
        { resourceType: 'team', action: 'create' },
        { resourceType: 'team', action: 'read' },
        { resourceType: 'team', action: 'update' },
        { resourceType: 'project', action: 'create' },
        { resourceType: 'project', action: 'read' },
        { resourceType: 'project', action: 'update' },
        { resourceType: 'report', action: 'create' },
        { resourceType: 'report', action: 'read' },
        { resourceType: 'policy', action: 'read' },
        { resourceType: 'policy', action: 'update' },
        { resourceType: 'user', action: 'read' },
        { resourceType: 'user', action: 'assign' },
        { resourceType: 'integration', action: 'read' },
        { resourceType: 'integration', action: 'update' },
        { resourceType: 'baseline', action: 'create' },
        { resourceType: 'baseline', action: 'read' },
        { resourceType: 'baseline', action: 'update' },
      ],
    });

    // Developer role - code analysis and issue management
    this.roles.set('developer', {
      id: 'role-developer',
      name: 'developer',
      description: 'Code analysis and issue management access',
      isSystem: true,
      permissions: [
        { resourceType: 'organization', action: 'read' },
        { resourceType: 'team', action: 'read' },
        { resourceType: 'project', action: 'read' },
        { resourceType: 'project', action: 'execute' },
        { resourceType: 'report', action: 'read' },
        { resourceType: 'policy', action: 'read' },
        { resourceType: 'user', action: 'read' },
        { resourceType: 'integration', action: 'read' },
        { resourceType: 'baseline', action: 'read' },
      ],
    });

    // Viewer role - read-only access
    this.roles.set('viewer', {
      id: 'role-viewer',
      name: 'viewer',
      description: 'Read-only access',
      isSystem: true,
      permissions: [
        { resourceType: 'organization', action: 'read' },
        { resourceType: 'team', action: 'read' },
        { resourceType: 'project', action: 'read' },
        { resourceType: 'report', action: 'read' },
        { resourceType: 'policy', action: 'read' },
        { resourceType: 'baseline', action: 'read' },
      ],
    });
  }

  /**
   * Grant access to a user for a specific scope
   */
  grantAccess(
    userId: string,
    role: UserRole,
    scope: AccessScope,
    grantedBy: string
  ): void {
    const entry: AccessControlEntry = {
      userId,
      role,
      scope,
      grantedAt: new Date(),
      grantedBy,
    };

    const userEntries = this.accessControlList.get(userId) || [];
    userEntries.push(entry);
    this.accessControlList.set(userId, userEntries);
  }

  /**
   * Revoke access from a user for a specific scope
   */
  revokeAccess(userId: string, scope: AccessScope): void {
    const userEntries = this.accessControlList.get(userId) || [];
    const filtered = userEntries.filter(
      entry => !(entry.scope.type === scope.type && entry.scope.resourceId === scope.resourceId)
    );
    this.accessControlList.set(userId, filtered);
  }

  /**
   * Check if a user has permission to perform an action on a resource
   */
  checkPermission(
    userId: string,
    resourceType: ResourceType,
    action: Action,
    resourceId?: string,
    context?: Record<string, any>
  ): PermissionCheckResult {
    const userEntries = this.accessControlList.get(userId) || [];

    // Check each access control entry
    for (const entry of userEntries) {
      const role = this.roles.get(entry.role);
      if (!role) continue;

      // Check if this role has the required permission
      for (const permission of role.permissions) {
        if (permission.resourceType !== resourceType) continue;
        if (permission.action !== action) continue;

        // If permission specifies a resource ID, it must match
        if (permission.resourceId && permission.resourceId !== resourceId) continue;

        // Check conditions if present
        if (permission.conditions && context) {
          const conditionsMet = this.evaluateConditions(permission.conditions, context);
          if (!conditionsMet) continue;
        }

        // Permission granted
        return {
          granted: true,
          grantedByRole: entry.role,
        };
      }
    }

    // No matching permission found
    return {
      granted: false,
      reason: `User does not have permission to ${action} ${resourceType}`,
    };
  }

  /**
   * Evaluate permission conditions
   */
  private evaluateConditions(
    conditions: PermissionCondition[],
    context: Record<string, any>
  ): boolean {
    return conditions.every(condition => {
      const contextValue = context[condition.field];

      switch (condition.operator) {
        case 'equals':
          return contextValue === condition.value;
        case 'not_equals':
          return contextValue !== condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(contextValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(contextValue);
        case 'contains':
          return Array.isArray(contextValue) && contextValue.includes(condition.value);
        default:
          return false;
      }
    });
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(userId: string): Permission[] {
    const userEntries = this.accessControlList.get(userId) || [];
    const permissions: Permission[] = [];

    for (const entry of userEntries) {
      const role = this.roles.get(entry.role);
      if (role) {
        permissions.push(...role.permissions);
      }
    }

    return permissions;
  }

  /**
   * Get all access control entries for a user
   */
  getUserAccess(userId: string): AccessControlEntry[] {
    return this.accessControlList.get(userId) || [];
  }

  /**
   * Get role definition
   */
  getRole(roleName: UserRole): Role | undefined {
    return this.roles.get(roleName);
  }

  /**
   * Get all roles
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Check if user has any role in a specific scope
   */
  hasRoleInScope(userId: string, scope: AccessScope): boolean {
    const userEntries = this.accessControlList.get(userId) || [];
    return userEntries.some(
      entry => entry.scope.type === scope.type && entry.scope.resourceId === scope.resourceId
    );
  }

  /**
   * Get user's role in a specific scope
   */
  getUserRoleInScope(userId: string, scope: AccessScope): UserRole | undefined {
    const userEntries = this.accessControlList.get(userId) || [];
    const entry = userEntries.find(
      e => e.scope.type === scope.type && e.scope.resourceId === scope.resourceId
    );
    return entry?.role;
  }

  /**
   * Get all users with access to a specific scope
   */
  getUsersInScope(scope: AccessScope): AccessControlEntry[] {
    const result: AccessControlEntry[] = [];
    
    for (const entries of this.accessControlList.values()) {
      const matchingEntries = entries.filter(
        entry => entry.scope.type === scope.type && entry.scope.resourceId === scope.resourceId
      );
      result.push(...matchingEntries);
    }

    return result;
  }
}
