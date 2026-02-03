/**
 * NotificationSystem Service
 * 
 * Multi-channel notification delivery system for enterprise features including:
 * - Email notifications
 * - Slack integration
 * - Microsoft Teams integration
 * - Mobile push notifications
 * - Stakeholder notification routing based on roles
 * 
 * Requirements: 4.8, 9.3, 10.3
 */

import { User, EnterpriseCodeIssue, Priority } from '../models/enterprise';

/**
 * Notification channel types
 */
export type NotificationChannel = 'email' | 'slack' | 'teams' | 'mobile' | 'in_app';

/**
 * Notification priority
 */
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

/**
 * Notification status
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

/**
 * Notification template
 */
export interface NotificationTemplate {
  /** Template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Subject line (for email) */
  subject: string;
  /** Message body template */
  body: string;
  /** Supported channels */
  channels: NotificationChannel[];
  /** Template variables */
  variables: string[];
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  /** Email configuration */
  email?: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    from: string;
    username?: string;
    password?: string;
  };
  /** Slack configuration */
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    botToken?: string;
    defaultChannel?: string;
  };
  /** Microsoft Teams configuration */
  teams?: {
    enabled: boolean;
    webhookUrl: string;
  };
  /** Mobile push configuration */
  mobile?: {
    enabled: boolean;
    fcmServerKey?: string;
    apnsKeyId?: string;
    apnsTeamId?: string;
  };
}

/**
 * Notification message
 */
export interface Notification {
  /** Unique notification identifier */
  id: string;
  /** Notification type */
  type: 'issue_assigned' | 'issue_resolved' | 'quality_gate_failed' | 'report_ready' | 'policy_violation' | 'custom';
  /** Priority level */
  priority: NotificationPriority;
  /** Target channels */
  channels: NotificationChannel[];
  /** Recipients */
  recipients: User[];
  /** Subject/title */
  subject: string;
  /** Message body */
  body: string;
  /** Additional data */
  data?: Record<string, any>;
  /** Status */
  status: NotificationStatus;
  /** When the notification was created */
  createdAt: Date;
  /** When the notification was sent */
  sentAt?: Date;
  /** When the notification was delivered */
  deliveredAt?: Date;
  /** When the notification was read */
  readAt?: Date;
  /** Error message if failed */
  error?: string;
}

/**
 * Notification rule for routing
 */
export interface NotificationRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Condition for triggering notification */
  condition: {
    issueType?: string[];
    priority?: Priority[];
    teamId?: string;
    projectId?: string;
  };
  /** Target channels */
  channels: NotificationChannel[];
  /** Target roles */
  targetRoles: User['role'][];
  /** Specific users to notify */
  targetUsers?: string[];
  /** Whether this rule is enabled */
  enabled: boolean;
}

/**
 * Delivery result
 */
export interface DeliveryResult {
  /** Notification ID */
  notificationId: string;
  /** Channel used */
  channel: NotificationChannel;
  /** Whether delivery was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Delivery timestamp */
  timestamp: Date;
}

/**
 * NotificationSystem service
 */
export class NotificationSystem {
  private config: NotificationConfig;
  private notifications: Map<string, Notification> = new Map();
  private rules: Map<string, NotificationRule> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor(config: NotificationConfig) {
    this.config = config;
    this.initializeDefaultTemplates();
  }

  /**
   * Send a notification
   */
  async sendNotification(
    type: Notification['type'],
    recipients: User[],
    subject: string,
    body: string,
    channels: NotificationChannel[],
    priority: NotificationPriority = 'normal',
    data?: Record<string, any>
  ): Promise<Notification> {
    const notificationId = this.generateId('notification');
    const now = new Date();

    const notification: Notification = {
      id: notificationId,
      type,
      priority,
      channels,
      recipients,
      subject,
      body,
      data,
      status: 'pending',
      createdAt: now,
    };

    this.notifications.set(notificationId, notification);

    // Send to all channels
    const results = await this.deliverToChannels(notification);

    // Update notification status based on results
    const allSuccessful = results.every((r) => r.success);
    notification.status = allSuccessful ? 'sent' : 'failed';
    notification.sentAt = now;

    if (!allSuccessful) {
      const errors = results.filter((r) => !r.success).map((r) => r.error);
      notification.error = errors.join('; ');
    }

    return notification;
  }

