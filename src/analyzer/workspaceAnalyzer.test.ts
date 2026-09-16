import { describe, it, expect, beforeEach } from 'vitest';
import { Project } from 'ts-morph';
import { WorkspaceAnalyzer } from './workspaceAnalyzer';

describe('WorkspaceAnalyzer', () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
  });

  describe('Initialization', () => {
    it('should be instantiated without errors', () => {
      const analyzer = new WorkspaceAnalyzer(project);
      expect(analyzer).toBeInstanceOf(WorkspaceAnalyzer);
    });

    it('should initialize with default analyzers', () => {
      const analyzer = new WorkspaceAnalyzer(project);
      const analyzers = analyzer.getAnalyzers();
      expect(analyzers).toBeInstanceOf(Array);
      expect(analyzers.length).toBe(3);
    });
  });
});
