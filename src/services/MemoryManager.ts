/**
 * Memory Manager
 * 
 * Provides memory optimization for large TypeScript projects:
 * - Memory usage monitoring
 * - Automatic garbage collection triggers
 * - Memory pressure detection
 * - Resource cleanup strategies
 * 
 * Requirements: 6.5
 */

/**
 * Memory statistics
 */
export interface MemoryStats {
  /** Total heap size in MB */
  heapTotal: number;
  /** Used heap size in MB */
  heapUsed: number;
  /** External memory in MB */
  external: number;
  /** RSS (Resident Set Size) in MB */
  rss: number;
  /** Memory usage percentage */
  usagePercent: number;
  /** Whether memory pressure is detected */
  isUnderPressure: boolean;
}

/**
 * Memory Manager
 * Monitors and optimizes memory usage during analysis
 */
export class MemoryManager {
  private memoryLimitMB: number;
  private pressureThreshold: number;
  private criticalThreshold: number;
  private lastGCTime: number = 0;
  private gcCooldownMs: number = 5000; // 5 seconds between GC attempts

  constructor(memoryLimitMB: number) {
    this.memoryLimitMB = memoryLimitMB;
    // Trigger pressure warning at 70% of limit
    this.pressureThreshold = memoryLimitMB * 0.7;
    // Trigger critical warning at 85% of limit
    this.criticalThreshold = memoryLimitMB * 0.85;
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const externalMB = usage.external / 1024 / 1024;
    const rssMB = usage.rss / 1024 / 1024;

    const usagePercent = (heapUsedMB / this.memoryLimitMB) * 100;
    const isUnderPressure = heapUsedMB > this.pressureThreshold;

    return {
      heapTotal: heapTotalMB,
      heapUsed: heapUsedMB,
      external: externalMB,
      rss: rssMB,
      usagePercent,
      isUnderPressure,
    };
  }

  /**
   * Check memory usage and return whether processing should pause
   */
  checkMemoryUsage(): boolean {
    const stats = this.getMemoryStats();

    if (stats.heapUsed > this.criticalThreshold) {
      // Critical memory pressure - should pause and GC
      return true;
    }

    if (stats.heapUsed > this.pressureThreshold) {
      // Memory pressure detected - consider GC
      const now = Date.now();
      if (now - this.lastGCTime > this.gcCooldownMs) {
        return true;
      }
    }

    return false;
  }

  /**
   * Force garbage collection if available
   * Note: Requires --expose-gc flag when running Node.js
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      const before = this.getMemoryStats();
      global.gc();
      this.lastGCTime = Date.now();
      const after = this.getMemoryStats();
      
      // Log memory freed (optional, for debugging)
      const freed = before.heapUsed - after.heapUsed;
      if (freed > 0) {
        // Memory was freed
      }
    }
  }

  /**
   * Get memory optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const stats = this.getMemoryStats();
    const recommendations: string[] = [];

    if (stats.heapUsed > this.criticalThreshold) {
      recommendations.push('Critical memory usage detected. Consider reducing batch size or concurrency.');
    } else if (stats.heapUsed > this.pressureThreshold) {
      recommendations.push('High memory usage detected. Monitor for potential memory leaks.');
    }

    if (stats.external > 100) {
      recommendations.push('High external memory usage. Check for large buffers or native modules.');
    }

    if (stats.rss > this.memoryLimitMB * 1.5) {
      recommendations.push('RSS significantly higher than heap. Check for memory fragmentation.');
    }

    if (!global.gc) {
      recommendations.push('Run Node.js with --expose-gc flag for better memory management.');
    }

    return recommendations;
  }

  /**
   * Calculate optimal batch size based on current memory
   */
  calculateOptimalBatchSize(defaultBatchSize: number): number {
    const stats = this.getMemoryStats();
    
    if (stats.heapUsed > this.criticalThreshold) {
      // Reduce batch size significantly
      return Math.max(1, Math.floor(defaultBatchSize * 0.25));
    } else if (stats.heapUsed > this.pressureThreshold) {
      // Reduce batch size moderately
      return Math.max(1, Math.floor(defaultBatchSize * 0.5));
    }

    return defaultBatchSize;
  }

  /**
   * Update memory limit
   */
  setMemoryLimit(memoryLimitMB: number): void {
    this.memoryLimitMB = memoryLimitMB;
    this.pressureThreshold = memoryLimitMB * 0.7;
    this.criticalThreshold = memoryLimitMB * 0.85;
  }

  /**
   * Get current memory limit
   */
  getMemoryLimit(): number {
    return this.memoryLimitMB;
  }

  /**
   * Check if memory is available for operation
   */
  hasAvailableMemory(requiredMB: number): boolean {
    const stats = this.getMemoryStats();
    const availableMB = this.memoryLimitMB - stats.heapUsed;
    return availableMB >= requiredMB;
  }

  /**
   * Estimate memory required for file analysis
   */
  estimateMemoryForFile(fileSizeKB: number): number {
    // Rough estimate: 10x file size for AST and analysis
    return (fileSizeKB * 10) / 1024; // Convert to MB
  }
}
