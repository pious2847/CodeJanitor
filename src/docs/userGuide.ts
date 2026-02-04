/**
 * User Guide Documentation Generator
 * 
 * Generates comprehensive user guides and best practices documentation
 */

export interface GuideSection {
  title: string;
  content: string;
  subsections?: GuideSection[];
}

export class UserGuideGenerator {
  /**
   * Generate complete user guide
   */
  generateGuide(): string {
    const sections: GuideSection[] = [
      this.getIntroductionSection(),
      this.getGettingStartedSection(),
      this.getAnalysisSection(),
      this.getTeamCollaborationSection(),
      this.getPolicyManagementSection(),
      this.getReportingSection(),
      this.getCIIntegrationSection(),
      this.getBestPracticesSection(),
      this.getTroubleshootingSection(),
    ];

    return this.sectionsToMarkdown(sections);
  }

  /**
   * Introduction section
   */
  private getIntroductionSection(): GuideSection {
    return {
      title: 'Introduction',
      content: `
CodeJanitor Enterprise is a comprehensive code quality platform for TypeScript/JavaScript projects. It helps development teams maintain high code quality standards through automated analysis, team collaboration, and continuous monitoring.

## Key Features

- **Advanced Code Analysis**: Detect unused code, circular dependencies, complexity issues, security vulnerabilities, and more
- **Team Collaboration**: Assign tasks, track progress, and collaborate on code quality improvements
- **Policy Management**: Define and enforce organizational coding standards
- **CI/CD Integration**: Integrate quality checks into your development pipeline
- **Comprehensive Reporting**: Generate executive summaries and detailed technical reports
- **Real-time Dashboard**: Monitor code quality metrics across all projects
      `,
    };
  }

  /**
   * Getting started section
   */
  private getGettingStartedSection(): GuideSection {
    return {
      title: 'Getting Started',
      content: '',
      subsections: [
        {
          title: 'Installation',
          content: `
### VS Code Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "CodeJanitor Enterprise"
4. Click Install

### API Server

\`\`\`bash
npm install -g @codejanitor/enterprise-server
codejanitor-server start --port 3000
\`\`\`
          `,
        },
        {
          title: 'Configuration',
          content: `
### Basic Configuration

Create a \`.codejanitor.json\` file in your project root:

\`\`\`json
{
  "enableUnusedImports": true,
  "enableUnusedVariables": true,
  "enableDeadFunctions": true,
  "enableCircularDependencies": true,
  "enableComplexityAnalysis": true,
  "enableSecurityAnalysis": true,
  "ignorePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**"
  ]
}
\`\`\`

### API Authentication

Generate an API key from the dashboard and add it to your environment:

\`\`\`bash
export CODEJANITOR_API_KEY=your_api_key_here
\`\`\`
          `,
        },
      ],
    };
  }

  /**
   * Analysis section
   */
  private getAnalysisSection(): GuideSection {
    return {
      title: 'Running Analysis',
      content: '',
      subsections: [
        {
          title: 'Analyze a Single File',
          content: `
### Using VS Code Extension

1. Open a TypeScript/JavaScript file
2. Right-click in the editor
3. Select "CodeJanitor: Analyze Current File"

### Using API

\`\`\`bash
curl -X POST https://api.codejanitor.dev/v1/analysis/file \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "filePath": "/path/to/file.ts",
    "config": {
      "enableUnusedImports": true
    }
  }'
\`\`\`
          `,
        },
        {
          title: 'Analyze Entire Workspace',
          content: `
### Using VS Code Extension

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "CodeJanitor: Analyze Workspace"
3. Press Enter

### Using API

\`\`\`bash
curl -X POST https://api.codejanitor.dev/v1/analysis/workspace \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workspacePath": "/path/to/workspace"
  }'
\`\`\`
          `,
        },
      ],
    };
  }

  /**
   * Team collaboration section
   */
  private getTeamCollaborationSection(): GuideSection {
    return {
      title: 'Team Collaboration',
      content: `
CodeJanitor Enterprise enables teams to collaborate on code quality improvements.
      `,
      subsections: [
        {
          title: 'Creating a Team',
          content: `
\`\`\`bash
curl -X POST https://api.codejanitor.dev/v1/teams \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Frontend Team",
    "organizationId": "org_123",
    "members": [
      {
        "userId": "user_1",
        "role": "lead"
      }
    ]
  }'
\`\`\`
          `,
        },
        {
          title: 'Assigning Issues',
          content: `
Issues can be assigned to team members for resolution. Assigned members receive notifications and can track their progress in the dashboard.
          `,
        },
      ],
    };
  }

  /**
   * Policy management section
   */
  private getPolicyManagementSection(): GuideSection {
    return {
      title: 'Policy Management',
      content: `
Policies define coding standards that are enforced across your organization.
      `,
      subsections: [
        {
          title: 'Creating a Policy',
          content: `
\`\`\`bash
curl -X POST https://api.codejanitor.dev/v1/policies \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "No Unused Imports",
    "scope": "organization",
    "rules": [
      {
        "type": "unused-imports",
        "severity": "high"
      }
    ]
  }'
\`\`\`
          `,
        },
        {
          title: 'Policy Hierarchy',
          content: `
Policies can be defined at three levels:

1. **Organization**: Applies to all teams and projects
2. **Team**: Applies to all projects in the team
3. **Project**: Applies only to the specific project

Lower-level policies inherit from higher levels and can override specific rules.
          `,
        },
      ],
    };
  }

