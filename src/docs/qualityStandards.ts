/**
 * Code Quality Standards Documentation Generator
 * 
 * Generates comprehensive documentation for code quality standards and best practices
 */

export interface QualityStandard {
  id: string;
  category: string;
  title: string;
  description: string;
  rationale: string;
  examples: {
    good: string[];
    bad: string[];
  };
  severity: 'critical' | 'high' | 'medium' | 'low';
  autoFixable: boolean;
}

export class QualityStandardsGenerator {
  private standards: QualityStandard[] = [];

  constructor() {
    this.initializeStandards();
  }

  /**
   * Initialize default quality standards
   */
  private initializeStandards(): void {
    this.standards = [
      {
        id: 'unused-imports',
        category: 'Code Cleanliness',
        title: 'Remove Unused Imports',
        description: 'All import statements should be used in the code. Unused imports clutter the codebase and can lead to confusion.',
        rationale: 'Unused imports increase bundle size, slow down compilation, and make code harder to understand.',
        examples: {
          good: [
            "import { useState } from 'react';\n\nfunction Component() {\n  const [state, setState] = useState(0);\n  return <div>{state}</div>;\n}",
          ],
          bad: [
            "import { useState, useEffect } from 'react'; // useEffect is unused\n\nfunction Component() {\n  const [state, setState] = useState(0);\n  return <div>{state}</div>;\n}",
          ],
        },
        severity: 'medium',
        autoFixable: true,
      },
      {
        id: 'unused-variables',
        category: 'Code Cleanliness',
        title: 'Remove Unused Variables',
        description: 'Variables that are declared but never used should be removed.',
        rationale: 'Unused variables waste memory, confuse developers, and may indicate incomplete refactoring.',
        examples: {
          good: [
            'function calculate(x: number, y: number) {\n  const result = x + y;\n  return result;\n}',
          ],
          bad: [
            'function calculate(x: number, y: number) {\n  const unused = 42; // Never used\n  const result = x + y;\n  return result;\n}',
          ],
        },
        severity: 'medium',
        autoFixable: true,
      },
      {
        id: 'dead-functions',
        category: 'Code Cleanliness',
        title: 'Remove Dead Functions',
        description: 'Functions that are never called should be removed from the codebase.',
        rationale: 'Dead functions increase maintenance burden, confuse developers, and bloat the codebase.',
        examples: {
          good: [
            'function usedFunction() {\n  return "I am used";\n}\n\nexport function main() {\n  return usedFunction();\n}',
          ],
          bad: [
            'function deadFunction() {\n  return "I am never called";\n}\n\nexport function main() {\n  return "Hello";\n}',
          ],
        },
        severity: 'medium',
        autoFixable: false,
      },
      {
        id: 'circular-dependencies',
        category: 'Architecture',
        title: 'Avoid Circular Dependencies',
        description: 'Modules should not have circular import relationships.',
        rationale: 'Circular dependencies make code harder to understand, test, and can cause runtime errors.',
        examples: {
          good: [
            '// moduleA.ts\nimport { helperB } from "./moduleB";\n\n// moduleB.ts\n// No import from moduleA',
          ],
          bad: [
            '// moduleA.ts\nimport { helperB } from "./moduleB";\n\n// moduleB.ts\nimport { helperA } from "./moduleA"; // Circular!',
          ],
        },
        severity: 'high',
        autoFixable: false,
      },
      {
        id: 'high-complexity',
        category: 'Maintainability',
        title: 'Reduce Cyclomatic Complexity',
        description: 'Functions should have low cyclomatic complexity (recommended: < 10).',
        rationale: 'High complexity makes code harder to understand, test, and maintain.',
        examples: {
          good: [
            'function validateUser(user: User) {\n  if (!user.email) return false;\n  if (!user.name) return false;\n  return true;\n}',
          ],
          bad: [
            'function complexValidation(data: any) {\n  if (data.a && data.b || data.c) {\n    if (data.d && data.e || data.f) {\n      if (data.g && data.h || data.i) {\n        // Too many nested conditions\n      }\n    }\n  }\n}',
          ],
        },
        severity: 'medium',
        autoFixable: false,
      },
      {
        id: 'security-vulnerabilities',
        category: 'Security',
        title: 'Fix Security Vulnerabilities',
        description: 'Code should not contain common security vulnerabilities.',
        rationale: 'Security vulnerabilities can lead to data breaches, unauthorized access, and system compromise.',
        examples: {
          good: [
            'const query = db.prepare("SELECT * FROM users WHERE id = ?");\nquery.run(userId);',
          ],
          bad: [
            'const query = `SELECT * FROM users WHERE id = ${userId}`; // SQL injection risk',
          ],
        },
        severity: 'critical',
        autoFixable: false,
      },
      {
        id: 'hardcoded-secrets',
        category: 'Security',
        title: 'Remove Hardcoded Secrets',
        description: 'API keys, passwords, and other secrets should not be hardcoded.',
        rationale: 'Hardcoded secrets can be exposed in version control and lead to security breaches.',
        examples: {
          good: [
            'const apiKey = process.env.API_KEY;',
          ],
          bad: [
            'const apiKey = "sk_live_1234567890abcdef"; // Hardcoded secret!',
          ],
        },
        severity: 'critical',
        autoFixable: false,
      },
      {
        id: 'accessibility-violations',
        category: 'Accessibility',
        title: 'Fix Accessibility Issues',
        description: 'UI components should be accessible to all users.',
        rationale: 'Accessibility ensures your application is usable by people with disabilities.',
        examples: {
          good: [
            '<img src="logo.png" alt="Company Logo" />',
          ],
          bad: [
            '<img src="logo.png" /> // Missing alt text',
          ],
        },
        severity: 'high',
        autoFixable: false,
      },
    ];
  }

