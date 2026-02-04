/**
 * OpenAPI/Swagger Documentation Generator
 * 
 * Generates comprehensive API documentation in OpenAPI 3.0 format
 */

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
      url: string;
    };
    license?: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  security: Array<Record<string, string[]>>;
}

export class OpenAPIGenerator {
  /**
   * Generate complete OpenAPI specification
   */
  generateSpec(version: string = 'v1'): OpenAPISpec {
    return {
      openapi: '3.0.0',
      info: {
        title: 'CodeJanitor Enterprise API',
        version: version,
        description: 'Comprehensive REST API for CodeJanitor Enterprise code quality platform',
        contact: {
          name: 'CodeJanitor Support',
          email: 'support@codejanitor.dev',
          url: 'https://codejanitor.dev',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `https://api.codejanitor.dev/${version}`,
          description: 'Production server',
        },
        {
          url: `https://staging-api.codejanitor.dev/${version}`,
          description: 'Staging server',
        },
        {
          url: `http://localhost:3000/api/${version}`,
          description: 'Local development server',
        },
      ],
      paths: this.generatePaths(),
      components: {
        schemas: this.generateSchemas(),
        securitySchemes: this.generateSecuritySchemes(),
      },
      security: [
        { ApiKeyAuth: [] },
        { BearerAuth: [] },
      ],
    };
  }

