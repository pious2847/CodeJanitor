/**
 * Tests for RBAC Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RBACService, AccessScope } from '../RBACService';

describe('RBACService', () => {
  let rbacService: RBACService;

  beforeEach(() => {
    rbacService = new RBACService();
  });

  describe('System Roles', () => {
    it('should initialize with system roles', () => {
      const roles = rbacService.getAllRoles();
      expect(roles).toHaveLength(4);
      expect(roles.map(r => r.name)).toContain('admin');
      expect(roles.map(r => r.name)).toContain('manager');
      expect(roles.map(r => r.name)).toContain('developer');
      expect(roles.map(r => r.name)).toContain('viewer');
    });

    it('should have admin role with full permissions', () => {
      const adminRole = rbacService.getRole('admin');
      expect(adminRole).toBeDefined();
      expect(adminRole?.permissions.length).toBeGreaterThan(20);
      expect(adminRole?.isSystem).toBe(true);
    });

    it('should have manager role with limited permissions', () => {
      const managerRole = rbacService.getRole('manager');
      expect(managerRole).toBeDefined();
      expect(managerRole?.permissions.length).toBeLessThan(rbacService.getRole('admin')!.permissions.length);
    });

    it('should have developer role with read and execute permissions', () => {
      const devRole = rbacService.getRole('developer');
      expect(devRole).toBeDefined();
      const actions = devRole?.permissions.map(p => p.action);
      expect(actions).toContain('read');
      expect(actions).toContain('execute');
      expect(actions).not.toContain('delete');
    });

    it('should have viewer role with only read permissions', () => {
      const viewerRole = rbacService.getRole('viewer');
      expect(viewerRole).toBeDefined();
      const actions = viewerRole?.permissions.map(p => p.action);
      expect(actions?.every(a => a === 'read')).toBe(true);
    });
  });

  describe('Access Control', () => {
    const orgScope: AccessScope = { type: 'organization', resourceId: 'org-1' };
    const teamScope: AccessScope = { type: 'team', resourceId: 'team-1' };

    it('should grant access to a user', () => {
      rbacService.grantAccess('user-1', 'admin', orgScope, 'system');
      const access = rbacService.getUserAccess('user-1');
      expect(access).toHaveLength(1);
      expect(access[0]?.role).toBe('admin');
      expect(access[0]?.scope).toEqual(orgScope);
    });

    it('should allow multiple access grants for different scopes', () => {
      rbacService.grantAccess('user-1', 'admin', orgScope, 'system');
      rbacService.grantAccess('user-1', 'manager', teamScope, 'admin-1');
      const access = rbacService.getUserAccess('user-1');
      expect(access).toHaveLength(2);
    });

    it('should revoke access from a user', () => {
      rbacService.grantAccess('user-1', 'admin', orgScope, 'system');
      rbacService.grantAccess('user-1', 'manager', teamScope, 'admin-1');
      rbacService.revokeAccess('user-1', orgScope);
      const access = rbacService.getUserAccess('user-1');
      expect(access).toHaveLength(1);
      expect(access[0]?.scope).toEqual(teamScope);
    });

    it('should check if user has role in scope', () => {
      rbacService.grantAccess('user-1', 'admin', orgScope, 'system');
      expect(rbacService.hasRoleInScope('user-1', orgScope)).toBe(true);
      expect(rbacService.hasRoleInScope('user-1', teamScope)).toBe(false);
    });

    it('should get user role in scope', () => {
      rbacService.grantAccess('user-1', 'manager', teamScope, 'admin-1');
      const role = rbacService.getUserRoleInScope('user-1', teamScope);
      expect(role).toBe('manager');
    });

    it('should get all users in scope', () => {
      rbacService.grantAccess('user-1', 'admin', orgScope, 'system');
      rbacService.grantAccess('user-2', 'manager', orgScope, 'admin-1');
      const users = rbacService.getUsersInScope(orgScope);
      expect(users).toHaveLength(2);
    });
  });

  describe('Permission Checking', () => {
    const orgScope: AccessScope = { type: 'organization', resourceId: 'org-1' };

    it('should grant permission for admin to create organization', () => {
      rbacService.grantAccess('user-1', 'admin', orgScope, 'system');
      const result = rbacService.checkPermission('user-1', 'organization', 'create');
      expect(result.granted).toBe(true);
      expect(result.grantedByRole).toBe('admin');
    });

    it('should deny permission for viewer to delete project', () => {
      rbacService.grantAccess('user-1', 'viewer', orgScope, 'system');
      const result = rbacService.checkPermission('user-1', 'project', 'delete');
      expect(result.granted).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should grant permission for manager to update team', () => {
      rbacService.grantAccess('user-1', 'manager', orgScope, 'system');
      const result = rbacService.checkPermission('user-1', 'team', 'update');
      expect(result.granted).toBe(true);
    });

    it('should grant permission for developer to execute project', () => {
      rbacService.grantAccess('user-1', 'developer', orgScope, 'system');
      const result = rbacService.checkPermission('user-1', 'project', 'execute');
      expect(result.granted).toBe(true);
    });

    it('should deny permission for developer to delete policy', () => {
      rbacService.grantAccess('user-1', 'developer', orgScope, 'system');
      const result = rbacService.checkPermission('user-1', 'policy', 'delete');
      expect(result.granted).toBe(false);
    });

    it('should deny permission for user without access', () => {
      const result = rbacService.checkPermission('user-1', 'organization', 'read');
      expect(result.granted).toBe(false);
    });
  });

  describe('User Permissions', () => {
    const orgScope: AccessScope = { type: 'organization', resourceId: 'org-1' };

    it('should get all permissions for a user', () => {
      rbacService.grantAccess('user-1', 'admin', orgScope, 'system');
      const permissions = rbacService.getUserPermissions('user-1');
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should aggregate permissions from multiple roles', () => {
      const teamScope: AccessScope = { type: 'team', resourceId: 'team-1' };
      rbacService.grantAccess('user-1', 'manager', orgScope, 'system');
      rbacService.grantAccess('user-1', 'developer', teamScope, 'manager-1');
      const permissions = rbacService.getUserPermissions('user-1');
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should return empty array for user without access', () => {
      const permissions = rbacService.getUserPermissions('user-unknown');
      expect(permissions).toEqual([]);
    });
  });

  describe('Resource-specific Permissions', () => {
    const orgScope: AccessScope = { type: 'organization', resourceId: 'org-1' };

    it('should check permission for specific resource ID', () => {
      rbacService.grantAccess('user-1', 'admin', orgScope, 'system');
      const result = rbacService.checkPermission('user-1', 'project', 'read', 'project-1');
      expect(result.granted).toBe(true);
    });
  });
});
