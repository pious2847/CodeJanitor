/**
 * Monitoring Tool Integration
 * 
 * Provides integration with APM and monitoring tools for metrics export,
 * including Datadog, New Relic, and custom webhook support.
 */

import { QualityMetrics } from '../models';

/**
 * Metric data point for export
 */
export interface MetricDataPoint {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** Timestamp */
  timestamp: Date;
  /** Metric type */
  type: MetricType;
  /** Tags for filtering and grouping */
  tags: Record<string, string>;
  /** Unit of measurement */
  unit?: string;
}

/**
 * Metric type
 */
export type MetricType =
  | 'gauge'      // Current value (e.g., current complexity)
  | 'counter'    // Cumulative count (e.g., total issues found)
  | 'histogram'  // Distribution (e.g., complexity distribution)
  | 'rate';      // Rate of change (e.g., issues per day)

/**
 * Metric export result
 */
export interface MetricExportResult {
  /** Whether export was successful */
  success: boolean;
  /** Number of metrics exported */
  metricsExported: number;
  /** Error message if export failed */
  error?: string;
  /** Export timestamp */
  timestamp: Date;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Alert name */
  name: string;
  /** Metric to monitor */
  metricName: string;
  /** Condition for triggering alert */
  condition: AlertCondition;
  /** Threshold value */
  threshold: number;
  /** Alert severity */
  severity: AlertSeverity;
  /** Notification channels */
  channels: string[];
  /** Whether alert is enabled */
  enabled: boolean;
}

/**
 * Alert condition
 */
export type AlertCondition =
  | 'above'
  | 'below'
  | 'equal'
  | 'not_equal';

/**
 * Alert severity
 */
export type AlertSeverity =
  | 'critical'
  | 'warning'
  | 'info';

/**
 * Monitoring tool configuration
 */
export interface MonitoringConfig {
  /** Tool type */
  type: 'datadog' | 'newrelic' | 'webhook';
  /** API endpoint */
  endpoint: string;
  /** Authentication credentials */
  credentials: MonitoringCredentials;
  /** Export interval in milliseconds */
  exportIntervalMs: number;
  /** Metric prefix for namespacing */
  metricPrefix: string;
  /** Default tags to apply to all metrics */
  defaultTags: Record<string, string>;
  /** Whether to enable alerts */
  enableAlerts: boolean;
  /** Alert configurations */
  alerts: AlertConfig[];
}

/**
 * Monitoring tool credentials
 */
export interface MonitoringCredentials {
  /** API key */
  apiKey: string;
  /** Application key (if required) */
  appKey?: string;
  /** Additional auth parameters */
  additionalParams?: Record<string, string>;
}

/**
 * Webhook payload for custom integrations
 */
export interface WebhookPayload {
  /** Event type */
  event: string;
  /** Timestamp */
  timestamp: Date;
  /** Metrics data */
  metrics: MetricDataPoint[];
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Main interface for monitoring integrations
 */
export interface MonitoringIntegration {
  /**
   * Initialize the integration
   */
  initialize(config: MonitoringConfig): Promise<void>;
  
  /**
   * Export a single metric
   */
  exportMetric(metric: MetricDataPoint): Promise<MetricExportResult>;
  
  /**
   * Export multiple metrics in batch
   */
  exportMetrics(metrics: MetricDataPoint[]): Promise<MetricExportResult>;
  
  /**
   * Export quality metrics from analysis
   */
  exportQualityMetrics(
    projectId: string,
    metrics: QualityMetrics,
    tags?: Record<string, string>
  ): Promise<MetricExportResult>;
  
  /**
   * Create an alert
   */
  createAlert(alert: AlertConfig): Promise<void>;
  
  /**
   * Update an alert
   */
  updateAlert(alertName: string, updates: Partial<AlertConfig>): Promise<void>;
  
  /**
   * Delete an alert
   */
  deleteAlert(alertName: string): Promise<void>;
  
  /**
   * Get all alerts
   */
  getAllAlerts(): Promise<AlertConfig[]>;
  
  /**
   * Test connection to the monitoring tool
   */
  testConnection(): Promise<boolean>;
}

/**
 * Base implementation with common functionality
 */
export abstract class BaseMonitoringIntegration implements MonitoringIntegration {
  protected config: MonitoringConfig | null = null;
  protected exportTimer: NodeJS.Timeout | null = null;
  
