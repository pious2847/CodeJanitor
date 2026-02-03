/**
 * Git Integration Service
 * 
 * Enhanced Git integration for enterprise features including:
 * - Pull request annotation functionality
 * - Code ownership and responsibility metrics calculation
 * - Git blame analysis for issue attribution
 * 
 * Requirements: 2.6, 3.2
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { EnterpriseCodeIssue } from '../models/enterprise';
import { FileBlameInfo, LineBlameInfo } from '../models/types';

const execP = promisify(exec);

/**
 * Pull request annotation
 */
export interface PRAnnotation {
  /** File path relative to repository root */
  filePath: string;
  /** Line number where annotation should appear */
  line: number;
  /** Annotation message */
  message: string;
  /** Severity level */
  level: 'error' | 'warning' | 'info';
  /** Associated issue ID */
  issueId: string;
  /** Title of the annotation */
  title: string;
}

/**
 * Code ownership metrics for a file or module
 */
export interface CodeOwnership {
  /** File or module path */
  path: string;
  /** Primary owner (author with most contributions) */
  primaryOwner: string;
  /** All contributors with their contribution percentages */
  contributors: Map<string, ContributorMetrics>;
  /** Total lines in the file */
  totalLines: number;
  /** Last modified date */
  lastModified: Date;
  /** Number of commits touching this file */
  commitCount: number;
}

/**
 * Contributor metrics
 */
export interface ContributorMetrics {
  /** Author name */
  author: string;
  /** Author email */
  email: string;
  /** Number of lines authored */
  linesAuthored: number;
  /** Percentage of file owned */
  ownershipPercentage: number;
  /** Number of commits */
  commitCount: number;
  /** Last contribution date */
  lastContribution: Date;
}

/**
 * Responsibility metrics for a developer
 */
export interface ResponsibilityMetrics {
  /** Developer identifier (email or name) */
  developer: string;
  /** Files primarily owned by this developer */
  primaryFiles: string[];
  /** Total lines of code owned */
  totalLinesOwned: number;
  /** Number of files contributed to */
  filesContributed: number;
  /** Average ownership percentage across files */
  avgOwnershipPercentage: number;
  /** Areas of expertise (directories or modules) */
  expertiseAreas: string[];
}

/**
 * Issue attribution from git blame
 */
export interface IssueAttribution {
  /** Issue being attributed */
  issue: EnterpriseCodeIssue;
  /** Primary author responsible for the code */
  primaryAuthor: string;
  /** Primary author's email */
  primaryEmail: string;
  /** All authors who touched the problematic code */
  contributingAuthors: string[];
  /** When the problematic code was introduced */
  introducedDate: Date;
  /** Commit hash that introduced the issue */
  introducedCommit: string;
  /** Confidence level in the attribution (0-1) */
  confidence: number;
}

/**
 * Git Integration Service
 */
export class GitIntegration {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Generate pull request annotations for code issues
   */
  async generatePRAnnotations(issues: EnterpriseCodeIssue[]): Promise<PRAnnotation[]> {
    const annotations: PRAnnotation[] = [];

    for (const issue of issues) {
      for (const location of issue.locations) {
        const relPath = path.relative(this.workspaceRoot, location.filePath);
        
        const level = this.mapCertaintyToLevel(issue.certainty);
        
        annotations.push({
          filePath: relPath,
          line: location.startLine,
          message: issue.reason,
          level,
          issueId: issue.id,
          title: `${issue.type}: ${issue.symbolName}`,
        });
      }
    }

    return annotations;
  }

