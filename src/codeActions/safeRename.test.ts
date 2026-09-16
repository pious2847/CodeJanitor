import { describe, it, expect, beforeEach } from 'vitest';
import { Project } from 'ts-morph';
import { computeSafeRenamePreview } from './safeRename';

describe('computeSafeRenamePreview', () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
  });

  describe('parameter validation', () => {
    it('returns an error when the file is not found in the project', async () => {
      // Act
      const result = await computeSafeRenamePreview(project, 'nonExistentFile.ts', 0, 'newName');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    it('returns an error when no identifier is found at the given position', async () => {
      // Arrange
      project.createSourceFile('test.ts', `const a = 1;`);

      // Act
      // Position 9 is the space before the equal sign, not an identifier
      const result = await computeSafeRenamePreview(project, 'test.ts', 9, 'b');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No identifier found at position');
    });
  });
});
