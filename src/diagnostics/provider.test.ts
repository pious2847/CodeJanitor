import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodeJanitorDiagnosticProvider } from './provider';
import * as vscode from 'vscode';

// Mock vscode module
vi.mock('vscode', () => {
  return {
    languages: {
      createDiagnosticCollection: vi.fn((name) => ({
        name,
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        dispose: vi.fn(),
      })),
    },
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3,
    },
    Range: vi.fn(),
    Position: vi.fn(),
    Diagnostic: vi.fn(),
    Uri: {
      file: vi.fn((path) => ({ path })),
      parse: vi.fn(),
    },
    DiagnosticRelatedInformation: vi.fn(),
    Location: vi.fn(),
  };
});

describe('CodeJanitorDiagnosticProvider', () => {
  let provider: CodeJanitorDiagnosticProvider;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and create a diagnostic collection named "codejanitor"', () => {
    provider = new CodeJanitorDiagnosticProvider();

    expect(vscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('codejanitor');
    expect(provider.getDiagnosticCollection()).toBeDefined();
    expect((provider.getDiagnosticCollection() as any).name).toBe('codejanitor');
  });

  it('should clear all diagnostics', () => {
    provider = new CodeJanitorDiagnosticProvider();
    const collection = provider.getDiagnosticCollection();

    provider.clearAllDiagnostics();
    expect(collection.clear).toHaveBeenCalled();
  });

  it('should dispose the diagnostic collection', () => {
    provider = new CodeJanitorDiagnosticProvider();
    const collection = provider.getDiagnosticCollection();

    provider.dispose();
    expect(collection.dispose).toHaveBeenCalled();
  });
});