  /**
   * Send notification for issue assignment
   */
  async notifyIssueAssigned(issue: EnterpriseCodeIssue, assignee: User): Promise<Notification> {
    const subject = `Issue Assigned: ${issue.type} - ${issue.symbolName}`;
    const body = `You have been assigned a new issue:\n\nType: ${issue.type}\nSymbol: ${issue.symbolName}\nPriority: ${issue.priority}\nReason: ${issue.reason}`;

    const channels = this.determineChannels(issue.priority);
    const priority = this.mapIssuePriorityToNotificationPriority(issue.priority);

    return this.sendNotification(
      'issue_assigned',
      [assignee],
      subject,
      body,
      channels,
      priority,
      { issueId: issue.id }
    );
  }

  /**
   * Send notification for quality gate failure
   */
  async notifyQualityGateFailed(
    projectId: string,
    stakeholders: User[],
    failedMetrics: string[]
  ): Promise<Notification> {
    const subject = `Quality Gate Failed: ${projectId}`;
    const body = `Quality gate has failed for project ${projectId}.\n\nFailed metrics:\n${failedMetrics.map((m) => `- ${m}`).join('\n')}`;

    return this.sendNotification(
      'quality_gate_failed',
      stakeholders,
      subject,
      body,
      ['email', 'slack', 'teams', 'mobile'],
      'urgent'
    );
  }

  /**
   * Send notification for policy violation
   */
  async notifyPolicyViolation(
    issue: EnterpriseCodeIssue,
    stakeholders: User[]
  ): Promise<Notification> {
    const subject = `Policy Violation: ${issue.type}`;
    const body = `A policy violation has been detected:\n\nType: ${issue.type}\nSymbol: ${issue.symbolName}\nReason: ${issue.reason}\nPolicies violated: ${issue.policyViolations.join(', ')}`;

    const priority = this.mapIssuePriorityToNotificationPriority(issue.priority);

    return this.sendNotification(
      'policy_violation',
      stakeholders,
      subject,
      body,
      ['email', 'slack'],
      priority,
      { issueId: issue.id }
    );
  }

  /**
   * Route notifications based on rules
   */
  async routeNotification(issue: EnterpriseCodeIssue, allUsers: User[]): Promise<Notification[]> {
    const matchingRules = this.findMatchingRules(issue);
    const notifications: Notification[] = [];

    for (const rule of matchingRules) {
      // Find target users based on roles
      const targetUsers = allUsers.filter((user) => {
        if (rule.targetRoles.includes(user.role)) {
          return true;
        }
        if (rule.targetUsers && rule.targetUsers.includes(user.id)) {
          return true;
        }
        return false;
      });

      if (targetUsers.length > 0) {
        const subject = `Code Quality Alert: ${issue.type}`;
        const body = `A code quality issue has been detected:\n\nType: ${issue.type}\nSymbol: ${issue.symbolName}\nPriority: ${issue.priority}\nReason: ${issue.reason}`;

        const notification = await this.sendNotification(
          'custom',
          targetUsers,
          subject,
          body,
          rule.channels,
          this.mapIssuePriorityToNotificationPriority(issue.priority),
          { issueId: issue.id, ruleId: rule.id }
        );

        notifications.push(notification);
      }
    }

    return notifications;
  }

  /**
   * Add a notification rule
   */
  addRule(rule: NotificationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a notification rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all notification rules
   */
  getRules(): NotificationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get notification by ID
   */
  getNotification(notificationId: string): Notification | undefined {
    return this.notifications.get(notificationId);
  }

  /**
   * Get notifications for a user
   */
  getUserNotifications(userId: string, status?: NotificationStatus): Notification[] {
    let notifications = Array.from(this.notifications.values()).filter((n) =>
      n.recipients.some((r) => r.id === userId)
    );

    if (status) {
      notifications = notifications.filter((n) => n.status === status);
    }

    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = 'read';
      notification.readAt = new Date();
    }
  }

