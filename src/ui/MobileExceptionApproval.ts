import * as vscode from 'vscode';
import { PolicyEngine } from '../services/PolicyEngine';
import { NotificationSystem } from '../services/NotificationSystem';

export interface QualityException {
  id: string;
  issueId: string;
  projectId: string;
  teamId: string;
  requestedBy: string;
  requestedAt: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  comments: ExceptionComment[];
  expiresAt?: Date;
  isPermanent: boolean;
}

export interface ExceptionComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
}

export interface ApprovalAction {
  exceptionId: string;
  action: 'approve' | 'reject';
  comment?: string;
  userId: string;
}

/**
 * Mobile-optimized interface for quality exception review and approval
 * Requirements: 10.4
 */
export class MobileExceptionApproval {
  private panel: vscode.WebviewPanel | undefined;
  private policyEngine: PolicyEngine;
  private notificationSystem: NotificationSystem;
  private pendingExceptions: Map<string, QualityException> = new Map();

  constructor(
    private extensionUri: vscode.Uri,
    policyEngine: PolicyEngine,
    notificationSystem: NotificationSystem
  ) {
    this.policyEngine = policyEngine;
    this.notificationSystem = notificationSystem;
  }

  public show(exceptionId?: string): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      if (exceptionId) {
        this.loadException(exceptionId);
      }
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'mobileExceptionApproval',
      'Exception Approval',
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

