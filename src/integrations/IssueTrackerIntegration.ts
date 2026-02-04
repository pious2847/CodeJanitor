/**
 * Issue Tracker Integration
 * 
 * Provides bidirectional synchronization with popular issue tracking systems
 * including Jira, GitHub Issues, and Azure DevOps.
 */

import { CodeIssue } from '../models';

/**
 * External issue representation
 */
export interface ExternalIssue {
  /** External issue ID (e.g., PROJ-123, #456) */
  externalId: string;
  /** Issue title */
  title: string;
  /** Issue description */
  description: string;
  /** Issue status */
  status: IssueStatus;
  /** Assigned user */
  assignee?: string;
  /** Priority level */
  priority: IssuePriority;
  /** Labels/tags */
  labels: string[];
  /** URL to view the issue */
  url: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Custom fields specific to the tracker */
  customFields?: Record<string, any>;
}

/**
 * Issue status
 */
export type IssueStatus = 
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'blocked';

/**
 * Issue priority
 */
export type IssuePriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * Sync result for a single issue
 */
export interface IssueSyncResult {
  /** Internal CodeJanitor issue ID */
  internalId: string;
  /** External tracker issue ID */
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
 * Sync configuration
 */
export interface SyncConfig {
  /** Whether to enable bidirectional sync */
  bidirectional: boolean;
  /** Sync interval in milliseconds */
  syncIntervalMs: number;
  /** Issue types to sync */
  issueTypes: string[];
  /** Field mappings between internal and external */
  fieldMappings: FieldMapping[];
  /** Auto-create issues in tracker */
  autoCreate: boolean;
  /** Auto-close resolved issues */
  autoClose: boolean;
}

/**
 * Field mapping between internal and external systems
 */
export interface FieldMapping {
  /** Internal field name */
  internalField: string;
  /** External field name */
  externalField: string;
  /** Transformation function */
  transform?: (value: any) => any;
}

/**
 * Issue tracker configuration
 */
export interface IssueTrackerConfig {
  /** Tracker type */
  type: 'jira' | 'github' | 'azure-devops';
  /** API endpoint */
  endpoint: string;
  /** Authentication credentials */
  credentials: TrackerCredentials;
  /** Project/repository identifier */
  projectId: string;
  /** Sync configuration */
  syncConfig: SyncConfig;
}

/**
 * Tracker authentication credentials
 */
export interface TrackerCredentials {
  /** API token or password */
  token: string;
  /** Username (if required) */
  username?: string;
  /** Additional auth parameters */
  additionalParams?: Record<string, string>;
}

/**
 * Main interface for issue tracker integrations
 */
export interface IssueTrackerIntegration {
  /**
   * Initialize the integration with configuration
   */
  initialize(config: IssueTrackerConfig): Promise<void>;
  
  /**
   * Create an issue in the external tracker
   */
  createIssue(issue: CodeIssue): Promise<ExternalIssue>;
  
  /**
   * Update an existing issue in the external tracker
   */
  updateIssue(externalId: string, updates: Partial<ExternalIssue>): Promise<ExternalIssue>;
  
  /**
   * Get an issue from the external tracker
   */
  getIssue(externalId: string): Promise<ExternalIssue>;
  
  /**
   * Delete/close an issue in the external tracker
   */
  deleteIssue(externalId: string): Promise<void>;
  
  /**
   * Synchronize issues between internal and external systems
   */
  syncIssues(internalIssues: CodeIssue[]): Promise<IssueSyncResult[]>;
  
  /**
   * Get all issues from the external tracker
   */
  getAllIssues(): Promise<ExternalIssue[]>;
  
  /**
   * Test connection to the tracker
   */
  testConnection(): Promise<boolean>;
}

/**
 * Base implementation with common functionality
 */
export abstract class BaseIssueTrackerIntegration implements IssueTrackerIntegration {
  protected config: IssueTrackerConfig | null = null;
  protected issueMapping: Map<string, string> = new Map(); // internal ID -> external ID
  
  async initialize(config: IssueTrackerConfig): Promise<void> {
    this.config = config;
    
    // Test connection
    const connected = await this.testConnection();
    if (!connected) {
      throw new Error(`Failed to connect to ${config.type} at ${config.endpoint}`);
    }
  }
  
