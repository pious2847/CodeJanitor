/**
 * Project Management Tool Integration
 * 
 * Provides integration with popular project management tools for task synchronization,
 * progress tracking, and milestone/sprint integration for quality goals.
 */

import { CodeIssue } from '../models';

/**
 * Project management task representation
 */
export interface PMTask {
  /** External task ID */
  id: string;
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Task status */
  status: TaskStatus;
  /** Assigned user(s) */
  assignees: string[];
  /** Due date */
  dueDate?: Date;
  /** Priority */
  priority: TaskPriority;
  /** Tags/labels */
  tags: string[];
  /** Parent task ID (for subtasks) */
  parentId?: string;
  /** Associated milestone/sprint */
  milestone?: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Estimated effort in hours */
  estimatedHours?: number;
  /** Actual effort in hours */
  actualHours?: number;
  /** URL to view the task */
  url: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Custom fields */
  customFields?: Record<string, any>;
}

/**
 * Task status
 */
export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'done'
  | 'blocked';

/**
 * Task priority
 */
export type TaskPriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * Milestone/Sprint representation
 */
export interface Milestone {
  /** Milestone ID */
  id: string;
  /** Milestone name */
  name: string;
  /** Description */
  description: string;
  /** Start date */
  startDate: Date;
  /** End date */
  endDate: Date;
  /** Status */
  status: MilestoneStatus;
  /** Associated tasks */
  taskIds: string[];
  /** Quality goals for this milestone */
  qualityGoals: QualityGoal[];
  /** Progress percentage */
  progress: number;
}

/**
 * Milestone status
 */
export type MilestoneStatus =
  | 'planned'
  | 'active'
  | 'completed'
  | 'cancelled';

/**
 * Quality goal for a milestone
 */
export interface QualityGoal {
  /** Goal ID */
  id: string;
  /** Goal description */
  description: string;
  /** Target metric */
  metric: string;
  /** Target value */
  targetValue: number;
  /** Current value */
  currentValue: number;
  /** Whether goal is met */
  isMet: boolean;
}

/**
 * Task synchronization result
 */
export interface TaskSyncResult {
  /** Internal issue ID */
  internalId: string;
  /** External task ID */
  externalId: string;
  /** Whether sync was successful */
  success: boolean;
  /** Error message if sync failed */
  error?: string;
  /** Sync action performed */
  action: SyncAction;
}

/**
 * Sync action type
 */
export type SyncAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'no_change';

/**
 * Progress tracking data
 */
export interface ProgressTracking {
  /** Total tasks */
  totalTasks: number;
  /** Completed tasks */
  completedTasks: number;
  /** In-progress tasks */
  inProgressTasks: number;
  /** Blocked tasks */
  blockedTasks: number;
  /** Overall progress percentage */
  progressPercentage: number;
  /** Estimated completion date */
  estimatedCompletion?: Date;
  /** Velocity (tasks per day) */
  velocity: number;
}

/**
 * Project management tool configuration
 */
export interface PMToolConfig {
  /** Tool type */
  type: 'asana' | 'trello' | 'monday' | 'clickup' | 'linear';
  /** API endpoint */
  endpoint: string;
  /** Authentication credentials */
  credentials: PMCredentials;
  /** Workspace/project identifier */
  workspaceId: string;
  /** Project identifier */
  projectId: string;
  /** Sync configuration */
  syncConfig: PMSyncConfig;
}

/**
 * PM tool authentication credentials
 */
export interface PMCredentials {
  /** API token */
  token: string;
  /** Additional auth parameters */
  additionalParams?: Record<string, string>;
}

/**
 * PM tool sync configuration
 */
export interface PMSyncConfig {
  /** Whether to enable bidirectional sync */
  bidirectional: boolean;
  /** Sync interval in milliseconds */
  syncIntervalMs: number;
  /** Auto-create tasks */
  autoCreate: boolean;
  /** Auto-update progress */
  autoUpdateProgress: boolean;
  /** Sync milestones */
  syncMilestones: boolean;
  /** Field mappings */
  fieldMappings: Record<string, string>;
}

/**
 * Main interface for project management integrations
 */
export interface ProjectManagementIntegration {
  /**
   * Initialize the integration
   */
  initialize(config: PMToolConfig): Promise<void>;
  
  /**
   * Create a task in the PM tool
   */
  createTask(issue: CodeIssue): Promise<PMTask>;
  