  /**
   * Deliver notification to all channels
   */
  private async deliverToChannels(notification: Notification): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const channel of notification.channels) {
      try {
        let success = false;

        switch (channel) {
          case 'email':
            success = await this.sendEmail(notification);
            break;
          case 'slack':
            success = await this.sendSlack(notification);
            break;
          case 'teams':
            success = await this.sendTeams(notification);
            break;
          case 'mobile':
            success = await this.sendMobilePush(notification);
            break;
          case 'in_app':
            success = true; // In-app notifications are stored in the system
            break;
        }

        results.push({
          notificationId: notification.id,
          channel,
          success,
          timestamp: new Date(),
        });
      } catch (error) {
        results.push({
          notificationId: notification.id,
          channel,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: Notification): Promise<boolean> {
    if (!this.config.email?.enabled) {
      return false;
    }

    // In a real implementation, this would use nodemailer or similar
    console.log(`[EMAIL] To: ${notification.recipients.map((r) => r.email).join(', ')}`);
    console.log(`[EMAIL] Subject: ${notification.subject}`);
    console.log(`[EMAIL] Body: ${notification.body}`);

    return true;
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(notification: Notification): Promise<boolean> {
    if (!this.config.slack?.enabled) {
      return false;
    }

    // In a real implementation, this would use Slack Web API or webhook
    console.log(`[SLACK] Webhook: ${this.config.slack.webhookUrl}`);
    console.log(`[SLACK] Message: ${notification.subject}\n${notification.body}`);

    return true;
  }

  /**
   * Send Microsoft Teams notification
   */
  private async sendTeams(notification: Notification): Promise<boolean> {
    if (!this.config.teams?.enabled) {
      return false;
    }

    // In a real implementation, this would use Teams webhook
    console.log(`[TEAMS] Webhook: ${this.config.teams.webhookUrl}`);
    console.log(`[TEAMS] Message: ${notification.subject}\n${notification.body}`);

    return true;
  }

  /**
   * Send mobile push notification
   */
  private async sendMobilePush(notification: Notification): Promise<boolean> {
    if (!this.config.mobile?.enabled) {
      return false;
    }

    // In a real implementation, this would use FCM/APNS
    console.log(`[MOBILE] Recipients: ${notification.recipients.length}`);
    console.log(`[MOBILE] Title: ${notification.subject}`);
    console.log(`[MOBILE] Body: ${notification.body}`);

    return true;
  }

  /**
   * Find matching notification rules for an issue
   */
  private findMatchingRules(issue: EnterpriseCodeIssue): NotificationRule[] {
    return Array.from(this.rules.values()).filter((rule) => {
      if (!rule.enabled) {
        return false;
      }

      // Check issue type
      if (rule.condition.issueType && !rule.condition.issueType.includes(issue.type)) {
        return false;
      }

      // Check priority
      if (rule.condition.priority && !rule.condition.priority.includes(issue.priority)) {
        return false;
      }

      // Check team
      if (rule.condition.teamId && rule.condition.teamId !== issue.teamId) {
        return false;
      }

      // Check project
      if (rule.condition.projectId && rule.condition.projectId !== issue.projectId) {
        return false;
      }

      return true;
    });
  }

  /**
   * Determine channels based on priority
   */
  private determineChannels(priority: Priority): NotificationChannel[] {
    switch (priority) {
      case 'critical':
        return ['email', 'slack', 'teams', 'mobile', 'in_app'];
      case 'high':
        return ['email', 'slack', 'in_app'];
      case 'medium':
        return ['email', 'in_app'];
      case 'low':
        return ['in_app'];
      default:
        return ['in_app'];
    }
  }

  /**
   * Map issue priority to notification priority
   */
  private mapIssuePriorityToNotificationPriority(priority: Priority): NotificationPriority {
    switch (priority) {
      case 'critical':
        return 'urgent';
      case 'high':
        return 'high';
      case 'medium':
        return 'normal';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    this.templates.set('issue_assigned', {
      id: 'issue_assigned',
      name: 'Issue Assigned',
      subject: 'Issue Assigned: {{issueType}} - {{symbolName}}',
      body: 'You have been assigned a new issue:\n\nType: {{issueType}}\nSymbol: {{symbolName}}\nPriority: {{priority}}\nReason: {{reason}}',
      channels: ['email', 'slack', 'in_app'],
      variables: ['issueType', 'symbolName', 'priority', 'reason'],
    });

    this.templates.set('quality_gate_failed', {
      id: 'quality_gate_failed',
      name: 'Quality Gate Failed',
      subject: 'Quality Gate Failed: {{projectId}}',
      body: 'Quality gate has failed for project {{projectId}}.\n\nFailed metrics:\n{{failedMetrics}}',
      channels: ['email', 'slack', 'teams', 'mobile'],
      variables: ['projectId', 'failedMetrics'],
    });
  }

  /**
   * Generate unique IDs
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
