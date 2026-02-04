/**
 * Documentation Generator Module
 * 
 * Main entry point for generating all documentation
 */

import * as fs from 'fs';
import * as path from 'path';
import { OpenAPIGenerator } from './openapi';
import { QualityStandardsGenerator } from './qualityStandards';
import { UserGuideGenerator } from './userGuide';

export interface DocumentationConfig {
  outputDir: string;
  formats: ('markdown' | 'html' | 'json' | 'yaml')[];
  includeAPI: boolean;
  includeStandards: boolean;
  includeUserGuide: boolean;
}

export class DocumentationGenerator {
  private config: DocumentationConfig;
  private openApiGen: OpenAPIGenerator;
  private standardsGen: QualityStandardsGenerator;
  private userGuideGen: UserGuideGenerator;

  constructor(config: Partial<DocumentationConfig> = {}) {
    this.config = {
      outputDir: config.outputDir || './docs',
      formats: config.formats || ['markdown', 'html', 'json'],
      includeAPI: config.includeAPI !== false,
      includeStandards: config.includeStandards !== false,
      includeUserGuide: config.includeUserGuide !== false,
    };

    this.openApiGen = new OpenAPIGenerator();
    this.standardsGen = new QualityStandardsGenerator();
    this.userGuideGen = new UserGuideGenerator();
  }

  /**
   * Generate all documentation
   */
  async generateAll(): Promise<void> {
    // Create output directory
    this.ensureDirectory(this.config.outputDir);

    const results: string[] = [];

    // Generate API documentation
    if (this.config.includeAPI) {
      await this.generateAPIDocumentation();
      results.push('API documentation');
    }

    // Generate quality standards documentation
    if (this.config.includeStandards) {
      await this.generateStandardsDocumentation();
      results.push('Quality standards documentation');
    }

    // Generate user guide
    if (this.config.includeUserGuide) {
      await this.generateUserGuideDocumentation();
      results.push('User guide documentation');
    }

    console.log(`Documentation generated successfully: ${results.join(', ')}`);
  }

  /**
   * Generate API documentation
   */
  private async generateAPIDocumentation(): Promise<void> {
    const apiDir = path.join(this.config.outputDir, 'api');
    this.ensureDirectory(apiDir);

    // Generate JSON format
    if (this.config.formats.includes('json')) {
      const jsonSpec = this.openApiGen.exportJSON();
      const jsonPath = path.join(apiDir, 'openapi.json');
      fs.writeFileSync(jsonPath, jsonSpec, 'utf8');
      console.log(`Generated: ${jsonPath}`);
    }

    // Generate YAML format
    if (this.config.formats.includes('yaml')) {
      const yamlSpec = this.openApiGen.exportYAML();
      const yamlPath = path.join(apiDir, 'openapi.yaml');
      fs.writeFileSync(yamlPath, yamlSpec, 'utf8');
      console.log(`Generated: ${yamlPath}`);
    }

    // Generate markdown format
    if (this.config.formats.includes('markdown')) {
      const markdown = this.generateAPIMarkdown();
      const mdPath = path.join(apiDir, 'README.md');
      fs.writeFileSync(mdPath, markdown, 'utf8');
      console.log(`Generated: ${mdPath}`);
    }
  }

