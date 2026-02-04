/**
 * Session Manager
 * 
 * Provides concurrent user support for enterprise deployments:
 * - Session management for multiple teams
 * - Resource isolation between organizations
 * - Rate limiting and fair usage policies
 * 
 * Requirements: 6.6
 */

/**
 * User session
 */
export interface UserSession {
  sessionId: string;
  userId: string;
  organizationId: string;
  teamId?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Resource quota for an organization
 */
export interface ResourceQuota {
  organizationId: string;
  maxConcurrentAnalyses: number;
  maxFilesPerAnalysis: number;
  maxStorageMB: number;
  maxAPICallsPerHour: number;
  currentUsage: ResourceUsage;
}

/**
 * Current resource usage
 */
export interface ResourceUsage {
  concurrentAnalyses: number;
  storageMB: number;
  apiCallsThisHour: number;
  lastReset: Date;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxConcurrentRequests: number;
  burstSize: number;
}

/**
 * Rate limit state
 */
interface RateLimitState {
  requestsThisMinute: number;
  requestsThisHour: number;
  concurrentRequests: number;
  lastMinuteReset: Date;
  lastHourReset: Date;
}

/**
 * Session Manager
 * Manages user sessions and resource isolation
 */
export class SessionManager {
  private sessions: Map<string, UserSession> = new Map();
  private quotas: Map<string, ResourceQuota> = new Map();
  private rateLimits: Map<string, RateLimitState> = new Map();
  private defaultRateLimitConfig: RateLimitConfig;
  private sessionTimeoutMs: number;

  constructor(
    sessionTimeoutMs: number = 3600000, // 1 hour
    defaultRateLimitConfig?: Partial<RateLimitConfig>
  ) {
    this.sessionTimeoutMs = sessionTimeoutMs;
    this.defaultRateLimitConfig = {
      maxRequestsPerMinute: defaultRateLimitConfig?.maxRequestsPerMinute ?? 60,
      maxRequestsPerHour: defaultRateLimitConfig?.maxRequestsPerHour ?? 1000,
      maxConcurrentRequests: defaultRateLimitConfig?.maxConcurrentRequests ?? 10,
      burstSize: defaultRateLimitConfig?.burstSize ?? 20,
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Create a new session
   */
  createSession(
    userId: string,
    organizationId: string,
    teamId?: string,
    metadata?: Record<string, any>
  ): UserSession {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTimeoutMs);

    const session: UserSession = {
      sessionId,
      userId,
      organizationId,
      teamId,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      metadata,
    };

    this.sessions.set(sessionId, session);

    // Initialize rate limit state if not exists
    if (!this.rateLimits.has(userId)) {
      this.rateLimits.set(userId, {
        requestsThisMinute: 0,
        requestsThisHour: 0,
        concurrentRequests: 0,
        lastMinuteReset: now,
        lastHourReset: now,
      });
    }

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): UserSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + this.sessionTimeoutMs);
    return true;
  }

