import * as vscode from 'vscode';
import { AnalyticsEngine } from '../services/AnalyticsEngine';
import { TeamWorkspace } from '../services/TeamWorkspace';
import { PolicyEngine } from '../services/PolicyEngine';
import { DashboardMetrics, TeamComparison, ProjectHealth } from './EnterpriseDashboard';

export interface CachedDashboardData {
  metrics: DashboardMetrics;
  teamComparisons: TeamComparison[];
  projectHealth: ProjectHealth[];
  timestamp: Date;
  version: string;
}

export interface MobileViewport {
  width: number;
  height: number;
  devicePixelRatio: number;
  isMobile: boolean;
  isTablet: boolean;
}

/**
 * Mobile-optimized dashboard with offline support and responsive design
 * Requirements: 10.1, 10.2
 */
export class MobileDashboard {
  private panel: vscode.WebviewPanel | undefined;
  private analyticsEngine: AnalyticsEngine;
  private teamWorkspace: TeamWorkspace;
  private policyEngine: PolicyEngine;
  private cacheStorage: Map<string, CachedDashboardData> = new Map();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private extensionUri: vscode.Uri,
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
      'mobileDashboard',
      'CodeJanitor Mobile Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri],
      }
    );

    this.panel.webview.html = this.getMobileHtmlContent();
    this.setupMessageHandlers();

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // Load cached data first for instant display, then refresh
    this.loadCachedData();
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
        case 'viewportChange':
          await this.handleViewportChange(message.viewport);
          break;
        case 'requestOfflineData':
          await this.sendCachedData();
          break;
        case 'clearCache':
          this.clearCache();
          break;
      }
    });
  }

  private async updateDashboard(): Promise<void> {
    try {
      const metrics = await this.getOverallMetrics();
      const teamComparisons = await this.getTeamComparisons();
      const projectHealth = await this.getProjectHealth();

      const data: CachedDashboardData = {
        metrics,
        teamComparisons,
        projectHealth,
        timestamp: new Date(),
        version: '1.0.0',
      };

      // Cache the data
      this.cacheStorage.set('dashboard', data);

      this.panel?.webview.postMessage({
        type: 'update',
        data,
        cached: false,
      });
    } catch (error) {
      // If update fails, try to use cached data
      await this.sendCachedData();
      this.panel?.webview.postMessage({
        type: 'error',
        message: 'Failed to fetch latest data. Showing cached data.',
      });
    }
  }

  private async loadCachedData(): Promise<void> {
    const cached = this.cacheStorage.get('dashboard');
    if (cached && this.isCacheValid(cached)) {
      this.panel?.webview.postMessage({
        type: 'update',
        data: cached,
        cached: true,
      });
    }
  }

  private async sendCachedData(): Promise<void> {
    const cached = this.cacheStorage.get('dashboard');
    if (cached) {
      this.panel?.webview.postMessage({
        type: 'update',
        data: cached,
        cached: true,
      });
    }
  }

  private isCacheValid(cached: CachedDashboardData): boolean {
    const age = Date.now() - cached.timestamp.getTime();
    return age < this.CACHE_DURATION_MS;
  }

  private clearCache(): void {
    this.cacheStorage.clear();
    this.panel?.webview.postMessage({
      type: 'cacheCleared',
    });
  }

  private async handleViewportChange(viewport: MobileViewport): Promise<void> {
    // Adjust data granularity based on viewport
    if (viewport.isMobile) {
      // Send simplified data for mobile
      const simplifiedData = await this.getSimplifiedData();
      this.panel?.webview.postMessage({
        type: 'simplifiedUpdate',
        data: simplifiedData,
      });
    }
  }

  private async getSimplifiedData(): Promise<any> {
    // Return only essential metrics for mobile view
    const metrics = await this.getOverallMetrics();
    return {
      codeQuality: metrics.codeQuality,
      technicalDebt: metrics.technicalDebt,
      trends: metrics.trends,
    };
  }

  private async getOverallMetrics(): Promise<DashboardMetrics> {
    const qualityScore = await this.analyticsEngine.calculateQualityScore();
    const debtMetrics = await this.analyticsEngine.getTechnicalDebtMetrics();
    const trends = await this.analyticsEngine.calculateDashboardTrends();

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

  private async getTeamComparisons(): Promise<TeamComparison[]> {
    const teams = await this.teamWorkspace.getAllTeams();
    const comparisons: TeamComparison[] = [];

    for (const team of teams) {
      const metrics = await this.getTeamMetrics(team.id);
      comparisons.push({
        teamId: team.id,
        teamName: team.name,
        metrics,
        rank: 0,
      });
    }

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

  private getMobileHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <title>CodeJanitor Mobile Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      overflow-x: hidden;
      touch-action: pan-y;
    }

    /* Mobile-first responsive design */
    .mobile-header {
      position: sticky;
      top: 0;
      background: var(--vscode-editor-background);
      padding: 12px 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mobile-header h1 {
      font-size: 20px;
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .icon-btn {
      background: transparent;
      border: none;
      color: var(--vscode-editor-foreground);
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      min-height: 36px;
    }

    .icon-btn:active {
      background: var(--vscode-list-activeSelectionBackground);
    }

    .refresh-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .refresh-btn:active {
      background: var(--vscode-button-hoverBackground);
    }

    .content-wrapper {
      padding: 16px;
      padding-bottom: 80px;
    }

    /* Mobile-optimized metrics cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 12px;
      padding: 16px;
      min-height: 100px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .metric-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .metric-trend {
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
    }

    .trend-up { color: #4caf50; }
    .trend-down { color: #f44336; }
    .trend-stable { color: var(--vscode-descriptionForeground); }

    /* Mobile-optimized sections */
    .section {
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
    }

    .view-all-btn {
      color: var(--vscode-textLink-foreground);
      font-size: 14px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
    }

    /* Mobile-friendly list items */
    .list-item {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .list-item:active {
      background: var(--vscode-list-activeSelectionBackground);
    }

    .list-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .list-item-title {
      font-size: 16px;
      font-weight: 500;
    }

    .list-item-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
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
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-weight: bold;
      font-size: 14px;
    }

    /* Offline indicator */
    .offline-banner {
      background: #ff9800;
      color: #000;
      padding: 8px 16px;
      text-align: center;
      font-size: 13px;
      font-weight: 500;
      display: none;
    }

    .offline-banner.show {
      display: block;
    }

    /* Loading states */
    .loading {
      text-align: center;
      padding: 40px 16px;
      color: var(--vscode-descriptionForeground);
    }

    .spinner {
      border: 3px solid var(--vscode-panel-border);
      border-top: 3px solid var(--vscode-button-background);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Pull-to-refresh indicator */
    .pull-to-refresh {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateY(-100%);
      transition: transform 0.3s;
      background: var(--vscode-editor-background);
    }

    .pull-to-refresh.active {
      transform: translateY(0);
    }

    /* Tablet and desktop adjustments */
    @media (min-width: 768px) {
      .metrics-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
      }

      .content-wrapper {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .mobile-header h1 {
        font-size: 24px;
      }
    }

    @media (min-width: 1024px) {
      .list-item:hover {
        background: var(--vscode-list-hoverBackground);
      }
    }

    /* Touch-friendly spacing */
    @media (hover: none) and (pointer: coarse) {
      .list-item {
        padding: 20px;
        margin-bottom: 12px;
      }

      .icon-btn {
        min-width: 44px;
        min-height: 44px;
      }
    }
  </style>
</head>
<body>
  <div class="offline-banner" id="offlineBanner">
    📡 Offline - Showing cached data
  </div>

  <div class="pull-to-refresh" id="pullToRefresh">
    <div class="spinner"></div>
  </div>

  <div class="mobile-header">
    <h1>Dashboard</h1>
    <div class="header-actions">
      <button class="icon-btn" onclick="toggleMenu()" title="Menu">☰</button>
      <button class="refresh-btn" onclick="refresh()">Refresh</button>
    </div>
  </div>

  <div id="content" class="content-wrapper">
    <div class="loading">
      <div class="spinner"></div>
      <div>Loading dashboard...</div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let cachedData = null;
    let isOnline = true;
    let pullStartY = 0;
    let isPulling = false;

    // Detect viewport changes
    function detectViewport() {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
      };
      vscode.postMessage({ command: 'viewportChange', viewport });
      return viewport;
    }

    // Initialize
    detectViewport();
    window.addEventListener('resize', detectViewport);

    // Pull-to-refresh functionality
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        pullStartY = e.touches[0].clientY;
        isPulling = true;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!isPulling) return;
      
      const pullDistance = e.touches[0].clientY - pullStartY;
      if (pullDistance > 0 && pullDistance < 100) {
        const pullToRefresh = document.getElementById('pullToRefresh');
        pullToRefresh.style.transform = \`translateY(\${pullDistance - 60}px)\`;
      }
    });

    document.addEventListener('touchend', (e) => {
      if (!isPulling) return;
      
      const pullDistance = e.changedTouches[0].clientY - pullStartY;
      const pullToRefresh = document.getElementById('pullToRefresh');
      
      if (pullDistance > 80) {
        pullToRefresh.classList.add('active');
        refresh();
        setTimeout(() => {
          pullToRefresh.classList.remove('active');
          pullToRefresh.style.transform = '';
        }, 1000);
      } else {
        pullToRefresh.style.transform = '';
      }
      
      isPulling = false;
    });

    // Online/offline detection
    window.addEventListener('online', () => {
      isOnline = true;
      document.getElementById('offlineBanner').classList.remove('show');
      refresh();
    });

    window.addEventListener('offline', () => {
      isOnline = false;
      document.getElementById('offlineBanner').classList.add('show');
      vscode.postMessage({ command: 'requestOfflineData' });
    });

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    function selectTeam(teamId) {
      vscode.postMessage({ command: 'selectTeam', teamId });
    }

    function selectProject(projectId) {
      vscode.postMessage({ command: 'selectProject', projectId });
    }

    function toggleMenu() {
      // Menu functionality
      console.log('Menu toggled');
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

    function renderDashboard(data, isCached) {
      cachedData = data;
      const { metrics, teamComparisons, projectHealth } = data;
      const viewport = detectViewport();

      // Show top 3 teams on mobile, all on desktop
      const teamsToShow = viewport.isMobile ? teamComparisons.slice(0, 3) : teamComparisons;
      const projectsToShow = viewport.isMobile ? projectHealth.slice(0, 3) : projectHealth;

      const html = \`
        \${isCached ? '<div style="background: #ff980033; padding: 8px 16px; margin: -16px -16px 16px; border-radius: 8px; font-size: 13px;">📦 Showing cached data</div>' : ''}
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Quality</div>
            <div class="metric-value">\${formatNumber(metrics.codeQuality)}</div>
            <div class="metric-trend \${getTrendClass(metrics.trends.quality)}">
              \${getTrendIcon(metrics.trends.quality)} \${metrics.trends.quality}
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Tech Debt</div>
            <div class="metric-value">\${formatMinutes(metrics.technicalDebt)}</div>
            <div class="metric-trend \${getTrendClass(metrics.trends.debt)}">
              \${getTrendIcon(metrics.trends.debt)} \${metrics.trends.debt}
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Coverage</div>
            <div class="metric-value">\${formatNumber(metrics.testCoverage)}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Maintain</div>
            <div class="metric-value">\${formatNumber(metrics.maintainability)}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Team Rankings</h2>
            \${viewport.isMobile && teamComparisons.length > 3 ? '<button class="view-all-btn">View All</button>' : ''}
          </div>
          \${teamsToShow.map(team => \`
            <div class="list-item" onclick="selectTeam('\${team.teamId}')">
              <div class="list-item-header">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="rank-badge">\${team.rank}</span>
                  <span class="list-item-title">\${team.teamName}</span>
                </div>
                <span class="\${getTrendClass(team.metrics.trends.quality)}" style="font-size: 20px;">
                  \${getTrendIcon(team.metrics.trends.quality)}
                </span>
              </div>
              <div class="list-item-meta">
                <span>Quality: \${formatNumber(team.metrics.codeQuality)}</span>
                <span>Debt: \${formatMinutes(team.metrics.technicalDebt)}</span>
              </div>
            </div>
          \`).join('')}
        </div>

        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Project Health</h2>
            \${viewport.isMobile && projectHealth.length > 3 ? '<button class="view-all-btn">View All</button>' : ''}
          </div>
          \${projectsToShow.map(project => \`
            <div class="list-item" onclick="selectProject('\${project.projectId}')">
              <div class="list-item-header">
                <span class="list-item-title">\${project.projectName}</span>
                <span class="status-badge status-\${project.status}">\${project.status}</span>
              </div>
              <div class="list-item-meta">
                <span>Quality: \${formatNumber(project.metrics.codeQuality)}</span>
                <span>Issues: \${project.issues}</span>
                <span>\${new Date(project.lastAnalyzed).toLocaleDateString()}</span>
              </div>
            </div>
          \`).join('')}
        </div>
      \`;

      document.getElementById('content').innerHTML = html;
    }

    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'update':
          renderDashboard(message.data, message.cached);
          if (message.cached) {
            document.getElementById('offlineBanner').classList.add('show');
          } else {
            document.getElementById('offlineBanner').classList.remove('show');
          }
          break;
        case 'simplifiedUpdate':
          // Handle simplified mobile data
          console.log('Simplified data:', message.data);
          break;
        case 'error':
          console.error('Dashboard error:', message.message);
          break;
        case 'cacheCleared':
          cachedData = null;
          break;
      }
    });

    // Request initial data
    if (!isOnline) {
      vscode.postMessage({ command: 'requestOfflineData' });
    } else {
      refresh();
    }
  </script>
</body>
</html>`;
  }
}