    // Load pending exceptions
    if (exceptionId) {
      this.loadException(exceptionId);
    } else {
      this.loadPendingExceptions();
    }
  }

  private setupMessageHandlers(): void {
    this.panel?.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'loadExceptions':
          await this.loadPendingExceptions();
          break;
        case 'loadException':
          await this.loadException(message.exceptionId);
          break;
        case 'approve':
          await this.approveException(message.exceptionId, message.comment, message.userId);
          break;
        case 'reject':
          await this.rejectException(message.exceptionId, message.comment, message.userId);
          break;
        case 'addComment':
          await this.addComment(message.exceptionId, message.comment, message.userId);
          break;
        case 'requestNotificationPermission':
          await this.requestNotificationPermission();
          break;
      }
    });
  }

  private async loadPendingExceptions(): Promise<void> {
    try {
      const exceptions = await this.policyEngine.getPendingExceptions();
      
      exceptions.forEach(ex => {
        this.pendingExceptions.set(ex.id, ex);
      });

      this.panel?.webview.postMessage({
        type: 'exceptionsList',
        data: exceptions,
      });
    } catch (error) {
      this.panel?.webview.postMessage({
        type: 'error',
        message: 'Failed to load pending exceptions',
      });
    }
  }

  private async loadException(exceptionId: string): Promise<void> {
    try {
      const exception = await this.policyEngine.getException(exceptionId);
      
      if (exception) {
        this.pendingExceptions.set(exception.id, exception);
        
        this.panel?.webview.postMessage({
          type: 'exceptionDetail',
          data: exception,
        });
      }
    } catch (error) {
      this.panel?.webview.postMessage({
        type: 'error',
        message: 'Failed to load exception details',
      });
    }
  }

  private async approveException(exceptionId: string, comment: string, userId: string): Promise<void> {
    try {
      const action: ApprovalAction = {
        exceptionId,
        action: 'approve',
        comment,
        userId,
      };

      await this.policyEngine.processExceptionApproval(action);
      
      // Send notification
      const exception = this.pendingExceptions.get(exceptionId);
      if (exception) {
        await this.notificationSystem.sendExceptionApprovalNotification(
          exception.requestedBy,
          exceptionId,
          'approved',
          comment
        );
      }

      this.panel?.webview.postMessage({
        type: 'approvalSuccess',
        exceptionId,
        action: 'approved',
      });

      // Reload exceptions list
      await this.loadPendingExceptions();
    } catch (error) {
      this.panel?.webview.postMessage({
        type: 'error',
        message: 'Failed to approve exception',
      });
    }
  }

  private async rejectException(exceptionId: string, comment: string, userId: string): Promise<void> {
    try {
      const action: ApprovalAction = {
        exceptionId,
        action: 'reject',
        comment,
        userId,
      };

      await this.policyEngine.processExceptionApproval(action);
      
      // Send notification
      const exception = this.pendingExceptions.get(exceptionId);
      if (exception) {
        await this.notificationSystem.sendExceptionApprovalNotification(
          exception.requestedBy,
          exceptionId,
          'rejected',
          comment
        );
      }

      this.panel?.webview.postMessage({
        type: 'approvalSuccess',
        exceptionId,
        action: 'rejected',
      });

      // Reload exceptions list
      await this.loadPendingExceptions();
    } catch (error) {
      this.panel?.webview.postMessage({
        type: 'error',
        message: 'Failed to reject exception',
      });
    }
  }

  private async addComment(exceptionId: string, commentText: string, userId: string): Promise<void> {
    try {
      const comment: ExceptionComment = {
        id: `comment-${Date.now()}`,
        userId,
        userName: 'Current User', // TODO: Get from user service
        text: commentText,
        timestamp: new Date(),
      };

      await this.policyEngine.addExceptionComment(exceptionId, comment);
      
      // Reload exception to show new comment
      await this.loadException(exceptionId);
    } catch (error) {
      this.panel?.webview.postMessage({
        type: 'error',
        message: 'Failed to add comment',
      });
    }
  }

  private async requestNotificationPermission(): Promise<void> {
    // Request notification permission for mobile push notifications
    this.panel?.webview.postMessage({
      type: 'notificationPermission',
      granted: true, // In real implementation, check actual permission
    });
  }

  private getMobileHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>Exception Approval</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      overflow-x: hidden;
    }

    .mobile-header {
      position: sticky;
      top: 0;
      background: var(--vscode-editor-background);
      padding: 12px 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .back-btn {
      background: transparent;
      border: none;
      color: var(--vscode-editor-foreground);
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
    }

    .mobile-header h1 {
      font-size: 20px;
      font-weight: 600;
      flex: 1;
    }

    .content-wrapper {
      padding: 16px;
    }

    /* Exception list view */
    .exception-item {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .exception-item:active {
      background: var(--vscode-list-activeSelectionBackground);
    }

    .exception-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .exception-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .exception-meta {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }

    .exception-reason {
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 8px;
      color: var(--vscode-editor-foreground);
    }

    .exception-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    /* Exception detail view */
    .detail-view {
      display: none;
    }

    .detail-view.active {
      display: block;
    }

    .detail-card {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .detail-section {
      margin-bottom: 20px;
    }

    .detail-section:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .detail-value {
      font-size: 15px;
      line-height: 1.6;
    }

    /* Comments section */
    .comments-section {
      margin-top: 20px;
    }

    .comment-item {
      background: var(--vscode-editor-background);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 13px;
    }

    .comment-author {
      font-weight: 500;
    }

    .comment-time {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    .comment-text {
      font-size: 14px;
      line-height: 1.5;
    }

    /* Comment input */
    .comment-input-section {
      margin-top: 16px;
    }

    .comment-textarea {
      width: 100%;
      min-height: 80px;
      padding: 12px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
    }

    .comment-textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    /* Action buttons */
    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    .btn {
      flex: 1;
      padding: 14px 20px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
      min-height: 48px;
    }

    .btn:active {
      opacity: 0.8;
    }

    .btn-approve {
      background: #4caf50;
      color: white;
    }

    .btn-reject {
      background: #f44336;
      color: white;
    }

    .btn-comment {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    /* Status badges */
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-pending {
      background: #ff980033;
      color: #ff9800;
    }

    .status-approved {
      background: #4caf5033;
      color: #4caf50;
    }

    .status-rejected {
      background: #f4433633;
      color: #f44336;
    }

    /* Priority badges */
    .priority-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .priority-high {
      background: #f4433633;
      color: #f44336;
    }

    .priority-medium {
      background: #ff980033;
      color: #ff9800;
    }

    .priority-low {
      background: #2196f333;
      color: #2196f3;
    }

    /* Loading and empty states */
    .loading {
      text-align: center;
      padding: 40px 16px;
      color: var(--vscode-descriptionForeground);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--vscode-descriptionForeground);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-state-text {
      font-size: 16px;
    }

    /* Success message */
    .success-message {
      background: #4caf5033;
      color: #4caf50;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: none;
    }

    .success-message.show {
      display: block;
    }

    /* Error message */
    .error-message {
      background: #f4433633;
      color: #f44336;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: none;
    }

    .error-message.show {
      display: block;
    }

    @media (min-width: 768px) {
      .content-wrapper {
        max-width: 800px;
        margin: 0 auto;
        padding: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="mobile-header">
    <button class="back-btn" onclick="goBack()" style="display: none;" id="backBtn">←</button>
    <h1 id="headerTitle">Exception Approvals</h1>
  </div>

  <div class="content-wrapper">
    <div id="successMessage" class="success-message"></div>
    <div id="errorMessage" class="error-message"></div>
    
    <div id="listView">
      <div class="loading">Loading exceptions...</div>
    </div>

    <div id="detailView" class="detail-view">
      <!-- Detail view content will be inserted here -->
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let currentView = 'list';
    let currentException = null;

    function goBack() {
      if (currentView === 'detail') {
        showListView();
      }
    }

    function showListView() {
      currentView = 'list';
      document.getElementById('listView').style.display = 'block';
      document.getElementById('detailView').classList.remove('active');
      document.getElementById('backBtn').style.display = 'none';
      document.getElementById('headerTitle').textContent = 'Exception Approvals';
      vscode.postMessage({ command: 'loadExceptions' });
    }

    function showDetailView(exceptionId) {
      currentView = 'detail';
      document.getElementById('listView').style.display = 'none';
      document.getElementById('detailView').classList.add('active');
      document.getElementById('backBtn').style.display = 'block';
      document.getElementById('headerTitle').textContent = 'Exception Details';
      vscode.postMessage({ command: 'loadException', exceptionId });
    }

    function approveException() {
      const comment = document.getElementById('approvalComment')?.value || '';
      if (!currentException) return;

      vscode.postMessage({
        command: 'approve',
        exceptionId: currentException.id,
        comment,
        userId: 'current-user', // TODO: Get from context
      });
    }

    function rejectException() {
      const comment = document.getElementById('rejectionComment')?.value || '';
      if (!currentException) return;

      if (!comment.trim()) {
        showError('Please provide a reason for rejection');
        return;
      }

      vscode.postMessage({
        command: 'reject',
        exceptionId: currentException.id,
        comment,
        userId: 'current-user', // TODO: Get from context
      });
    }

    function addComment() {
      const commentText = document.getElementById('newComment')?.value || '';
      if (!currentException || !commentText.trim()) return;

      vscode.postMessage({
        command: 'addComment',
        exceptionId: currentException.id,
        comment: commentText,
        userId: 'current-user', // TODO: Get from context
      });

      document.getElementById('newComment').value = '';
    }

    function formatDate(dateStr) {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return \`\${diffMins}m ago\`;
      if (diffHours < 24) return \`\${diffHours}h ago\`;
      if (diffDays < 7) return \`\${diffDays}d ago\`;
      return date.toLocaleDateString();
    }

    function showSuccess(message) {
      const el = document.getElementById('successMessage');
      el.textContent = message;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 3000);
    }

    function showError(message) {
      const el = document.getElementById('errorMessage');
      el.textContent = message;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 3000);
    }

    function renderExceptionsList(exceptions) {
      if (exceptions.length === 0) {
        document.getElementById('listView').innerHTML = \`
          <div class="empty-state">
            <div class="empty-state-icon">✓</div>
            <div class="empty-state-text">No pending exceptions</div>
          </div>
        \`;
        return;
      }

      const html = exceptions.map(ex => \`
        <div class="exception-item" onclick="showDetailView('\${ex.id}')">
          <div class="exception-header">
            <div>
              <div class="exception-title">\${ex.issueId}</div>
              <div class="exception-meta">
                Requested by \${ex.requestedBy} • \${formatDate(ex.requestedAt)}
              </div>
            </div>
            <span class="status-badge status-\${ex.status}">\${ex.status}</span>
          </div>
          <div class="exception-reason">\${ex.reason}</div>
          <div class="exception-footer">
            <span>Project: \${ex.projectId}</span>
            <span>\${ex.isPermanent ? 'Permanent' : 'Temporary'}</span>
          </div>
        </div>
      \`).join('');

      document.getElementById('listView').innerHTML = html;
    }

    function renderExceptionDetail(exception) {
      currentException = exception;

      const html = \`
        <div class="detail-card">
          <div class="detail-section">
            <div class="detail-label">Issue ID</div>
            <div class="detail-value">\${exception.issueId}</div>
          </div>

          <div class="detail-section">
            <div class="detail-label">Status</div>
            <div class="detail-value">
              <span class="status-badge status-\${exception.status}">\${exception.status}</span>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-label">Requested By</div>
            <div class="detail-value">\${exception.requestedBy}</div>
          </div>

          <div class="detail-section">
            <div class="detail-label">Requested At</div>
            <div class="detail-value">\${new Date(exception.requestedAt).toLocaleString()}</div>
          </div>

          <div class="detail-section">
            <div class="detail-label">Reason</div>
            <div class="detail-value">\${exception.reason}</div>
          </div>

          <div class="detail-section">
            <div class="detail-label">Type</div>
            <div class="detail-value">\${exception.isPermanent ? 'Permanent Exception' : 'Temporary Exception'}</div>
          </div>

          \${exception.expiresAt ? \`
            <div class="detail-section">
              <div class="detail-label">Expires At</div>
              <div class="detail-value">\${new Date(exception.expiresAt).toLocaleString()}</div>
            </div>
          \` : ''}
        </div>

        \${exception.comments && exception.comments.length > 0 ? \`
          <div class="detail-card">
            <div class="detail-label">Comments</div>
            <div class="comments-section">
              \${exception.comments.map(comment => \`
                <div class="comment-item">
                  <div class="comment-header">
                    <span class="comment-author">\${comment.userName}</span>
                    <span class="comment-time">\${formatDate(comment.timestamp)}</span>
                  </div>
                  <div class="comment-text">\${comment.text}</div>
                </div>
              \`).join('')}
            </div>
          </div>
        \` : ''}

        \${exception.status === 'pending' ? \`
          <div class="detail-card">
            <div class="detail-label">Add Comment (Optional)</div>
            <div class="comment-input-section">
              <textarea 
                id="approvalComment" 
                class="comment-textarea" 
                placeholder="Add a comment about your decision..."
              ></textarea>
            </div>
            <div class="action-buttons">
              <button class="btn btn-reject" onclick="rejectException()">Reject</button>
              <button class="btn btn-approve" onclick="approveException()">Approve</button>
            </div>
          </div>

          <div class="detail-card">
            <div class="detail-label">Add Comment</div>
            <div class="comment-input-section">
              <textarea 
                id="newComment" 
                class="comment-textarea" 
                placeholder="Ask a question or add a note..."
              ></textarea>
            </div>
            <button class="btn btn-comment" onclick="addComment()">Post Comment</button>
          </div>
        \` : ''}
      \`;

      document.getElementById('detailView').innerHTML = html;
    }

    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'exceptionsList':
          renderExceptionsList(message.data);
          break;
        case 'exceptionDetail':
          renderExceptionDetail(message.data);
          break;
        case 'approvalSuccess':
          showSuccess(\`Exception \${message.action} successfully\`);
          setTimeout(() => showListView(), 1500);
          break;
        case 'error':
          showError(message.message);
          break;
      }
    });

    // Request notification permission on load
    vscode.postMessage({ command: 'requestNotificationPermission' });

    // Load initial data
    vscode.postMessage({ command: 'loadExceptions' });
  </script>
</body>
</html>`;
  }
}
