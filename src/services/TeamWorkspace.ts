/**
 * TeamWorkspace Service
 * 
 * Manages team collaboration features including:
 * - Team management and member operations
 * - Task assignment and progress tracking
 * - Discussion threads and commenting system
 * - Configuration sharing across team members
 * 
 * Requirements: 3.3, 3.4, 3.6, 3.7
 */

import {
  Team,
  TeamMember,
  User,
  EnterpriseCodeIssue,
  Priority,
  TaskStatus,
  TeamMetrics,
  TeamSettings,
} from '../models/enterprise';
import { AnalyzerConfig } from '../models/types';

/**
 * Quality task for team assignment
 */
export interface QualityTask {
  /** Unique task identifier */
  id: string;
  /** Task type */
  type: 'fix_issue' | 'review_code' | 'refactor' | 'documentation';
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Priority level */
  priority: Priority;
  /** Associated code issue */
  issue?: EnterpriseCodeIssue;
  /** Assigned team member */
  assignee?: User;
  /** Due date */
  dueDate?: Date;
  /** Current status */
  status: TaskStatus;
  /** Comments on this task */
  comments: Comment[];
  /** Team this task belongs to */
  teamId: string;
  /** Project this task belongs to */
  projectId: string;
  /** When the task was created */
  createdAt: Date;
  /** When the task was last updated */
  updatedAt: Date;
  /** Who created the task */
  createdBy: string;
}

/**
 * Comment on a task or issue
 */
export interface Comment {
  /** Unique comment identifier */
  id: string;
  /** Comment author */
  author: User;
  /** Comment content */
  content: string;
  /** When the comment was created */
  createdAt: Date;
  /** When the comment was last edited */
  editedAt?: Date;
  /** Parent comment ID for threaded discussions */
  parentId?: string;
  /** Replies to this comment */
  replies: Comment[];
}

/**
 * Discussion thread for quality issues
 */
export interface Discussion {
  /** Unique discussion identifier */
  id: string;
  /** Discussion title */
  title: string;
  /** Associated issue */
  issueId: string;
  /** Participants in the discussion */
  participants: User[];
  /** Comments in the discussion */
  comments: Comment[];
  /** Discussion status */
  status: 'open' | 'resolved' | 'closed';
  /** When the discussion was created */
  createdAt: Date;
  /** When the discussion was last updated */
  updatedAt: Date;
  /** Team this discussion belongs to */
  teamId: string;
}

/**
 * Team progress tracking
 */
export interface TeamProgress {
  /** Team identifier */
  teamId: string;
  /** Total tasks assigned */
  totalTasks: number;
  /** Completed tasks */
  completedTasks: number;
  /** In-progress tasks */
  inProgressTasks: number;
  /** Overdue tasks */
  overdueTasks: number;
  /** Completion percentage */
  completionPercentage: number;
  /** Average task completion time in hours */
  avgCompletionTime: number;
  /** Progress by member */
  memberProgress: Map<string, MemberProgress>;
  /** Progress trend */
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Individual member progress
 */
export interface MemberProgress {
  /** User identifier */
  userId: string;
  /** User information */
  user: User;
  /** Tasks assigned */
  assignedTasks: number;
  /** Tasks completed */
  completedTasks: number;
  /** Tasks in progress */
  inProgressTasks: number;
  /** Average completion time in hours */
  avgCompletionTime: number;
  /** Quality score (0-100) */
  qualityScore: number;
}

/**
 * Shared configuration
 */
export interface SharedConfiguration {
  /** Configuration identifier */
  id: string;
  /** Configuration name */
  name: string;
  /** Analyzer configuration */
  config: AnalyzerConfig;
  /** Team this configuration belongs to */
  teamId: string;
  /** Who created this configuration */
  createdBy: string;
  /** When it was created */
  createdAt: Date;
  /** When it was last updated */
  updatedAt: Date;
  /** Whether this is the default configuration */
  isDefault: boolean;
}

/**
 * TeamWorkspace service for managing team collaboration
 */
export class TeamWorkspace {
  private teams: Map<string, Team> = new Map();
  private tasks: Map<string, QualityTask> = new Map();
  private discussions: Map<string, Discussion> = new Map();
  private configurations: Map<string, SharedConfiguration> = new Map();

  /**
   * Create a new team
   */
  async createTeam(
    name: string,
    organizationId: string,
    settings?: Partial<TeamSettings>
  ): Promise<Team> {
    const teamId = this.generateId('team');
    const now = new Date();

    const defaultSettings: TeamSettings = {
      defaultPriority: 'medium',
      autoAssign: false,
      notifications: {
        email: true,
        slack: false,
        inApp: true,
      },
      ...settings,
    };

    const team: Team = {
      id: teamId,
      name,
      organizationId,
      members: [],
      projects: [],
      policies: [],
      metrics: this.initializeTeamMetrics(),
      settings: defaultSettings,
      createdAt: now,
      updatedAt: now,
    };

    this.teams.set(teamId, team);
    return team;
  }