  /**
   * Calculate code ownership metrics for a file
   */
  async calculateCodeOwnership(filePath: string): Promise<CodeOwnership> {
    const relPath = path.relative(this.workspaceRoot, filePath);
    
    // Get blame information
    const blameInfo = await this.getFileBlame(filePath);
    
    // Calculate contributor metrics
    const contributorMap = new Map<string, ContributorMetrics>();
    
    for (const line of blameInfo.lines) {
      const key = line.email;
      
      if (!contributorMap.has(key)) {
        contributorMap.set(key, {
          author: line.author,
          email: line.email,
          linesAuthored: 0,
          ownershipPercentage: 0,
          commitCount: 0,
          lastContribution: line.date,
        });
      }
      
      const metrics = contributorMap.get(key)!;
      metrics.linesAuthored++;
      
      if (line.date > metrics.lastContribution) {
        metrics.lastContribution = line.date;
      }
    }
    
    // Calculate ownership percentages
    const totalLines = blameInfo.lines.length;
    for (const metrics of contributorMap.values()) {
      metrics.ownershipPercentage = (metrics.linesAuthored / totalLines) * 100;
    }
    
    // Get commit count for the file
    const commitCount = await this.getFileCommitCount(filePath);
    
    // Find primary owner (highest ownership percentage)
    let primaryOwner = 'unknown';
    let maxOwnership = 0;
    for (const metrics of contributorMap.values()) {
      if (metrics.ownershipPercentage > maxOwnership) {
        maxOwnership = metrics.ownershipPercentage;
        primaryOwner = metrics.author;
      }
    }
    
    // Get last modified date
    const lastModified = await this.getLastModifiedDate(filePath);
    
    return {
      path: relPath,
      primaryOwner,
      contributors: contributorMap,
      totalLines,
      lastModified,
      commitCount,
    };
  }

  /**
   * Calculate responsibility metrics for a developer
   */
  async calculateResponsibilityMetrics(
    developer: string,
    files: string[]
  ): Promise<ResponsibilityMetrics> {
    const primaryFiles: string[] = [];
    let totalLinesOwned = 0;
    let filesContributed = 0;
    let totalOwnershipPercentage = 0;
    const expertiseAreas = new Set<string>();
    
    for (const file of files) {
      try {
        const ownership = await this.calculateCodeOwnership(file);
        
        // Check if developer contributed to this file
        const developerMetrics = Array.from(ownership.contributors.values()).find(
          (c) => c.author === developer || c.email === developer
        );
        
        if (developerMetrics) {
          filesContributed++;
          totalLinesOwned += developerMetrics.linesAuthored;
          totalOwnershipPercentage += developerMetrics.ownershipPercentage;
          
          // Check if primary owner
          if (ownership.primaryOwner === developer) {
            primaryFiles.push(ownership.path);
          }
          
          // Track expertise areas (directories)
          const dir = path.dirname(ownership.path);
          if (dir !== '.') {
            const firstDir = dir.split(path.sep)[0];
            if (firstDir) {
              expertiseAreas.add(firstDir);
            }
          }
        }
      } catch (error) {
        // Skip files that can't be analyzed
        continue;
      }
    }
    
    const avgOwnershipPercentage =
      filesContributed > 0 ? totalOwnershipPercentage / filesContributed : 0;
    
    return {
      developer,
      primaryFiles,
      totalLinesOwned,
      filesContributed,
      avgOwnershipPercentage,
      expertiseAreas: Array.from(expertiseAreas),
    };
  }

  /**
   * Attribute an issue to its responsible author(s) using git blame
   */
  async attributeIssue(issue: EnterpriseCodeIssue): Promise<IssueAttribution> {
    if (issue.locations.length === 0) {
      throw new Error('Issue has no locations to attribute');
    }
    
    const primaryLocation = issue.locations[0]!;
    const blameInfo = await this.getFileBlame(primaryLocation.filePath);
    
    // Find blame information for the issue's line range
    const relevantLines = blameInfo.lines.filter(
      (line) =>
        line.lineNumber >= primaryLocation.startLine &&
        line.lineNumber <= primaryLocation.endLine
    );
    
    if (relevantLines.length === 0) {
      throw new Error('No blame information found for issue location');
    }
    
    // Count contributions by author
    const authorCounts = new Map<string, { count: number; email: string; date: Date; commit: string }>();
    
    for (const line of relevantLines) {
      const key = line.author;
      if (!authorCounts.has(key)) {
        authorCounts.set(key, {
          count: 0,
          email: line.email,
          date: line.date,
          commit: line.commitHash,
        });
      }
      authorCounts.get(key)!.count++;
    }
    
    // Find primary author (most lines in the issue range)
    let primaryAuthor = 'unknown';
    let primaryEmail = 'unknown';
    let maxCount = 0;
    let introducedDate = new Date();
    let introducedCommit = '';
    
    for (const [author, data] of authorCounts.entries()) {
      if (data.count > maxCount) {
        maxCount = data.count;
        primaryAuthor = author;
        primaryEmail = data.email;
        introducedDate = data.date;
        introducedCommit = data.commit;
      }
    }
    
    // Calculate confidence based on how concentrated the authorship is
    const totalLines = relevantLines.length;
    const confidence = maxCount / totalLines;
    
    return {
      issue,
      primaryAuthor,
      primaryEmail,
      contributingAuthors: Array.from(authorCounts.keys()),
      introducedDate,
      introducedCommit,
      confidence,
    };
  }

