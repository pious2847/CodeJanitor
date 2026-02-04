/**
 * API Router
 * 
 * Routes requests to appropriate handlers with versioning support
 */

import * as http from 'http';
import { ApiResponse, ApiHandler } from './types';
import { AnalysisController } from './controllers/analysisController';
import { TeamController } from './controllers/teamController';
import { PolicyController } from './controllers/policyController';
import { ReportController } from './controllers/reportController';
import { ProjectController } from './controllers/projectController';

interface Route {
  pattern: RegExp;
  method: string;
  handler: ApiHandler;
  paramNames: string[];
}

export class ApiRouter {
  private routes: Route[] = [];
  private apiVersion: string;
  private analysisController: AnalysisController;
  private teamController: TeamController;
  private policyController: PolicyController;
  private reportController: ReportController;
  private projectController: ProjectController;

  constructor(apiVersion: string) {
    this.apiVersion = apiVersion;
    this.analysisController = new AnalysisController();
    this.teamController = new TeamController();
    this.policyController = new PolicyController();
    this.reportController = new ReportController();
    this.projectController = new ProjectController();
    
    this.registerRoutes();
  }

  /**
   * Register all API routes
   */
  private registerRoutes(): void {
    const prefix = `/api/${this.apiVersion}`;

    // Health check
    this.addRoute('GET', `${prefix}/health`, this.healthCheck.bind(this));

    // Analysis endpoints
    this.addRoute('POST', `${prefix}/analysis/file`, this.analysisController.analyzeFile.bind(this.analysisController));
    this.addRoute('POST', `${prefix}/analysis/workspace`, this.analysisController.analyzeWorkspace.bind(this.analysisController));
    this.addRoute('GET', `${prefix}/analysis/:id`, this.analysisController.getAnalysis.bind(this.analysisController));
    this.addRoute('GET', `${prefix}/analysis/:id/issues`, this.analysisController.getIssues.bind(this.analysisController));

    // Team endpoints
    this.addRoute('GET', `${prefix}/teams`, this.teamController.listTeams.bind(this.teamController));
    this.addRoute('POST', `${prefix}/teams`, this.teamController.createTeam.bind(this.teamController));
    this.addRoute('GET', `${prefix}/teams/:id`, this.teamController.getTeam.bind(this.teamController));
    this.addRoute('PUT', `${prefix}/teams/:id`, this.teamController.updateTeam.bind(this.teamController));
    this.addRoute('DELETE', `${prefix}/teams/:id`, this.teamController.deleteTeam.bind(this.teamController));
    this.addRoute('GET', `${prefix}/teams/:id/metrics`, this.teamController.getMetrics.bind(this.teamController));

    // Policy endpoints
    this.addRoute('GET', `${prefix}/policies`, this.policyController.listPolicies.bind(this.policyController));
    this.addRoute('POST', `${prefix}/policies`, this.policyController.createPolicy.bind(this.policyController));
    this.addRoute('GET', `${prefix}/policies/:id`, this.policyController.getPolicy.bind(this.policyController));
    this.addRoute('PUT', `${prefix}/policies/:id`, this.policyController.updatePolicy.bind(this.policyController));
    this.addRoute('DELETE', `${prefix}/policies/:id`, this.policyController.deletePolicy.bind(this.policyController));
    this.addRoute('POST', `${prefix}/policies/:id/evaluate`, this.policyController.evaluatePolicy.bind(this.policyController));

    // Report endpoints
    this.addRoute('GET', `${prefix}/reports`, this.reportController.listReports.bind(this.reportController));
    this.addRoute('POST', `${prefix}/reports`, this.reportController.generateReport.bind(this.reportController));
    this.addRoute('GET', `${prefix}/reports/:id`, this.reportController.getReport.bind(this.reportController));
    this.addRoute('GET', `${prefix}/reports/:id/export`, this.reportController.exportReport.bind(this.reportController));

    // Project endpoints
    this.addRoute('GET', `${prefix}/projects`, this.projectController.listProjects.bind(this.projectController));
    this.addRoute('POST', `${prefix}/projects`, this.projectController.createProject.bind(this.projectController));
    this.addRoute('GET', `${prefix}/projects/:id`, this.projectController.getProject.bind(this.projectController));
    this.addRoute('PUT', `${prefix}/projects/:id`, this.projectController.updateProject.bind(this.projectController));
    this.addRoute('DELETE', `${prefix}/projects/:id`, this.projectController.deleteProject.bind(this.projectController));
    this.addRoute('GET', `${prefix}/projects/:id/baseline`, this.projectController.getBaseline.bind(this.projectController));
    this.addRoute('POST', `${prefix}/projects/:id/baseline`, this.projectController.setBaseline.bind(this.projectController));
  }

  /**
   * Add a route to the router
   */
  private addRoute(method: string, path: string, handler: ApiHandler): void {
    const paramNames: string[] = [];
    const pattern = path.replace(/:([^/]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    this.routes.push({
      pattern: new RegExp(`^${pattern}$`),
      method,
      handler,
      paramNames,
    });
  }

  /**
   * Route incoming request to appropriate handler
   */
  async route(
    req: http.IncomingMessage,
    pathname: string,
    query: Record<string, any>
  ): Promise<ApiResponse> {
    const method = req.method || 'GET';

    // Find matching route
    for (const route of this.routes) {
      if (route.method !== method) {
        continue;
      }

      const match = pathname.match(route.pattern);
      if (!match) {
        continue;
      }

      // Extract path parameters
      const params: Record<string, string> = {};
      for (let i = 0; i < route.paramNames.length; i++) {
        const paramName = route.paramNames[i];
        if (paramName) {
          params[paramName] = match[i + 1] || '';
        }
      }

      // Parse request body if present
      let body: any = undefined;
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        body = await this.parseBody(req);
      }

      // Call handler
      try {
        return await route.handler(req, params, query, body);
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'HANDLER_ERROR',
            message: 'Error processing request',
            details: error instanceof Error ? error.message : String(error),
          },
          statusCode: 500,
        };
      }
    }

    // No route found
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route not found: ${method} ${pathname}`,
      },
      statusCode: 404,
    };
  }

  /**
   * Parse request body
   */
  private async parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          if (body) {
            resolve(JSON.parse(body));
          } else {
            resolve(undefined);
          }
        } catch (error) {
          reject(new Error('Invalid JSON in request body'));
        }
      });

      req.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Health check endpoint
   */
  private async healthCheck(): Promise<ApiResponse> {
    return {
      success: true,
      data: {
        status: 'healthy',
        version: this.apiVersion,
        timestamp: new Date().toISOString(),
      },
      statusCode: 200,
    };
  }
}
