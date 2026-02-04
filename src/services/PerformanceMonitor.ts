/**
 * Performance Monitor Service
 * 
 * Provides comprehensive performance monitoring and alerting:
 * - Real-time performance metrics collection
 * - Performance bottleneck detection
 * - Alerting for performance degradation
 * - System health checks and monitoring dashboards
 * 
 * Requirements: 6.8
 */

import { EventEmitter } from 'events';

/**
 * Performance metric types
 */
export type MetricType =
  | 'analysis_time'
  | 'memory_usage'
  | 'cpu_usage'
  | 'cache_hit_rate'
  | 'api_response_time'
  | 'database_query_time'
  | 'worker_utilization'
  | 'queue_length';

/**
 * Performance metric data point
 */
export interface PerformanceMetric {
  type: MetricType;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit: string;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThreshold {
  metric: MetricType;
  warningThreshold: number;
  criticalThreshold: number;
  enabled: boolean;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  id: string;
  metric: MetricType;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  timestamp: number;
  message: string;
  resolved: boolean;
}

/**
 * System health status
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  checks: HealthCheck[];
  timestamp: number;
  overallScore: number;
}

/**
 * Individual health check
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  value?: number;
  threshold?: number;
}

/**
 * Performance bottleneck
 */
export interface PerformanceBottleneck {
  id: string;
  type: 'cpu' | 'memory' | 'io' | 'network' | 'database';
  severity: number; // 1-10
  description: string;
  affectedOperations: string[];
  recommendation: string;
  detectedAt: number;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitorConfig {
  enabled: boolean;
  collectionIntervalMs: number;
  retentionPeriodMs: number;
  thresholds: PerformanceThreshold[];
  enableAlerting: boolean;
  enableBottleneckDetection: boolean;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  averageAnalysisTime: number;
  p95AnalysisTime: number;
  p99AnalysisTime: number;
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  cacheHitRate: number;
  totalAnalyses: number;
  failedAnalyses: number;
  averageApiResponseTime: number;
}

/**
 * Performance Monitor Service
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<MetricType, PerformanceMetric[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  private bottlenecks: PerformanceBottleneck[] = [];
  private config: PerformanceMonitorConfig;
  private collectionInterval: NodeJS.Timeout | null = null;
  private analysisTimings: number[] = [];

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    super();
    
    this.config = {
      enabled: config.enabled ?? true,
      collectionIntervalMs: config.collectionIntervalMs ?? 5000, // 5 seconds
      retentionPeriodMs: config.retentionPeriodMs ?? 3600000, // 1 hour
      thresholds: config.thresholds ?? this.getDefaultThresholds(),
      enableAlerting: config.enableAlerting ?? true,
      enableBottleneckDetection: config.enableBottleneckDetection ?? true,
    };

    if (this.config.enabled) {
      this.startCollection();
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    type: MetricType,
    value: number,
    tags?: Record<string, string>,
    unit: string = 'ms'
  ): void {
    if (!this.config.enabled) {
      return;
    }

    const metric: PerformanceMetric = {
      type,
      value,
      timestamp: Date.now(),
      tags,
      unit,
    };

    const metrics = this.metrics.get(type) || [];
    metrics.push(metric);
    this.metrics.set(type, metrics);

    // Track analysis timings separately for statistics
    if (type === 'analysis_time') {
      this.analysisTimings.push(value);
      if (this.analysisTimings.length > 1000) {
        this.analysisTimings.shift();
      }
    }

    // Check thresholds and create alerts
    if (this.config.enableAlerting) {
      this.checkThresholds(metric);
    }

    // Emit metric event
    this.emit('metric', metric);

    // Clean up old metrics
    this.cleanupOldMetrics();
  }

  /**
   * Get metrics for a specific type
   */
  getMetrics(type: MetricType, since?: number): PerformanceMetric[] {
    const metrics = this.metrics.get(type) || [];
    
    if (since) {
      return metrics.filter(m => m.timestamp >= since);
    }
    
    return metrics;
  }

  /**
   * Get all active alerts
   */
  getAlerts(unresolved: boolean = true): PerformanceAlert[] {
    if (unresolved) {
      return this.alerts.filter(a => !a.resolved);
    }
    return this.alerts;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert-resolved', alert);
    }
  }

  /**
   * Get detected performance bottlenecks
   */
  getBottlenecks(): PerformanceBottleneck[] {
    return this.bottlenecks;
  }

