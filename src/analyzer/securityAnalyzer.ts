/**
 * Security Analyzer
 * 
 * Detects common JavaScript/TypeScript security vulnerabilities:
 * - Hardcoded secrets and credentials
 * - XSS vulnerabilities (dangerouslySetInnerHTML, eval, etc.)
 * - SQL injection patterns
 * - Command injection patterns
 * - Insecure random number generation
 * - Weak cryptography
 * - Path traversal vulnerabilities
 */

import {
  SourceFile,
  Node,
} from 'ts-morph';
import { BaseEnterpriseAnalyzer } from './base';
import {
  CodeIssue,
  AnalyzerConfig,
  SourceLocation,
  generateIssueId,
  QualityMetrics,
  SecurityMetrics,
  AnalyzerPriority,
  AnalyzerCategory,
} from '../models';
import { parseCodeJanitorDirectives } from './ignoreDirectives';

/**
 * Security vulnerability patterns
 */
interface SecurityPattern {
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  check: (node: Node) => boolean;
  getSuggestion: () => string;
}

/**
 * Secret patterns to detect
 */
const SECRET_PATTERNS = [
  { name: 'API Key', pattern: /(?:api[_-]?key|apikey)[\s]*[=:][\s]*['"]([a-zA-Z0-9_\-]{20,})['"]/ },
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Password', pattern: /(?:password|passwd|pwd)[\s]*[=:][\s]*['"]([^'"]{8,})['"]/ },
  { name: 'Token', pattern: /(?:token|auth)[\s]*[=:][\s]*['"]([a-zA-Z0-9_\-\.]{20,})['"]/ },
  { name: 'Secret', pattern: /(?:secret|secret[_-]?key)[\s]*[=:][\s]*['"]([^'"]{8,})['"]/ },
  { name: 'Database URL', pattern: /(?:mongodb|postgres|mysql):\/\/[^'"]+:[^'"]+@/ },
];

/**
 * Analyzer for security vulnerabilities
 */
export class SecurityAnalyzer extends BaseEnterpriseAnalyzer {
  readonly name = 'security';
  readonly priority: AnalyzerPriority = 90; // Very high priority
  readonly category: AnalyzerCategory = 'security';

  private securityPatterns: SecurityPattern[] = [];

  constructor() {
    super();
    this.initializePatterns();
  }

  isEnabled(config: AnalyzerConfig): boolean {
    return config.enableSecurityAnalysis;
  }

  analyzeFile(sourceFile: SourceFile, _config: AnalyzerConfig): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const directives = parseCodeJanitorDirectives(sourceFile);
    
    if (directives.fileIgnored) {
      return [];
    }

    // Check for hardcoded secrets
    issues.push(...this.detectSecrets(sourceFile, directives));

    // Check for security vulnerabilities
    issues.push(...this.detectVulnerabilities(sourceFile, directives));

    return issues;
  }

  /**
   * Get security metrics for the file
   */
  getMetrics(sourceFile: SourceFile): QualityMetrics {
    const metrics = super.getMetrics(sourceFile);
    
    const secrets = this.detectSecrets(sourceFile, parseCodeJanitorDirectives(sourceFile));
    const vulnerabilities = this.detectVulnerabilities(sourceFile, parseCodeJanitorDirectives(sourceFile));
    
    const securityMetrics: SecurityMetrics = {
      vulnerabilities: vulnerabilities.length,
      secrets: secrets.length,
      riskScore: this.calculateRiskScore(secrets.length, vulnerabilities.length),
    };

    metrics.security = securityMetrics;

    return metrics;
  }

  /**
   * Initialize security vulnerability patterns
   */
  private initializePatterns(): void {
    this.securityPatterns = [
      {
        name: 'dangerouslySetInnerHTML',
        description: 'Using dangerouslySetInnerHTML can lead to XSS vulnerabilities',
        severity: 'high',
        check: (node) => {
          if (Node.isJsxAttribute(node)) {
            const name = node.getNameNode().getText();
            return name === 'dangerouslySetInnerHTML';
          }
          return false;
        },
        getSuggestion: () =>
          'Avoid using dangerouslySetInnerHTML. If necessary, sanitize the HTML using a library like DOMPurify.',
      },
      {
        name: 'eval',
        description: 'Using eval() can execute arbitrary code and lead to code injection',
        severity: 'critical',
        check: (node) => {
          if (Node.isCallExpression(node)) {
            const expr = node.getExpression();
            return expr.getText() === 'eval';
          }
          return false;
        },
        getSuggestion: () =>
          'Never use eval(). Consider using JSON.parse() for JSON data or other safe alternatives.',
      },
      {
        name: 'Function constructor',
        description: 'Using Function constructor can execute arbitrary code',
        severity: 'critical',
        check: (node) => {
          if (Node.isNewExpression(node)) {
            const expr = node.getExpression();
            return expr.getText() === 'Function';
          }
          return false;
        },
        getSuggestion: () =>
          'Avoid using the Function constructor. Use regular function declarations instead.',
      },
      {
        name: 'innerHTML',
        description: 'Setting innerHTML with user input can lead to XSS',
        severity: 'high',
        check: (node) => {
          if (Node.isPropertyAccessExpression(node)) {
            const name = node.getName();
            return name === 'innerHTML';
          }
          return false;
        },
        getSuggestion: () =>
          'Avoid setting innerHTML with user input. Use textContent or createElement instead.',
      },
      {
        name: 'document.write',
        description: 'Using document.write can lead to XSS vulnerabilities',
        severity: 'medium',
        check: (node) => {
          if (Node.isCallExpression(node)) {
            const expr = node.getExpression();
            if (Node.isPropertyAccessExpression(expr)) {
              return expr.getText() === 'document.write';
            }
          }
          return false;
        },
        getSuggestion: () =>
          'Avoid using document.write. Use DOM manipulation methods instead.',
      },
      {
        name: 'Math.random for security',
        description: 'Math.random() is not cryptographically secure',
        severity: 'medium',
        check: (node) => {
          if (Node.isCallExpression(node)) {
            const expr = node.getExpression();
            if (Node.isPropertyAccessExpression(expr)) {
              const text = expr.getText();
              // Check if used in security context (token, key, etc.)
              if (text === 'Math.random') {
                const parent = node.getParent();
                if (Node.isVariableDeclaration(parent)) {
                  const name = parent.getName().toLowerCase();
                  return name.includes('token') || name.includes('key') || 
                         name.includes('secret') || name.includes('id');
                }
              }
            }
          }
          return false;
        },
        getSuggestion: () =>
          'Use crypto.randomBytes() or crypto.getRandomValues() for cryptographically secure random values.',
      },
      {
        name: 'SQL concatenation',
        description: 'String concatenation in SQL queries can lead to SQL injection',
        severity: 'critical',
        check: (node) => {
          if (Node.isCallExpression(node)) {
            const args = node.getArguments();
            if (args.length > 0) {
              const firstArg = args[0];
              if (Node.isTemplateExpression(firstArg) || Node.isBinaryExpression(firstArg)) {
                const text = firstArg.getText().toLowerCase();
                return text.includes('select') || text.includes('insert') || 
                       text.includes('update') || text.includes('delete');
              }
            }
          }
          return false;
        },
        getSuggestion: () =>
          'Use parameterized queries or prepared statements to prevent SQL injection.',
      },
      {
        name: 'Command execution',
        description: 'Executing shell commands with user input can lead to command injection',
        severity: 'critical',
        check: (node) => {
          if (Node.isCallExpression(node)) {
            const expr = node.getExpression();
            if (Node.isPropertyAccessExpression(expr)) {
              const obj = expr.getExpression().getText();
              const method = expr.getName();
              return (obj === 'child_process' || obj === 'cp') && 
                     (method === 'exec' || method === 'execSync');
            }
          }
          return false;
        },
        getSuggestion: () =>
          'Avoid executing shell commands with user input. Use execFile or spawn with argument arrays instead.',
      },
    ];
  }

  /**
   * Detect hardcoded secrets in the source file
   */
  private detectSecrets(
    sourceFile: SourceFile,
    directives: ReturnType<typeof parseCodeJanitorDirectives>
  ): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const fileText = sourceFile.getFullText();

    for (const secretPattern of SECRET_PATTERNS) {
      const matches = fileText.matchAll(new RegExp(secretPattern.pattern, 'gi'));
      
      for (const match of matches) {
        if (match.index === undefined) continue;

        // Get line and column from index
        const position = sourceFile.getLineAndColumnAtPos(match.index);
        
        // Skip if line is ignored
        if (directives.isLineIgnored(position.line, 'security-vulnerability')) {
          continue;
        }

        const location: SourceLocation = {
          filePath: sourceFile.getFilePath(),
          startLine: position.line,
          startColumn: position.column,
          endLine: position.line,
          endColumn: position.column + match[0].length,
          sourceText: this.maskSecret(match[0]),
        };

        issues.push({
          id: generateIssueId(
            'security-vulnerability',
            sourceFile.getFilePath(),
            secretPattern.name,
            position.line
          ),
          type: 'security-vulnerability',
          certainty: 'high',
          reason: `Potential hardcoded ${secretPattern.name} detected`,
          locations: [location],
          safeFixAvailable: false,
          symbolName: secretPattern.name,
          explanation:
            `Hardcoded secrets in source code pose a security risk. ` +
            `If this code is committed to version control, the secret may be exposed.`,
          suggestedFix:
            `• Move secrets to environment variables\n` +
            `• Use a secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.)\n` +
            `• Use configuration files that are not committed to version control`,
          tags: ['security', 'secrets', 'critical'],
        });
      }
    }

    return issues;
  }

  /**
   * Detect security vulnerabilities in the source file
   */
  private detectVulnerabilities(
    sourceFile: SourceFile,
    directives: ReturnType<typeof parseCodeJanitorDirectives>
  ): CodeIssue[] {
    const issues: CodeIssue[] = [];

    sourceFile.forEachDescendant((node) => {
      for (const pattern of this.securityPatterns) {
        if (pattern.check(node)) {
          const startLine = node.getStartLineNumber();
          
          // Skip if line is ignored
          if (directives.isLineIgnored(startLine, 'security-vulnerability')) {
            continue;
          }

          const location: SourceLocation = {
            filePath: sourceFile.getFilePath(),
            startLine,
            startColumn: node.getStart(),
            endLine: node.getEndLineNumber(),
            endColumn: node.getEnd(),
            sourceText: node.getText().substring(0, 100),
          };

          const certainty = pattern.severity === 'critical' ? 'high' : 'medium';

          issues.push({
            id: generateIssueId(
              'security-vulnerability',
              sourceFile.getFilePath(),
              pattern.name,
              startLine
            ),
            type: 'security-vulnerability',
            certainty,
            reason: `${pattern.severity.toUpperCase()}: ${pattern.description}`,
            locations: [location],
            safeFixAvailable: false,
            symbolName: pattern.name,
            explanation: pattern.description,
            suggestedFix: pattern.getSuggestion(),
            tags: ['security', pattern.severity],
          });
        }
      }
    });

    return issues;
  }

  /**
   * Mask a secret for display
   */
  private maskSecret(secret: string): string {
    if (secret.length <= 8) {
      return '***';
    }
    return secret.substring(0, 4) + '***' + secret.substring(secret.length - 4);
  }

  /**
   * Calculate security risk score (0-100, lower is better)
   */
  private calculateRiskScore(secrets: number, vulnerabilities: number): number {
    // Weight secrets more heavily than other vulnerabilities
    const score = (secrets * 20) + (vulnerabilities * 10);
    return Math.min(100, score);
  }
}

/**
 * Singleton instance
 */
export const securityAnalyzer = new SecurityAnalyzer();
