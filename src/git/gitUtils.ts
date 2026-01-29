import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execP = promisify(exec);

export async function isGitRepository(workspaceRoot: string): Promise<boolean> {
  try {
    const { stdout } = await execP('git rev-parse --is-inside-work-tree', { cwd: workspaceRoot });
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

export async function getUncommittedFiles(workspaceRoot: string): Promise<Set<string>> {
  try {
    // Use NUL-separated porcelain to handle special filenames
    const { stdout } = await execP('git status --porcelain -z', { cwd: workspaceRoot, maxBuffer: 10 * 1024 * 1024 });
    if (!stdout) return new Set();
    const parts = stdout.split('\0').filter(Boolean);
    const files = new Set<string>();
    for (const p of parts) {
      // porcelain entries are like "XY <path>" or for renames "XY <from> -> <to>"
      const m = p.match(/^.{2}\s+(.*)$/s);
      if (!m || !m[1]) continue;
      let filePath = m[1] as string;
      // handle rename with ->
      const arrowIdx = filePath.indexOf('->');
      if (arrowIdx !== -1) {
        filePath = filePath.slice(arrowIdx + 2).trim();
      }
      files.add(path.resolve(workspaceRoot, filePath));
    }
    return files;
  } catch {
    return new Set();
  }
}

export async function getLastCommitInfo(workspaceRoot: string, filePath: string): Promise<{ hash: string; author: string; date: string } | null> {
  try {
    const relPath = path.relative(workspaceRoot, filePath);
    const cmd = `git log -1 --format=%H::%an::%aI -- "${relPath.replace(/"/g, '\\"')}"`;
    const { stdout } = await execP(cmd, { cwd: workspaceRoot });
    const out = stdout.trim();
    if (!out) return null;
    const parts = out.split('::');
    if (parts.length < 3) return null;
    const [hash, author, date] = parts;
    return { hash: hash || '', author: author || '', date: date || '' };
  } catch {
    return null;
  }
}
