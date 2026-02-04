/**
 * Connectivity Manager Service
 * 
 * Handles intermittent network connections, offline/online transitions,
 * and data synchronization for distributed teams.
 * Requirements: 10.8
 */

export interface ConnectivityStatus {
  isOnline: boolean;
  lastOnline: Date;
  lastOffline?: Date;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  latency?: number; // in milliseconds
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  resourceId: string;
  data: any;
  timestamp: Date;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
  error?: string;
}

export interface OfflineData {
  key: string;
  data: any;
  timestamp: Date;
  expiresAt?: Date;
}

export interface ConnectivityEvent {
  type: 'online' | 'offline' | 'quality_change';
  timestamp: Date;
  previousStatus?: ConnectivityStatus;
  currentStatus: ConnectivityStatus;
}

/**
 * Connectivity Manager Service
 */
export class ConnectivityManager {
  private status: ConnectivityStatus;
  private syncQueue: Map<string, SyncOperation> = new Map();
  private offlineStorage: Map<string, OfflineData> = new Map();
  private listeners: Array<(event: ConnectivityEvent) => void> = [];
  private syncInterval?: NodeJS.Timeout;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    this.status = {
      isOnline: true,
      lastOnline: new Date(),
      connectionQuality: 'excellent',
    };

    this.startMonitoring();
  }

  /**
   * Get current connectivity status
   */
  getStatus(): ConnectivityStatus {
    return { ...this.status };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.status.isOnline;
  }

  /**
   * Add connectivity event listener
   */
  addListener(listener: (event: ConnectivityEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove connectivity event listener
   */
  removeListener(listener: (event: ConnectivityEvent) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Queue operation for synchronization
   */
  queueSync(
    type: SyncOperation['type'],
    resource: string,
    resourceId: string,
    data: any
  ): SyncOperation {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type,
      resource,
      resourceId,
      data,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0,
    };

    this.syncQueue.set(operation.id, operation);

    // Try to sync immediately if online
    if (this.status.isOnline) {
      this.processSyncQueue();
    }

    return operation;
  }

  /**
   * Get pending sync operations
   */
  getPendingSyncOperations(): SyncOperation[] {
    return Array.from(this.syncQueue.values())
      .filter(op => op.status === 'pending' || op.status === 'failed')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Store data for offline access
   */
  storeOfflineData(key: string, data: any, expiresAt?: Date): void {
    this.offlineStorage.set(key, {
      key,
      data,
      timestamp: new Date(),
      expiresAt,
    });
  }

  /**
   * Retrieve offline data
   */
  getOfflineData(key: string): any | undefined {
    const stored = this.offlineStorage.get(key);
    
    if (!stored) {
      return undefined;
    }

    // Check if expired
    if (stored.expiresAt && stored.expiresAt < new Date()) {
      this.offlineStorage.delete(key);
      return undefined;
    }

    return stored.data;
  }

  /**
   * Clear offline data
   */
  clearOfflineData(key?: string): void {
    if (key) {
      this.offlineStorage.delete(key);
    } else {
      this.offlineStorage.clear();
    }
  }

  /**
   * Get all offline data keys
   */
  getOfflineDataKeys(): string[] {
    return Array.from(this.offlineStorage.keys());
  }

  /**
   * Manually trigger sync
   */
  async sync(): Promise<void> {
    if (!this.status.isOnline) {
      console.log('[Connectivity] Cannot sync while offline');
      return;
    }

    await this.processSyncQueue();
  }

  /**
   * Handle online transition
   */
  private async handleOnline(): Promise<void> {
    const previousStatus = { ...this.status };
    
    this.status.isOnline = true;
    this.status.lastOnline = new Date();
    this.status.connectionQuality = await this.measureConnectionQuality();

    const event: ConnectivityEvent = {
      type: 'online',
      timestamp: new Date(),
      previousStatus,
      currentStatus: this.status,
    };

    this.notifyListeners(event);

    // Process sync queue
    await this.processSyncQueue();
  }

  /**
   * Handle offline transition
   */
  private handleOffline(): void {
    const previousStatus = { ...this.status };
    
    this.status.isOnline = false;
    this.status.lastOffline = new Date();
    this.status.connectionQuality = 'offline';
    this.status.latency = undefined;

    const event: ConnectivityEvent = {
      type: 'offline',
      timestamp: new Date(),
      previousStatus,
      currentStatus: this.status,
    };

    this.notifyListeners(event);
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    const pending = this.getPendingSyncOperations();
    
    for (const operation of pending) {
      if (operation.retryCount >= this.MAX_RETRY_COUNT) {
        operation.status = 'failed';
        operation.error = 'Max retry count exceeded';
        this.syncQueue.set(operation.id, operation);
        continue;
      }

      try {
        operation.status = 'syncing';
        this.syncQueue.set(operation.id, operation);

        // Perform sync operation
        await this.performSync(operation);

        operation.status = 'completed';
        this.syncQueue.set(operation.id, operation);

        // Remove completed operations after a delay
        setTimeout(() => {
          this.syncQueue.delete(operation.id);
        }, 60000); // Keep for 1 minute
      } catch (error) {
        operation.status = 'failed';
        operation.retryCount++;
        operation.error = error instanceof Error ? error.message : 'Unknown error';
        this.syncQueue.set(operation.id, operation);
      }
    }
  }

  /**
   * Perform actual sync operation
   */
  private async performSync(operation: SyncOperation): Promise<void> {
    // In a real implementation, this would make API calls
    console.log(`[Connectivity] Syncing ${operation.type} ${operation.resource}/${operation.resourceId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Network error');
    }
  }

  /**
   * Measure connection quality
   */
  private async measureConnectionQuality(): Promise<ConnectivityStatus['connectionQuality']> {
    try {
      const startTime = Date.now();
      
      // In a real implementation, ping a server endpoint
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const latency = Date.now() - startTime;
      this.status.latency = latency;

      if (latency < 100) {
        return 'excellent';
      } else if (latency < 300) {
        return 'good';
      } else {
        return 'poor';
      }
    } catch {
      return 'offline';
    }
  }

  /**
   * Start monitoring connectivity
   */
  private startMonitoring(): void {
    // Monitor online/offline events
    if (typeof globalThis !== 'undefined' && 'addEventListener' in globalThis) {
      (globalThis as any).addEventListener('online', () => this.handleOnline());
      (globalThis as any).addEventListener('offline', () => this.handleOffline());
    }

    // Start periodic sync
    this.syncInterval = setInterval(() => {
      if (this.status.isOnline) {
        this.processSyncQueue();
      }
    }, this.SYNC_INTERVAL_MS);

    // Periodic connection quality check
    setInterval(async () => {
      if (this.status.isOnline) {
        const previousQuality = this.status.connectionQuality;
        const newQuality = await this.measureConnectionQuality();
        
        if (newQuality !== previousQuality) {
          const previousStatus = { ...this.status };
          this.status.connectionQuality = newQuality;
          
          const event: ConnectivityEvent = {
            type: 'quality_change',
            timestamp: new Date(),
            previousStatus,
            currentStatus: this.status,
          };
          
          this.notifyListeners(event);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (typeof globalThis !== 'undefined' && 'removeEventListener' in globalThis) {
      (globalThis as any).removeEventListener('online', () => this.handleOnline());
      (globalThis as any).removeEventListener('offline', () => this.handleOffline());
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: ConnectivityEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[Connectivity] Error in listener:', error);
      }
    }
  }

  /**
   * Clean up expired offline data
   */
  cleanupExpiredData(): void {
    const now = new Date();
    
    for (const [key, data] of this.offlineStorage.entries()) {
      if (data.expiresAt && data.expiresAt < now) {
        this.offlineStorage.delete(key);
      }
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
    totalOfflineData: number;
  } {
    const operations = Array.from(this.syncQueue.values());
    
    return {
      pending: operations.filter(op => op.status === 'pending').length,
      syncing: operations.filter(op => op.status === 'syncing').length,
      completed: operations.filter(op => op.status === 'completed').length,
      failed: operations.filter(op => op.status === 'failed').length,
      totalOfflineData: this.offlineStorage.size,
    };
  }

  /**
   * Retry failed operations
   */
  async retryFailedOperations(): Promise<void> {
    const failed = Array.from(this.syncQueue.values()).filter(
      op => op.status === 'failed' && op.retryCount < this.MAX_RETRY_COUNT
    );

    for (const operation of failed) {
      operation.status = 'pending';
      operation.retryCount = 0;
      this.syncQueue.set(operation.id, operation);
    }

    await this.processSyncQueue();
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
