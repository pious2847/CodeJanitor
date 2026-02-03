/**
 * CodeJanitor VS Code Extension
 * 
 * Main extension entry point. Handles:
 * - Activation on TypeScript/JavaScript files
 * - Project initialization
 * - Diagnostic registration
 * - Command registration
 * - Document synchronization
 */

import * as vscode from 'vscode';
import { Project } from 'ts-morph';
import { WorkspaceAnalyzer } from './analyzer/workspaceAnalyzer';
import { CodeJanitorDiagnosticProvider } from './diagnostics/provider';
import { registerCodeActionsProvider } from './codeActions/provider';
import { AnalyzerConfig } from './models';

/**
 * Global extension state
 */
let diagnosticProvider: CodeJanitorDiagnosticProvider;
let workspaceAnalyzer: WorkspaceAnalyzer | null = null;
let analyzerConfig: AnalyzerConfig;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('CodeJanitor extension activated');

  // Initialize diagnostic provider
  diagnosticProvider = new CodeJanitorDiagnosticProvider();
  context.subscriptions.push(diagnosticProvider);

  // Load configuration
  analyzerConfig = loadConfiguration();

  // Initialize the workspace
  await initializeWorkspace();

  // Register code actions
  registerCodeActionsProvider(context);

  // Register commands
  registerCommands(context);

  // Register document change listener
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      onDocumentChange(event.document);
    })
  );

  // Register file open listener
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      onDocumentOpen(document);
    })
  );

  // Register configuration change listener
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('codejanitor')) {
        analyzerConfig = loadConfiguration();
        // Re-analyze all open files
        vscode.workspace.textDocuments.forEach((doc) => {
          onDocumentOpen(doc);
        });
      }
    })
  );

  // Analyze all currently open files
  vscode.workspace.textDocuments.forEach((doc) => {
    onDocumentOpen(doc);
  });
}

/**
 * Initialize the workspace analyzer
 */
async function initializeWorkspace(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    console.warn('CodeJanitor requires a workspace to be open');
    return;
  }

  try {
    const folder = workspaceFolders[0];
    if (!folder) {
      console.warn('CodeJanitor requires a workspace to be open');
      return;
    }
    
    const workspacePath = folder.uri.fsPath;
    console.log('CodeJanitor workspace root:', workspacePath);
    
    // Try to create project with tsconfig if it exists, otherwise use workspace root
    try {
      const project = new Project({
        tsConfigFilePath: `${workspacePath}/tsconfig.json`,
        skipAddingFilesFromTsConfig: false,
      });
      workspaceAnalyzer = new WorkspaceAnalyzer(project);
      console.log('CodeJanitor workspace initialized with tsconfig.json');
    } catch (tsError) {
      // Fall back to creating project without tsconfig
      console.warn('tsconfig.json not found, creating project with workspace root:', tsError);
      const project = new Project({
        compilerOptions: {
          target: 99, // Latest
          module: 99,
          lib: ['ES2020'],
          declaration: true,
        },
      });
      
      // Add source files from workspace
      const srcPath = `${workspacePath}/src/**/*.{ts,tsx,js,jsx}`;
      project.addSourceFilesAtPaths(srcPath);
      
      workspaceAnalyzer = new WorkspaceAnalyzer(project);
      console.log('CodeJanitor workspace initialized without tsconfig.json');
    }
  } catch (error) {
    console.error('Failed to initialize workspace:', error);
  }
}

/**
 * Load analyzer configuration from VS Code settings
 */
function loadConfiguration(): AnalyzerConfig {
  const config = vscode.workspace.getConfiguration('codejanitor');

  return {
    enableUnusedImports: config.get('enableUnusedImports', true),
    enableUnusedVariables: config.get('enableUnusedVariables', true),
    enableDeadFunctions: config.get('enableDeadFunctions', true),
    enableDeadExports: config.get('enableDeadExports', false),
    enableMissingImplementations: config.get('enableMissingImplementations', false),
    enableCircularDependencies: config.get('enableCircularDependencies', false),
    enableComplexityAnalysis: config.get('enableComplexityAnalysis', false),
    enableSecurityAnalysis: config.get('enableSecurityAnalysis', false),
    enableAccessibilityAnalysis: config.get('enableAccessibilityAnalysis', false),
    autoFixOnSave: config.get('autoFixOnSave', false),
    ignorePatterns: config.get('ignorePatterns', ['node_modules/**', '**/dist/**']),
    respectUnderscoreConvention: config.get('respectUnderscoreConvention', true),
  };
}

/**
 * Handle document changes
 */
function onDocumentChange(document: vscode.TextDocument): void {
  if (!isSupported(document)) {
    return;
  }

  // Auto-fix on save if enabled
  if (analyzerConfig.autoFixOnSave && document.isDirty === false) {
    analyzeDocument(document);
  }
}

/**
 * Handle document open
 */
function onDocumentOpen(document: vscode.TextDocument): void {
  if (!isSupported(document)) {
    return;
  }

  analyzeDocument(document);
}

