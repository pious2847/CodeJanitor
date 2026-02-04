/**
 * Real-time Collaboration Service
 * 
 * Provides WebSocket-based real-time updates, collaborative editing,
 * and activity feeds for distributed teams.
 * Requirements: 10.5
 */

export interface CollaborationSession {
  id: string;
  type: 'policy_editing' | 'issue_discussion' | 'dashboard_viewing';
  resourceId: string;
  participants: Participant[];
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface Participant {
  userId: string;
  userName: string;
  role: string;
  joinedAt: Date;
  isActive: boolean;
  cursor?: CursorPosition;
}

export interface CursorPosition {
  line: number;
  column: number;
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface RealtimeUpdate {
  id: string;
  sessionId: string;
  type: 'cursor_move' | 'content_change' | 'participant_join' | 'participant_leave' | 'activity';
  userId: string;
  timestamp: Date;
  data: any;
}

export interface ContentChange {
  operation: 'insert' | 'delete' | 'replace';
  position: { line: number; column: number };
  content: string;
  version: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'issue_created' | 'issue_resolved' | 'policy_updated' | 'exception_approved' | 'comment_added';
  userId: string;
  userName: string;
  resourceId: string;
  resourceType: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * WebSocket connection interface
 */
export interface WebSocketConnection {
  id: string;
  userId: string;
  sessionId: string;
  connected: boolean;
  lastPing: Date;
}

/**
 * Real-time Collaboration Service
 */
export class RealtimeCollaboration {
  private sessions: Map<string, CollaborationSession> = new Map();
  private connections: Map<string, WebSocketConnection> = new Map();
  private activityFeed: ActivityFeedItem[] = [];
  private readonly MAX_ACTIVITY_ITEMS = 1000;

  /**
   * Create a new collaboration session
   */
  async createSession(
    type: CollaborationSession['type'],
    resourceId: string,
    userId: string,
    userName: string
  ): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: this.generateSessionId(),
      type,
      resourceId,
      participants: [
        {
          userId,
          userName,
          role: 'owner',
          joinedAt: new Date(),
          isActive: true,
        },
      ],
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    };

    this.sessions.set(session.id, session);
    
    // Broadcast session created
    await this.broadcastUpdate(session.id, {
      id: this.generateUpdateId(),
      sessionId: session.id,
      type: 'participant_join',
      userId,
      timestamp: new Date(),
      data: { userName, role: 'owner' },
    });

    return session;
  }

  /**
   * Join an existing collaboration session
   */
  async joinSession(
    sessionId: string,
    userId: string,
    userName: string,
    role: string = 'participant'
  ): Promise<CollaborationSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Check if user is already in session
    const existingParticipant = session.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      existingParticipant.isActive = true;
      existingParticipant.joinedAt = new Date();
    } else {
      session.participants.push({
        userId,
        userName,
        role,
        joinedAt: new Date(),
        isActive: true,
      });
    }

    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    // Broadcast participant joined
    await this.broadcastUpdate(sessionId, {
      id: this.generateUpdateId(),
      sessionId,
      type: 'participant_join',
      userId,
      timestamp: new Date(),
      data: { userName, role },
    });