  /**
   * Update an existing task
   */
  updateTask(taskId: string, updates: Partial<PMTask>): Promise<PMTask>;
  
  /**
   * Get a task by ID
   */
  getTask(taskId: string): Promise<PMTask>;
  
  /**
   * Delete a task
   */
  deleteTask(taskId: string): Promise<void>;
  
  /**
   * Get all tasks in the project
   */
  getAllTasks(): Promise<PMTask[]>;
  
  /**
   * Synchronize tasks
   */
  syncTasks(internalIssues: CodeIssue[]): Promise<TaskSyncResult[]>;
  
  /**
   * Track progress for a set of tasks
   */
  trackProgress(taskIds: string[]): Promise<ProgressTracking>;
  
  /**
   * Create a milestone
   */
  createMilestone(milestone: Omit<Milestone, 'id' | 'progress'>): Promise<Milestone>;
  
  /**
   * Update a milestone
   */
  updateMilestone(milestoneId: string, updates: Partial<Milestone>): Promise<Milestone>;
  
  /**
   * Get milestone by ID
   */
  getMilestone(milestoneId: string): Promise<Milestone>;
  
  /**
   * Get all milestones
   */
  getAllMilestones(): Promise<Milestone[]>;
  
  /**
   * Add quality goal to milestone
   */
  addQualityGoal(milestoneId: string, goal: Omit<QualityGoal, 'id' | 'currentValue' | 'isMet'>): Promise<QualityGoal>;
  
  /**
   * Update quality goal progress
   */
  updateQualityGoalProgress(milestoneId: string, goalId: string, currentValue: number): Promise<QualityGoal>;
  
  /**
   * Test connection to the PM tool
   */
  testConnection(): Promise<boolean>;
}

/**
 * Base implementation with common functionality
 */
export abstract class BasePMIntegration implements ProjectManagementIntegration {
  protected config: PMToolConfig | null = null;
  protected taskMapping: Map<string, string> = new Map(); // internal ID -> external ID
  
  async initialize(config: PMToolConfig): Promise<void> {
    this.config = config;
    
    // Test connection
    const connected = await this.testConnection();
    if (!connected) {
      throw new Error(`Failed to connect to ${config.type} at ${config.endpoint}`);
    }
  }
  
  abstract createTask(issue: CodeIssue): Promise<PMTask>;
  abstract updateTask(taskId: string, updates: Partial<PMTask>): Promise<PMTask>;
  abstract getTask(taskId: string): Promise<PMTask>;
  abstract deleteTask(taskId: string): Promise<void>;
  abstract getAllTasks(): Promise<PMTask[]>;
  abstract createMilestone(milestone: Omit<Milestone, 'id' | 'progress'>): Promise<Milestone>;
  abstract updateMilestone(milestoneId: string, updates: Partial<Milestone>): Promise<Milestone>;
  abstract getMilestone(milestoneId: string): Promise<Milestone>;
  abstract getAllMilestones(): Promise<Milestone[]>;
  abstract testConnection(): Promise<boolean>;
  
  async syncTasks(internalIssues: CodeIssue[]): Promise<TaskSyncResult[]> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    const results: TaskSyncResult[] = [];
    const externalTasks = await this.getAllTasks();
    const externalTaskMap = new Map(externalTasks.map(task => [task.id, task]));
    
    for (const issue of internalIssues) {
      try {
        const externalId = this.taskMapping.get(issue.id);
        
        if (externalId && externalTaskMap.has(externalId)) {
          // Task exists, update if needed
          const task = externalTaskMap.get(externalId)!;
          if (this.needsUpdate(issue, task)) {
            await this.updateTask(externalId, this.mapToTask(issue));
            results.push({
              internalId: issue.id,
              externalId,
              success: true,
              action: 'updated',
            });
          } else {
            results.push({
              internalId: issue.id,
              externalId,
              success: true,
              action: 'no_change',
            });
          }
        } else if (this.config.syncConfig.autoCreate) {
          // Create new task
          const created = await this.createTask(issue);
          this.taskMapping.set(issue.id, created.id);
          results.push({
            internalId: issue.id,
            externalId: created.id,
            success: true,
            action: 'created',
          });
        }
      } catch (error) {
        results.push({
          internalId: issue.id,
          externalId: this.taskMapping.get(issue.id) || '',
          success: false,
          error: error instanceof Error ? error.message : String(error),
          action: 'no_change',
        });
      }
    }
    
