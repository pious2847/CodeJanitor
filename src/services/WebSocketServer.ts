/**
 * WebSocket Server for Real-time Collaboration
 * 
 * Provides WebSocket server functionality for real-time updates
 * in the CodeJanitor Enterprise platform.
 * Requirements: 10.5
 */

import { RealtimeCollaboration, RealtimeUpdate } from './RealtimeCollaboration';

export interface WebSocketMessage {
  type: 'join' | 'leave' | 'cursor' | 'change' | 'ping' | 'activity';
  sessionId: string;
  userId: string;
  data?: any;
}

export interface WebSocketClient {
  id: string;
  userId: string;
  sessionId: string;
  send: (message: any) => void;
  close: () => void;
}

/**
 * WebSocket Server for real-time collaboration
 */
export class WebSocketServer {
  private collaboration: RealtimeCollaboration;
  private clients: Map<string, WebSocketClient> = new Map();
  private port: number;
  private isRunning: boolean = false;

  constructor(collaboration: RealtimeCollaboration, port: number = 8080) {
    this.collaboration = collaboration;
    this.port = port;
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // In a real implementation, this would start a WebSocket server
    // For VS Code extension, we might use a different approach
    console.log(`[WebSocket] Server starting on port ${this.port}`);
    
    this.isRunning = true;

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[WebSocket] Server stopping');
    
    // Close all client connections
    for (const client of this.clients.values()) {
      client.close();
    }
    
    this.clients.clear();
    this.isRunning = false;
  }

  /**
   * Handle new client connection
   */
  async handleConnection(clientId: string, userId: string): Promise<void> {
    console.log(`[WebSocket] Client connected: ${clientId} (User: ${userId})`);
    
    // Client will be added when they join a session
  }

  /**
   * Handle client disconnection
   */
  async handleDisconnection(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
      
      // Unregister connection
      await this.collaboration.unregisterConnection(clientId);
      
      this.clients.delete(clientId);
    }
  }

  /**
   * Handle incoming message from client
   */
  async handleMessage(clientId: string, message: WebSocketMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'join':
          await this.handleJoin(clientId, message);
          break;
        case 'leave':
          await this.handleLeave(clientId, message);
          break;
        case 'cursor':
          await this.handleCursor(clientId, message);
          break;
        case 'change':
          await this.handleChange(clientId, message);
          break;
        case 'ping':
          await this.handlePing(clientId);
          break;
        case 'activity':
          await this.handleActivity(message);
          break;
        default:
          console.warn(`[WebSocket] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[WebSocket] Error handling message:', error);
      this.sendError(clientId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle join session message
   */
  private async handleJoin(clientId: string, message: WebSocketMessage): Promise<void> {
    const { sessionId, userId, data } = message;
    const { userName, role } = data || {};

    // Join or create session
    let session;
    try {
      session = await this.collaboration.joinSession(sessionId, userId, userName, role);
    } catch {
      // Session doesn't exist, create it
      session = await this.collaboration.createSession(
        'policy_editing',
        data.resourceId,
        userId,
        userName
      );
    }

    // Register connection
    const connection = this.collaboration.registerConnection(userId, session.id);

    // Store client
    this.clients.set(clientId, {
      id: clientId,
      userId,
      sessionId: session.id,
      send: (msg) => this.sendToClient(clientId, msg),
      close: () => this.handleDisconnection(clientId),
    });

    // Send session info to client
    this.sendToClient(clientId, {
      type: 'session_joined',
      data: {
        session,
        connectionId: connection.id,
      },
    });
  }

  /**
   * Handle leave session message
   */
  private async handleLeave(clientId: string, message: WebSocketMessage): Promise<void> {
    const { sessionId, userId } = message;
    
    await this.collaboration.leaveSession(sessionId, userId);
    
    this.sendToClient(clientId, {
      type: 'session_left',
      data: { sessionId },
    });
  }

  /**
   * Handle cursor update message
   */
  private async handleCursor(_clientId: string, message: WebSocketMessage): Promise<void> {
    const { sessionId, userId, data } = message;
    const { cursor } = data;

    await this.collaboration.updateCursor(sessionId, userId, cursor);
  }

  /**
   * Handle content change message
   */
  private async handleChange(_clientId: string, message: WebSocketMessage): Promise<void> {
    const { sessionId, userId, data } = message;
    const { change } = data;

    await this.collaboration.applyContentChange(sessionId, userId, change);
  }

  /**
   * Handle ping message
   */
  private async handlePing(clientId: string): Promise<void> {
    this.collaboration.updateConnectionPing(clientId);
    
    this.sendToClient(clientId, {
      type: 'pong',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle activity message
   */
  private async handleActivity(message: WebSocketMessage): Promise<void> {
    const { data } = message;
    
    await this.collaboration.addActivity(data);
  }

  /**
   * Broadcast update to session participants
   */
  async broadcastToSession(sessionId: string, update: RealtimeUpdate): Promise<void> {
    const connections = this.collaboration.getSessionConnections(sessionId);
    
    for (const connection of connections) {
      // Skip sender
      if (connection.userId === update.userId) {
        continue;
      }
      
      // Find client by connection
      const client = Array.from(this.clients.values()).find(
        c => c.userId === connection.userId && c.sessionId === sessionId
      );
      
      if (client) {
        client.send({
          type: 'update',
          data: update,
        });
      }
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client) {
      // In a real implementation, this would send via WebSocket
      console.log(`[WebSocket] Sending to ${clientId}:`, message);
    }
  }

  /**
   * Send error to client
   */
  private sendError(clientId: string, error: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      error,
    });
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(async () => {
      await this.collaboration.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    port: number;
    clientCount: number;
    sessionCount: number;
  } {
    return {
      isRunning: this.isRunning,
      port: this.port,
      clientCount: this.clients.size,
      sessionCount: this.collaboration.getActiveSessions().length,
    };
  }
}