/**
 * Check if document should be analyzed
 */
function isSupported(document: vscode.TextDocument): boolean {
  const supportedLanguages = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'];
  const supportedSchemes = ['file', 'untitled'];

  return (
    supportedLanguages.includes(document.languageId) &&
    supportedSchemes.includes(document.uri.scheme)
  );
}

/**
 * Analyze a single document
 */
async function analyzeDocument(document: vscode.TextDocument): Promise<void> {
  if (!workspaceAnalyzer) {
    console.warn('Workspace analyzer not initialized');
    return;
  }

  try {
    const filePath = document.uri.fsPath;

    // Get the source file from the project
    const sourceFile = workspaceAnalyzer['project']?.getSourceFile(filePath);
    if (!sourceFile) {
      // File not in project, skip
      diagnosticProvider.clearFileDiagnostics(filePath);
      return;
    }

    // Analyze the file
    const result = workspaceAnalyzer.analyzeFile(sourceFile, analyzerConfig);

    if (result.success) {
      diagnosticProvider.updateFileDiagnostics(filePath, result.issues);
      
      if (result.issues.length > 0) {
        console.log(`CodeJanitor found ${result.issues.length} issues in ${filePath}`);
      }
    } else {
      console.error(`Analysis failed for ${filePath}: ${result.error}`);
      diagnosticProvider.clearFileDiagnostics(filePath);
    }
  } catch (error) {
    console.error('Error analyzing document:', error);
  }
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // Analyze current file
  context.subscriptions.push(
    vscode.commands.registerCommand('codejanitor.analyzeFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      await analyzeDocument(editor.document);
      vscode.window.showInformationMessage('CodeJanitor analysis complete');
    })
  );

  // Analyze workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('codejanitor.analyzeWorkspace', async () => {
      if (!workspaceAnalyzer) {
        vscode.window.showErrorMessage('Workspace analyzer not initialized');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'CodeJanitor: Analyzing workspace...',
          cancellable: false,
        },
        async () => {
          try {
            const results = await workspaceAnalyzer!.analyzeWorkspace(analyzerConfig);
            
            // Update diagnostics for all files
            for (const result of results) {
              diagnosticProvider.updateFileDiagnostics(result.filePath, result.issues);
            }

            const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
            vscode.window.showInformationMessage(
              `CodeJanitor analysis complete: ${totalIssues} issues found in ${results.length} files`
            );
          } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
          }
        }
      );
    })
  );

  // Show report (placeholder for future UI)
  context.subscriptions.push(
    vscode.commands.registerCommand('codejanitor.showReport', async () => {
      vscode.window.showInformationMessage('CodeJanitor Report feature coming soon');
    })
  );

  // Export dry-run report (JSON + HTML)
  context.subscriptions.push(
    vscode.commands.registerCommand('codejanitor.exportReport', async () => {
      if (!workspaceAnalyzer) {
        vscode.window.showErrorMessage('Workspace analyzer not initialized');
        return;
      }

      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        vscode.window.showErrorMessage('Open a workspace folder to export report');
        return;
      }

      const { exportReport } = await import('./commands/report');
      try {
        const result = await exportReport(workspaceAnalyzer, analyzerConfig, folder.uri.fsPath);
        vscode.window.showInformationMessage(`Report exported: ${result.jsonPath}`);
      } catch (err) {
        vscode.window.showErrorMessage('Failed to export report: ' + String(err));
      }
    })
  );

  // Cleanup with preview (placeholder)
  context.subscriptions.push(
    vscode.commands.registerCommand('codejanitor.cleanupWithPreview', async () => {
      // Open the preview panel scaffold
      try {
        const panel = (await import('./ui/PreviewPanel')).PreviewPanel;
        const p = panel.createOrShow(context.extensionUri);
        // placeholder content
        p.setContent({ 'example.txt': '<span>+ added line</span>\n<span>- removed line</span>' });
      } catch (err) {
        vscode.window.showErrorMessage('Failed to open CodeJanitor preview: ' + String(err));
      }
    })
  );

  // Show Enterprise Dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand('codejanitor.showEnterpriseDashboard', async () => {
      try {
        const { EnterpriseDashboard } = await import('./ui/EnterpriseDashboard');
        const { AnalyticsEngine } = await import('./services/AnalyticsEngine');
        const { TeamWorkspace } = await import('./services/TeamWorkspace');
        const { PolicyEngine } = await import('./services/PolicyEngine');

        const analyticsEngine = new AnalyticsEngine();
        const teamWorkspace = new TeamWorkspace();
        const policyEngine = new PolicyEngine();

        const dashboard = new EnterpriseDashboard(
          context.extensionUri,
          analyticsEngine,
          teamWorkspace,
          policyEngine
        );

        dashboard.show();
      } catch (err) {
        vscode.window.showErrorMessage('Failed to open Enterprise Dashboard: ' + String(err));
      }
    })
  );
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  diagnosticProvider?.dispose();
  console.log('CodeJanitor extension deactivated');
}
