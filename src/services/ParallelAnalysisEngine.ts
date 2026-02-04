/**
 * Parallel Analysis Engine
 * 
 * Provides parallel processing capabilities for code analysis:
 * - Configurable concurrency for file analysis
 * - Worker pool management for distributed processing
 * - Memory optimization for large TypeScript projects
 * 
 * Requirements: 6.1, 6.4, 6.5
 */

import { SourceFile } from 'ts-morph';
import { WorkerPool } from './WorkerPool';
import { MemoryManager } from './MemoryManager';
import { 
  FileAnalysisResult, 
  AnalyzerConfig,
  AnalysisContext 
} from '../models';
import { IAnalyzer } from '../analyzer/base';

/**
 * Configuration for parallel analysis
 */
export interface ParallelAnalysisConfig {
  /** Maximum number of concurrent file analyses (default: CPU cores) */
  maxConcurrency?: number;
  /** Enable worker pool for distributed processing */
  useWorkerPool?: boolean;
  /** Memory limit in MB (default: 2048) */
  memoryLimitMB?: number;
  /** Enable memory optimization strategies */
  enableMemoryOptimization?: boolean;
  /** Batch size for processing files */
  batchSize?: number;
}

/**
 * Analysis task for worker pool
 */
export interface AnalysisTask {
  filePath: string;
  sourceFile: SourceFile;
  analyzers: IAnalyzer[];
  config: AnalyzerConfig;
  context?: AnalysisContext;
}

/**
 * Parallel Analysis Engine
 * Orchestrates parallel file analysis with memory management
 */
export class ParallelAnalysisEngine {
  private workerPool: WorkerPool | null = null;
  private memoryManager: MemoryManager;
  private config: Required<ParallelAnalysisConfig>;

  constructor(config: ParallelAnalysisConfig = {}) {
    // Set defaults
    const cpuCount = this.getCPUCount();
    this.config = {
      maxConcurrency: config.maxConcurrency ?? cpuCount,
      useWorkerPool: config.useWorkerPool ?? false,
      memoryLimitMB: config.memoryLimitMB ?? 2048,
      enableMemoryOptimization: config.enableMemoryOptimization ?? true,
      batchSize: config.batchSize ?? 10,
    };

    this.memoryManager = new MemoryManager(this.config.memoryLimitMB);

    if (this.config.useWorkerPool) {
      this.workerPool = new WorkerPool(this.config.maxConcurrency);
    }
  }

  /**
   * Analyze multiple files in parallel
   */
  async analyzeFiles(
    tasks: AnalysisTask[]
  ): Promise<FileAnalysisResult[]> {
    if (this.config.enableMemoryOptimization) {
      // Monitor memory before starting
      this.memoryManager.checkMemoryUsage();
    }

    if (this.config.useWorkerPool && this.workerPool) {
      return this.analyzeWithWorkerPool(tasks);
    } else {
      return this.analyzeWithConcurrency(tasks);
    }
  }

  /**
   * Analyze files using worker pool for distributed processing
   */
  private async analyzeWithWorkerPool(
    tasks: AnalysisTask[]
  ): Promise<FileAnalysisResult[]> {
    if (!this.workerPool) {
      throw new Error('Worker pool not initialized');
    }

    const results: FileAnalysisResult[] = [];
    const batches = this.createBatches(tasks, this.config.batchSize);

    for (const batch of batches) {
      // Check memory before each batch
      if (this.config.enableMemoryOptimization) {
        const shouldPause = this.memoryManager.checkMemoryUsage();
        if (shouldPause) {
          // Force garbage collection if available
          this.memoryManager.forceGarbageCollection();
          // Wait a bit for memory to be freed
          await this.sleep(100);
        }
      }

      const batchResults = await Promise.all(
        batch.map(task => this.workerPool!.executeTask(task))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Analyze files with configurable concurrency (no worker pool)
   */
  private async analyzeWithConcurrency(
    tasks: AnalysisTask[]
  ): Promise<FileAnalysisResult[]> {
    const results: FileAnalysisResult[] = [];
    const batches = this.createBatches(tasks, this.config.maxConcurrency);

    for (const batch of batches) {
      // Check memory before each batch
      if (this.config.enableMemoryOptimization) {
        const shouldPause = this.memoryManager.checkMemoryUsage();
        if (shouldPause) {
          this.memoryManager.forceGarbageCollection();
          await this.sleep(100);
        }
      }

      const batchResults = await Promise.all(
        batch.map(task => this.analyzeTask(task))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Analyze a single task
   */
  private async analyzeTask(task: AnalysisTask): Promise<FileAnalysisResult> {
    const startTime = Date.now();
    const issues = [];

    try {
      for (const analyzer of task.analyzers) {
        if (analyzer.isEnabled(task.config)) {
          const analyzerIssues = analyzer.analyzeFile(task.sourceFile, task.config);
          issues.push(...analyzerIssues);
        }
      }

      return {
        filePath: task.filePath,
        issues,
        analysisTimeMs: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      return {
        filePath: task.filePath,
        issues: [],
        analysisTimeMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create batches of tasks for parallel processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get CPU count for default concurrency
   */
  private getCPUCount(): number {
    try {
      const os = require('os');
      return os.cpus().length;
    } catch {
      return 4; // Default fallback
    }
  }

  /**
   * Sleep utility for memory management
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ParallelAnalysisConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ParallelAnalysisConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    // Update memory manager if limit changed
    if (config.memoryLimitMB) {
      this.memoryManager = new MemoryManager(config.memoryLimitMB);
    }

    // Recreate worker pool if concurrency changed
    if (config.maxConcurrency && this.config.useWorkerPool) {
      this.workerPool?.shutdown();
      this.workerPool = new WorkerPool(config.maxConcurrency);
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    return this.memoryManager.getMemoryStats();
  }

  /**
   * Shutdown the engine and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.workerPool) {
      await this.workerPool.shutdown();
    }
  }
}