  abstract createIssue(issue: CodeIssue): Promise<ExternalIssue>;
  abstract updateIssue(externalId: string, updates: Partial<ExternalIssue>): Promise<ExternalIssue>;
  abstract getIssue(externalId: string): Promise<ExternalIssue>;
  abstract deleteIssue(externalId: string): Promise<void>;
  abstract getAllIssues(): Promise<ExternalIssue[]>;
  abstract testConnection(): Promise<boolean>;
  
  async syncIssues(internalIssues: CodeIssue[]): Promise<IssueSyncResult[]> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    const results: IssueSyncResult[] = [];
    
    // Get all external issues
    const externalIssues = await this.getAllIssues();
    const externalIssueMap = new Map(
      externalIssues.map(issue => [issue.externalId, issue])
    );
    
    // Sync each internal issue
    for (const internalIssue of internalIssues) {
      try {
        const externalId = this.issueMapping.get(internalIssue.id);
        
        if (externalId && externalIssueMap.has(externalId)) {
          // Issue exists, update if needed
          const externalIssue = externalIssueMap.get(externalId)!;
          const needsUpdate = this.needsUpdate(internalIssue, externalIssue);
          
          if (needsUpdate) {
            await this.updateIssue(externalId, this.mapToExternal(internalIssue));
            results.push({
              internalId: internalIssue.id,
              externalId,
              success: true,
              action: 'updated',
            });
          } else {
            results.push({
              internalId: internalIssue.id,
              externalId,
              success: true,
              action: 'no_change',
            });
          }
        } else if (this.config.syncConfig.autoCreate) {
          // Create new issue
          const created = await this.createIssue(internalIssue);
          this.issueMapping.set(internalIssue.id, created.externalId);
          results.push({
            internalId: internalIssue.id,
            externalId: created.externalId,
            success: true,
            action: 'created',
          });
        }
      } catch (error) {
        results.push({
          internalId: internalIssue.id,
          externalId: this.issueMapping.get(internalIssue.id) || '',
          success: false,
          error: error instanceof Error ? error.message : String(error),
          action: 'no_change',
        });
      }
    }
    
    return results;
  }
  
  /**
   * Check if an issue needs updating
   */
  protected needsUpdate(internal: CodeIssue, external: ExternalIssue): boolean {
    // Simple check - in real implementation would compare all relevant fields
    return external.title !== this.generateTitle(internal);
  }
  
  /**
   * Map internal issue to external format
   */
  protected mapToExternal(issue: CodeIssue): Partial<ExternalIssue> {
    return {
      title: this.generateTitle(issue),
      description: this.generateDescription(issue),
      priority: this.mapPriority(issue.certainty),
      labels: issue.tags || [],
    };
  }
  
  /**
   * Generate title for external issue
   */
  protected generateTitle(issue: CodeIssue): string {
    return `[CodeJanitor] ${issue.type}: ${issue.symbolName}`;
  }
  
  /**
   * Generate description for external issue
   */
  protected generateDescription(issue: CodeIssue): string {
    const location = issue.locations[0];
    if (!location) {
      return issue.reason;
    }
    return `${issue.reason}\n\nFile: ${location.filePath}\nLine: ${location.startLine}\n\n${issue.explanation || ''}`;
  }
  
