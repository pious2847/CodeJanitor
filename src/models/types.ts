/**
 * CodeJanitor Core Object Model
 * 
 * Every issue detected must be represented using this model.
 * All diagnostics, tooltips, reports, and code actions derive from these types.
 */

/**
 * Types of code issues that CodeJanitor can detect
 */
export type IssueType =
  | 'unused-import'
  | 'unused-variable'
  | 'dead-function'
  | 'dead-export'
  | 'missing-implementation';

/**
 * Certainty level for detected issues
 * 
 * HIGH: Safe to auto-fix (e.g., unused imports, declared-but-never-read variables)
 * MEDIUM: Likely correct but needs confirmation (e.g., dead functions not exported)
 * LOW: Ambiguous, may be false positive (e.g., dynamic access, framework hooks)
 * 
 * RULE: LOW certainty must NEVER auto-fix
 */
export type Certainty = 'high' | 'medium' | 'low';

/**
 * Represents a location in source code
 */
export interface SourceLocation {
  /** Absolute file path */
  filePath: string;
  /** 1-based line number where the issue starts */
  startLine: number;
  /** 1-based column number where the issue starts */
  startColumn: number;
  /** 1-based line number where the issue ends */
  endLine: number;
  /** 1-based column number where the issue ends */
  endColumn: number;
  /** The actual source text at this location */
  sourceText?: string;
}

/**
 * Core issue model - the single source of truth for all detected problems
 */
export interface CodeIssue {
  /** Unique identifier for this issue instance */
  id: string;
  /** The type of code issue */
  type: IssueType;
  /** Confidence level in the detection */
  certainty: Certainty;
  /** Human-readable explanation of why this is flagged */
  reason: string;
  /** All source locations related to this issue */
  locations: SourceLocation[];
  /** Whether a safe automatic fix is available */
  safeFixAvailable: boolean;
  /** The symbol name involved (e.g., variable name, function name) */
  symbolName: string;
  /** Additional context for the "Why is this unused?" feature */
  explanation?: string;
  /** Suggested fix description */
  suggestedFix?: string;
  /** Tags for filtering/categorization */
  tags?: string[];
}

/**
 * Result of analyzing a single file
 */
export interface FileAnalysisResult {
  /** The file that was analyzed */
  filePath: string;
  /** All issues found in this file */
  issues: CodeIssue[];
  /** Time taken to analyze in milliseconds */
  analysisTimeMs: number;
  /** Whether the analysis completed successfully */
  success: boolean;
  /** Error message if analysis failed */
  error?: string;
}

/**
 * Result of analyzing the entire workspace
 */
export interface WorkspaceAnalysisResult {
  /** Results for each analyzed file */
  fileResults: FileAnalysisResult[];
  /** Total number of files analyzed */
  totalFiles: number;
  /** Total number of issues found */
  totalIssues: number;
  /** Breakdown by issue type */
  issuesByType: Record<IssueType, number>;
  /** Breakdown by certainty */
  issuesByCertainty: Record<Certainty, number>;
  /** Total analysis time in milliseconds */
  totalTimeMs: number;
}

/**
 * A fix that can be applied to resolve an issue
 */
export interface CodeFix {
  /** The issue this fix resolves */
  issueId: string;
  /** Human-readable description of what this fix does */
  description: string;
  /** The text changes to apply */
  changes: TextChange[];
  /** Whether this is considered a safe fix */
  isSafe: boolean;
}

/**
 * A single text change operation
 */
export interface TextChange {
  /** File to modify */
  filePath: string;
  /** Location to replace */
  location: SourceLocation;
  /** New text (empty string for deletion) */
  newText: string;
}

/**
 * Configuration for the analyzer
 */
export interface AnalyzerConfig {
  /** Enable unused imports detection */
  enableUnusedImports: boolean;
  /** Enable unused variables detection */
  enableUnusedVariables: boolean;
  /** Enable dead functions detection */
  enableDeadFunctions: boolean;
  /** Enable dead exports detection */
  enableDeadExports: boolean;
  /** Enable missing implementations detection */
  enableMissingImplementations: boolean;
  /** Auto-fix HIGH certainty issues on save */
  autoFixOnSave: boolean;
  /** Glob patterns to ignore */
  ignorePatterns: string[];
  /** Respect underscore convention for unused variables */
  respectUnderscoreConvention: boolean;
}

/**
 * Framework patterns that should reduce certainty or be ignored
 */
export interface FrameworkPattern {
  /** Name of the framework */
  framework: string;
  /** Pattern to match (function names, decorators, etc.) */
  pattern: RegExp;
  /** How this affects certainty */
  certaintyModifier: 'reduce' | 'ignore';
  /** Explanation for why this pattern exists */
  explanation: string;
}

/**
 * Ignore directive found in source code
 */
export interface IgnoreDirective {
  /** Type of directive */
  type: 'ignore' | 'ignore-next' | 'ignore-file';
  /** Line number where the directive appears */
  line: number;
  /** Optional: specific issue types to ignore */
  issueTypes?: IssueType[];
}

/**
 * Severity mapping for VS Code diagnostics
 */
export const CERTAINTY_TO_SEVERITY = {
  high: 'Warning',
  medium: 'Hint',
  low: 'Information',
} as const;

/**
 * Generate a unique issue ID
 */
export function generateIssueId(type: IssueType, filePath: string, symbolName: string, line: number): string {
  return `${type}:${filePath}:${symbolName}:${line}`;
}