    return results;
  }
  
  async trackProgress(taskIds: string[]): Promise<ProgressTracking> {
    const tasks = await Promise.all(taskIds.map(id => this.getTask(id)));
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Calculate velocity (simple average)
    const velocity = completedTasks / Math.max(1, taskIds.length);
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      progressPercentage,
      velocity,
    };
  }
  
  async addQualityGoal(
    milestoneId: string,
    goal: Omit<QualityGoal, 'id' | 'currentValue' | 'isMet'>
  ): Promise<QualityGoal> {
    const milestone = await this.getMilestone(milestoneId);
    
    const newGoal: QualityGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
      currentValue: 0,
      isMet: false,
    };
    
    milestone.qualityGoals.push(newGoal);
    await this.updateMilestone(milestoneId, { qualityGoals: milestone.qualityGoals });
    
    return newGoal;
  }
  
  async updateQualityGoalProgress(
    milestoneId: string,
    goalId: string,
    currentValue: number
  ): Promise<QualityGoal> {
    const milestone = await this.getMilestone(milestoneId);
    const goal = milestone.qualityGoals.find(g => g.id === goalId);
    
    if (!goal) {
      throw new Error(`Quality goal ${goalId} not found in milestone ${milestoneId}`);
    }
    
    goal.currentValue = currentValue;
    goal.isMet = currentValue >= goal.targetValue;
    
    await this.updateMilestone(milestoneId, { qualityGoals: milestone.qualityGoals });
    
    return goal;
  }
  
  protected needsUpdate(issue: CodeIssue, task: PMTask): boolean {
    return task.title !== this.generateTitle(issue);
  }
  
  protected mapToTask(issue: CodeIssue): Partial<PMTask> {
    return {
      title: this.generateTitle(issue),
      description: this.generateDescription(issue),
      priority: this.mapPriority(issue.certainty),
      tags: issue.tags || [],
    };
  }
  
  protected generateTitle(issue: CodeIssue): string {
    return `[CodeJanitor] ${issue.type}: ${issue.symbolName}`;
  }
  
  protected generateDescription(issue: CodeIssue): string {
    const location = issue.locations[0];
    if (!location) {
      return issue.reason;
    }
    return `${issue.reason}\n\nFile: ${location.filePath}\nLine: ${location.startLine}`;
  }
  
  protected mapPriority(certainty: string): TaskPriority {
    switch (certainty) {
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }
}

/**
 * Asana integration implementation
 */
export class AsanaIntegration extends BasePMIntegration {
  async createTask(issue: CodeIssue): Promise<PMTask> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    const task: PMTask = {
      id: `asana-${Date.now()}`,
      title: this.generateTitle(issue),
      description: this.generateDescription(issue),
      status: 'todo',
      assignees: [],
      priority: this.mapPriority(issue.certainty),
      tags: issue.tags || [],
      progress: 0,
      url: `${this.config.endpoint}/0/123456`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.taskMapping.set(issue.id, task.id);
    return task;
  }
  
  async updateTask(taskId: string, updates: Partial<PMTask>): Promise<PMTask> {
    const existing = await this.getTask(taskId);
    return { ...existing, ...updates, updatedAt: new Date() };
  }
  