  /**
   * Perform system health check
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const checks: HealthCheck[] = [];

    // Check memory usage
    const memoryCheck = await this.checkMemoryHealth();
    checks.push(memoryCheck);

    // Check CPU usage
    const cpuCheck = await this.checkCPUHealth();
    checks.push(cpuCheck);

    // Check cache performance
    const cacheCheck = this.checkCacheHealth();
    checks.push(cacheCheck);

    // Check analysis performance
    const analysisCheck = this.checkAnalysisPerformance();
    checks.push(analysisCheck);

    // Check API response times
    const apiCheck = this.checkAPIPerformance();
    checks.push(apiCheck);

    // Calculate overall status
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    
    let status: 'healthy' | 'degraded' | 'critical';
    if (failCount > 0) {
      status = 'critical';
    } else if (warnCount > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    const passCount = checks.filter(c => c.status === 'pass').length;
    const overallScore = (passCount / checks.length) * 100;

    return {
      status,
      checks,
      timestamp: Date.now(),
      overallScore,
    };
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    const analysisMetrics = this.getMetrics('analysis_time');
    const memoryMetrics = this.getMetrics('memory_usage');
    const apiMetrics = this.getMetrics('api_response_time');

    return {
      averageAnalysisTime: this.calculateAverage(analysisMetrics),
      p95AnalysisTime: this.calculatePercentile(this.analysisTimings, 95),
      p99AnalysisTime: this.calculatePercentile(this.analysisTimings, 99),
      averageMemoryUsage: this.calculateAverage(memoryMetrics),
      peakMemoryUsage: this.calculateMax(memoryMetrics),
      cacheHitRate: this.calculateCacheHitRate(),
      totalAnalyses: analysisMetrics.length,
      failedAnalyses: 0, // Would track from error metrics
      averageApiResponseTime: this.calculateAverage(apiMetrics),
    };
  }

  /**
   * Detect performance bottlenecks
   */
  async detectBottlenecks(): Promise<PerformanceBottleneck[]> {
    if (!this.config.enableBottleneckDetection) {
      return [];
    }

    const newBottlenecks: PerformanceBottleneck[] = [];

    // Check for CPU bottlenecks
    const cpuMetrics = this.getMetrics('cpu_usage');
    if (cpuMetrics.length > 0) {
      const avgCPU = this.calculateAverage(cpuMetrics);
      if (avgCPU > 80) {
        newBottlenecks.push({
          id: `cpu-${Date.now()}`,
          type: 'cpu',
          severity: Math.min(10, Math.floor(avgCPU / 10)),
          description: `High CPU usage detected: ${avgCPU.toFixed(1)}%`,
          affectedOperations: ['analysis', 'parsing'],
          recommendation: 'Consider increasing worker pool size or reducing concurrency',
          detectedAt: Date.now(),
        });
      }
    }

    // Check for memory bottlenecks
    const memoryMetrics = this.getMetrics('memory_usage');
    if (memoryMetrics.length > 0) {
      const avgMemory = this.calculateAverage(memoryMetrics);
      if (avgMemory > 1500) { // > 1.5GB
        newBottlenecks.push({
          id: `memory-${Date.now()}`,
          type: 'memory',
          severity: Math.min(10, Math.floor(avgMemory / 200)),
          description: `High memory usage detected: ${avgMemory.toFixed(0)}MB`,
          affectedOperations: ['analysis', 'caching'],
          recommendation: 'Enable memory optimization or reduce batch size',
          detectedAt: Date.now(),
        });
      }
    }

    // Check for slow analysis times
    const analysisMetrics = this.getMetrics('analysis_time');
    if (analysisMetrics.length > 0) {
      const p95 = this.calculatePercentile(this.analysisTimings, 95);
      if (p95 > 5000) { // > 5 seconds
        newBottlenecks.push({
          id: `analysis-${Date.now()}`,
          type: 'cpu',
          severity: Math.min(10, Math.floor(p95 / 1000)),
          description: `Slow analysis detected: P95 = ${p95.toFixed(0)}ms`,
          affectedOperations: ['file_analysis'],
          recommendation: 'Enable parallel processing or optimize analyzer algorithms',
          detectedAt: Date.now(),
        });
      }
    }

    // Add new bottlenecks
    this.bottlenecks.push(...newBottlenecks);

    // Emit bottleneck events
    for (const bottleneck of newBottlenecks) {
      this.emit('bottleneck', bottleneck);
    }

    return newBottlenecks;
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getStats();

    if (stats.averageAnalysisTime > 2000) {
      recommendations.push('Enable parallel processing to improve analysis speed');
    }

    if (stats.cacheHitRate < 0.5) {
      recommendations.push('Increase cache TTL or enable cache warming for better performance');
    }

    if (stats.peakMemoryUsage > 2000) {
      recommendations.push('Enable memory optimization or reduce batch size');
    }

    if (stats.averageApiResponseTime > 1000) {
      recommendations.push('Consider adding API caching or optimizing database queries');
    }

    const bottlenecks = this.getBottlenecks();
    for (const bottleneck of bottlenecks) {
      if (!recommendations.includes(bottleneck.recommendation)) {
        recommendations.push(bottleneck.recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Start automatic metric collection
   */
  private startCollection(): void {
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.collectionIntervalMs);
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      // Collect memory usage
      const memoryUsage = process.memoryUsage();
      this.recordMetric('memory_usage', memoryUsage.heapUsed / 1024 / 1024, {}, 'MB');

      // Collect CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      const totalCPU = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      this.recordMetric('cpu_usage', totalCPU, {}, 'seconds');

      // Detect bottlenecks periodically
      if (this.config.enableBottleneckDetection) {
        this.detectBottlenecks();
      }
    } catch (error) {
      // Ignore collection errors
    }
  }

  /**
   * Check thresholds and create alerts
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.config.thresholds.find(t => t.metric === metric.type);
    
    if (!threshold || !threshold.enabled) {
      return;
    }

    let severity: 'warning' | 'critical' | null = null;
    let thresholdValue = 0;

    if (metric.value >= threshold.criticalThreshold) {
      severity = 'critical';
      thresholdValue = threshold.criticalThreshold;
    } else if (metric.value >= threshold.warningThreshold) {
      severity = 'warning';
      thresholdValue = threshold.warningThreshold;
    }

    if (severity) {
      const alert: PerformanceAlert = {
        id: `alert-${metric.type}-${Date.now()}`,
        metric: metric.type,
        severity,
        value: metric.value,
        threshold: thresholdValue,
        timestamp: Date.now(),
        message: `${metric.type} exceeded ${severity} threshold: ${metric.value.toFixed(2)}${metric.unit} (threshold: ${thresholdValue}${metric.unit})`,
        resolved: false,
      };

      this.alerts.push(alert);
      this.emit('alert', alert);
    }
  }

  /**
   * Health check implementations
   */
  private async checkMemoryHealth(): Promise<HealthCheck> {
    const memoryMetrics = this.getMetrics('memory_usage');
    if (memoryMetrics.length === 0) {
      return {
        name: 'Memory Usage',
        status: 'pass',
        message: 'No memory metrics available',
      };
    }

    const avgMemory = this.calculateAverage(memoryMetrics);
    const threshold = 1500; // 1.5GB

    if (avgMemory > threshold * 1.2) {
      return {
        name: 'Memory Usage',
        status: 'fail',
        message: `Critical memory usage: ${avgMemory.toFixed(0)}MB`,
        value: avgMemory,
        threshold,
      };
    } else if (avgMemory > threshold) {
      return {
        name: 'Memory Usage',
        status: 'warn',
        message: `High memory usage: ${avgMemory.toFixed(0)}MB`,
        value: avgMemory,
        threshold,
      };
    }

    return {
      name: 'Memory Usage',
      status: 'pass',
      message: `Memory usage normal: ${avgMemory.toFixed(0)}MB`,
      value: avgMemory,
      threshold,
    };
  }

  private async checkCPUHealth(): Promise<HealthCheck> {
    const cpuMetrics = this.getMetrics('cpu_usage');
    if (cpuMetrics.length === 0) {
      return {
        name: 'CPU Usage',
        status: 'pass',
        message: 'No CPU metrics available',
      };
    }

    const avgCPU = this.calculateAverage(cpuMetrics);
    const threshold = 80;

    if (avgCPU > threshold * 1.2) {
      return {
        name: 'CPU Usage',
        status: 'fail',
        message: `Critical CPU usage: ${avgCPU.toFixed(1)}%`,
        value: avgCPU,
        threshold,
      };
    } else if (avgCPU > threshold) {
      return {
        name: 'CPU Usage',
        status: 'warn',
        message: `High CPU usage: ${avgCPU.toFixed(1)}%`,
        value: avgCPU,
        threshold,
      };
    }

    return {
      name: 'CPU Usage',
      status: 'pass',
      message: `CPU usage normal: ${avgCPU.toFixed(1)}%`,
      value: avgCPU,
      threshold,
    };
  }

  private checkCacheHealth(): HealthCheck {
    const hitRate = this.calculateCacheHitRate();
    const threshold = 0.5; // 50%

    if (hitRate < threshold * 0.5) {
      return {
        name: 'Cache Performance',
        status: 'fail',
        message: `Poor cache hit rate: ${(hitRate * 100).toFixed(1)}%`,
        value: hitRate,
        threshold,
      };
    } else if (hitRate < threshold) {
      return {
        name: 'Cache Performance',
        status: 'warn',
        message: `Low cache hit rate: ${(hitRate * 100).toFixed(1)}%`,
        value: hitRate,
        threshold,
      };
    }

    return {
      name: 'Cache Performance',
      status: 'pass',
      message: `Cache hit rate good: ${(hitRate * 100).toFixed(1)}%`,
      value: hitRate,
      threshold,
    };
  }

  private checkAnalysisPerformance(): HealthCheck {
    const analysisMetrics = this.getMetrics('analysis_time');
    if (analysisMetrics.length === 0) {
      return {
        name: 'Analysis Performance',
        status: 'pass',
        message: 'No analysis metrics available',
      };
    }

    const p95 = this.calculatePercentile(this.analysisTimings, 95);
    const threshold = 3000; // 3 seconds

    if (p95 > threshold * 2) {
      return {
        name: 'Analysis Performance',
        status: 'fail',
        message: `Slow analysis: P95 = ${p95.toFixed(0)}ms`,
        value: p95,
        threshold,
      };
    } else if (p95 > threshold) {
      return {
        name: 'Analysis Performance',
        status: 'warn',
        message: `Moderate analysis speed: P95 = ${p95.toFixed(0)}ms`,
        value: p95,
        threshold,
      };
    }

    return {
      name: 'Analysis Performance',
      status: 'pass',
      message: `Analysis performance good: P95 = ${p95.toFixed(0)}ms`,
      value: p95,
      threshold,
    };
  }

  private checkAPIPerformance(): HealthCheck {
    const apiMetrics = this.getMetrics('api_response_time');
    if (apiMetrics.length === 0) {
      return {
        name: 'API Performance',
        status: 'pass',
        message: 'No API metrics available',
      };
    }

    const avgResponse = this.calculateAverage(apiMetrics);
    const threshold = 500; // 500ms

    if (avgResponse > threshold * 2) {
      return {
        name: 'API Performance',
        status: 'fail',
        message: `Slow API responses: ${avgResponse.toFixed(0)}ms`,
        value: avgResponse,
        threshold,
      };
    } else if (avgResponse > threshold) {
      return {
        name: 'API Performance',
        status: 'warn',
        message: `Moderate API response time: ${avgResponse.toFixed(0)}ms`,
        value: avgResponse,
        threshold,
      };
    }

    return {
      name: 'API Performance',
      status: 'pass',
      message: `API performance good: ${avgResponse.toFixed(0)}ms`,
      value: avgResponse,
      threshold,
    };
  }

  /**
   * Utility methods
   */
  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  private calculateMax(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    return Math.max(...metrics.map(m => m.value));
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private calculateCacheHitRate(): number {
    // This would integrate with CacheManager in production
    // For now, return a placeholder
    return 0.75;
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionPeriodMs;
    
    for (const [type, metrics] of this.metrics) {
      const filtered = metrics.filter(m => m.timestamp >= cutoff);
      this.metrics.set(type, filtered);
    }

    // Clean up old alerts
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);

    // Clean up old bottlenecks
    this.bottlenecks = this.bottlenecks.filter(b => b.detectedAt >= cutoff);
  }

  private getDefaultThresholds(): PerformanceThreshold[] {
    return [
      {
        metric: 'analysis_time',
        warningThreshold: 2000,
        criticalThreshold: 5000,
        enabled: true,
      },
      {
        metric: 'memory_usage',
        warningThreshold: 1500,
        criticalThreshold: 2000,
        enabled: true,
      },
      {
        metric: 'cpu_usage',
        warningThreshold: 70,
        criticalThreshold: 90,
        enabled: true,
      },
      {
        metric: 'api_response_time',
        warningThreshold: 500,
        criticalThreshold: 1000,
        enabled: true,
      },
      {
        metric: 'cache_hit_rate',
        warningThreshold: 0.5,
        criticalThreshold: 0.3,
        enabled: true,
      },
    ];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceMonitorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart collection if interval changed
    if (config.collectionIntervalMs && this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.startCollection();
    }
  }

  /**
   * Shutdown the monitor
   */
  shutdown(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.removeAllListeners();
  }
}