  /**
   * Generate API paths
   */
  private generatePaths(): Record<string, any> {
    return {
      '/health': {
        get: {
          summary: 'Health check',
          description: 'Check API server health status',
          tags: ['System'],
          responses: {
            '200': {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/analysis/file': {
        post: {
          summary: 'Analyze a single file',
          description: 'Perform code quality analysis on a single file',
          tags: ['Analysis'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/FileAnalysisRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Analysis completed successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/FileAnalysisResponse',
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request parameters',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/analysis/workspace': {
        post: {
          summary: 'Analyze entire workspace',
          description: 'Perform code quality analysis on an entire workspace',
          tags: ['Analysis'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/WorkspaceAnalysisRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Analysis completed successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/WorkspaceAnalysisResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/teams': {
        get: {
          summary: 'List teams',
          description: 'Get a list of all teams',
          tags: ['Teams'],
          parameters: [
            {
              name: 'organizationId',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by organization ID',
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: 'Page number',
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', default: 20 },
              description: 'Items per page',
            },
          ],
          responses: {
            '200': {
              description: 'List of teams',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/TeamListResponse',
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create team',
          description: 'Create a new team',
          tags: ['Teams'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateTeamRequest',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Team created successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Team',
                  },
                },
              },
            },
          },
        },
      },
      '/teams/{id}': {
        get: {
          summary: 'Get team',
          description: 'Get team by ID',
          tags: ['Teams'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Team ID',
            },
          ],
          responses: {
            '200': {
              description: 'Team details',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Team',
                  },
                },
              },
            },
            '404': {
              description: 'Team not found',
            },
          },
        },
        put: {
          summary: 'Update team',
          description: 'Update team details',
          tags: ['Teams'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateTeamRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Team updated successfully',
            },
          },
        },
        delete: {
          summary: 'Delete team',
          description: 'Delete a team',
          tags: ['Teams'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Team deleted successfully',
            },
          },
        },
      },
      '/policies': {
        get: {
          summary: 'List policies',
          description: 'Get a list of all policies',
          tags: ['Policies'],
          responses: {
            '200': {
              description: 'List of policies',
            },
          },
        },
        post: {
          summary: 'Create policy',
          description: 'Create a new policy',
          tags: ['Policies'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreatePolicyRequest',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Policy created successfully',
            },
          },
        },
      },
      '/reports': {
        get: {
          summary: 'List reports',
          description: 'Get a list of all reports',
          tags: ['Reports'],
          responses: {
            '200': {
              description: 'List of reports',
            },
          },
        },
        post: {
          summary: 'Generate report',
          description: 'Generate a new report',
          tags: ['Reports'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GenerateReportRequest',
                },
              },
            },
          },
          responses: {
            '202': {
              description: 'Report generation started',
            },
          },
        },
      },
      '/projects': {
        get: {
          summary: 'List projects',
          description: 'Get a list of all projects',
          tags: ['Projects'],
          responses: {
            '200': {
              description: 'List of projects',
            },
          },
        },
        post: {
          summary: 'Create project',
          description: 'Create a new project',
          tags: ['Projects'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateProjectRequest',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Project created successfully',
            },
          },
        },
      },
    };
  }

  /**
   * Generate schema definitions
   */
  private generateSchemas(): Record<string, any> {
    return {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'healthy' },
          version: { type: 'string', example: 'v1' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      FileAnalysisRequest: {
        type: 'object',
        required: ['filePath'],
        properties: {
          filePath: { type: 'string', description: 'Path to the file to analyze' },
          config: {
            type: 'object',
            description: 'Analyzer configuration',
          },
        },
      },
      FileAnalysisResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              filePath: { type: 'string' },
              issues: { type: 'array', items: { $ref: '#/components/schemas/CodeIssue' } },
              analysisTimeMs: { type: 'number' },
            },
          },
        },
      },
      WorkspaceAnalysisRequest: {
        type: 'object',
        required: ['workspacePath'],
        properties: {
          workspacePath: { type: 'string' },
          config: { type: 'object' },
        },
      },
      WorkspaceAnalysisResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              totalFiles: { type: 'number' },
              totalIssues: { type: 'number' },
              fileResults: { type: 'array' },
            },
          },
        },
      },
      CodeIssue: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          certainty: { type: 'string', enum: ['high', 'medium', 'low'] },
          reason: { type: 'string' },
          symbolName: { type: 'string' },
        },
      },
      Team: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          organizationId: { type: 'string' },
          members: { type: 'array' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateTeamRequest: {
        type: 'object',
        required: ['name', 'organizationId'],
        properties: {
          name: { type: 'string' },
          organizationId: { type: 'string' },
          members: { type: 'array' },
        },
      },
      UpdateTeamRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          members: { type: 'array' },
        },
      },
      TeamListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              teams: { type: 'array', items: { $ref: '#/components/schemas/Team' } },
              total: { type: 'number' },
              page: { type: 'number' },
              pageSize: { type: 'number' },
            },
          },
        },
      },
      CreatePolicyRequest: {
        type: 'object',
        required: ['name', 'scope', 'rules'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          scope: { type: 'string', enum: ['organization', 'team', 'project'] },
          rules: { type: 'array' },
        },
      },
      GenerateReportRequest: {
        type: 'object',
        required: ['type', 'projectId'],
        properties: {
          type: { type: 'string', enum: ['executive', 'technical', 'compliance', 'trend'] },
          projectId: { type: 'string' },
          format: { type: 'string', enum: ['json', 'pdf', 'excel'] },
        },
      },
      CreateProjectRequest: {
        type: 'object',
        required: ['name', 'teamId'],
        properties: {
          name: { type: 'string' },
          teamId: { type: 'string' },
          repositories: { type: 'array' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'string' },
            },
          },
        },
      },
    };
  }

  /**
   * Generate security schemes
   */
  private generateSecuritySchemes(): Record<string, any> {
    return {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authentication',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authentication',
      },
    };
  }

  /**
   * Export specification as JSON
   */
  exportJSON(version: string = 'v1'): string {
    return JSON.stringify(this.generateSpec(version), null, 2);
  }

  /**
   * Export specification as YAML
   */
  exportYAML(version: string = 'v1'): string {
    const spec = this.generateSpec(version);
    // Simple YAML conversion (in production, use a proper YAML library)
    return this.jsonToYaml(spec);
  }

  /**
   * Simple JSON to YAML converter
   */
  private jsonToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}: null\n`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}- \n${this.jsonToYaml(item, indent + 1)}`;
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n${this.jsonToYaml(value, indent + 1)}`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }
}
