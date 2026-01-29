import * as vscode from 'vscode';

/**
 * PreviewPanel
 * Simple webview panel that displays a list of file diffs (unified) and allows applying selected edits.
 *
 * This is a minimal scaffold: it accepts a map of filePath -> unified diff HTML and renders checkboxes per file.
 */
export class PreviewPanel {
  public static currentPanel: PreviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'apply':
          vscode.window.showInformationMessage('Apply selected edits (not implemented)');
          return;
      }
    }, null, this.disposables);
  }

  public static createOrShow(_extensionUri: vscode.Uri, title = 'CodeJanitor Preview') {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (PreviewPanel.currentPanel) {
      PreviewPanel.currentPanel.panel.reveal(column);
      return PreviewPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel('codejanitor.preview', title, column || vscode.ViewColumn.One, {
      enableScripts: true,
      localResourceRoots: [_extensionUri],
    });

    PreviewPanel.currentPanel = new PreviewPanel(panel);
    return PreviewPanel.currentPanel;
  }

  public setContent(diffs: { [filePath: string]: string }) {
    const webview = this.panel.webview;
    const escaped = Object.entries(diffs).map(([fp, html]) => `
      <div class="file">
        <label><input type="checkbox" checked data-file="${fp}"> ${fp}</label>
        <pre class="diff">${html}</pre>
      </div>
    `).join('\n');

    webview.html = `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: system-ui, sans-serif; padding: 12px }
        .file { margin-bottom: 18px }
        .diff { background: #1e1e1e; color: #dcdcdc; padding: 8px; overflow:auto }
      </style>
    </head>
    <body>
      <h2>CodeJanitor Preview</h2>
      <div id="files">
        ${escaped}
      </div>
      <button id="apply">Apply Selected</button>
      <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('apply').addEventListener('click', () => {
          const checks = Array.from(document.querySelectorAll('input[data-file]'));
          const selected = checks.filter(c => c.checked).map(c => c.getAttribute('data-file'));
          vscode.postMessage({ command: 'apply', files: selected });
        });
      </script>
    </body>
    </html>`;
  }

  public dispose() {
    PreviewPanel.currentPanel = undefined;

    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) d.dispose();
    }
  }
}
