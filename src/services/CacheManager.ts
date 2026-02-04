/**
 * Cache Manager
 * 
 * Provides intelligent caching for analysis results:
 * - Redis-based caching for distributed systems
 * - In-memory caching for single-instance deployments
 * - Cache invalidation strategies for code changes
 * - Cache warming for frequently accessed projects
 * 
 * Requirements: 6.3
 */

import { FileAnalysisResult } from '../models';
import * as crypto from 'crypto';

/**
 * Analysis cache entry with metadata
 */
export interface AnalysisCacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number; // Time to live in seconds
  hits: number;
  fileHash?: string;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Enable caching */
  enabled: boolean;
  /** Use Redis for distributed caching */
  useRedis: boolean;
  /** Redis connection URL */
  redisUrl?: string;
  /** Default TTL in seconds */
  defaultTTL: number;
  /** Maximum cache size in MB (for in-memory cache) */
  maxSizeMB: number;
  /** Enable cache warming */
  enableWarming: boolean;
  /** Frequently accessed threshold (hits) */
  warmingThreshold: number;
}

/**
 * Analysis cache statistics
 */
export interface AnalysisCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  totalSizeMB: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Cache invalidation strategy
 */
export type InvalidationStrategy = 
  | 'file-change'    // Invalidate when file content changes
  | 'time-based'     // Invalidate after TTL expires
  | 'dependency'     // Invalidate when dependencies change
  | 'manual';        // Manual invalidation only

/**
 * Cache Manager
 * Manages caching of analysis results with intelligent invalidation
 */
export class CacheManager {
  private cache: Map<string, AnalysisCacheEntry<FileAnalysisResult>> = new Map();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
  };
  private redisClient: any = null; // Would be Redis client in production

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      useRedis: config.useRedis ?? false,
      redisUrl: config.redisUrl,
      defaultTTL: config.defaultTTL ?? 3600, // 1 hour
      maxSizeMB: config.maxSizeMB ?? 512,
      enableWarming: config.enableWarming ?? true,
      warmingThreshold: config.warmingThreshold ?? 10,
    };

    if (this.config.useRedis && this.config.redisUrl) {
      this.initializeRedis();
    }
  }

  /**
   * Initialize Redis client
   * Note: This is a placeholder. In production, use ioredis or node-redis
   */
  private initializeRedis(): void {
    // Placeholder for Redis initialization
    // In production: this.redisClient = new Redis(this.config.redisUrl);
  }

  /**
   * Get cached analysis result
   */
  async get(filePath: string, fileHash?: string): Promise<FileAnalysisResult | null> {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(filePath);

    if (this.config.useRedis && this.redisClient) {
      return this.getFromRedis(key, fileHash);
    } else {
      return this.getFromMemory(key, fileHash);
    }
  }

  /**
   * Get from in-memory cache
   */
  private getFromMemory(key: string, fileHash?: string): FileAnalysisResult | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Check if file hash matches (file hasn't changed)
    if (fileHash && entry.fileHash && entry.fileHash !== fileHash) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Cache hit
    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Get from Redis cache
   */
  private async getFromRedis(_key: string, _fileHash?: string): Promise<FileAnalysisResult | null> {
    // Placeholder for Redis implementation
    // In production: const data = await this.redisClient.get(key);
    this.stats.misses++;
    return null;
  }

  /**
   * Set cached analysis result
   */
  async set(
    filePath: string,
    result: FileAnalysisResult,
    fileHash?: string,
    ttl?: number
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const key = this.generateKey(filePath);
    const actualTTL = ttl ?? this.config.defaultTTL;

    if (this.config.useRedis && this.redisClient) {
      await this.setInRedis(key, result, fileHash, actualTTL);
    } else {
      this.setInMemory(key, result, fileHash, actualTTL);
    }
  }

  /**
   * Set in memory cache
   */
  private setInMemory(
    key: string,
    result: FileAnalysisResult,
    fileHash: string | undefined,
    ttl: number
  ): void {
    // Check cache size before adding
    if (this.getCurrentSizeMB() > this.config.maxSizeMB) {
      this.evictLRU();
    }

    this.cache.set(key, {
      key,
      value: result,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      fileHash,
    });
  }

  /**
   * Set in Redis cache
   */
  private async setInRedis(
    _key: string,
    _result: FileAnalysisResult,
    _fileHash: string | undefined,
    _ttl: number
  ): Promise<void> {
    // Placeholder for Redis implementation
    // In production:
    // const data = JSON.stringify({ result, fileHash });
    // await this.redisClient.setex(key, ttl, data);
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(filePath: string): Promise<void> {
    const key = this.generateKey(filePath);

    if (this.config.useRedis && this.redisClient) {
      // await this.redisClient.del(key);
    } else {
      this.cache.delete(key);
    }
  }

  /**
   * Invalidate multiple entries
   */
  async invalidateMultiple(filePaths: string[]): Promise<void> {
    await Promise.all(filePaths.map(fp => this.invalidate(fp)));
  }

  /**
   * Invalidate by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    if (this.config.useRedis && this.redisClient) {
      // Redis SCAN implementation
    } else {
      const regex = new RegExp(pattern);
      const keysToDelete: string[] = [];

      for (const [key] of this.cache) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    if (this.config.useRedis && this.redisClient) {
      // await this.redisClient.flushdb();
    } else {
      this.cache.clear();
    }
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Warm cache for frequently accessed files
   */
  async warmCache(
    filePaths: string[],
    analyzer: (filePath: string) => Promise<FileAnalysisResult>
  ): Promise<void> {
    if (!this.config.enableWarming) {
      return;
    }

    // Get frequently accessed files
    const frequentFiles = this.getFrequentlyAccessedFiles();
    const filesToWarm = [...new Set([...filePaths, ...frequentFiles])];

    // Warm cache in batches
    const batchSize = 10;
    for (let i = 0; i < filesToWarm.length; i += batchSize) {
      const batch = filesToWarm.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (filePath) => {
          try {
            const result = await analyzer(filePath);
            const fileHash = await this.calculateFileHash(filePath);
            await this.set(filePath, result, fileHash);
          } catch (error) {
            // Ignore warming errors
          }
        })
      );
    }
  }

  /**
   * Get frequently accessed files
   */
  private getFrequentlyAccessedFiles(): string[] {
    const entries = Array.from(this.cache.values())
      .filter(entry => entry.hits >= this.config.warmingThreshold)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 100); // Top 100 files

    return entries.map(entry => entry.value.filePath);
  }

  /**
   * Calculate file hash for cache invalidation
   */
  async calculateFileHash(filePath: string): Promise<string> {
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf-8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Generate cache key from file path
   */
  private generateKey(filePath: string): string {
    return `analysis:${filePath}`;
  }

  /**
   * Get cache statistics
   */
  getStats(): AnalysisCacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalEntries: this.cache.size,
      totalSizeMB: this.getCurrentSizeMB(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0,
    };
  }

  /**
   * Get current cache size in MB
   */
  private getCurrentSizeMB(): number {
    // Rough estimate based on number of entries
    // In production, calculate actual size
    return (this.cache.size * 50) / 1024; // Assume ~50KB per entry
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const entry = entries[i];
      if (entry) {
        this.cache.delete(entry[0]);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.useRedis && config.redisUrl && !this.redisClient) {
      this.initializeRedis();
    }
  }

  /**
   * Get configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Shutdown cache manager
   */
  async shutdown(): Promise<void> {
    if (this.redisClient) {
      // await this.redisClient.quit();
    }
    this.cache.clear();
  }
}
