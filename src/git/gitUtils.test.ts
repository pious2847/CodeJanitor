import { describe, it, expect, vi, afterEach } from 'vitest';
import { getLastCommitInfo, getUncommittedFiles } from './gitUtils';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as cp from 'child_process';

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  const execMock = vi.fn();
  // `util.promisify` relies on a custom symbol for `exec`, so we must mock the promisified version directly
  (execMock as any)[Symbol.for('nodejs.util.promisify.custom')] = vi.fn();
  return {
    ...actual,
    exec: execMock,
  };
});

describe('gitUtils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUncommittedFiles', () => {
    it('should parse simple uncommitted files correctly', async () => {
      ((cp.exec as any)[Symbol.for('nodejs.util.promisify.custom')] as ReturnType<typeof vi.fn>).mockResolvedValue({
        stdout: ' M src/index.ts\0?? src/newFile.ts\0',
        stderr: ''
      });

      const workspaceRoot = '/test/root';
      const files = await getUncommittedFiles(workspaceRoot);

      expect(files.size).toBe(2);
      expect(files.has(path.resolve(workspaceRoot, 'src/index.ts'))).toBe(true);
      expect(files.has(path.resolve(workspaceRoot, 'src/newFile.ts'))).toBe(true);
    });

    it('should parse renamed files correctly', async () => {
      // The implementation actually splits by NUL and expects the parsed format to work with `->`
      ((cp.exec as any)[Symbol.for('nodejs.util.promisify.custom')] as ReturnType<typeof vi.fn>).mockResolvedValue({
        stdout: 'R  src/old.ts -> src/renamed.ts\0 M src/modified.ts\0',
        stderr: ''
      });

      const workspaceRoot = '/test/root';
      const files = await getUncommittedFiles(workspaceRoot);

      expect(files.size).toBe(2);
      expect(files.has(path.resolve(workspaceRoot, 'src/renamed.ts'))).toBe(true);
      expect(files.has(path.resolve(workspaceRoot, 'src/modified.ts'))).toBe(true);
    });

    it('should return empty set if no output', async () => {
      ((cp.exec as any)[Symbol.for('nodejs.util.promisify.custom')] as ReturnType<typeof vi.fn>).mockResolvedValue({
        stdout: '',
        stderr: ''
      });
      const files = await getUncommittedFiles('/test/root');
      expect(files.size).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      ((cp.exec as any)[Symbol.for('nodejs.util.promisify.custom')] as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('git command failed'));
      const files = await getUncommittedFiles('/test/root');
      expect(files.size).toBe(0);
    });
  });

  describe('getLastCommitInfo', () => {
    it('should not allow command injection through malicious file paths', async () => {
      // Setup a temporary workspace
      const workspaceRoot = path.join(__dirname, 'test-workspace-injection');
      if (fs.existsSync(workspaceRoot)) {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
      }
      fs.mkdirSync(workspaceRoot);

      // Initialize git
      execSync('git init', { cwd: workspaceRoot });
      execSync('git config user.email "test@example.com"', { cwd: workspaceRoot });
      execSync('git config user.name "Test User"', { cwd: workspaceRoot });

      // Create a test file and commit it
      const normalFile = 'normal.txt';
      fs.writeFileSync(path.join(workspaceRoot, normalFile), 'hello');
      execSync(`git add ${normalFile}`, { cwd: workspaceRoot });
      execSync('git commit -m "initial commit"', { cwd: workspaceRoot });

      // Try a malicious file path
      const maliciousPath = 'normal.txt"; touch pwned.txt; echo "';
      const fullMaliciousPath = path.join(workspaceRoot, maliciousPath);

      // This should fail to find a commit because the file doesn't exist,
      // but it shouldn't execute `touch pwned.txt`.
      await getLastCommitInfo(workspaceRoot, fullMaliciousPath);

      // Verify command injection didn't happen
      const pwnedFileExists = fs.existsSync(path.join(workspaceRoot, 'pwned.txt'));
      expect(pwnedFileExists).toBe(false);

      // Cleanup
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    });
  });
});
