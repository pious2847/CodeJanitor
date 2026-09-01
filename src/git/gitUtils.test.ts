import { describe, it, expect } from 'vitest';
import { getLastCommitInfo } from './gitUtils';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

describe('gitUtils', () => {
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