  /**
   * Generate markdown documentation
   */
  generateMarkdown(): string {
    let markdown = '# Code Quality Standards\n\n';
    markdown += 'This document outlines the code quality standards enforced by CodeJanitor Enterprise.\n\n';
    markdown += '## Table of Contents\n\n';

    // Generate table of contents
    const categories = this.getCategories();
    for (const category of categories) {
      markdown += `- [${category}](#${this.slugify(category)})\n`;
    }
    markdown += '\n---\n\n';

    // Generate standards by category
    for (const category of categories) {
      markdown += `## ${category}\n\n`;
      const categoryStandards = this.standards.filter(s => s.category === category);

      for (const standard of categoryStandards) {
        markdown += `### ${standard.title}\n\n`;
        markdown += `**ID:** \`${standard.id}\`  \n`;
        markdown += `**Severity:** ${standard.severity}  \n`;
        markdown += `**Auto-fixable:** ${standard.autoFixable ? 'Yes' : 'No'}  \n\n`;
        markdown += `${standard.description}\n\n`;
        markdown += `**Rationale:** ${standard.rationale}\n\n`;

        if (standard.examples.good.length > 0) {
          markdown += '**Good Example:**\n\n';
          markdown += '```typescript\n';
          markdown += standard.examples.good[0];
          markdown += '\n```\n\n';
        }

        if (standard.examples.bad.length > 0) {
          markdown += '**Bad Example:**\n\n';
          markdown += '```typescript\n';
          markdown += standard.examples.bad[0];
          markdown += '\n```\n\n';
        }

        markdown += '---\n\n';
      }
    }

    return markdown;
  }

  /**
   * Generate HTML documentation
   */
  generateHTML(): string {
    let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
    html += '  <meta charset="UTF-8">\n';
    html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
    html += '  <title>Code Quality Standards - CodeJanitor Enterprise</title>\n';
    html += '  <style>\n';
    html += this.getCSS();
    html += '  </style>\n';
    html += '</head>\n<body>\n';
    html += '  <div class="container">\n';
    html += '    <h1>Code Quality Standards</h1>\n';
    html += '    <p class="intro">This document outlines the code quality standards enforced by CodeJanitor Enterprise.</p>\n';

    const categories = this.getCategories();
    for (const category of categories) {
      html += `    <h2>${category}</h2>\n`;
      const categoryStandards = this.standards.filter(s => s.category === category);

      for (const standard of categoryStandards) {
        html += `    <div class="standard severity-${standard.severity}">\n`;
        html += `      <h3>${standard.title}</h3>\n`;
        html += `      <div class="metadata">\n`;
        html += `        <span class="badge">ID: ${standard.id}</span>\n`;
        html += `        <span class="badge severity">${standard.severity}</span>\n`;
        html += `        <span class="badge">${standard.autoFixable ? 'Auto-fixable' : 'Manual fix'}</span>\n`;
        html += `      </div>\n`;
        html += `      <p>${standard.description}</p>\n`;
        html += `      <p><strong>Rationale:</strong> ${standard.rationale}</p>\n`;
        html += `    </div>\n`;
      }
    }

    html += '  </div>\n';
    html += '</body>\n</html>';
    return html;
  }

  /**
   * Get unique categories
   */
  private getCategories(): string[] {
    const categories = new Set(this.standards.map(s => s.category));
    return Array.from(categories).sort();
  }

  /**
   * Convert string to slug
   */
  private slugify(text: string): string {
    return text.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Get CSS styles for HTML documentation
   */
  private getCSS(): string {
    return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 40px;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 8px;
    }
    .intro {
      font-size: 1.1em;
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .standard {
      margin: 20px 0;
      padding: 20px;
      border-left: 4px solid #3498db;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .standard.severity-critical {
      border-left-color: #e74c3c;
      background: #fef5f5;
    }
    .standard.severity-high {
      border-left-color: #e67e22;
      background: #fef9f5;
    }
    .standard.severity-medium {
      border-left-color: #f39c12;
      background: #fefcf5;
    }
    .standard.severity-low {
      border-left-color: #95a5a6;
      background: #f8f9fa;
    }
    .metadata {
      margin: 10px 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      margin-right: 8px;
      background: #ecf0f1;
      border-radius: 3px;
      font-size: 0.85em;
      font-weight: 500;
    }
    .badge.severity {
      background: #3498db;
      color: white;
    }
    `;
  }

  /**
   * Add custom standard
   */
  addStandard(standard: QualityStandard): void {
    this.standards.push(standard);
  }

  /**
   * Get all standards
   */
  getStandards(): QualityStandard[] {
    return this.standards;
  }
}