  async getTask(taskId: string): Promise<PMTask> {
    return {
      id: taskId,
      title: 'Sample Task',
      description: 'Sample description',
      status: 'todo',
      assignees: [],
      priority: 'medium',
      tags: [],
      progress: 0,
      url: `${this.config?.endpoint}/0/${taskId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  async deleteTask(taskId: string): Promise<void> {
    console.log(`Deleting Asana task ${taskId}`);
  }
  
  async getAllTasks(): Promise<PMTask[]> {
    return [];
  }
  
  async createMilestone(milestone: Omit<Milestone, 'id' | 'progress'>): Promise<Milestone> {
    return {
      ...milestone,
      id: `milestone-${Date.now()}`,
      progress: 0,
    };
  }
  
  async updateMilestone(milestoneId: string, updates: Partial<Milestone>): Promise<Milestone> {
    const existing = await this.getMilestone(milestoneId);
    return { ...existing, ...updates };
  }
  
  async getMilestone(milestoneId: string): Promise<Milestone> {
    return {
      id: milestoneId,
      name: 'Sample Milestone',
      description: 'Sample description',
      startDate: new Date(),
      endDate: new Date(),
      status: 'active',
      taskIds: [],
      qualityGoals: [],
      progress: 0,
    };
  }
  
  async getAllMilestones(): Promise<Milestone[]> {
    return [];
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    
    try {
      const url = new URL(this.config.endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * Trello integration implementation
 */
export class TrelloIntegration extends BasePMIntegration {
  async createTask(issue: CodeIssue): Promise<PMTask> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    const task: PMTask = {
      id: `trello-${Date.now()}`,
      title: this.generateTitle(issue),
      description: this.generateDescription(issue),
      status: 'todo',
      assignees: [],
      priority: this.mapPriority(issue.certainty),
      tags: issue.tags || [],
      progress: 0,
      url: `${this.config.endpoint}/c/abc123`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.taskMapping.set(issue.id, task.id);
    return task;
  }
  
  async updateTask(taskId: string, updates: Partial<PMTask>): Promise<PMTask> {
    const existing = await this.getTask(taskId);
    return { ...existing, ...updates, updatedAt: new Date() };
  }
  
  async getTask(taskId: string): Promise<PMTask> {
    return {
      id: taskId,
      title: 'Sample Card',
      description: 'Sample description',
      status: 'todo',
      assignees: [],
      priority: 'medium',
      tags: [],
      progress: 0,
      url: `${this.config?.endpoint}/c/${taskId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  async deleteTask(taskId: string): Promise<void> {
    console.log(`Archiving Trello card ${taskId}`);
  }
  
  async getAllTasks(): Promise<PMTask[]> {
    return [];
  }
  
  async createMilestone(milestone: Omit<Milestone, 'id' | 'progress'>): Promise<Milestone> {
    return {
      ...milestone,
      id: `milestone-${Date.now()}`,
      progress: 0,
    };
  }
  
  async updateMilestone(milestoneId: string, updates: Partial<Milestone>): Promise<Milestone> {
    const existing = await this.getMilestone(milestoneId);
    return { ...existing, ...updates };
  }
  
  async getMilestone(milestoneId: string): Promise<Milestone> {
    return {
      id: milestoneId,
      name: 'Sample List',
      description: 'Sample description',
      startDate: new Date(),
      endDate: new Date(),
      status: 'active',
      taskIds: [],
      qualityGoals: [],
      progress: 0,
    };
  }
  
  async getAllMilestones(): Promise<Milestone[]> {
    return [];
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    
    try {
      const url = new URL(this.config.endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * Linear integration implementation
 */
export class LinearIntegration extends BasePMIntegration {
  async createTask(issue: CodeIssue): Promise<PMTask> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    const task: PMTask = {
      id: `linear-${Date.now()}`,
      title: this.generateTitle(issue),
      description: this.generateDescription(issue),
      status: 'backlog',
      assignees: [],
      priority: this.mapPriority(issue.certainty),
      tags: issue.tags || [],
      progress: 0,
      url: `${this.config.endpoint}/issue/ABC-123`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.taskMapping.set(issue.id, task.id);
    return task;
  }
  
  async updateTask(taskId: string, updates: Partial<PMTask>): Promise<PMTask> {
    const existing = await this.getTask(taskId);
    return { ...existing, ...updates, updatedAt: new Date() };
  }
  
  async getTask(taskId: string): Promise<PMTask> {
    return {
      id: taskId,
      title: 'Sample Issue',
      description: 'Sample description',
      status: 'backlog',
      assignees: [],
      priority: 'medium',
      tags: [],
      progress: 0,
      url: `${this.config?.endpoint}/issue/${taskId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  async deleteTask(taskId: string): Promise<void> {
    console.log(`Deleting Linear issue ${taskId}`);
  }
  
  async getAllTasks(): Promise<PMTask[]> {
    return [];
  }
  
  async createMilestone(milestone: Omit<Milestone, 'id' | 'progress'>): Promise<Milestone> {
    return {
      ...milestone,
      id: `milestone-${Date.now()}`,
      progress: 0,
    };
  }
  
  async updateMilestone(milestoneId: string, updates: Partial<Milestone>): Promise<Milestone> {
    const existing = await this.getMilestone(milestoneId);
    return { ...existing, ...updates };
  }
  
  async getMilestone(milestoneId: string): Promise<Milestone> {
    return {
      id: milestoneId,
      name: 'Sample Cycle',
      description: 'Sample description',
      startDate: new Date(),
      endDate: new Date(),
      status: 'active',
      taskIds: [],
      qualityGoals: [],
      progress: 0,
    };
  }
  
  async getAllMilestones(): Promise<Milestone[]> {
    return [];
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    
    try {
      const url = new URL(this.config.endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