  /**
   * Generate quality standards documentation
   */
  private async generateStandardsDocumentation(): Promise<void> {
    const standardsDir = path.join(this.config.outputDir, 'standards');
    this.ensureDirectory(standardsDir);

    // Generate markdown format
    if (this.config.formats.includes('markdown')) {
      const markdown = this.standardsGen.generateMarkdown();
      const mdPath = path.join(standardsDir, 'quality-standards.md');
      fs.writeFileSync(mdPath, markdown, 'utf8');
      console.log(`Generated: ${mdPath}`);
    }

    // Generate HTML format
    if (this.config.formats.includes('html')) {
      const html = this.standardsGen.generateHTML();
      const htmlPath = path.join(standardsDir, 'quality-standards.html');
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`Generated: ${htmlPath}`);
    }
  }

  /**
   * Generate user guide documentation
   */
  private async generateUserGuideDocumentation(): Promise<void> {
    const guideDir = path.join(this.config.outputDir, 'guides');
    this.ensureDirectory(guideDir);

    // Generate full user guide
    if (this.config.formats.includes('markdown')) {
      const guide = this.userGuideGen.generateGuide();
      const guidePath = path.join(guideDir, 'user-guide.md');
      fs.writeFileSync(guidePath, guide, 'utf8');
      console.log(`Generated: ${guidePath}`);

      // Generate quick start guide
      const quickStart = this.userGuideGen.generateQuickStart();
      const quickStartPath = path.join(guideDir, 'quick-start.md');
      fs.writeFileSync(quickStartPath, quickStart, 'utf8');
      console.log(`Generated: ${quickStartPath}`);
    }
  }

  /**
   * Generate API markdown documentation
   */
  private generateAPIMarkdown(): string {
    return `# CodeJanitor Enterprise API Documentation

## Overview

The CodeJanitor Enterprise API provides programmatic access to all platform features including code analysis, team management, policy enforcement, and reporting.

## Base URL

\`\`\`
https://api.codejanitor.dev/v1
\`\`\`

## Authentication

All API requests require authentication using either an API key or JWT token.

### API Key Authentication

Include your API key in the request header:

\`\`\`
X-API-Key: your_api_key_here
\`\`\`

### Bearer Token Authentication

Include your JWT token in the Authorization header:

\`\`\`
Authorization: Bearer your_jwt_token_here
\`\`\`

## Rate Limiting

API requests are rate limited to 100 requests per minute per API key. Rate limit information is included in response headers:

- \`X-RateLimit-Limit\`: Maximum requests per window
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Time when the rate limit resets

## Endpoints

### Analysis

#### Analyze File

\`\`\`http
POST /analysis/file
\`\`\`

Analyze a single file for code quality issues.

**Request Body:**
\`\`\`json
{
  "filePath": "/path/to/file.ts",
  "config": {
    "enableUnusedImports": true,
    "enableUnusedVariables": true
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "filePath": "/path/to/file.ts",
    "issues": [],
    "analysisTimeMs": 150
  }
}
\`\`\`

#### Analyze Workspace

\`\`\`http
POST /analysis/workspace
\`\`\`

Analyze an entire workspace for code quality issues.

### Teams

#### List Teams

\`\`\`http
GET /teams?organizationId=org_123&page=1&pageSize=20
\`\`\`

#### Create Team

\`\`\`http
POST /teams
\`\`\`

#### Get Team

\`\`\`http
GET /teams/{id}
\`\`\`

### Policies

#### List Policies

\`\`\`http
GET /policies
\`\`\`

#### Create Policy

\`\`\`http
POST /policies
\`\`\`

### Reports

#### Generate Report

\`\`\`http
POST /reports
\`\`\`

### Projects

#### List Projects

\`\`\`http
GET /projects
\`\`\`

#### Create Project

\`\`\`http
POST /projects
\`\`\`

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details"
  }
}
\`\`\`

### Common Error Codes

- \`AUTHENTICATION_FAILED\`: Invalid or missing authentication credentials
- \`RATE_LIMIT_EXCEEDED\`: Too many requests
- \`NOT_FOUND\`: Resource not found
- \`INVALID_PARAMETER\`: Invalid request parameter
- \`INTERNAL_SERVER_ERROR\`: Server error

## Versioning

The API uses URL-based versioning. The current version is \`v1\`. When breaking changes are introduced, a new version will be released and the old version will be supported for at least 6 months.

## Support

For API support, contact: support@codejanitor.dev

For detailed OpenAPI specification, see: [openapi.json](./openapi.json)
`;
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Generate index page
   */
  async generateIndexPage(): Promise<void> {
    const indexPath = path.join(this.config.outputDir, 'README.md');
    const content = `# CodeJanitor Enterprise Documentation

Welcome to the CodeJanitor Enterprise documentation.

## Documentation Sections

- [API Documentation](./api/README.md) - REST API reference and examples
- [Quality Standards](./standards/quality-standards.md) - Code quality standards and best practices
- [User Guide](./guides/user-guide.md) - Comprehensive user guide
- [Quick Start](./guides/quick-start.md) - Get started quickly

## Quick Links

- [Installation](./guides/user-guide.md#installation)
- [Configuration](./guides/user-guide.md#configuration)
- [Running Analysis](./guides/user-guide.md#running-analysis)
- [Team Collaboration](./guides/user-guide.md#team-collaboration)
- [CI/CD Integration](./guides/user-guide.md#cicd-integration)

## Support

- Documentation: https://docs.codejanitor.dev
- Support: support@codejanitor.dev
- Community: https://community.codejanitor.dev

---

Generated on ${new Date().toISOString()}
`;

    fs.writeFileSync(indexPath, content, 'utf8');
    console.log(`Generated: ${indexPath}`);
  }
}

// Export all generators
export { OpenAPIGenerator } from './openapi';
export { QualityStandardsGenerator } from './qualityStandards';
export { UserGuideGenerator } from './userGuide';