  /**
   * Get git blame information for a file
   */
  async getFileBlame(filePath: string): Promise<FileBlameInfo> {
    const relPath = path.relative(this.workspaceRoot, filePath);
    
    try {
      // Use porcelain format for easier parsing
      const cmd = `git blame --line-porcelain "${relPath.replace(/"/g, '\\"')}"`;
      const { stdout } = await execP(cmd, {
        cwd: this.workspaceRoot,
        maxBuffer: 10 * 1024 * 1024,
      });
      
      const lines: LineBlameInfo[] = [];
      const blameLines = stdout.split('\n');
      
      let currentCommit = '';
      let currentAuthor = '';
      let currentEmail = '';
      let currentDate = new Date();
      let lineNumber = 0;
      
      for (let i = 0; i < blameLines.length; i++) {
        const line = blameLines[i];
        
        if (!line) continue;
        
        if (line.match(/^[0-9a-f]{40}/)) {
          // New commit line
          const parts = line.split(' ');
          currentCommit = parts[0] || '';
          lineNumber = parseInt(parts[2] || '0', 10);
        } else if (line.startsWith('author ')) {
          currentAuthor = line.substring(7);
        } else if (line.startsWith('author-mail ')) {
          currentEmail = line.substring(12).replace(/[<>]/g, '');
        } else if (line.startsWith('author-time ')) {
          const timestamp = parseInt(line.substring(12), 10);
          currentDate = new Date(timestamp * 1000);
        } else if (line.startsWith('\t')) {
          // Actual code line
          lines.push({
            lineNumber,
            author: currentAuthor,
            email: currentEmail,
            date: currentDate,
            commitHash: currentCommit,
          });
        }
      }
      
      return {
        filePath: relPath,
        lines,
      };
    } catch (error) {
      throw new Error(`Failed to get blame info for ${relPath}: ${error}`);
    }
  }

  /**
   * Get the number of commits that touched a file
   */
  private async getFileCommitCount(filePath: string): Promise<number> {
    const relPath = path.relative(this.workspaceRoot, filePath);
    
    try {
      const cmd = `git log --oneline -- "${relPath.replace(/"/g, '\\"')}"`;
      const { stdout } = await execP(cmd, { cwd: this.workspaceRoot });
      
      const lines = stdout.trim().split('\n').filter(Boolean);
      return lines.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get the last modified date of a file
   */
  private async getLastModifiedDate(filePath: string): Promise<Date> {
    const relPath = path.relative(this.workspaceRoot, filePath);
    
    try {
      const cmd = `git log -1 --format=%aI -- "${relPath.replace(/"/g, '\\"')}"`;
      const { stdout } = await execP(cmd, { cwd: this.workspaceRoot });
      
      const dateStr = stdout.trim();
      return dateStr ? new Date(dateStr) : new Date();
    } catch {
      return new Date();
    }
  }

  /**
   * Map certainty level to annotation level
   */
  private mapCertaintyToLevel(certainty: string): 'error' | 'warning' | 'info' {
    switch (certainty) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  }
}