    return session;
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.isActive = false;
    }

    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    // Broadcast participant left
    await this.broadcastUpdate(sessionId, {
      id: this.generateUpdateId(),
      sessionId,
      type: 'participant_leave',
      userId,
      timestamp: new Date(),
      data: {},
    });

    // Clean up session if no active participants
    const hasActiveParticipants = session.participants.some(p => p.isActive);
    if (!hasActiveParticipants) {
      session.isActive = false;
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Update cursor position for collaborative editing
   */
  async updateCursor(
    sessionId: string,
    userId: string,
    cursor: CursorPosition
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.cursor = cursor;
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);

      // Broadcast cursor update
      await this.broadcastUpdate(sessionId, {
        id: this.generateUpdateId(),
        sessionId,
        type: 'cursor_move',
        userId,
        timestamp: new Date(),
        data: { cursor },
      });
    }
  }

  /**
   * Apply content change for collaborative editing
   */
  async applyContentChange(
    sessionId: string,
    userId: string,
    change: ContentChange
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    // Broadcast content change
    await this.broadcastUpdate(sessionId, {
      id: this.generateUpdateId(),
      sessionId,
      type: 'content_change',
      userId,
      timestamp: new Date(),
      data: { change },
    });
  }

  /**
   * Add activity to feed
   */
  async addActivity(activity: Omit<ActivityFeedItem, 'id' | 'timestamp'>): Promise<ActivityFeedItem> {
    const item: ActivityFeedItem = {
      ...activity,
      id: this.generateActivityId(),
      timestamp: new Date(),
    };

    this.activityFeed.unshift(item);

    // Trim feed if too large
    if (this.activityFeed.length > this.MAX_ACTIVITY_ITEMS) {
      this.activityFeed = this.activityFeed.slice(0, this.MAX_ACTIVITY_ITEMS);
    }

    // Broadcast activity to all relevant sessions
    await this.broadcastActivityUpdate(item);

    return item;
  }

  /**
   * Get activity feed
   */
  getActivityFeed(
    limit: number = 50,
    filter?: {
      userId?: string;
      resourceType?: string;
      type?: ActivityFeedItem['type'];
    }
  ): ActivityFeedItem[] {
    let feed = this.activityFeed;

    if (filter) {
      if (filter.userId) {
        feed = feed.filter(item => item.userId === filter.userId);
      }
      if (filter.resourceType) {
        feed = feed.filter(item => item.resourceType === filter.resourceType);
      }
      if (filter.type) {
        feed = feed.filter(item => item.type === filter.type);
      }
    }

    return feed.slice(0, limit);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(resourceId?: string): CollaborationSession[] {
    let sessions = Array.from(this.sessions.values()).filter(s => s.isActive);

    if (resourceId) {
      sessions = sessions.filter(s => s.resourceId === resourceId);
    }

    return sessions;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Register WebSocket connection
   */
  registerConnection(userId: string, sessionId: string): WebSocketConnection {
    const connection: WebSocketConnection = {
      id: this.generateConnectionId(),
      userId,
      sessionId,
      connected: true,
      lastPing: new Date(),
    };

    this.connections.set(connection.id, connection);
    return connection;
  }

  /**
   * Unregister WebSocket connection
   */
  unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.connected = false;
      this.connections.set(connectionId, connection);
      
      // Leave session
      this.leaveSession(connection.sessionId, connection.userId);
    }
  }

  /**
   * Update connection ping
   */
  updateConnectionPing(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastPing = new Date();
      this.connections.set(connectionId, connection);
    }
  }

  /**
   * Get active connections for a session
   */
  getSessionConnections(sessionId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      c => c.sessionId === sessionId && c.connected
    );
  }

  /**
   * Broadcast update to all participants in a session
   */
  private async broadcastUpdate(sessionId: string, update: RealtimeUpdate): Promise<void> {
    const connections = this.getSessionConnections(sessionId);
    
    // In a real implementation, this would send via WebSocket
    console.log(`[REALTIME] Broadcasting to ${connections.length} connections:`, update);
    
    // Simulate WebSocket broadcast
    for (const connection of connections) {
      // Skip sender
      if (connection.userId === update.userId) {
        continue;
      }
      
      // Send update via WebSocket
      this.sendToConnection(connection.id, update);
    }
  }

  /**
   * Broadcast activity update to relevant sessions
   */
  private async broadcastActivityUpdate(activity: ActivityFeedItem): Promise<void> {
    // Find sessions that should receive this activity
    const relevantSessions = Array.from(this.sessions.values()).filter(
      s => s.isActive && s.resourceId === activity.resourceId
    );

    for (const session of relevantSessions) {
      await this.broadcastUpdate(session.id, {
        id: this.generateUpdateId(),
        sessionId: session.id,
        type: 'activity',
        userId: activity.userId,
        timestamp: activity.timestamp,
        data: { activity },
      });
    }
  }

  /**
   * Send update to a specific connection
   */
  private sendToConnection(_connectionId: string, _update: RealtimeUpdate): void {
    // In a real implementation, this would send via WebSocket
    // For now, just log
    console.log(`[REALTIME] Sending update to connection ${_connectionId}`);
  }

  /**
   * Clean up inactive sessions and connections
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    const INACTIVE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

    // Clean up inactive sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      if (inactiveTime > INACTIVE_THRESHOLD_MS) {
        session.isActive = false;
        this.sessions.set(sessionId, session);
      }
    }

    // Clean up stale connections
    for (const [connectionId, connection] of this.connections.entries()) {
      const staleTime = now.getTime() - connection.lastPing.getTime();
      if (staleTime > INACTIVE_THRESHOLD_MS) {
        this.unregisterConnection(connectionId);
      }
    }
  }

  /**
   * Generate unique IDs
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUpdateId(): string {
    return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActivityId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
