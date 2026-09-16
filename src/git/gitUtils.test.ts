import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLastCommitInfo, isGitRepository } from './gitUtils';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as cp from 'child_process';

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    exec: vi.fn(),
  };
});

describe('gitUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true if it is a git work tree', async () => {
      vi.mocked(cp.exec).mockImplementation(((_cmd: string, opts: any, cb: any) => {
        if (typeof opts === 'function') cb = opts;
        // Due to util.promisify on a mocked function without the custom symbol,
        // the first argument after error becomes the resolved value.
        cb(null, { stdout: 'true\n' });
        return {} as any;
      }) as any);

      const result = await isGitRepository('/workspace');
      expect(result).toBe(true);
      expect(cp.exec).toHaveBeenCalledWith('git rev-parse --is-inside-work-tree', { cwd: '/workspace' }, expect.any(Function));
    });

    it('should return false if it is not a git work tree', async () => {
      vi.mocked(cp.exec).mockImplementation(((_cmd: string, opts: any, cb: any) => {
        if (typeof opts === 'function') cb = opts;
        cb(null, { stdout: 'false\n' });
        return {} as any;
      }) as any);

      const result = await isGitRepository('/workspace');
      expect(result).toBe(false);
      expect(cp.exec).toHaveBeenCalledWith('git rev-parse --is-inside-work-tree', { cwd: '/workspace' }, expect.any(Function));
    });

    it('should return false if an error is thrown', async () => {
      vi.mocked(cp.exec).mockImplementation(((_cmd: string, opts: any, cb: any) => {
        if (typeof opts === 'function') cb = opts;
        cb(new Error('Command failed'));
        return {} as any;
      }) as any);

      const result = await isGitRepository('/workspace');
      expect(result).toBe(false);
      expect(cp.exec).toHaveBeenCalledWith('git rev-parse --is-inside-work-tree', { cwd: '/workspace' }, expect.any(Function));
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