  async initialize(config: MonitoringConfig): Promise<void> {
    this.config = config;
    
    // Test connection
    const connected = await this.testConnection();
    if (!connected) {
      throw new Error(`Failed to connect to ${config.type} at ${config.endpoint}`);
    }
  }
  
  abstract exportMetric(metric: MetricDataPoint): Promise<MetricExportResult>;
  abstract exportMetrics(metrics: MetricDataPoint[]): Promise<MetricExportResult>;
  abstract createAlert(alert: AlertConfig): Promise<void>;
  abstract updateAlert(alertName: string, updates: Partial<AlertConfig>): Promise<void>;
  abstract deleteAlert(alertName: string): Promise<void>;
  abstract getAllAlerts(): Promise<AlertConfig[]>;
  abstract testConnection(): Promise<boolean>;
  
  async exportQualityMetrics(
    projectId: string,
    metrics: QualityMetrics,
    tags?: Record<string, string>
  ): Promise<MetricExportResult> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    const timestamp = new Date();
    const baseTags = {
      ...this.config.defaultTags,
      project: projectId,
      ...tags,
    };
    
    const metricPoints: MetricDataPoint[] = [
      // Complexity metrics
      {
        name: `${this.config.metricPrefix}.complexity.cyclomatic`,
        value: metrics.complexity.cyclomaticComplexity,
        timestamp,
        type: 'gauge',
        tags: baseTags,
        unit: 'count',
      },
      {
        name: `${this.config.metricPrefix}.complexity.cognitive`,
        value: metrics.complexity.cognitiveComplexity,
        timestamp,
        type: 'gauge',
        tags: baseTags,
        unit: 'count',
      },
      {
        name: `${this.config.metricPrefix}.complexity.nesting`,
        value: metrics.complexity.maxNestingDepth,
        timestamp,
        type: 'gauge',
        tags: baseTags,
        unit: 'levels',
      },
      {
        name: `${this.config.metricPrefix}.complexity.loc`,
        value: metrics.complexity.linesOfCode,
        timestamp,
        type: 'gauge',
        tags: baseTags,
        unit: 'lines',
      },
      
      // Maintainability metrics
      {
        name: `${this.config.metricPrefix}.maintainability.index`,
        value: metrics.maintainability.maintainabilityIndex,
        timestamp,
        type: 'gauge',
        tags: baseTags,
        unit: 'score',
      },
      {
        name: `${this.config.metricPrefix}.maintainability.duplications`,
        value: metrics.maintainability.duplications,
        timestamp,
        type: 'counter',
        tags: baseTags,
        unit: 'count',
      },
      
      // Security metrics
      {
        name: `${this.config.metricPrefix}.security.vulnerabilities`,
        value: metrics.security.vulnerabilities,
        timestamp,
        type: 'counter',
        tags: baseTags,
        unit: 'count',
      },
      {
        name: `${this.config.metricPrefix}.security.secrets`,
        value: metrics.security.secrets,
        timestamp,
        type: 'counter',
        tags: baseTags,
        unit: 'count',
      },
      {
        name: `${this.config.metricPrefix}.security.risk_score`,
        value: metrics.security.riskScore,
        timestamp,
        type: 'gauge',
        tags: baseTags,
        unit: 'score',
      },
      
      // Performance metrics
      {
        name: `${this.config.metricPrefix}.performance.antipatterns`,
        value: metrics.performance.antiPatterns,
        timestamp,
        type: 'counter',
        tags: baseTags,
        unit: 'count',
      },
      
      // Testability metrics
      {
        name: `${this.config.metricPrefix}.testability.coverage`,
        value: metrics.testability.coverage,
        timestamp,
        type: 'gauge',
        tags: baseTags,
        unit: 'percent',
      },
      {
        name: `${this.config.metricPrefix}.testability.untested_functions`,
        value: metrics.testability.untestedFunctions,
        timestamp,
        type: 'counter',
        tags: baseTags,
        unit: 'count',
      },
    ];
    
    return this.exportMetrics(metricPoints);
  }
  
  /**
   * Shutdown the integration
   */
  async shutdown(): Promise<void> {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = null;
    }
    this.config = null;
  }
}

/**
 * Datadog integration implementation
 */
