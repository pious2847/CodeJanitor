/**
 * CI Integration Service
 * 
 * Provides webhook handlers for major CI platforms, quality gate evaluation,
 * and intelligent caching for CI analysis optimization.
 */

import { WorkspaceAnalysisResult, FileAnalysisResult, AnalyzerConfig } from '../models/types';
import { QualityBaseline } from '../models/enterprise';

/**
 * Supported CI platforms
 */
export type CIPlatform = 'github-actions' | 'jenkins' | 'gitlab-ci' | 'azure-pipelines' | 'circleci';

/**
 * Webhook event types
 */
export type WebhookEvent = 'push' | 'pull_request' | 'merge' | 'tag';

/**
 * Comparison operator for gate conditions
 */
export type ComparisonOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq';

/**
 * Condition scope for quality gates
 */
export type ConditionScope = 'new_code' | 'overall' | 'changed_files';

/**
 * Report format for CI systems
 */
export type ReportFormat = 'json' | 'junit' | 'checkstyle' | 'sarif';

/**
 * Notification channel types for CI
 */
export type CINotificationChannel = 'email' | 'slack' | 'teams' | 'webhook';

/**
 * Webhook configuration
 */
export interface Webhook {
  id: string;
  repositoryId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  platform: CIPlatform;
  enabled: boolean;
  createdAt: Date;
}

/**
 * Commit information
 */
export interface Commit {
  hash: string;
  author: string;
  email: string;
  message: string;
  timestamp: Date;
  branch: string;
  changedFiles: string[];
  repositoryId: string;
}

/**
 * Quality gate condition
 */
export interface GateCondition {
  id: string;
  metric: MetricType;
  operator: ComparisonOperator;
  threshold: number;
  scope: ConditionScope;
}

/**
 * Metric types for quality gates
 */
export type MetricType =
  | 'code_quality'
  | 'technical_debt'
  | 'test_coverage'
  | 'complexity'
  | 'security_issues'
  | 'duplications'
  | 'new_issues';

/**
 * Quality gate configuration
 */
export interface QualityGate {
  id: string;
  name: string;
  description?: string;
  conditions: GateCondition[];
  blockOnFailure: boolean;
  notificationChannels: CINotificationChannel[];
  enabled: boolean;
}

/**
 * Gate evaluation result
 */
export interface GateResult {
  passed: boolean;
  gate: QualityGate;
  evaluatedConditions: ConditionEvaluation[];
  timestamp: Date;
  summary: string;
}

/**
 * Condition evaluation result
 */
export interface ConditionEvaluation {
  condition: GateCondition;
  passed: boolean;
  actualValue: number;
  expectedValue: number;
  message: string;
}

/**
 * CI report
 */
export interface CIReport {
  format: ReportFormat;
  content: string;
  timestamp: Date;
  analysisResult: WorkspaceAnalysisResult;
  gateResult?: GateResult;
}

/**
 * Cache entry for analysis results
 */
export interface CacheEntry {
  key: string;
  result: WorkspaceAnalysisResult;
  timestamp: Date;
  expiresAt: Date;
  fileHashes: Map<string, string>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  totalSizeBytes: number;
}

/**
 * CI Integration Service
 */
