/**
 * Worker Pool
 * 
 * Manages a pool of workers for distributed analysis processing
 * Provides task queuing, load balancing, and worker lifecycle management
 */

import { FileAnalysisResult } from '../models';
import { AnalysisTask } from './ParallelAnalysisEngine';

/**
 * Worker status
 */
type WorkerStatus = 'idle' | 'busy' | 'error' | 'terminated';

/**
 * Worker information
 */
interface WorkerInfo {
  id: number;
  status: WorkerStatus;
  currentTask: AnalysisTask | null;
  tasksCompleted: number;
  errors: number;
  lastActivity: Date;
}

/**
 * Task queue item
 */
interface QueuedTask {
  task: AnalysisTask;
  resolve: (result: FileAnalysisResult) => void;
  reject: (error: Error) => void;
}

/**
 * Worker Pool for distributed analysis
 * 
 * Note: This is a simplified in-process implementation.
 * For true distributed processing, this would use worker_threads or child_process.
 */
export class WorkerPool {
  private workers: Map<number, WorkerInfo> = new Map();
  private taskQueue: QueuedTask[] = [];
  private maxWorkers: number;
  private nextWorkerId = 0;
  private isShuttingDown = false;

  constructor(maxWorkers: number) {
    this.maxWorkers = maxWorkers;
    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      const workerId = this.nextWorkerId++;
      this.workers.set(workerId, {
        id: workerId,
        status: 'idle',
        currentTask: null,
        tasksCompleted: 0,
        errors: 0,
        lastActivity: new Date(),
      });
    }
  }

  /**
   * Execute a task using the worker pool
   */
  async executeTask(task: AnalysisTask): Promise<FileAnalysisResult> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    // Find idle workers
    const idleWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'idle');

    // Assign tasks to idle workers
    for (const worker of idleWorkers) {
      if (this.taskQueue.length === 0) {
        break;
      }

      const queuedTask = this.taskQueue.shift();
      if (queuedTask) {
        this.assignTaskToWorker(worker.id, queuedTask);
      }
    }
  }

  /**
   * Assign a task to a specific worker
   */
  private async assignTaskToWorker(
    workerId: number,
    queuedTask: QueuedTask
  ): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      queuedTask.reject(new Error(`Worker ${workerId} not found`));
      return;
    }

    worker.status = 'busy';
    worker.currentTask = queuedTask.task;
    worker.lastActivity = new Date();

    try {
      // Execute the task (in-process for now)
      const result = await this.executeTaskInWorker(queuedTask.task);
      
      worker.tasksCompleted++;
      worker.status = 'idle';
      worker.currentTask = null;
      worker.lastActivity = new Date();

      queuedTask.resolve(result);
    } catch (error) {
      worker.errors++;
      worker.status = 'error';
      worker.currentTask = null;
      worker.lastActivity = new Date();

      queuedTask.reject(error instanceof Error ? error : new Error(String(error)));

      // Reset worker to idle after error
      setTimeout(() => {
        if (worker.status === 'error') {
          worker.status = 'idle';
        }
      }, 1000);
    }

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Execute task in worker (simplified in-process implementation)
   * In a real implementation, this would use worker_threads
   */
  private async executeTaskInWorker(task: AnalysisTask): Promise<FileAnalysisResult> {
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
   * Get worker pool statistics
   */
  getStats() {
    const workers = Array.from(this.workers.values());
    return {
      totalWorkers: this.maxWorkers,
      idleWorkers: workers.filter(w => w.status === 'idle').length,
      busyWorkers: workers.filter(w => w.status === 'busy').length,
      errorWorkers: workers.filter(w => w.status === 'error').length,
      queuedTasks: this.taskQueue.length,
      totalTasksCompleted: workers.reduce((sum, w) => sum + w.tasksCompleted, 0),
      totalErrors: workers.reduce((sum, w) => sum + w.errors, 0),
    };
  }

  /**
   * Get detailed worker information
   */
  getWorkerInfo(): WorkerInfo[] {
    return Array.from(this.workers.values());
  }

  /**
   * Shutdown the worker pool
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Wait for all busy workers to complete
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.hasBusyWorkers() && Date.now() - startTime < maxWaitTime) {
      await this.sleep(100);
    }

    // Mark all workers as terminated
    for (const worker of this.workers.values()) {
      worker.status = 'terminated';
    }

    // Reject any remaining queued tasks
    for (const queuedTask of this.taskQueue) {
      queuedTask.reject(new Error('Worker pool shut down'));
    }
    this.taskQueue = [];
  }

  /**
   * Check if any workers are busy
   */
  private hasBusyWorkers(): boolean {
    return Array.from(this.workers.values()).some(w => w.status === 'busy');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
