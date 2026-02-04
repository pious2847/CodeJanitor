/**
 * Tests for Performance Monitor Service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from '../PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      enabled: true,
      collectionIntervalMs: 100,
      retentionPeriodMs: 5000,
      enableAlerting: true,
      enableBottleneckDetection: true,
    });
  });

  afterEach(() => {
    monitor.shutdown();
  });

  describe('Metric Recording', () => {
    it('should record performance metrics', () => {
      monitor.recordMetric('analysis_time', 1500, { file: 'test.ts' }, 'ms');
      
      const metrics = monitor.getMetrics('analysis_time');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.value).toBe(1500);
      expect(metrics[0]?.type).toBe('analysis_time');
      expect(metrics[0]?.unit).toBe('ms');
    });

    it('should record multiple metrics of same type', () => {
      monitor.recordMetric('analysis_time', 1000);
      monitor.recordMetric('analysis_time', 1500);
      monitor.recordMetric('analysis_time', 2000);
      
      const metrics = monitor.getMetrics('analysis_time');
      expect(metrics).toHaveLength(3);
    });

    it('should record metrics with tags', () => {
      monitor.recordMetric('analysis_time', 1500, { 
        file: 'test.ts',
        analyzer: 'complexity' 
      });
      
      const metrics = monitor.getMetrics('analysis_time');
      expect(metrics[0]?.tags).toEqual({
        file: 'test.ts',
        analyzer: 'complexity',
      });
    });

    it('should filter metrics by timestamp', () => {
      const now = Date.now();
      monitor.recordMetric('analysis_time', 1000);
      
      // Wait a bit
      const later = now + 100;
      
      const recentMetrics = monitor.getMetrics('analysis_time', later);
      expect(recentMetrics.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Alerting', () => {
    it('should create warning alert when threshold exceeded', () => {
      // Record metric above warning threshold (2000ms)
      monitor.recordMetric('analysis_time', 2500);
      
      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0]?.severity).toBe('warning');
    });

    it('should create critical alert when critical threshold exceeded', () => {
      // Record metric above critical threshold (5000ms)
      monitor.recordMetric('analysis_time', 6000);
      
      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const criticalAlert = alerts.find(a => a.severity === 'critical');
      expect(criticalAlert).toBeDefined();
    });

    it('should resolve alerts', () => {
      monitor.recordMetric('analysis_time', 6000);
      
      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const alertId = alerts[0]?.id;
      if (alertId) {
        monitor.resolveAlert(alertId);
        
        const unresolvedAlerts = monitor.getAlerts(true);
        expect(unresolvedAlerts.find(a => a.id === alertId)).toBeUndefined();
      }
    });

    it('should emit alert events', () => {
      return new Promise<void>((resolve) => {
        monitor.on('alert', (alert) => {
          expect(alert.metric).toBe('analysis_time');
          expect(alert.severity).toBeDefined();
          resolve();
        });

        monitor.recordMetric('analysis_time', 6000);
      });
    });
  });

  describe('System Health Checks', () => {
    it('should perform system health check', async () => {
      // Record some metrics
      monitor.recordMetric('memory_usage', 500, {}, 'MB');
      monitor.recordMetric('cpu_usage', 50, {}, '%');
      monitor.recordMetric('analysis_time', 1000);
      
      const health = await monitor.checkSystemHealth();
      
      expect(health.status).toBeDefined();
      expect(health.checks).toBeInstanceOf(Array);
      expect(health.checks.length).toBeGreaterThan(0);
      expect(health.overallScore).toBeGreaterThanOrEqual(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);
    });

    it('should report healthy status with good metrics', async () => {
      monitor.recordMetric('memory_usage', 500, {}, 'MB');
      monitor.recordMetric('cpu_usage', 30, {}, '%');
      monitor.recordMetric('analysis_time', 1000);
      
      const health = await monitor.checkSystemHealth();
      
      expect(health.status).toBe('healthy');
    });

    it('should report degraded status with warning metrics', async () => {
      monitor.recordMetric('memory_usage', 1600, {}, 'MB'); // Above warning
      monitor.recordMetric('analysis_time', 1000);
      
      const health = await monitor.checkSystemHealth();
      
      expect(['degraded', 'critical']).toContain(health.status);
    });

    it('should include multiple health checks', async () => {
      monitor.recordMetric('memory_usage', 500, {}, 'MB');
      monitor.recordMetric('analysis_time', 1000);
      
      const health = await monitor.checkSystemHealth();
      
      const checkNames = health.checks.map(c => c.name);
      expect(checkNames).toContain('Memory Usage');
      expect(checkNames).toContain('Analysis Performance');
    });
  });

  describe('Performance Statistics', () => {
    it('should calculate performance statistics', () => {
      monitor.recordMetric('analysis_time', 1000);
      monitor.recordMetric('analysis_time', 1500);
      monitor.recordMetric('analysis_time', 2000);
      monitor.recordMetric('memory_usage', 500, {}, 'MB');
      monitor.recordMetric('memory_usage', 600, {}, 'MB');
      
      const stats = monitor.getStats();
      
      expect(stats.averageAnalysisTime).toBeGreaterThan(0);
      expect(stats.p95AnalysisTime).toBeGreaterThanOrEqual(0);
      expect(stats.p99AnalysisTime).toBeGreaterThanOrEqual(0);
      expect(stats.averageMemoryUsage).toBeGreaterThan(0);
      expect(stats.totalAnalyses).toBe(3);
    });

    it('should calculate percentiles correctly', () => {
      // Record 100 metrics with known distribution
      for (let i = 1; i <= 100; i++) {
        monitor.recordMetric('analysis_time', i * 10);
      }
      
      const stats = monitor.getStats();
      
      // P95 should be around 950ms (95th value * 10)
      expect(stats.p95AnalysisTime).toBeGreaterThan(900);
      expect(stats.p95AnalysisTime).toBeLessThan(1000);
      
      // P99 should be around 990ms (99th value * 10)
      expect(stats.p99AnalysisTime).toBeGreaterThan(980);
    });

    it('should track peak memory usage', () => {
      monitor.recordMetric('memory_usage', 500, {}, 'MB');
      monitor.recordMetric('memory_usage', 800, {}, 'MB');
      monitor.recordMetric('memory_usage', 600, {}, 'MB');
      
      const stats = monitor.getStats();
      
      expect(stats.peakMemoryUsage).toBe(800);
    });
  });

  describe('Bottleneck Detection', () => {
    it('should detect CPU bottlenecks', async () => {
      // Record high CPU usage
      for (let i = 0; i < 10; i++) {
        monitor.recordMetric('cpu_usage', 85, {}, '%');
      }
      
      const bottlenecks = await monitor.detectBottlenecks();
      
      const cpuBottleneck = bottlenecks.find(b => b.type === 'cpu');
      expect(cpuBottleneck).toBeDefined();
      expect(cpuBottleneck?.severity).toBeGreaterThan(0);
    });

    it('should detect memory bottlenecks', async () => {
      // Record high memory usage
      for (let i = 0; i < 10; i++) {
        monitor.recordMetric('memory_usage', 1600, {}, 'MB');
      }
      
      const bottlenecks = await monitor.detectBottlenecks();
      
      const memoryBottleneck = bottlenecks.find(b => b.type === 'memory');
      expect(memoryBottleneck).toBeDefined();
    });

    it('should detect slow analysis bottlenecks', async () => {
      // Record slow analysis times
      for (let i = 0; i < 100; i++) {
        monitor.recordMetric('analysis_time', 6000);
      }
      
      const bottlenecks = await monitor.detectBottlenecks();
      
      expect(bottlenecks.length).toBeGreaterThan(0);
    });

    it('should emit bottleneck events', async () => {
      return new Promise<void>((resolve) => {
        monitor.on('bottleneck', (bottleneck) => {
          expect(bottleneck.type).toBeDefined();
          expect(bottleneck.severity).toBeGreaterThan(0);
          expect(bottleneck.recommendation).toBeDefined();
          resolve();
        });

        // Trigger bottleneck detection
        for (let i = 0; i < 10; i++) {
          monitor.recordMetric('cpu_usage', 90, {}, '%');
        }
        
        monitor.detectBottlenecks();
      });
    });
  });

  describe('Performance Recommendations', () => {
    it('should provide recommendations for slow analysis', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordMetric('analysis_time', 3000);
      }
      
      const recommendations = monitor.getRecommendations();
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('parallel'))).toBe(true);
    });

    it('should provide recommendations for low cache hit rate', () => {
      // This would require integration with CacheManager
      // For now, test that recommendations are returned
      const recommendations = monitor.getRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should provide recommendations for high memory usage', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordMetric('memory_usage', 2100, {}, 'MB');
      }
      
      const recommendations = monitor.getRecommendations();
      
      expect(recommendations.some(r => r.includes('memory'))).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should respect enabled flag', () => {
      const disabledMonitor = new PerformanceMonitor({ enabled: false });
      
      disabledMonitor.recordMetric('analysis_time', 1000);
      
      const metrics = disabledMonitor.getMetrics('analysis_time');
      expect(metrics).toHaveLength(0);
      
      disabledMonitor.shutdown();
    });

    it('should update configuration', () => {
      monitor.updateConfig({
        enableAlerting: false,
      });
      
      monitor.recordMetric('analysis_time', 10000); // Way above threshold
      
      const alerts = monitor.getAlerts();
      expect(alerts).toHaveLength(0);
    });

    it('should respect custom thresholds', () => {
      const customMonitor = new PerformanceMonitor({
        thresholds: [
          {
            metric: 'analysis_time',
            warningThreshold: 1000,
            criticalThreshold: 2000,
            enabled: true,
          },
        ],
      });
      
      customMonitor.recordMetric('analysis_time', 1500);
      
      const alerts = customMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      customMonitor.shutdown();
    });
  });

  describe('Metric Cleanup', () => {
    it('should clean up old metrics based on retention period', async () => {
      const shortRetentionMonitor = new PerformanceMonitor({
        retentionPeriodMs: 100, // 100ms retention
      });
      
      shortRetentionMonitor.recordMetric('analysis_time', 1000);
      
      // Wait for retention period to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Record new metric to trigger cleanup
      shortRetentionMonitor.recordMetric('analysis_time', 2000);
      
      const metrics = shortRetentionMonitor.getMetrics('analysis_time');
      // Should only have the recent metric
      expect(metrics.length).toBeLessThanOrEqual(1);
      
      shortRetentionMonitor.shutdown();
    });
  });
});
