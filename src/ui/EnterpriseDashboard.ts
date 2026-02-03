import * as vscode from 'vscode';
import { AnalyticsEngine } from '../services/AnalyticsEngine';
import { TeamWorkspace } from '../services/TeamWorkspace';
import { PolicyEngine } from '../services/PolicyEngine';

export interface DashboardMetrics {
  codeQuality: number;
  technicalDebt: number;
  testCoverage: number;
  complexity: number;
  security: number;
  maintainability: number;
  trends: {
    quality: 'up' | 'down' | 'stable';
    debt: 'up' | 'down' | 'stable';
  };
}

export interface TeamComparison {
  teamId: string;
  teamName: string;
  metrics: DashboardMetrics;
  rank: number;
}

export interface ProjectHealth {
  projectId: string;
  projectName: string;
  status: 'healthy' | 'warning' | 'critical';
  metrics: DashboardMetrics;
  issues: number;
  lastAnalyzed: Date;
}

export class EnterpriseDashboard {
  private panel: vscode.WebviewPanel | undefined;
  private analyticsEngine: AnalyticsEngine;
  private teamWorkspace: TeamWorkspace;
  private policyEngine: PolicyEngine;

  constructor(
    _extensionUri: vscode.Uri,
    analyticsEngine: AnalyticsEngine,
    teamWorkspace: TeamWorkspace,
    policyEngine: PolicyEngine
  ) {
    this.analyticsEngine = analyticsEngine;
    this.teamWorkspace = teamWorkspace;
    this.policyEngine = policyEngine;
  }

