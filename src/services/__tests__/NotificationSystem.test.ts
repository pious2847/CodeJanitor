/**
 * Tests for NotificationSystem service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationSystem, NotificationConfig, NotificationRule } from '../NotificationSystem';
import { User, EnterpriseCodeIssue } from '../../models/enterprise';

describe('NotificationSystem', () => {
  let notificationSystem: NotificationSystem;
  let testUser: User;
  let config: NotificationConfig;

  beforeEach(() => {
    config = {
      email: {
        enabled: true,
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        from: 'noreply@example.com',
      },
      slack: {
        enabled: true,
        webhookUrl: 'https://hooks.slack.com/test',
      },
      teams: {
        enabled: true,
        webhookUrl: 'https://outlook.office.com/webhook/test',
      },
      mobile: {
        enabled: true,
      },
    };

    notificationSystem = new NotificationSystem(config);

    testUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'developer',
    };
  });

  describe('Basic Notifications', () => {
    it('should send a notification', async () => {
      const notification = await notificationSystem.sendNotification(
        'custom',
        [testUser],
        'Test Subject',
        'Test Body',
        ['email', 'in_app'],
        'normal'
      );

      expect(notification).toBeDefined();
      expect(notification.id).toBeDefined();
      expect(notification.subject).toBe('Test Subject');
      expect(notification.body).toBe('Test Body');
      expect(notification.recipients).toHaveLength(1);
      expect(notification.channels).toContain('email');
      expect(notification.channels).toContain('in_app');
      expect(notification.status).toBe('sent');
    });

    it('should send notification to multiple recipients', async () => {
      const user2: User = {
        id: 'user-2',
        email: 'test2@example.com',
        name: 'Test User 2',
        role: 'manager',
      };

      const notification = await notificationSystem.sendNotification(
        'custom',
        [testUser, user2],
        'Test Subject',
        'Test Body',
        ['email'],
        'normal'
      );

      expect(notification.recipients).toHaveLength(2);
    });

    it('should send notification to multiple channels', async () => {
      const notification = await notificationSystem.sendNotification(
        'custom',
        [testUser],
        'Test Subject',
        'Test Body',
        ['email', 'slack', 'teams', 'mobile', 'in_app'],
        'urgent'
      );

      expect(notification.channels).toHaveLength(5);
      expect(notification.priority).toBe('urgent');
    });
  });

  describe('Issue Notifications', () => {
    it('should notify when issue is assigned', async () => {
      const issue: EnterpriseCodeIssue = {
        id: 'issue-1',
        type: 'unused-import',
        certainty: 'high',
        reason: 'Import is never used',
        locations: [],
        safeFixAvailable: true,
        symbolName: 'unusedImport',
        teamId: 'team-1',
        projectId: 'project-1',
        priority: 'high',
        businessImpact: {
          category: 'maintainability',
          severity: 'low',
          riskLevel: 'low',
        },
        estimatedEffort: {
          minutes: 5,
          confidence: 0.9,
          complexity: 'trivial',
        },
        relatedIssues: [],
        policyViolations: [],
        historicalOccurrences: 0,
        firstDetected: new Date(),
        lastUpdated: new Date(),
      };

      const notification = await notificationSystem.notifyIssueAssigned(issue, testUser);

      expect(notification).toBeDefined();
      expect(notification.type).toBe('issue_assigned');
      expect(notification.subject).toContain('unused-import');
      expect(notification.body).toContain('unusedImport');
      expect(notification.recipients[0]!.id).toBe(testUser.id);
    });

    it('should notify quality gate failure', async () => {
      const stakeholders: User[] = [
        testUser,
        {
          id: 'manager-1',
          email: 'manager@example.com',
          name: 'Manager',
          role: 'manager',
        },
      ];

      const notification = await notificationSystem.notifyQualityGateFailed(
        'project-1',
        stakeholders,
        ['Code Coverage < 80%', 'Complexity > 10']
      );

      expect(notification).toBeDefined();
      expect(notification.type).toBe('quality_gate_failed');
      expect(notification.priority).toBe('urgent');
      expect(notification.recipients).toHaveLength(2);
      expect(notification.body).toContain('Code Coverage < 80%');
      expect(notification.channels).toContain('mobile');
    });

    it('should notify policy violation', async () => {
      const issue: EnterpriseCodeIssue = {
        id: 'issue-1',
        type: 'security-vulnerability',
        certainty: 'high',
        reason: 'Hardcoded secret detected',
        locations: [],
        safeFixAvailable: false,
        symbolName: 'apiKey',
        teamId: 'team-1',
        projectId: 'project-1',
        priority: 'critical',
        businessImpact: {
          category: 'security',
          severity: 'critical',
          riskLevel: 'critical',
        },
        estimatedEffort: {
          minutes: 30,
          confidence: 0.8,
          complexity: 'moderate',
        },
        relatedIssues: [],
        policyViolations: ['no-hardcoded-secrets', 'security-best-practices'],
        historicalOccurrences: 0,
        firstDetected: new Date(),
        lastUpdated: new Date(),
      };

      const notification = await notificationSystem.notifyPolicyViolation(issue, [testUser]);

      expect(notification).toBeDefined();
      expect(notification.type).toBe('policy_violation');
      expect(notification.body).toContain('no-hardcoded-secrets');
      expect(notification.priority).toBe('urgent');
    });
  });

  describe('Notification Rules', () => {
    it('should add and retrieve notification rules', () => {
      const rule: NotificationRule = {
        id: 'rule-1',
        name: 'Critical Issues',
        condition: {
          priority: ['critical'],
        },
        channels: ['email', 'slack', 'mobile'],
        targetRoles: ['manager', 'admin'],
        enabled: true,
      };

      notificationSystem.addRule(rule);

      const rules = notificationSystem.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]!.id).toBe('rule-1');
    });

    it('should remove notification rules', () => {
      const rule: NotificationRule = {
        id: 'rule-1',
        name: 'Test Rule',
        condition: {},
        channels: ['email'],
        targetRoles: ['developer'],
        enabled: true,
      };

      notificationSystem.addRule(rule);
      expect(notificationSystem.getRules()).toHaveLength(1);

      notificationSystem.removeRule('rule-1');
      expect(notificationSystem.getRules()).toHaveLength(0);
    });

    it('should route notifications based on rules', async () => {
      const rule: NotificationRule = {
        id: 'rule-1',
        name: 'Security Issues',
        condition: {
          issueType: ['security-vulnerability'],
          priority: ['critical', 'high'],
        },
        channels: ['email', 'slack'],
        targetRoles: ['manager'],
        enabled: true,
      };

      notificationSystem.addRule(rule);

      const manager: User = {
        id: 'manager-1',
        email: 'manager@example.com',
        name: 'Manager',
        role: 'manager',
      };

      const issue: EnterpriseCodeIssue = {
        id: 'issue-1',
        type: 'security-vulnerability',
        certainty: 'high',
        reason: 'SQL injection vulnerability',
        locations: [],
        safeFixAvailable: false,
        symbolName: 'query',
        teamId: 'team-1',
        projectId: 'project-1',
        priority: 'critical',
        businessImpact: {
          category: 'security',
          severity: 'critical',
          riskLevel: 'critical',
        },
        estimatedEffort: {
          minutes: 120,
          confidence: 0.7,
          complexity: 'complex',
        },
        relatedIssues: [],
        policyViolations: [],
        historicalOccurrences: 0,
        firstDetected: new Date(),
        lastUpdated: new Date(),
      };

      const notifications = await notificationSystem.routeNotification(issue, [testUser, manager]);

      expect(notifications).toHaveLength(1);
      expect(notifications[0]!.recipients).toHaveLength(1);
      expect(notifications[0]!.recipients[0]!.role).toBe('manager');
      expect(notifications[0]!.channels).toContain('email');
      expect(notifications[0]!.channels).toContain('slack');
    });

    it('should not route notifications for disabled rules', async () => {
      const rule: NotificationRule = {
        id: 'rule-1',
        name: 'Disabled Rule',
        condition: {
          issueType: ['unused-import'],
        },
        channels: ['email'],
        targetRoles: ['developer'],
        enabled: false,
      };

      notificationSystem.addRule(rule);

      const issue: EnterpriseCodeIssue = {
        id: 'issue-1',
        type: 'unused-import',
        certainty: 'high',
        reason: 'Import is never used',
        locations: [],
        safeFixAvailable: true,
        symbolName: 'unusedImport',
        teamId: 'team-1',
        projectId: 'project-1',
        priority: 'low',
        businessImpact: {
          category: 'maintainability',
          severity: 'low',
          riskLevel: 'low',
        },
        estimatedEffort: {
          minutes: 5,
          confidence: 0.9,
          complexity: 'trivial',
        },
        relatedIssues: [],
        policyViolations: [],
        historicalOccurrences: 0,
        firstDetected: new Date(),
        lastUpdated: new Date(),
      };

      const notifications = await notificationSystem.routeNotification(issue, [testUser]);

      expect(notifications).toHaveLength(0);
    });
  });

  describe('Notification Management', () => {
    it('should retrieve notification by ID', async () => {
      const notification = await notificationSystem.sendNotification(
        'custom',
        [testUser],
        'Test',
        'Test Body',
        ['in_app'],
        'normal'
      );

      const retrieved = notificationSystem.getNotification(notification.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(notification.id);
    });

    it('should get user notifications', async () => {
      await notificationSystem.sendNotification(
        'custom',
        [testUser],
        'Test 1',
        'Body 1',
        ['in_app'],
        'normal'
      );

      await notificationSystem.sendNotification(
        'custom',
        [testUser],
        'Test 2',
        'Body 2',
        ['in_app'],
        'normal'
      );

      const notifications = notificationSystem.getUserNotifications(testUser.id);
      expect(notifications).toHaveLength(2);
    });

    it('should filter user notifications by status', async () => {
      const notification = await notificationSystem.sendNotification(
        'custom',
        [testUser],
        'Test',
        'Body',
        ['in_app'],
        'normal'
      );

      notificationSystem.markAsRead(notification.id);

      const unreadNotifications = notificationSystem.getUserNotifications(testUser.id, 'sent');
      const readNotifications = notificationSystem.getUserNotifications(testUser.id, 'read');

      expect(unreadNotifications).toHaveLength(0);
      expect(readNotifications).toHaveLength(1);
    });

    it('should mark notification as read', async () => {
      const notification = await notificationSystem.sendNotification(
        'custom',
        [testUser],
        'Test',
        'Body',
        ['in_app'],
        'normal'
      );

      expect(notification.status).toBe('sent');
      expect(notification.readAt).toBeUndefined();

      notificationSystem.markAsRead(notification.id);

      const updated = notificationSystem.getNotification(notification.id);
      expect(updated?.status).toBe('read');
      expect(updated?.readAt).toBeDefined();
    });
  });
});
