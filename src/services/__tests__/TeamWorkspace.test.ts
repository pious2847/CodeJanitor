/**
 * Tests for TeamWorkspace service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TeamWorkspace } from '../TeamWorkspace';
import { User } from '../../models/enterprise';
import { AnalyzerConfig } from '../../models/types';

describe('TeamWorkspace', () => {
  let workspace: TeamWorkspace;
  let testUser: User;

  beforeEach(() => {
    workspace = new TeamWorkspace();
    testUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'developer',
    };
  });

  describe('Team Management', () => {
    it('should create a new team', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');

      expect(team).toBeDefined();
      expect(team.id).toBeDefined();
      expect(team.name).toBe('Engineering');
      expect(team.organizationId).toBe('org-1');
      expect(team.members).toHaveLength(0);
      expect(team.settings.defaultPriority).toBe('medium');
    });

    it('should add a member to a team', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      await workspace.addTeamMember(team.id, testUser, 'developer');

      const updatedTeam = await workspace.getTeam(team.id);
      expect(updatedTeam?.members).toHaveLength(1);
      expect(updatedTeam?.members[0]!.user.id).toBe(testUser.id);
      expect(updatedTeam?.members[0]!.role).toBe('developer');
    });

    it('should remove a member from a team', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      await workspace.addTeamMember(team.id, testUser, 'developer');
      await workspace.removeTeamMember(team.id, testUser.id);

      const updatedTeam = await workspace.getTeam(team.id);
      expect(updatedTeam?.members).toHaveLength(0);
    });
  });

  describe('Task Management', () => {
    it('should create a quality task', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      
      const task = await workspace.createTask(team.id, 'project-1', {
        type: 'fix_issue',
        title: 'Fix circular dependency',
        description: 'Remove circular dependency in module A',
        priority: 'high',
        createdBy: testUser.id,
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Fix circular dependency');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('open');
      expect(task.teamId).toBe(team.id);
    });

    it('should assign a task to a user', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      const task = await workspace.createTask(team.id, 'project-1', {
        type: 'fix_issue',
        title: 'Fix issue',
        description: 'Fix the issue',
        priority: 'medium',
        createdBy: testUser.id,
      });

      await workspace.assignTask(task.id, testUser);

      const tasks = await workspace.getTeamTasks(team.id);
      expect(tasks[0]!.assignee?.id).toBe(testUser.id);
      expect(tasks[0]!.status).toBe('in_progress');
    });

    it('should update task status', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      const task = await workspace.createTask(team.id, 'project-1', {
        type: 'fix_issue',
        title: 'Fix issue',
        description: 'Fix the issue',
        priority: 'medium',
        createdBy: testUser.id,
      });

      await workspace.updateTaskStatus(task.id, 'completed');

      const tasks = await workspace.getTeamTasks(team.id);
      expect(tasks[0]!.status).toBe('completed');
    });

    it('should filter tasks by status', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      
      await workspace.createTask(team.id, 'project-1', {
        type: 'fix_issue',
        title: 'Task 1',
        description: 'Description 1',
        priority: 'high',
        createdBy: testUser.id,
      });

      const task2 = await workspace.createTask(team.id, 'project-1', {
        type: 'review_code',
        title: 'Task 2',
        description: 'Description 2',
        priority: 'medium',
        createdBy: testUser.id,
      });

      await workspace.updateTaskStatus(task2.id, 'completed');

      const openTasks = await workspace.getTeamTasks(team.id, { status: 'open' });
      const completedTasks = await workspace.getTeamTasks(team.id, { status: 'completed' });

      expect(openTasks).toHaveLength(1);
      expect(completedTasks).toHaveLength(1);
    });

    it('should add comments to tasks', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      const task = await workspace.createTask(team.id, 'project-1', {
        type: 'fix_issue',
        title: 'Fix issue',
        description: 'Fix the issue',
        priority: 'medium',
        createdBy: testUser.id,
      });

      const comment = await workspace.addTaskComment(
        task.id,
        testUser,
        'This needs attention'
      );

      expect(comment).toBeDefined();
      expect(comment.content).toBe('This needs attention');
      expect(comment.author.id).toBe(testUser.id);

      const tasks = await workspace.getTeamTasks(team.id);
      expect(tasks[0]!.comments).toHaveLength(1);
    });

    it('should support threaded comments', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      const task = await workspace.createTask(team.id, 'project-1', {
        type: 'fix_issue',
        title: 'Fix issue',
        description: 'Fix the issue',
        priority: 'medium',
        createdBy: testUser.id,
      });

      const parentComment = await workspace.addTaskComment(
        task.id,
        testUser,
        'Parent comment'
      );

      const replyComment = await workspace.addTaskComment(
        task.id,
        testUser,
        'Reply to parent',
        parentComment.id
      );

      expect(replyComment.parentId).toBe(parentComment.id);

      const tasks = await workspace.getTeamTasks(team.id);
      expect(tasks[0]!.comments).toHaveLength(1);
      expect(tasks[0]!.comments[0]!.replies).toHaveLength(1);
    });
  });

  describe('Progress Tracking', () => {
    it('should track team progress', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      await workspace.addTeamMember(team.id, testUser, 'developer');

      const task1 = await workspace.createTask(team.id, 'project-1', {
        type: 'fix_issue',
        title: 'Task 1',
        description: 'Description 1',
        priority: 'high',
        createdBy: testUser.id,
      });

      await workspace.createTask(team.id, 'project-1', {
        type: 'fix_issue',
        title: 'Task 2',
        description: 'Description 2',
        priority: 'medium',
        createdBy: testUser.id,
      });

      await workspace.assignTask(task1.id, testUser);
      await workspace.updateTaskStatus(task1.id, 'completed');

      const progress = await workspace.trackProgress(team.id);

      expect(progress.teamId).toBe(team.id);
      expect(progress.totalTasks).toBe(2);
      expect(progress.completedTasks).toBe(1);
      expect(progress.inProgressTasks).toBe(0);
      expect(progress.completionPercentage).toBe(50);
    });

    it('should track individual member progress', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      await workspace.addTeamMember(team.id, testUser, 'developer');

      const task = await workspace.createTask(team.id, 'project-1', {
        type: 'fix_issue',
        title: 'Task 1',
        description: 'Description 1',
        priority: 'high',
        createdBy: testUser.id,
      });

      await workspace.assignTask(task.id, testUser);
      await workspace.updateTaskStatus(task.id, 'completed');

      const progress = await workspace.trackProgress(team.id);
      const memberProgress = progress.memberProgress.get(testUser.id);

      expect(memberProgress).toBeDefined();
      expect(memberProgress?.assignedTasks).toBe(1);
      expect(memberProgress?.completedTasks).toBe(1);
    });
  });

  describe('Discussion Threads', () => {
    it('should create a discussion thread', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      
      const discussion = await workspace.createDiscussion(
        team.id,
        'issue-1',
        'How to fix this issue?',
        [testUser]
      );

      expect(discussion).toBeDefined();
      expect(discussion.id).toBeDefined();
      expect(discussion.title).toBe('How to fix this issue?');
      expect(discussion.issueId).toBe('issue-1');
      expect(discussion.participants).toHaveLength(1);
      expect(discussion.status).toBe('open');
    });

    it('should add comments to discussions', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      const discussion = await workspace.createDiscussion(
        team.id,
        'issue-1',
        'Discussion title',
        [testUser]
      );

      const comment = await workspace.addDiscussionComment(
        discussion.id,
        testUser,
        'My thoughts on this'
      );

      expect(comment).toBeDefined();
      expect(comment.content).toBe('My thoughts on this');

      const discussions = await workspace.getTeamDiscussions(team.id);
      expect(discussions[0]!.comments).toHaveLength(1);
    });

    it('should filter discussions by status', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      
      await workspace.createDiscussion(team.id, 'issue-1', 'Discussion 1', [testUser]);
      await workspace.createDiscussion(team.id, 'issue-2', 'Discussion 2', [testUser]);

      const openDiscussions = await workspace.getTeamDiscussions(team.id, 'open');
      expect(openDiscussions).toHaveLength(2);
    });
  });

  describe('Configuration Sharing', () => {
    it('should share a configuration with the team', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      
      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: true,
        enableDeadExports: true,
        enableMissingImplementations: false,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: false,
        autoFixOnSave: false,
        ignorePatterns: ['**/*.test.ts'],
        respectUnderscoreConvention: true,
      };

      const sharedConfig = await workspace.shareConfiguration(
        team.id,
        'Standard Config',
        config,
        testUser.id,
        true
      );

      expect(sharedConfig).toBeDefined();
      expect(sharedConfig.name).toBe('Standard Config');
      expect(sharedConfig.isDefault).toBe(true);
      expect(sharedConfig.config.enableUnusedImports).toBe(true);
    });

    it('should get team configurations', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      
      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: true,
        enableDeadExports: true,
        enableMissingImplementations: false,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: false,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      await workspace.shareConfiguration(team.id, 'Config 1', config, testUser.id);
      await workspace.shareConfiguration(team.id, 'Config 2', config, testUser.id);

      const configs = await workspace.getTeamConfigurations(team.id);
      expect(configs).toHaveLength(2);
    });

    it('should get default configuration', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      
      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: true,
        enableDeadExports: true,
        enableMissingImplementations: false,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: false,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      await workspace.shareConfiguration(team.id, 'Config 1', config, testUser.id, false);
      await workspace.shareConfiguration(team.id, 'Config 2', config, testUser.id, true);

      const defaultConfig = await workspace.getDefaultConfiguration(team.id);
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig?.name).toBe('Config 2');
      expect(defaultConfig?.isDefault).toBe(true);
    });

    it('should update configuration and maintain single default', async () => {
      const team = await workspace.createTeam('Engineering', 'org-1');
      
      const config: AnalyzerConfig = {
        enableUnusedImports: true,
        enableUnusedVariables: true,
        enableDeadFunctions: true,
        enableDeadExports: true,
        enableMissingImplementations: false,
        enableCircularDependencies: true,
        enableComplexityAnalysis: true,
        enableSecurityAnalysis: true,
        enableAccessibilityAnalysis: false,
        autoFixOnSave: false,
        ignorePatterns: [],
        respectUnderscoreConvention: true,
      };

      await workspace.shareConfiguration(team.id, 'Config 1', config, testUser.id, true);
      const config2 = await workspace.shareConfiguration(team.id, 'Config 2', config, testUser.id, false);

      await workspace.updateConfiguration(config2.id, { isDefault: true });

      const configs = await workspace.getTeamConfigurations(team.id);
      const defaultConfigs = configs.filter(c => c.isDefault);
      
      expect(defaultConfigs).toHaveLength(1);
      expect(defaultConfigs[0]!.id).toBe(config2.id);
    });
  });
});
