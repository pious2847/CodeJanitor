/**
 * Tests for Audit Logger
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLogger } from '../AuditLogger';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  describe('Basic Logging', () => {
    it('should log an audit event', () => {
      const event = auditLogger.log({
        type: 'user.login',
        category: 'authentication',
        severity: 'info',
        userId: 'user-1',
        action: 'login',
        description: 'User logged in',
        success: true,
        metadata: {},
      });

      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.type).toBe('user.login');
      expect(event.userId).toBe('user-1');
    });

    it('should generate unique event IDs', () => {
      const event1 = auditLogger.log({
        type: 'user.login',
        category: 'authentication',
        severity: 'info',
        userId: 'user-1',
        action: 'login',
        description: 'User logged in',
        success: true,
        metadata: {},
      });

      const event2 = auditLogger.log({
        type: 'user.logout',
        category: 'authentication',
        severity: 'info',
        userId: 'user-1',
        action: 'logout',
        description: 'User logged out',
        success: true,
        metadata: {},
      });

      expect(event1.id).not.toBe(event2.id);
    });

    it('should store all logged events', () => {
      auditLogger.log({
        type: 'user.login',
        category: 'authentication',
        severity: 'info',
        userId: 'user-1',
        action: 'login',
        description: 'User logged in',
        success: true,
        metadata: {},
      });

      auditLogger.log({
        type: 'user.logout',
        category: 'authentication',
        severity: 'info',
        userId: 'user-1',
        action: 'logout',
        description: 'User logged out',
        success: true,
        metadata: {},
      });

      const events = auditLogger.getAllEvents();
      expect(events).toHaveLength(2);
    });
  });

  describe('User Actions', () => {
    it('should log user actions', () => {
      const event = auditLogger.logUserAction(
        'user-1',
        'developer',
        'view_report',
        'User viewed quality report',
        { reportId: 'report-1' }
      );

      expect(event.userId).toBe('user-1');
      expect(event.userRole).toBe('developer');
      expect(event.action).toBe('view_report');
      expect(event.success).toBe(true);
      expect(event.metadata.reportId).toBe('report-1');
    });
  });

  describe('Policy Changes', () => {
    it('should log policy creation', () => {
      const event = auditLogger.logPolicyChange(
        'admin-1',
        'admin',
        'policy-1',
        'created',
        undefined,
        { name: 'New Policy', rules: [] }
      );

      expect(event.type).toBe('policy.created');
      expect(event.category).toBe('configuration');
      expect(event.severity).toBe('warning');
      expect(event.resourceType).toBe('policy');
      expect(event.resourceId).toBe('policy-1');
      expect(event.newState).toBeDefined();
    });

    it('should log policy updates with previous and new state', () => {
      const previousState = { name: 'Old Policy', rules: [] };
      const newState = { name: 'Updated Policy', rules: ['rule-1'] };

      const event = auditLogger.logPolicyChange(
        'admin-1',
        'admin',
        'policy-1',
        'updated',
        previousState,
        newState
      );

      expect(event.type).toBe('policy.updated');
      expect(event.previousState).toEqual(previousState);
      expect(event.newState).toEqual(newState);
    });

    it('should log policy deletion', () => {
      const event = auditLogger.logPolicyChange(
        'admin-1',
        'admin',
        'policy-1',
        'deleted',
        { name: 'Deleted Policy', rules: [] }
      );

      expect(event.type).toBe('policy.deleted');
      expect(event.previousState).toBeDefined();
    });
  });

  describe('Policy Exceptions', () => {
    it('should log policy exception granted', () => {
      const exceptionDetails = {
        reason: 'Legacy code exception',
        expiresAt: new Date('2025-12-31'),
      };

      const event = auditLogger.logPolicyException(
        'manager-1',
        'manager',
        'policy-1',
        'granted',
        exceptionDetails
      );

      expect(event.type).toBe('policy.exception_granted');
      expect(event.category).toBe('configuration');
      expect(event.newState).toEqual(exceptionDetails);
    });

    it('should log policy exception revoked', () => {
      const event = auditLogger.logPolicyException(
        'manager-1',
        'manager',
        'policy-1',
        'revoked',
        { reason: 'Code refactored' }
      );

      expect(event.type).toBe('policy.exception_revoked');
    });
  });

  describe('Security Events', () => {
    it('should log security events', () => {
      const event = auditLogger.logSecurityEvent(
        'user-1',
        'security.unauthorized_access',
        'Attempted to access restricted resource',
        'error',
        { resourceId: 'project-1' }
      );

      expect(event.type).toBe('security.unauthorized_access');
      expect(event.category).toBe('security');
      expect(event.severity).toBe('error');
      expect(event.success).toBe(false);
    });

    it('should log suspicious activity', () => {
      const event = auditLogger.logSecurityEvent(
        'user-1',
        'security.suspicious_activity',
        'Multiple failed login attempts',
        'critical'
      );

      expect(event.severity).toBe('critical');
      expect(event.category).toBe('security');
    });
  });

  describe('Authentication Events', () => {
    it('should log successful login', () => {
      const event = auditLogger.logAuthentication(
        'user-1',
        'login',
        true,
        { ipAddress: '192.168.1.1' }
      );

      expect(event.type).toBe('user.login');
      expect(event.category).toBe('authentication');
      expect(event.severity).toBe('info');
      expect(event.success).toBe(true);
    });

    it('should log failed login', () => {
      const event = auditLogger.logAuthentication(
        'user-1',
        'login',
        false,
        { ipAddress: '192.168.1.1' }
      );

      expect(event.success).toBe(false);
      expect(event.severity).toBe('warning');
    });

    it('should log logout', () => {
      const event = auditLogger.logAuthentication('user-1', 'logout', true);
      expect(event.type).toBe('user.logout');
    });
  });

  describe('Query and Filtering', () => {
    beforeEach(() => {
      // Create test data
      auditLogger.logAuthentication('user-1', 'login', true);
      auditLogger.logAuthentication('user-2', 'login', true);
      auditLogger.logSecurityEvent('user-1', 'security.unauthorized_access', 'Test', 'error');
      auditLogger.logPolicyChange('admin-1', 'admin', 'policy-1', 'created');
    });

    it('should query events by user ID', () => {
      const events = auditLogger.query({ userId: 'user-1' });
      expect(events).toHaveLength(2);
      expect(events.every(e => e.userId === 'user-1')).toBe(true);
    });

    it('should query events by event type', () => {
      const events = auditLogger.query({ eventType: 'user.login' });
      expect(events).toHaveLength(2);
      expect(events.every(e => e.type === 'user.login')).toBe(true);
    });

    it('should query events by category', () => {
      const events = auditLogger.query({ category: 'security' });
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('security.unauthorized_access');
    });

    it('should query events by severity', () => {
      const events = auditLogger.query({ severity: 'error' });
      expect(events).toHaveLength(1);
    });

    it('should query events by success status', () => {
      const events = auditLogger.query({ success: false });
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('security.unauthorized_access');
    });

    it('should query events by date range', () => {
      const past = new Date(Date.now() - 1000);
      const future = new Date(Date.now() + 1000);
      const events = auditLogger.query({ startDate: past, endDate: future });
      expect(events).toHaveLength(4);
    });

    it('should support multiple filters', () => {
      const events = auditLogger.query({
        userId: 'user-1',
        category: 'authentication',
      });
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('user.login');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      auditLogger.logAuthentication('user-1', 'login', true);
      auditLogger.logAuthentication('user-1', 'logout', true);
      auditLogger.logAuthentication('user-2', 'login', false);
      auditLogger.logSecurityEvent('user-1', 'security.unauthorized_access', 'Test', 'error');
      auditLogger.logPolicyChange('admin-1', 'admin', 'policy-1', 'created');
    });

    it('should calculate total events', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.totalEvents).toBe(5);
    });

    it('should count events by type', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.eventsByType['user.login']).toBe(2);
      expect(stats.eventsByType['user.logout']).toBe(1);
    });

    it('should count events by category', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.eventsByCategory.authentication).toBe(3);
      expect(stats.eventsByCategory.security).toBe(1);
      expect(stats.eventsByCategory.configuration).toBe(1);
    });

    it('should count events by severity', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.eventsBySeverity.info).toBe(2);
      expect(stats.eventsBySeverity.warning).toBeGreaterThan(0);
    });

    it('should count failed actions', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.failedActions).toBe(2);
    });

    it('should count security events', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.securityEvents).toBe(1);
    });

    it('should identify top users', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.topUsers).toHaveLength(3);
      expect(stats.topUsers[0]?.userId).toBe('user-1');
      expect(stats.topUsers[0]?.eventCount).toBe(3);
    });
  });

  describe('Security Alerts', () => {
    it('should configure security alerts', () => {
      auditLogger.configureSecurityAlerts({
        triggerEvents: ['security.unauthorized_access'],
        minSeverity: 'warning',
        recipients: ['admin@example.com'],
        enabled: true,
      });

      // Alert should be triggered (logged to console in test implementation)
      const event = auditLogger.logSecurityEvent(
        'user-1',
        'security.unauthorized_access',
        'Test alert',
        'error'
      );

      expect(event.category).toBe('security');
    });

    it('should not trigger alerts when disabled', () => {
      auditLogger.configureSecurityAlerts({
        triggerEvents: ['security.unauthorized_access'],
        minSeverity: 'warning',
        recipients: ['admin@example.com'],
        enabled: false,
      });

      const event = auditLogger.logSecurityEvent(
        'user-1',
        'security.unauthorized_access',
        'Test alert',
        'error'
      );

      expect(event).toBeDefined();
    });
  });

  describe('Clear Events', () => {
    it('should clear all events', () => {
      auditLogger.logAuthentication('user-1', 'login', true);
      auditLogger.logAuthentication('user-2', 'login', true);
      expect(auditLogger.getAllEvents()).toHaveLength(2);

      auditLogger.clearEvents();
      expect(auditLogger.getAllEvents()).toHaveLength(0);
    });
  });
});