export class CIIntegration {
  private webhooks: Map<string, Webhook> = new Map();
  private qualityGates: Map<string, QualityGate> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalEntries: 0,
    totalSizeBytes: 0,
  };

  /**
   * Register a webhook for a repository
   */
  async registerWebhook(
    repositoryId: string,
    platform: CIPlatform,
    events: WebhookEvent[]
  ): Promise<Webhook> {
    const webhook: Webhook = {
      id: this.generateWebhookId(repositoryId, platform),
      repositoryId,
      url: this.generateWebhookUrl(repositoryId, platform),
      secret: this.generateWebhookSecret(),
      events,
      platform,
      enabled: true,
      createdAt: new Date(),
    };

    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  /**
   * Analyze a commit
   */
  async analyzeCommit(
    commit: Commit,
    _config: AnalyzerConfig,
    _baseline?: QualityBaseline
  ): Promise<WorkspaceAnalysisResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(commit);
    const cachedResult = this.getCachedResult(cacheKey);
    
    if (cachedResult) {
      this.cacheStats.hits++;
      this.updateCacheHitRate();
      return cachedResult;
    }

    this.cacheStats.misses++;
    this.updateCacheHitRate();

    // Perform analysis (in real implementation, this would call the actual analyzer)
    const result = await this.performAnalysis(commit, _config);

    // Cache the result
    this.cacheResult(cacheKey, result, commit.changedFiles);

    return result;
  }

  /**
   * Evaluate quality gate
   */
  evaluateQualityGate(
    results: WorkspaceAnalysisResult,
    gate: QualityGate,
    baseline?: QualityBaseline
  ): GateResult {
    const evaluatedConditions: ConditionEvaluation[] = [];
    let allPassed = true;

    for (const condition of gate.conditions) {
      const evaluation = this.evaluateCondition(condition, results, baseline);
      evaluatedConditions.push(evaluation);
      
      if (!evaluation.passed) {
        allPassed = false;
      }
    }

    const passedCount = evaluatedConditions.filter(e => e.passed).length;
    const summary = `Quality Gate: ${allPassed ? 'PASSED' : 'FAILED'} (${passedCount}/${evaluatedConditions.length} conditions met)`;

    return {
      passed: allPassed,
      gate,
      evaluatedConditions,
      timestamp: new Date(),
      summary,
    };
  }

  /**
   * Generate CI report
   */
  generateCIReport(
    results: WorkspaceAnalysisResult,
    format: ReportFormat,
    gateResult?: GateResult
  ): CIReport {
    let content: string;

    switch (format) {
      case 'json':
        content = this.generateJsonReport(results, gateResult);
        break;
      case 'junit':
        content = this.generateJunitReport(results, gateResult);
        break;
      case 'checkstyle':
        content = this.generateCheckstyleReport(results);
        break;
      case 'sarif':
        content = this.generateSarifReport(results);
        break;
      default:
        content = this.generateJsonReport(results, gateResult);
    }

    return {
      format,
      content,
      timestamp: new Date(),
      analysisResult: results,
      gateResult,
    };
  }

  /**
   * Create a quality gate
   */
  createQualityGate(gate: Omit<QualityGate, 'id'>): QualityGate {
    const id = this.generateGateId(gate.name);
    const qualityGate: QualityGate = {
      id,
      ...gate,
    };

    this.qualityGates.set(id, qualityGate);
    return qualityGate;
  }

  /**
   * Get quality gate by ID
   */
  getQualityGate(id: string): QualityGate | undefined {
    return this.qualityGates.get(id);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      totalSizeBytes: 0,
    };
  }

  /**
   * Invalidate cache entries for specific files
   */
  invalidateCache(filePaths: string[]): void {
    const filePathSet = new Set(filePaths);
    
    for (const [key, entry] of this.cache.entries()) {
      // Check if any of the cached file hashes match the invalidated files
      for (const filePath of entry.fileHashes.keys()) {
        if (filePathSet.has(filePath)) {
          this.cache.delete(key);
          this.cacheStats.totalEntries--;
          break;
        }
      }
    }
  }

  // Private helper methods

  private generateWebhookId(repositoryId: string, platform: CIPlatform): string {
    return `webhook-${repositoryId}-${platform}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateWebhookUrl(repositoryId: string, platform: CIPlatform): string {
    return `https://api.codejanitor.io/webhooks/${platform}/${repositoryId}`;
  }

  private generateWebhookSecret(): string {
    return `secret-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateGateId(name: string): string {
    return `gate-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  }

  private generateCacheKey(commit: Commit): string {
    const filesHash = commit.changedFiles.sort().join('|');
    return `${commit.repositoryId}-${commit.hash}-${filesHash}`;
  }

  private getCachedResult(key: string): WorkspaceAnalysisResult | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.cacheStats.totalEntries--;
      return null;
    }

    return entry.result;
  }

  private cacheResult(
    key: string,
    result: WorkspaceAnalysisResult,
    changedFiles: string[]
  ): void {
    const fileHashes = new Map<string, string>();
    
    // Generate simple hashes for changed files (in real implementation, use actual file hashes)
    for (const file of changedFiles) {
      fileHashes.set(file, this.simpleHash(file));
    }

    const entry: CacheEntry = {
      key,
      result,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      fileHashes,
    };

    this.cache.set(key, entry);
    this.cacheStats.totalEntries++;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private updateCacheHitRate(): void {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0 ? this.cacheStats.hits / total : 0;
  }

  private async performAnalysis(
    commit: Commit,
    _config: AnalyzerConfig
  ): Promise<WorkspaceAnalysisResult> {
    // Placeholder implementation - in real system, this would call the actual analyzer
    const fileResults: FileAnalysisResult[] = commit.changedFiles.map(filePath => ({
      filePath,
      issues: [],
      analysisTimeMs: 10,
      success: true,
    }));

    return {
      fileResults,
      totalFiles: commit.changedFiles.length,
      totalIssues: 0,
      issuesByType: {} as any,
      issuesByCertainty: {} as any,
      totalTimeMs: fileResults.reduce((sum, r) => sum + r.analysisTimeMs, 0),
    };
  }

  private evaluateCondition(
    condition: GateCondition,
    results: WorkspaceAnalysisResult,
    _baseline?: QualityBaseline
  ): ConditionEvaluation {
    const actualValue = this.extractMetricValue(condition.metric, results, _baseline);
    const passed = this.compareValues(actualValue, condition.operator, condition.threshold);

    return {
      condition,
      passed,
      actualValue,
      expectedValue: condition.threshold,
      message: this.generateConditionMessage(condition, actualValue, passed),
    };
  }

  private extractMetricValue(
    metric: MetricType,
    results: WorkspaceAnalysisResult,
    _baseline?: QualityBaseline
  ): number {
    switch (metric) {
      case 'new_issues':
        return results.totalIssues;
      case 'security_issues':
        return results.issuesByType['security-vulnerability'] || 0;
      case 'complexity':
        // Placeholder - would calculate from actual metrics
        return 10;
      case 'technical_debt':
        // Placeholder - would calculate from actual metrics
        return 120;
      case 'test_coverage':
        // Placeholder - would get from coverage reports
        return 75;
      case 'code_quality':
        // Placeholder - would calculate quality score
        return 85;
      case 'duplications':
        return results.issuesByType['code-duplication'] || 0;
      default:
        return 0;
    }
  }

  private compareValues(actual: number, operator: ComparisonOperator, threshold: number): boolean {
    switch (operator) {
      case 'lt':
        return actual < threshold;
      case 'lte':
        return actual <= threshold;
      case 'gt':
        return actual > threshold;
      case 'gte':
        return actual >= threshold;
      case 'eq':
        return actual === threshold;
      case 'neq':
        return actual !== threshold;
      default:
        return false;
    }
  }

  private generateConditionMessage(
    condition: GateCondition,
    actualValue: number,
    passed: boolean
  ): string {
    const status = passed ? 'PASSED' : 'FAILED';
    const operatorText = this.operatorToText(condition.operator);
    return `${status}: ${condition.metric} is ${actualValue}, expected ${operatorText} ${condition.threshold}`;
  }

  private operatorToText(operator: ComparisonOperator): string {
    const map: Record<ComparisonOperator, string> = {
      lt: 'less than',
      lte: 'less than or equal to',
      gt: 'greater than',
      gte: 'greater than or equal to',
      eq: 'equal to',
      neq: 'not equal to',
    };
    return map[operator];
  }

  private generateJsonReport(results: WorkspaceAnalysisResult, gateResult?: GateResult): string {
    return JSON.stringify({
      summary: {
        totalFiles: results.totalFiles,
        totalIssues: results.totalIssues,
        totalTimeMs: results.totalTimeMs,
      },
      issuesByType: results.issuesByType,
      issuesByCertainty: results.issuesByCertainty,
      qualityGate: gateResult ? {
        passed: gateResult.passed,
        summary: gateResult.summary,
        conditions: gateResult.evaluatedConditions.map(e => ({
          metric: e.condition.metric,
          passed: e.passed,
          message: e.message,
        })),
      } : undefined,
      files: results.fileResults.map(f => ({
        path: f.filePath,
        issues: f.issues.length,
        success: f.success,
      })),
    }, null, 2);
  }

  private generateJunitReport(results: WorkspaceAnalysisResult, _gateResult?: GateResult): string {
    const failures = results.fileResults.filter(f => f.issues.length > 0).length;
    const tests = results.fileResults.length;

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuite name="CodeJanitor Analysis" tests="${tests}" failures="${failures}" time="${results.totalTimeMs / 1000}">\n`;

    for (const fileResult of results.fileResults) {
      const hasIssues = fileResult.issues.length > 0;
      xml += `  <testcase name="${fileResult.filePath}" time="${fileResult.analysisTimeMs / 1000}">\n`;
      
      if (hasIssues) {
        xml += `    <failure message="${fileResult.issues.length} issues found">\n`;
        for (const issue of fileResult.issues) {
          xml += `      ${issue.type}: ${issue.reason}\n`;
        }
        xml += `    </failure>\n`;
      }
      
      xml += `  </testcase>\n`;
    }

    xml += '</testsuite>';
    return xml;
  }

  private generateCheckstyleReport(results: WorkspaceAnalysisResult): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<checkstyle version="8.0">\n';

    for (const fileResult of results.fileResults) {
      if (fileResult.issues.length > 0) {
        xml += `  <file name="${fileResult.filePath}">\n`;
        
        for (const issue of fileResult.issues) {
          const location = issue.locations[0];
          if (location) {
            const severity = issue.certainty === 'high' ? 'error' : issue.certainty === 'medium' ? 'warning' : 'info';
            xml += `    <error line="${location.startLine}" column="${location.startColumn}" severity="${severity}" message="${issue.reason}" source="${issue.type}"/>\n`;
          }
        }
        
        xml += `  </file>\n`;
      }
    }

    xml += '</checkstyle>';
    return xml;
  }

  private generateSarifReport(results: WorkspaceAnalysisResult): string {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'CodeJanitor',
            version: '1.0.0',
            informationUri: 'https://codejanitor.io',
          },
        },
        results: results.fileResults.flatMap(fileResult =>
          fileResult.issues.map(issue => {
            const location = issue.locations[0];
            if (!location) {
              return null;
            }
            return {
              ruleId: issue.type,
              level: issue.certainty === 'high' ? 'error' : issue.certainty === 'medium' ? 'warning' : 'note',
              message: {
                text: issue.reason,
              },
              locations: [{
                physicalLocation: {
                  artifactLocation: {
                    uri: fileResult.filePath,
                  },
                  region: {
                    startLine: location.startLine,
                    startColumn: location.startColumn,
                    endLine: location.endLine,
                    endColumn: location.endColumn,
                  },
                },
              }],
            };
          }).filter(r => r !== null)
        ),
      }],
    };

    return JSON.stringify(sarif, null, 2);
  }
}
