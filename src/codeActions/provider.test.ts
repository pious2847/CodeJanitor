import { describe, it, expect, vi } from 'vitest';
import { CodeJanitorCodeActionsProvider } from './provider';
import * as vscode from 'vscode';

vi.mock('vscode', () => {
  return {
    CodeActionKind: {
      QuickFix: { value: 'quickfix' },
      RefactorRewrite: { value: 'refactor.rewrite' }
    },
    Range: vi.fn(),
    Position: vi.fn(),
    CodeAction: vi.fn(),
    WorkspaceEdit: vi.fn(),
    languages: {
      registerCodeActionsProvider: vi.fn()
    }
  };
});

describe('CodeJanitorCodeActionsProvider', () => {
  describe('Initialization', () => {
    it('should be instantiated correctly', () => {
      const provider = new CodeJanitorCodeActionsProvider();
      expect(provider).toBeInstanceOf(CodeJanitorCodeActionsProvider);
    });

    it('should provide code action kinds including QuickFix and RefactorRewrite', () => {
      expect(CodeJanitorCodeActionsProvider.providedCodeActionKinds).toBeDefined();
      expect(CodeJanitorCodeActionsProvider.providedCodeActionKinds).toContain(vscode.CodeActionKind.QuickFix);
      expect(CodeJanitorCodeActionsProvider.providedCodeActionKinds).toContain(vscode.CodeActionKind.RefactorRewrite);
    });
  });
});