  /**
   * Get a team by ID
   */
  async getTeam(teamId: string): Promise<Team | undefined> {
    return this.teams.get(teamId);
  }

  /**
   * Add a member to a team
   */
  async addTeamMember(
    teamId: string,
    user: User,
    role: TeamMember['role']
  ): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    const member: TeamMember = {
      user,
      role,
      joinedAt: new Date(),
    };

    team.members.push(member);
    team.updatedAt = new Date();
  }

  /**
   * Remove a member from a team
   */
  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    team.members = team.members.filter((m) => m.user.id !== userId);
    team.updatedAt = new Date();
  }

  /**
   * Create a quality task
   */
  async createTask(
    teamId: string,
    projectId: string,
    taskData: {
      type: QualityTask['type'];
      title: string;
      description: string;
      priority: Priority;
      issue?: EnterpriseCodeIssue;
      dueDate?: Date;
      createdBy: string;
    }
  ): Promise<QualityTask> {
    const taskId = this.generateId('task');
    const now = new Date();

    const task: QualityTask = {
      id: taskId,
      type: taskData.type,
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      issue: taskData.issue,
      assignee: undefined,
      dueDate: taskData.dueDate,
      status: 'open',
      comments: [],
      teamId,
      projectId,
      createdAt: now,
      updatedAt: now,
      createdBy: taskData.createdBy,
    };

    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * Assign a task to a team member
   */
  async assignTask(taskId: string, assignee: User): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.assignee = assignee;
    task.status = 'in_progress';
    task.updatedAt = new Date();
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = status;
    task.updatedAt = new Date();
  }

  /**
   * Add a comment to a task
   */
  async addTaskComment(
    taskId: string,
    author: User,
    content: string,
    parentId?: string
  ): Promise<Comment> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const comment: Comment = {
      id: this.generateId('comment'),
      author,
      content,
      createdAt: new Date(),
      parentId,
      replies: [],
    };

    if (parentId) {
      // Add as a reply to parent comment
      const parentComment = this.findComment(task.comments, parentId);
      if (parentComment) {
        parentComment.replies.push(comment);
      }
    } else {
      // Add as top-level comment
      task.comments.push(comment);
    }

    task.updatedAt = new Date();
    return comment;
  }

  /**
   * Get tasks for a team
   */
  async getTeamTasks(teamId: string, filters?: {
    status?: TaskStatus;
    assignee?: string;
    priority?: Priority;
  }): Promise<QualityTask[]> {
    let tasks = Array.from(this.tasks.values()).filter(
      (t) => t.teamId === teamId
    );

    if (filters?.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    if (filters?.assignee) {
      tasks = tasks.filter((t) => t.assignee?.id === filters.assignee);
    }

    if (filters?.priority) {
      tasks = tasks.filter((t) => t.priority === filters.priority);
    }

    return tasks;
  }

  /**
   * Track team progress
   */
  async trackProgress(teamId: string): Promise<TeamProgress> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    const tasks = await this.getTeamTasks(teamId);
    const now = new Date();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== 'completed'
    ).length;

    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average completion time
    const completedTasksWithTime = tasks.filter(
      (t) => t.status === 'completed' && t.createdAt && t.updatedAt
    );
    const avgCompletionTime =
      completedTasksWithTime.length > 0
        ? completedTasksWithTime.reduce(
            (sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()),
            0
          ) /
          completedTasksWithTime.length /
          (1000 * 60 * 60) // Convert to hours
        : 0;

    // Calculate member progress
    const memberProgress = new Map<string, MemberProgress>();
    for (const member of team.members) {
      const memberTasks = tasks.filter((t) => t.assignee?.id === member.user.id);
      const memberCompleted = memberTasks.filter((t) => t.status === 'completed').length;
      const memberInProgress = memberTasks.filter((t) => t.status === 'in_progress').length;

      const memberCompletedWithTime = memberTasks.filter(
        (t) => t.status === 'completed' && t.createdAt && t.updatedAt
      );
      const memberAvgTime =
        memberCompletedWithTime.length > 0
          ? memberCompletedWithTime.reduce(
              (sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()),
              0
            ) /
            memberCompletedWithTime.length /
            (1000 * 60 * 60)
          : 0;

      memberProgress.set(member.user.id, {
        userId: member.user.id,
        user: member.user,
        assignedTasks: memberTasks.length,
        completedTasks: memberCompleted,
        inProgressTasks: memberInProgress,
        avgCompletionTime: memberAvgTime,
        qualityScore: 85, // Placeholder - would be calculated from actual metrics
      });
    }

    // Determine trend (simplified - would use historical data in production)
    const trend = completionPercentage > 75 ? 'improving' : completionPercentage > 50 ? 'stable' : 'declining';

    return {
      teamId,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionPercentage,
      avgCompletionTime,
      memberProgress,
      trend,
    };
  }

  /**
   * Create a discussion thread
   */
  async createDiscussion(
    teamId: string,
    issueId: string,
    title: string,
    participants: User[]
  ): Promise<Discussion> {
    const discussionId = this.generateId('discussion');
    const now = new Date();

    const discussion: Discussion = {
      id: discussionId,
      title,
      issueId,
      participants,
      comments: [],
      status: 'open',
      createdAt: now,
      updatedAt: now,
      teamId,
    };

    this.discussions.set(discussionId, discussion);
    return discussion;
  }

  /**
   * Add a comment to a discussion
   */
  async addDiscussionComment(
    discussionId: string,
    author: User,
    content: string,
    parentId?: string
  ): Promise<Comment> {
    const discussion = this.discussions.get(discussionId);
    if (!discussion) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const comment: Comment = {
      id: this.generateId('comment'),
      author,
      content,
      createdAt: new Date(),
      parentId,
      replies: [],
    };

    if (parentId) {
      const parentComment = this.findComment(discussion.comments, parentId);
      if (parentComment) {
        parentComment.replies.push(comment);
      }
    } else {
      discussion.comments.push(comment);
    }

    discussion.updatedAt = new Date();
    return comment;
  }

  /**
   * Get discussions for a team
   */
  async getTeamDiscussions(teamId: string, status?: Discussion['status']): Promise<Discussion[]> {
    let discussions = Array.from(this.discussions.values()).filter(
      (d) => d.teamId === teamId
    );

    if (status) {
      discussions = discussions.filter((d) => d.status === status);
    }

    return discussions;
  }

  /**
   * Share a configuration with the team
   */
  async shareConfiguration(
    teamId: string,
    name: string,
    config: AnalyzerConfig,
    createdBy: string,
    isDefault: boolean = false
  ): Promise<SharedConfiguration> {
    const configId = this.generateId('config');
    const now = new Date();

    const sharedConfig: SharedConfiguration = {
      id: configId,
      name,
      config,
      teamId,
      createdBy,
      createdAt: now,
      updatedAt: now,
      isDefault,
    };

    this.configurations.set(configId, sharedConfig);
    return sharedConfig;
  }

  /**
   * Get shared configurations for a team
   */
  async getTeamConfigurations(teamId: string): Promise<SharedConfiguration[]> {
    return Array.from(this.configurations.values()).filter(
      (c) => c.teamId === teamId
    );
  }

  /**
   * Get the default configuration for a team
   */
  async getDefaultConfiguration(teamId: string): Promise<SharedConfiguration | undefined> {
    return Array.from(this.configurations.values()).find(
      (c) => c.teamId === teamId && c.isDefault
    );
  }

  /**
   * Update a shared configuration
   */
  async updateConfiguration(
    configId: string,
    updates: Partial<Pick<SharedConfiguration, 'name' | 'config' | 'isDefault'>>
  ): Promise<void> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Configuration ${configId} not found`);
    }

    if (updates.name !== undefined) {
      config.name = updates.name;
    }
    if (updates.config !== undefined) {
      config.config = updates.config;
    }
    if (updates.isDefault !== undefined) {
      // If setting as default, unset other defaults for this team
      if (updates.isDefault) {
        for (const [id, cfg] of this.configurations.entries()) {
          if (cfg.teamId === config.teamId && id !== configId) {
            cfg.isDefault = false;
          }
        }
      }
      config.isDefault = updates.isDefault;
    }

    config.updatedAt = new Date();
  }

  /**
   * Helper: Initialize team metrics
   */
  private initializeTeamMetrics(): TeamMetrics {
    return {
      totalIssues: 0,
      resolvedIssues: 0,
      avgResolutionTime: 0,
      qualityScore: 100,
      technicalDebtMinutes: 0,
    };
  }

  /**
   * Helper: Find a comment by ID in a comment tree
   */
  private findComment(comments: Comment[], commentId: string): Comment | undefined {
    for (const comment of comments) {
      if (comment.id === commentId) {
        return comment;
      }
      const found = this.findComment(comment.replies, commentId);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  /**
   * Get all teams
   */
  async getAllTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  /**
   * Get all projects across all teams
   */
  async getAllProjects(): Promise<Array<{ id: string; name: string; teamId: string }>> {
    const projects: Array<{ id: string; name: string; teamId: string }> = [];
    
    for (const team of this.teams.values()) {
      for (const project of team.projects) {
        projects.push({
          id: project.id,
          name: project.name,
          teamId: team.id,
        });
      }
    }
    
    return projects;
  }

  /**
   * Helper: Generate unique IDs
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