  public show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'enterpriseDashboard',
      'CodeJanitor Enterprise Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.webview.html = this.getHtmlContent();
    this.setupMessageHandlers();

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // Send initial data
    this.updateDashboard();
  }

  private setupMessageHandlers(): void {
    this.panel?.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refresh':
          await this.updateDashboard();
          break;
        case 'selectTeam':
          await this.loadTeamData(message.teamId);
          break;
        case 'selectProject':
          await this.loadProjectData(message.projectId);
          break;
      }
    });
  }

  private async updateDashboard(): Promise<void> {
    const metrics = await this.getOverallMetrics();
    const teamComparisons = await this.getTeamComparisons();
    const projectHealth = await this.getProjectHealth();

    this.panel?.webview.postMessage({
      type: 'update',
      data: {
        metrics,
        teamComparisons,
        projectHealth,
      },
    });
  }

  private async getOverallMetrics(): Promise<DashboardMetrics> {
    // Get metrics from analytics engine
    const qualityScore = await this.analyticsEngine.calculateQualityScore();
    const debtMetrics = await this.analyticsEngine.getTechnicalDebtMetrics();
    const trends = await this.analyticsEngine.calculateDashboardTrends();

    return {
      codeQuality: qualityScore,
      technicalDebt: debtMetrics.totalMinutes,
      testCoverage: 0, // TODO: Implement test coverage tracking
      complexity: 0, // TODO: Get from complexity analyzer
      security: 0, // TODO: Get from security analyzer
      maintainability: 0, // TODO: Calculate maintainability index
      trends: {
        quality: trends.quality,
        debt: trends.debt,
      },
    };
  }

  private async getTeamComparisons(): Promise<TeamComparison[]> {
    const teams = await this.teamWorkspace.getAllTeams();
    const comparisons: TeamComparison[] = [];

    for (const team of teams) {
      const metrics = await this.getTeamMetrics(team.id);
      comparisons.push({
        teamId: team.id,
        teamName: team.name,
        metrics,
        rank: 0, // Will be calculated after all teams are loaded
      });
    }

    // Sort by quality score and assign ranks
    comparisons.sort((a, b) => b.metrics.codeQuality - a.metrics.codeQuality);
    comparisons.forEach((comp, index) => {
      comp.rank = index + 1;
    });

    return comparisons;
  }

  private async getProjectHealth(): Promise<ProjectHealth[]> {
    const projects = await this.teamWorkspace.getAllProjects();
    const healthData: ProjectHealth[] = [];

    for (const project of projects) {
      const metrics = await this.getProjectMetrics(project.id);
      const issues = await this.policyEngine.getProjectIssues(project.id);
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (metrics.codeQuality < 50) {
        status = 'critical';
      } else if (metrics.codeQuality < 70) {
        status = 'warning';
      }

      healthData.push({
        projectId: project.id,
        projectName: project.name,
        status,
        metrics,
        issues: issues.length,
        lastAnalyzed: new Date(),
      });
    }

    return healthData;
  }

  private async getTeamMetrics(teamId: string): Promise<DashboardMetrics> {
    // Get team-specific metrics
    const qualityScore = await this.analyticsEngine.calculateTeamQualityScore(teamId);
    const debtMetrics = await this.analyticsEngine.getTeamTechnicalDebt(teamId);
    const trends = await this.analyticsEngine.calculateTeamTrends(teamId);

    return {
      codeQuality: qualityScore,
      technicalDebt: debtMetrics.totalMinutes,
      testCoverage: 0,
      complexity: 0,
      security: 0,
      maintainability: 0,
      trends: {
        quality: trends.quality,
        debt: trends.debt,
      },
    };
  }

  private async getProjectMetrics(projectId: string): Promise<DashboardMetrics> {
    // Get project-specific metrics
    const qualityScore = await this.analyticsEngine.calculateProjectQualityScore(projectId);
    const debtMetrics = await this.analyticsEngine.getProjectTechnicalDebt(projectId);
    const trends = await this.analyticsEngine.calculateProjectTrends(projectId);

    return {
      codeQuality: qualityScore,
      technicalDebt: debtMetrics.totalMinutes,
      testCoverage: 0,
      complexity: 0,
      security: 0,
      maintainability: 0,
      trends: {
        quality: trends.quality,
        debt: trends.debt,
      },
    };
  }

  private async loadTeamData(teamId: string): Promise<void> {
    const metrics = await this.getTeamMetrics(teamId);
    const team = await this.teamWorkspace.getTeam(teamId);
    
    this.panel?.webview.postMessage({
      type: 'teamData',
      data: {
        team,
        metrics,
      },
    });
  }

  private async loadProjectData(projectId: string): Promise<void> {
    const metrics = await this.getProjectMetrics(projectId);
    const issues = await this.policyEngine.getProjectIssues(projectId);
    
    this.panel?.webview.postMessage({
      type: 'projectData',
      data: {
        projectId,
        metrics,
        issues,
      },
    });
  }

  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeJanitor Enterprise Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }

    .dashboard-header {
      margin-bottom: 30px;
    }

    h1 {
      font-size: 28px;
      margin-bottom: 10px;
      color: var(--vscode-editor-foreground);
    }

    .refresh-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .refresh-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 20px;
    }

    .metric-label {
      font-size: 14px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .metric-trend {
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .trend-up { color: #4caf50; }
    .trend-down { color: #f44336; }
    .trend-stable { color: var(--vscode-descriptionForeground); }

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 20px;
      margin-bottom: 15px;
      color: var(--vscode-editor-foreground);
    }

    .team-comparison-table,
    .project-health-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 8px;
      overflow: hidden;
    }

    .team-comparison-table th,
    .team-comparison-table td,
    .project-health-table th,
    .project-health-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .team-comparison-table th,
    .project-health-table th {
      background: var(--vscode-editor-selectionBackground);
      font-weight: 600;
    }

    .team-comparison-table tr:hover,
    .project-health-table tr:hover {
      background: var(--vscode-list-hoverBackground);
      cursor: pointer;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-healthy {
      background: #4caf5033;
      color: #4caf50;
    }

    .status-warning {
      background: #ff980033;
      color: #ff9800;
    }

    .status-critical {
      background: #f4433633;
      color: #f44336;
    }

    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-weight: bold;
      font-size: 14px;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: var(--vscode-descriptionForeground);
    }

    @media (max-width: 768px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .team-comparison-table,
      .project-health-table {
        font-size: 14px;
      }

      .team-comparison-table th,
      .team-comparison-table td,
      .project-health-table th,
      .project-health-table td {
        padding: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="dashboard-header">
    <h1>Enterprise Dashboard</h1>
    <button class="refresh-btn" onclick="refresh()">Refresh</button>
  </div>

  <div id="content">
    <div class="loading">Loading dashboard data...</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    function selectTeam(teamId) {
      vscode.postMessage({ command: 'selectTeam', teamId });
    }

    function selectProject(projectId) {
      vscode.postMessage({ command: 'selectProject', projectId });
    }

    function formatNumber(num) {
      return num.toFixed(1);
    }

    function formatMinutes(minutes) {
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return days + 'd';
      if (hours > 0) return hours + 'h';
      return minutes + 'm';
    }

    function getTrendIcon(trend) {
      if (trend === 'up') return '↑';
      if (trend === 'down') return '↓';
      return '→';
    }

    function getTrendClass(trend) {
      if (trend === 'up') return 'trend-up';
      if (trend === 'down') return 'trend-down';
      return 'trend-stable';
    }

    function renderDashboard(data) {
      const { metrics, teamComparisons, projectHealth } = data;

      const html = \`
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Code Quality</div>
            <div class="metric-value">\${formatNumber(metrics.codeQuality)}</div>
            <div class="metric-trend \${getTrendClass(metrics.trends.quality)}">
              \${getTrendIcon(metrics.trends.quality)} \${metrics.trends.quality}
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Technical Debt</div>
            <div class="metric-value">\${formatMinutes(metrics.technicalDebt)}</div>
            <div class="metric-trend \${getTrendClass(metrics.trends.debt)}">
              \${getTrendIcon(metrics.trends.debt)} \${metrics.trends.debt}
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Test Coverage</div>
            <div class="metric-value">\${formatNumber(metrics.testCoverage)}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Maintainability</div>
            <div class="metric-value">\${formatNumber(metrics.maintainability)}</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Team Comparison</h2>
          <table class="team-comparison-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Quality Score</th>
                <th>Tech Debt</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              \${teamComparisons.map(team => \`
                <tr onclick="selectTeam('\${team.teamId}')">
                  <td><span class="rank-badge">\${team.rank}</span></td>
                  <td>\${team.teamName}</td>
                  <td>\${formatNumber(team.metrics.codeQuality)}</td>
                  <td>\${formatMinutes(team.metrics.technicalDebt)}</td>
                  <td class="\${getTrendClass(team.metrics.trends.quality)}">
                    \${getTrendIcon(team.metrics.trends.quality)}
                  </td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2 class="section-title">Project Health</h2>
          <table class="project-health-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Quality</th>
                <th>Issues</th>
                <th>Last Analyzed</th>
              </tr>
            </thead>
            <tbody>
              \${projectHealth.map(project => \`
                <tr onclick="selectProject('\${project.projectId}')">
                  <td>\${project.projectName}</td>
                  <td><span class="status-badge status-\${project.status}">\${project.status}</span></td>
                  <td>\${formatNumber(project.metrics.codeQuality)}</td>
                  <td>\${project.issues}</td>
                  <td>\${new Date(project.lastAnalyzed).toLocaleDateString()}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;

      document.getElementById('content').innerHTML = html;
    }

    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'update':
          renderDashboard(message.data);
          break;
        case 'teamData':
          // Handle team detail view
          console.log('Team data:', message.data);
          break;
        case 'projectData':
          // Handle project detail view
          console.log('Project data:', message.data);
          break;
      }
    });

    // Request initial data
    refresh();
  </script>
</body>
</html>`;
  }
}
