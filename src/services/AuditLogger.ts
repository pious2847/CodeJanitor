/**
 * Audit Logging System
 * 
 * Implements comprehensive user action logging, audit trails for policy changes,
 * and security event monitoring and alerting.
 */

import { UserRole } from '../models/enterprise';

/**
 * Audit event types
 */
export type AuditEventType =
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.role_changed'
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  | 'team.created'
  | 'team.updated'
  | 'team.deleted'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'policy.created'
  | 'policy.updated'
  | 'policy.deleted'
  | 'policy.exception_granted'
  | 'policy.exception_revoked'
  | 'report.generated'
  | 'report.exported'
  | 'analysis.started'
  | 'analysis.completed'
  | 'analysis.failed'
  | 'integration.configured'
  | 'integration.enabled'
  | 'integration.disabled'
  | 'security.unauthorized_access'
  | 'security.permission_denied'
  | 'security.suspicious_activity'
  | 'security.data_breach_attempt';

/**
 * Audit event severity
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Audit event category
 */
export type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'configuration'
  | 'security'
  | 'compliance';

/**
 * Audit event metadata
 */
export interface AuditMetadata {
  /** IP address of the user */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Session ID */
  sessionId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional context-specific data */
  [key: string]: any;
}

/**
 * Audit event
 */
export interface AuditEvent {
  /** Unique event identifier */
  id: string;
  /** Event type */
  type: AuditEventType;
  /** Event category */
  category: AuditCategory;
  /** Event severity */
  severity: AuditSeverity;
  /** User who performed the action */
  userId: string;
  /** User's role at the time of action */
  userRole?: UserRole;
  /** Resource type affected */
  resourceType?: string;
  /** Resource ID affected */
  resourceId?: string;
  /** Action performed */
  action: string;
  /** Description of the event */
  description: string;
  /** Previous state (for updates) */
  previousState?: any;
  /** New state (for updates) */
  newState?: any;
  /** Whether the action was successful */
  success: boolean;
  /** Error message if action failed */
  errorMessage?: string;
  /** Additional metadata */
  metadata: AuditMetadata;
  /** Timestamp of the event */
  timestamp: Date;
}

/**
 * Audit query filter
 */
export interface AuditQueryFilter {
  /** Filter by user ID */
  userId?: string;
  /** Filter by event type */
  eventType?: AuditEventType;
  /** Filter by category */
  category?: AuditCategory;
  /** Filter by severity */
  severity?: AuditSeverity;
  /** Filter by resource type */
  resourceType?: string;
  /** Filter by resource ID */
  resourceId?: string;
  /** Filter by date range start */
  startDate?: Date;
  /** Filter by date range end */
  endDate?: Date;
  /** Filter by success status */
  success?: boolean;
}

/**
 * Audit statistics
 */
export interface AuditStatistics {
  /** Total number of events */
  totalEvents: number;
  /** Events by type */
  eventsByType: Record<AuditEventType, number>;
  /** Events by category */
  eventsByCategory: Record<AuditCategory, number>;
  /** Events by severity */
  eventsBySeverity: Record<AuditSeverity, number>;
  /** Failed actions count */
  failedActions: number;
  /** Security events count */
  securityEvents: number;
  /** Most active users */
  topUsers: Array<{ userId: string; eventCount: number }>;
}

/**
 * Security alert configuration
 */
export interface SecurityAlertConfig {
  /** Event types that trigger alerts */
  triggerEvents: AuditEventType[];
  /** Minimum severity to trigger alert */
  minSeverity: AuditSeverity;
  /** Alert recipients */
  recipients: string[];
  /** Whether alerts are enabled */
  enabled: boolean;
}

/**
 * Audit Logger Service
 */
export class AuditLogger {
  private events: AuditEvent[] = [];
  private securityAlertConfig: SecurityAlertConfig | null = null;
  private eventIdCounter = 0;

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    this.events.push(auditEvent);

    // Check if this event should trigger a security alert
    if (this.shouldTriggerAlert(auditEvent)) {
      this.triggerSecurityAlert(auditEvent);
    }

