import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => {
  return {
    window: {
      createWebviewPanel: vi.fn(),
      showInformationMessage: vi.fn(),
      activeTextEditor: undefined,
    },
    ViewColumn: {
      One: 1,
    },
    Uri: {
      file: vi.fn(),
    },
  };
});

import { PreviewPanel } from './PreviewPanel';

describe('PreviewPanel', () => {
  it('currentPanel should be undefined initially', () => {
    expect(PreviewPanel.currentPanel).toBeUndefined();
  });
});
