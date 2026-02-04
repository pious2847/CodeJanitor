/**
 * Rate Limiter Middleware
 * 
 * Implements token bucket algorithm for rate limiting API requests
 */

export interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

interface ClientRecord {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private clients: Map<string, ClientRecord> = new Map();
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if client is within rate limit
   */
  checkLimit(clientId: string): boolean {
    const now = Date.now();
    let record = this.clients.get(clientId);

    if (!record) {
      // New client
      record = {
        tokens: this.config.maxRequests - 1,
        lastRefill: now,
      };
      this.clients.set(clientId, record);
      return true;
    }

    // Refill tokens based on time elapsed
    const elapsed = now - record.lastRefill;
    const refillAmount = Math.floor(
      (elapsed / this.config.windowMs) * this.config.maxRequests
    );

    if (refillAmount > 0) {
      record.tokens = Math.min(
        this.config.maxRequests,
        record.tokens + refillAmount
      );
      record.lastRefill = now;
    }

    // Check if client has tokens available
    if (record.tokens > 0) {
      record.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Get remaining tokens for a client
   */
  getRemainingTokens(clientId: string): number {
    const record = this.clients.get(clientId);
    return record ? record.tokens : this.config.maxRequests;
  }

  /**
   * Reset rate limit for a client
   */
  reset(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Clean up old client records
   */
  private cleanup(): void {
    const now = Date.now();
    const expireTime = this.config.windowMs * 2;

    for (const [clientId, record] of this.clients.entries()) {
      if (now - record.lastRefill > expireTime) {
        this.clients.delete(clientId);
      }
    }
  }
}