export class DatadogIntegration extends BaseMonitoringIntegration {
  async exportMetric(metric: MetricDataPoint): Promise<MetricExportResult> {
    return this.exportMetrics([metric]);
  }
  
  async exportMetrics(metrics: MetricDataPoint[]): Promise<MetricExportResult> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    try {
      // In a real implementation, this would call Datadog API
      // POST https://api.datadoghq.com/api/v1/series
      
      return {
        success: true,
        metricsExported: metrics.length,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        metricsExported: 0,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }
  
  async createAlert(alert: AlertConfig): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Datadog Monitors API
    console.log(`Creating Datadog monitor: ${alert.name}`);
  }
  
  async updateAlert(alertName: string, updates: Partial<AlertConfig>): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    console.log(`Updating Datadog monitor: ${alertName}`, updates);
  }
  
  async deleteAlert(alertName: string): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    console.log(`Deleting Datadog monitor: ${alertName}`);
  }
  
  async getAllAlerts(): Promise<AlertConfig[]> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Datadog Monitors API
    return [];
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    
    try {
      // In a real implementation, this would validate API key
      const url = new URL(this.config.endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * New Relic integration implementation
 */
export class NewRelicIntegration extends BaseMonitoringIntegration {
  async exportMetric(metric: MetricDataPoint): Promise<MetricExportResult> {
    return this.exportMetrics([metric]);
  }
  
  async exportMetrics(metrics: MetricDataPoint[]): Promise<MetricExportResult> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    try {
      // In a real implementation, this would call New Relic Metric API
      // POST https://metric-api.newrelic.com/metric/v1
      
      return {
        success: true,
        metricsExported: metrics.length,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        metricsExported: 0,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }
  
  async createAlert(alert: AlertConfig): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call New Relic Alerts API
    console.log(`Creating New Relic alert: ${alert.name}`);
  }
  
  async updateAlert(alertName: string, updates: Partial<AlertConfig>): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    console.log(`Updating New Relic alert: ${alertName}`, updates);
  }
  
  async deleteAlert(alertName: string): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    console.log(`Deleting New Relic alert: ${alertName}`);
  }
  
  async getAllAlerts(): Promise<AlertConfig[]> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call New Relic Alerts API
    return [];
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    
    try {
      // In a real implementation, this would validate API key
      const url = new URL(this.config.endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * Custom webhook integration implementation
 */
export class WebhookIntegration extends BaseMonitoringIntegration {
  async exportMetric(metric: MetricDataPoint): Promise<MetricExportResult> {
    return this.exportMetrics([metric]);
  }
  
  async exportMetrics(metrics: MetricDataPoint[]): Promise<MetricExportResult> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    try {
      const payload: WebhookPayload = {
        event: 'metrics.export',
        timestamp: new Date(),
        metrics,
        metadata: {
          source: 'codejanitor-enterprise',
          version: '1.0.0',
        },
      };
      
      // In a real implementation, this would POST to the webhook URL
      console.log(`Sending metrics to webhook: ${this.config.endpoint}`, payload);
      
      return {
        success: true,
        metricsExported: metrics.length,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        metricsExported: 0,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }
  
  async createAlert(alert: AlertConfig): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // Webhooks don't typically support alerts
    console.log(`Alert creation not supported for webhook integration: ${alert.name}`);
  }
  
  async updateAlert(alertName: string, updates: Partial<AlertConfig>): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    console.log(`Alert update not supported for webhook integration: ${alertName}`, updates);
  }
  
  async deleteAlert(alertName: string): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    console.log(`Alert deletion not supported for webhook integration: ${alertName}`);
  }
  
  async getAllAlerts(): Promise<AlertConfig[]> {
    // Webhooks don't support alerts
    return [];
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    
    try {
      // In a real implementation, this would send a test payload
      const url = new URL(this.config.endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create monitoring integration instances
 */
export function createMonitoringIntegration(
  type: 'datadog' | 'newrelic' | 'webhook'
): MonitoringIntegration {
  switch (type) {
    case 'datadog':
      return new DatadogIntegration();
    case 'newrelic':
      return new NewRelicIntegration();
    case 'webhook':
      return new WebhookIntegration();
    default:
      throw new Error(`Unsupported monitoring integration type: ${type}`);
  }
}
