/**
 * Job Queue
 * 
 * Provides background job processing for long-running analysis tasks:
 * - Job queue management with priority support
 * - Job status tracking and progress reporting
 * - Resource management and throttling
 * - Retry logic for failed jobs
 * 
 * Requirements: 6.7
 */

/**
 * Job status
 */
export type JobStatus = 
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

/**
 * Job priority
 */
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Job type
 */
export type JobType = 
  | 'workspace-analysis'
  | 'file-analysis'
  | 'report-generation'
  | 'cache-warming'
  | 'baseline-update'
  | 'custom';

/**
 * Job definition
 */
export interface Job<T = any> {
  id: string;
  type: JobType;
  priority: JobPriority;
  status: JobStatus;
  data: T;
  result?: any;
  error?: string;
  progress: number; // 0-100
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retries: number;
  maxRetries: number;
  metadata?: Record<string, any>;
}

/**
 * Job handler function
 */
export type JobHandler<T = any, R = any> = (
  job: Job<T>,
  updateProgress: (progress: number) => void
) => Promise<R>;

/**
 * Job queue configuration
 */
export interface JobQueueConfig {
  /** Maximum concurrent jobs */
  maxConcurrency: number;
  /** Maximum retries for failed jobs */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelayMs: number;
  /** Enable job persistence */
  enablePersistence: boolean;
  /** Job timeout in milliseconds */
  jobTimeoutMs: number;
}

/**
 * Job queue statistics
 */
export interface JobQueueStats {
  totalJobs: number;
  pendingJobs: number;
  queuedJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  averageProcessingTime: number;
  successRate: number;
}

/**
 * Job Queue
 * Manages background job processing with priority and resource management
 */
export class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<JobType, JobHandler> = new Map();
  private config: JobQueueConfig;
  private runningJobs: Set<string> = new Set();
  private isProcessing = false;
  private nextJobId = 0;

  constructor(config: Partial<JobQueueConfig> = {}) {
    this.config = {
      maxConcurrency: config.maxConcurrency ?? 5,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 5000,
      enablePersistence: config.enablePersistence ?? false,
      jobTimeoutMs: config.jobTimeoutMs ?? 300000, // 5 minutes
    };
  }

  /**
   * Register a job handler
   */
  registerHandler<T, R>(type: JobType, handler: JobHandler<T, R>): void {
    this.handlers.set(type, handler as JobHandler);
  }

  /**
   * Add a job to the queue
   */
  async addJob<T>(
    type: JobType,
    data: T,
    priority: JobPriority = 'normal',
    metadata?: Record<string, any>
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: Job<T> = {
      id: jobId,
      type,
      priority,
      status: 'pending',
      data,
      progress: 0,
      createdAt: new Date(),
      retries: 0,
      maxRetries: this.config.maxRetries,
      metadata,
    };

    this.jobs.set(jobId, job);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return jobId;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): JobStatus | undefined {
    return this.jobs.get(jobId)?.status;
  }

  /**
   * Get job progress
   */
  getJobProgress(jobId: string): number | undefined {
    return this.jobs.get(jobId)?.progress;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'running') {
      // Can't cancel running jobs in this simple implementation
      // In production, use AbortController or similar
      return false;
    }

    if (job.status === 'pending' || job.status === 'queued') {
      job.status = 'cancelled';
      job.completedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }

    job.status = 'pending';
    job.retries = 0;
    job.error = undefined;
    job.progress = 0;

    if (!this.isProcessing) {
      this.startProcessing();
    }

    return true;
  }

  /**
   * Start processing jobs
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.hasJobsToProcess()) {
      // Check if we can run more jobs
      if (this.runningJobs.size >= this.config.maxConcurrency) {
        await this.sleep(100);
        continue;
      }

      // Get next job to process
      const job = this.getNextJob();
      if (!job) {
        await this.sleep(100);
        continue;
      }

      // Process job
      this.processJob(job);
    }

    this.isProcessing = false;
  }

  /**
   * Check if there are jobs to process
   */
  private hasJobsToProcess(): boolean {
    return Array.from(this.jobs.values()).some(
      job => job.status === 'pending' || job.status === 'queued'
    );
  }

  /**
   * Get next job to process (by priority)
   */
  private getNextJob(): Job | null {
    const priorityOrder: JobPriority[] = ['critical', 'high', 'normal', 'low'];
    
    for (const priority of priorityOrder) {
      const job = Array.from(this.jobs.values()).find(
        j => (j.status === 'pending' || j.status === 'queued') && j.priority === priority
      );
      if (job) {
        return job;
      }
    }

    return null;
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'failed';
      job.error = `No handler registered for job type: ${job.type}`;
      job.completedAt = new Date();
      return;
    }

    job.status = 'running';
    job.startedAt = new Date();
    this.runningJobs.add(job.id);

    try {
      // Create progress updater
      const updateProgress = (progress: number) => {
        job.progress = Math.min(100, Math.max(0, progress));
      };

      // Execute job with timeout
      const result = await this.executeWithTimeout(
        handler(job, updateProgress),
        this.config.jobTimeoutMs
      );

      job.result = result;
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);

      // Retry logic
      if (job.retries < job.maxRetries) {
        job.retries++;
        job.status = 'retrying';
        
        // Wait before retry
        await this.sleep(this.config.retryDelayMs);
        job.status = 'pending';
      } else {
        job.status = 'failed';
        job.completedAt = new Date();
      }
    } finally {
      this.runningJobs.delete(job.id);
    }
  }

  /**
   * Execute promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Job timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Get queue statistics
   */
  getStats(): JobQueueStats {
    const jobs = Array.from(this.jobs.values());
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const failedJobs = jobs.filter(j => j.status === 'failed');

    const processingTimes = completedJobs
      .filter(j => j.startedAt && j.completedAt)
      .map(j => j.completedAt!.getTime() - j.startedAt!.getTime());

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const totalProcessed = completedJobs.length + failedJobs.length;
    const successRate = totalProcessed > 0
      ? completedJobs.length / totalProcessed
      : 0;

    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      queuedJobs: jobs.filter(j => j.status === 'queued').length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      cancelledJobs: jobs.filter(j => j.status === 'cancelled').length,
      averageProcessingTime,
      successRate,
    };
  }

  /**
   * Get all jobs
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter(j => j.status === status);
  }

  /**
   * Get jobs by type
   */
  getJobsByType(type: JobType): Job[] {
    return Array.from(this.jobs.values()).filter(j => j.type === type);
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): number {
    const completedJobs = Array.from(this.jobs.values())
      .filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled');

    for (const job of completedJobs) {
      this.jobs.delete(job.id);
    }

    return completedJobs.length;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<JobQueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): JobQueueConfig {
    return { ...this.config };
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${this.nextJobId++}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown job queue
   */
  async shutdown(): Promise<void> {
    this.isProcessing = false;

    // Wait for running jobs to complete
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.runningJobs.size > 0 && Date.now() - startTime < maxWaitTime) {
      await this.sleep(100);
    }

    // Cancel remaining jobs
    for (const job of this.jobs.values()) {
      if (job.status === 'pending' || job.status === 'queued' || job.status === 'running') {
        job.status = 'cancelled';
        job.completedAt = new Date();
      }
    }
  }
}