  /**
   * Reporting section
   */
  private getReportingSection(): GuideSection {
    return {
      title: 'Reporting',
      content: `
Generate comprehensive reports for stakeholders.
      `,
      subsections: [
        {
          title: 'Generate a Report',
          content: `
\`\`\`bash
curl -X POST https://api.codejanitor.dev/v1/reports \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "executive",
    "projectId": "proj_123",
    "format": "pdf"
  }'
\`\`\`

Report types:
- **executive**: High-level summary for management
- **technical**: Detailed technical analysis
- **compliance**: Compliance and audit report
- **trend**: Historical trend analysis
          `,
        },
      ],
    };
  }

  /**
   * CI integration section
   */
  private getCIIntegrationSection(): GuideSection {
    return {
      title: 'CI/CD Integration',
      content: `
Integrate CodeJanitor into your continuous integration pipeline.
      `,
      subsections: [
        {
          title: 'GitHub Actions',
          content: `
\`\`\`yaml
name: Code Quality Check

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run CodeJanitor
        run: |
          npx @codejanitor/cli analyze \\
            --api-key \${{ secrets.CODEJANITOR_API_KEY }} \\
            --fail-on-errors
\`\`\`
          `,
        },
        {
          title: 'GitLab CI',
          content: `
\`\`\`yaml
code_quality:
  stage: test
  script:
    - npx @codejanitor/cli analyze --api-key $CODEJANITOR_API_KEY
  only:
    - merge_requests
\`\`\`
          `,
        },
      ],
    };
  }

  /**
   * Best practices section
   */
  private getBestPracticesSection(): GuideSection {
    return {
      title: 'Best Practices',
      content: `
Follow these best practices to get the most out of CodeJanitor Enterprise.
      `,
      subsections: [
        {
          title: 'Regular Analysis',
          content: `
- Run analysis on every commit in CI/CD
- Schedule daily workspace analysis for large projects
- Review quality metrics weekly with your team
          `,
        },
        {
          title: 'Policy Management',
          content: `
- Start with organization-wide policies for critical issues
- Allow teams to define additional policies for their specific needs
- Review and update policies quarterly
- Use policy exceptions sparingly and document reasons
          `,
        },
        {
          title: 'Team Collaboration',
          content: `
- Assign issues to specific team members
- Set realistic deadlines for quality improvements
- Celebrate quality improvements in team meetings
- Use the dashboard to track team progress
          `,
        },
      ],
    };
  }

  /**
   * Troubleshooting section
   */
  private getTroubleshootingSection(): GuideSection {
    return {
      title: 'Troubleshooting',
      content: '',
      subsections: [
        {
          title: 'Common Issues',
          content: `
### Analysis Takes Too Long

- Enable incremental analysis for large codebases
- Use ignore patterns to exclude unnecessary files
- Increase parallel processing workers

### False Positives

- Use ignore directives for legitimate cases
- Adjust analyzer sensitivity in configuration
- Report false positives to help improve detection

### API Rate Limiting

- Implement exponential backoff in your integration
- Consider upgrading to a higher tier for more requests
- Cache analysis results when possible
          `,
        },
        {
          title: 'Getting Help',
          content: `
- Documentation: https://docs.codejanitor.dev
- Support: support@codejanitor.dev
- Community: https://community.codejanitor.dev
- GitHub Issues: https://github.com/codejanitor/enterprise/issues
          `,
        },
      ],
    };
  }

  /**
   * Convert sections to markdown
   */
  private sectionsToMarkdown(sections: GuideSection[], level: number = 1): string {
    let markdown = '';

    for (const section of sections) {
      const heading = '#'.repeat(level);
      markdown += `${heading} ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;

      if (section.subsections) {
        markdown += this.sectionsToMarkdown(section.subsections, level + 1);
      }
    }

    return markdown;
  }

  /**
   * Generate quick start guide
   */
  generateQuickStart(): string {
    return `# CodeJanitor Enterprise - Quick Start Guide

## 1. Install the Extension

Install CodeJanitor Enterprise from the VS Code marketplace or via command line:

\`\`\`bash
code --install-extension codejanitor.enterprise
\`\`\`

## 2. Configure Your Project

Create \`.codejanitor.json\` in your project root:

\`\`\`json
{
  "enableUnusedImports": true,
  "enableUnusedVariables": true,
  "enableDeadFunctions": true
}
\`\`\`

## 3. Run Your First Analysis

Open Command Palette (Ctrl+Shift+P) and run:
- "CodeJanitor: Analyze Workspace"

## 4. Review Results

View issues in:
- Problems panel (Ctrl+Shift+M)
- CodeJanitor dashboard
- Inline diagnostics in your code

## 5. Fix Issues

- Click on issues to see suggested fixes
- Use "Quick Fix" (Ctrl+.) for auto-fixable issues
- Review and apply fixes with preview

## Next Steps

- Set up team collaboration
- Configure quality policies
- Integrate with CI/CD
- Generate reports for stakeholders

For detailed documentation, visit: https://docs.codejanitor.dev
`;
  }
}