    return auditEvent;
  }

  /**
   * Log a user action
   */
  logUserAction(
    userId: string,
    userRole: UserRole,
    action: string,
    description: string,
    metadata: AuditMetadata = {}
  ): AuditEvent {
    return this.log({
      type: this.inferEventType(action),
      category: 'data_access',
      severity: 'info',
      userId,
      userRole,
      action,
      description,
      success: true,
      metadata,
    });
  }

  /**
   * Log a policy change
   */
  logPolicyChange(
    userId: string,
    userRole: UserRole,
    policyId: string,
    action: 'created' | 'updated' | 'deleted',
    previousState?: any,
    newState?: any,
    metadata: AuditMetadata = {}
  ): AuditEvent {
    const eventTypeMap = {
      created: 'policy.created' as AuditEventType,
      updated: 'policy.updated' as AuditEventType,
      deleted: 'policy.deleted' as AuditEventType,
    };

    return this.log({
      type: eventTypeMap[action],
      category: 'configuration',
      severity: 'warning',
      userId,
      userRole,
      resourceType: 'policy',
      resourceId: policyId,
      action: `policy.${action}`,
      description: `Policy ${policyId} was ${action}`,
      previousState,
      newState,
      success: true,
      metadata,
    });
  }

  /**
   * Log a policy exception
   */
  logPolicyException(
    userId: string,
    userRole: UserRole,
    policyId: string,
    action: 'granted' | 'revoked',
    exceptionDetails: any,
    metadata: AuditMetadata = {}
  ): AuditEvent {
    const eventType = action === 'granted' 
      ? 'policy.exception_granted' as AuditEventType
      : 'policy.exception_revoked' as AuditEventType;

    return this.log({
      type: eventType,
      category: 'configuration',
      severity: 'warning',
      userId,
      userRole,
      resourceType: 'policy',
      resourceId: policyId,
      action: `policy.exception.${action}`,
      description: `Policy exception ${action} for policy ${policyId}`,
      newState: exceptionDetails,
      success: true,
      metadata,
    });
  }

  /**
   * Log a security event
   */
  logSecurityEvent(
    userId: string,
    eventType: AuditEventType,
    description: string,
    severity: AuditSeverity = 'warning',
    metadata: AuditMetadata = {}
  ): AuditEvent {
    return this.log({
      type: eventType,
      category: 'security',
      severity,
      userId,
      action: eventType,
      description,
      success: false,
      metadata,
    });
  }

  /**
   * Log an authentication event
   */
  logAuthentication(
    userId: string,
    action: 'login' | 'logout',
    success: boolean,
    metadata: AuditMetadata = {}
  ): AuditEvent {
    const eventType = action === 'login' 
      ? 'user.login' as AuditEventType
      : 'user.logout' as AuditEventType;

    return this.log({
      type: eventType,
      category: 'authentication',
      severity: success ? 'info' : 'warning',
      userId,
      action: `user.${action}`,
      description: `User ${action} ${success ? 'successful' : 'failed'}`,
      success,
      metadata,
    });
  }

  /**
   * Query audit events
   */
  query(filter: AuditQueryFilter = {}): AuditEvent[] {
    return this.events.filter(event => {
      if (filter.userId && event.userId !== filter.userId) return false;
      if (filter.eventType && event.type !== filter.eventType) return false;
      if (filter.category && event.category !== filter.category) return false;
      if (filter.severity && event.severity !== filter.severity) return false;
      if (filter.resourceType && event.resourceType !== filter.resourceType) return false;
      if (filter.resourceId && event.resourceId !== filter.resourceId) return false;
      if (filter.success !== undefined && event.success !== filter.success) return false;
      if (filter.startDate && event.timestamp < filter.startDate) return false;
      if (filter.endDate && event.timestamp > filter.endDate) return false;
      return true;
    });
  }

  /**
   * Get audit statistics
   */
  getStatistics(filter: AuditQueryFilter = {}): AuditStatistics {
    const filteredEvents = this.query(filter);

    const eventsByType: Record<string, number> = {};
    const eventsByCategory: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const userEventCounts: Record<string, number> = {};

    let failedActions = 0;
    let securityEvents = 0;

    for (const event of filteredEvents) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      userEventCounts[event.userId] = (userEventCounts[event.userId] || 0) + 1;

      if (!event.success) failedActions++;
      if (event.category === 'security') securityEvents++;
    }

    const topUsers = Object.entries(userEventCounts)
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    return {
      totalEvents: filteredEvents.length,
      eventsByType: eventsByType as Record<AuditEventType, number>,
      eventsByCategory: eventsByCategory as Record<AuditCategory, number>,
      eventsBySeverity: eventsBySeverity as Record<AuditSeverity, number>,
      failedActions,
      securityEvents,
      topUsers,
    };
  }

  /**
   * Configure security alerts
   */
  configureSecurityAlerts(config: SecurityAlertConfig): void {
    this.securityAlertConfig = config;
  }

  /**
   * Get all events (for testing/debugging)
   */
  getAllEvents(): AuditEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.events = [];
    this.eventIdCounter = 0;
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `audit-${Date.now()}-${++this.eventIdCounter}`;
  }

  /**
   * Infer event type from action string
   */
  private inferEventType(action: string): AuditEventType {
    // Simple inference based on action string
    if (action.includes('login')) return 'user.login';
    if (action.includes('logout')) return 'user.logout';
    if (action.includes('analysis')) return 'analysis.started';
    return 'user.login'; // Default fallback
  }

  /**
   * Check if event should trigger a security alert
   */
  private shouldTriggerAlert(event: AuditEvent): boolean {
    if (!this.securityAlertConfig || !this.securityAlertConfig.enabled) {
      return false;
    }

    const severityLevels: Record<AuditSeverity, number> = {
      info: 0,
      warning: 1,
      error: 2,
      critical: 3,
    };

    const meetsMinSeverity = 
      severityLevels[event.severity] >= severityLevels[this.securityAlertConfig.minSeverity];

    const matchesTriggerEvent = 
      this.securityAlertConfig.triggerEvents.includes(event.type);

    return meetsMinSeverity && (matchesTriggerEvent || event.category === 'security');
  }

  /**
   * Trigger a security alert
   */
  private triggerSecurityAlert(event: AuditEvent): void {
    // In a real implementation, this would send notifications via email, Slack, etc.
    // For now, we just log it
    console.warn(`[SECURITY ALERT] ${event.type}: ${event.description}`);
  }
}