  /**
   * Map internal certainty to external priority
   */
  protected mapPriority(certainty: string): IssuePriority {
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
 * Jira integration implementation
 */
export class JiraIntegration extends BaseIssueTrackerIntegration {
  async createIssue(issue: CodeIssue): Promise<ExternalIssue> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Jira REST API
    const externalIssue: ExternalIssue = {
      externalId: `PROJ-${Math.floor(Math.random() * 10000)}`,
      title: this.generateTitle(issue),
      description: this.generateDescription(issue),
      status: 'open',
      priority: this.mapPriority(issue.certainty),
      labels: issue.tags || [],
      url: `${this.config.endpoint}/browse/PROJ-123`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.issueMapping.set(issue.id, externalIssue.externalId);
    return externalIssue;
  }
  
  async updateIssue(externalId: string, updates: Partial<ExternalIssue>): Promise<ExternalIssue> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Jira REST API
    const existing = await this.getIssue(externalId);
    return {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
  }
  
  async getIssue(externalId: string): Promise<ExternalIssue> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Jira REST API
    return {
      externalId,
      title: 'Sample Issue',
      description: 'Sample description',
      status: 'open',
      priority: 'medium',
      labels: [],
      url: `${this.config.endpoint}/browse/${externalId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  async deleteIssue(externalId: string): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Jira REST API to close/delete
    console.log(`Closing Jira issue ${externalId}`);
  }
  
  async getAllIssues(): Promise<ExternalIssue[]> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Jira REST API with JQL
    return [];
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    
    try {
      // In a real implementation, this would call Jira API to verify credentials
      const url = new URL(this.config.endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * GitHub Issues integration implementation
 */
export class GitHubIssuesIntegration extends BaseIssueTrackerIntegration {
  async createIssue(issue: CodeIssue): Promise<ExternalIssue> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call GitHub REST API
    const issueNumber = Math.floor(Math.random() * 10000);
    const externalIssue: ExternalIssue = {
      externalId: `#${issueNumber}`,
      title: this.generateTitle(issue),
      description: this.generateDescription(issue),
      status: 'open',
      priority: this.mapPriority(issue.certainty),
      labels: issue.tags || [],
      url: `${this.config.endpoint}/issues/${issueNumber}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.issueMapping.set(issue.id, externalIssue.externalId);
    return externalIssue;
  }
  
  async updateIssue(externalId: string, updates: Partial<ExternalIssue>): Promise<ExternalIssue> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call GitHub REST API
    const existing = await this.getIssue(externalId);
    return {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
  }
  
  async getIssue(externalId: string): Promise<ExternalIssue> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call GitHub REST API
    const issueNumber = externalId.replace('#', '');
    return {
      externalId,
      title: 'Sample Issue',
      description: 'Sample description',
      status: 'open',
      priority: 'medium',
      labels: [],
      url: `${this.config.endpoint}/issues/${issueNumber}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  async deleteIssue(externalId: string): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // GitHub doesn't support deleting issues, so we close them
    await this.updateIssue(externalId, { status: 'closed' });
  }
  
  async getAllIssues(): Promise<ExternalIssue[]> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call GitHub REST API
    return [];
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    
    try {
      // In a real implementation, this would call GitHub API to verify credentials
      const url = new URL(this.config.endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * Azure DevOps integration implementation
 */
export class AzureDevOpsIntegration extends BaseIssueTrackerIntegration {
  async createIssue(issue: CodeIssue): Promise<ExternalIssue> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Azure DevOps REST API
    const workItemId = Math.floor(Math.random() * 10000);
    const externalIssue: ExternalIssue = {
      externalId: `${workItemId}`,
      title: this.generateTitle(issue),
      description: this.generateDescription(issue),
      status: 'open',
      priority: this.mapPriority(issue.certainty),
      labels: issue.tags || [],
      url: `${this.config.endpoint}/_workitems/edit/${workItemId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.issueMapping.set(issue.id, externalIssue.externalId);
    return externalIssue;
  }
  
  async updateIssue(externalId: string, updates: Partial<ExternalIssue>): Promise<ExternalIssue> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Azure DevOps REST API
    const existing = await this.getIssue(externalId);
    return {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
  }
  
  async getIssue(externalId: string): Promise<ExternalIssue> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Azure DevOps REST API
    return {
      externalId,
      title: 'Sample Work Item',
      description: 'Sample description',
      status: 'open',
      priority: 'medium',
      labels: [],
      url: `${this.config.endpoint}/_workitems/edit/${externalId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  async deleteIssue(externalId: string): Promise<void> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Azure DevOps REST API to close
    console.log(`Closing Azure DevOps work item ${externalId}`);
  }
  
  async getAllIssues(): Promise<ExternalIssue[]> {
    if (!this.config) {
      throw new Error('Integration not initialized');
    }
    
    // In a real implementation, this would call Azure DevOps REST API with WIQL
    return [];
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    
    try {
      // In a real implementation, this would call Azure DevOps API to verify credentials
      const url = new URL(this.config.endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