  /**
   * Destroy session
   */
  destroySession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get all active sessions for an organization
   */
  getOrganizationSessions(organizationId: string): UserSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.organizationId === organizationId && new Date() <= s.expiresAt);
  }

  /**
   * Get all active sessions for a team
   */
  getTeamSessions(teamId: string): UserSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.teamId === teamId && new Date() <= s.expiresAt);
  }

  /**
   * Set resource quota for an organization
   */
  setResourceQuota(organizationId: string, quota: Omit<ResourceQuota, 'currentUsage'>): void {
    this.quotas.set(organizationId, {
      ...quota,
      currentUsage: {
        concurrentAnalyses: 0,
        storageMB: 0,
        apiCallsThisHour: 0,
        lastReset: new Date(),
      },
    });
  }

  /**
   * Get resource quota for an organization
   */
  getResourceQuota(organizationId: string): ResourceQuota | null {
    return this.quotas.get(organizationId) || null;
  }

  /**
   * Check if organization can start a new analysis
   */
  canStartAnalysis(organizationId: string): boolean {
    const quota = this.quotas.get(organizationId);
    if (!quota) {
      return true; // No quota set, allow
    }

    return quota.currentUsage.concurrentAnalyses < quota.maxConcurrentAnalyses;
  }

  /**
   * Increment concurrent analysis count
   */
  incrementAnalysisCount(organizationId: string): boolean {
    const quota = this.quotas.get(organizationId);
    if (!quota) {
      return true;
    }

    if (quota.currentUsage.concurrentAnalyses >= quota.maxConcurrentAnalyses) {
      return false;
    }

    quota.currentUsage.concurrentAnalyses++;
    return true;
  }

  /**
   * Decrement concurrent analysis count
   */
  decrementAnalysisCount(organizationId: string): void {
    const quota = this.quotas.get(organizationId);
    if (quota && quota.currentUsage.concurrentAnalyses > 0) {
      quota.currentUsage.concurrentAnalyses--;
    }
  }

  /**
   * Check rate limit for a user
   */
  checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
    const state = this.rateLimits.get(userId);
    if (!state) {
      return { allowed: true };
    }

    const now = new Date();

    // Reset counters if needed
    if (now.getTime() - state.lastMinuteReset.getTime() >= 60000) {
      state.requestsThisMinute = 0;
      state.lastMinuteReset = now;
    }

    if (now.getTime() - state.lastHourReset.getTime() >= 3600000) {
      state.requestsThisHour = 0;
      state.lastHourReset = now;
    }

    // Check limits
    if (state.concurrentRequests >= this.defaultRateLimitConfig.maxConcurrentRequests) {
      return { allowed: false, reason: 'Too many concurrent requests' };
    }

    if (state.requestsThisMinute >= this.defaultRateLimitConfig.maxRequestsPerMinute) {
      return { allowed: false, reason: 'Rate limit exceeded (per minute)' };
    }

    if (state.requestsThisHour >= this.defaultRateLimitConfig.maxRequestsPerHour) {
      return { allowed: false, reason: 'Rate limit exceeded (per hour)' };
    }

    return { allowed: true };
  }

  /**
   * Record a request for rate limiting
   */
  recordRequest(userId: string): void {
    const state = this.rateLimits.get(userId);
    if (!state) {
      return;
    }

    state.requestsThisMinute++;
    state.requestsThisHour++;
    state.concurrentRequests++;
  }

  /**
   * Complete a request (decrement concurrent count)
   */
  completeRequest(userId: string): void {
    const state = this.rateLimits.get(userId);
    if (state && state.concurrentRequests > 0) {
      state.concurrentRequests--;
    }
  }

  /**
   * Get rate limit status for a user
   */
  getRateLimitStatus(userId: string) {
    const state = this.rateLimits.get(userId);
    if (!state) {
      return null;
    }

    return {
      requestsThisMinute: state.requestsThisMinute,
      requestsThisHour: state.requestsThisHour,
      concurrentRequests: state.concurrentRequests,
      limits: this.defaultRateLimitConfig,
    };
  }

  /**
   * Get session statistics
   */
  getStats() {
    const now = new Date();
    const activeSessions = Array.from(this.sessions.values())
      .filter(s => s.expiresAt > now);

    const organizationCounts = new Map<string, number>();
    for (const session of activeSessions) {
      const count = organizationCounts.get(session.organizationId) || 0;
      organizationCounts.set(session.organizationId, count + 1);
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      expiredSessions: this.sessions.size - activeSessions.length,
      organizationCounts: Object.fromEntries(organizationCounts),
      totalOrganizations: organizationCounts.size,
    };
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Run every minute
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Shutdown session manager
   */
  shutdown(): void {
    this.sessions.clear();
    this.quotas.clear();
    this.rateLimits.clear();
  }
}
