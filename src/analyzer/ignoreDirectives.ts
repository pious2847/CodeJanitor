/**
 * Ignore directive parser for CodeJanitor
 *
 * Supports directives in source code comments:
 *  - // @codejanitor-ignore-file
 *  - // @codejanitor-ignore-next [types]
 *  - // @codejanitor-ignore [types]
 *
 * Types is an optional comma-separated list of issue types (e.g. unused-import,dead-function).
 * If types are omitted the directive applies to all issue types.
 */

import { SourceFile } from 'ts-morph';

type DirectiveMap = Map<number, Set<string> | null>;

export function parseCodeJanitorDirectives(sourceFile: SourceFile) {
  const text = sourceFile.getFullText();
  const lines = text.split(/\r?\n/);

  let fileIgnored = false;
  const ignoredLines: DirectiveMap = new Map();

  const directiveRegex = /@codejanitor-ignore(?:-(next|file))?(?:\s+([\w\-,]+))?/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const match = directiveRegex.exec(line);
    if (!match) continue;

    const modifier = match[1];
    const typesRaw = match[2];
    const types = typesRaw ? new Set(typesRaw.split(',').map(t => t.trim())) : null;

    if (modifier === 'file') {
      fileIgnored = true;
      break;
    }

    if (modifier === 'next') {
      const targetLine = i + 2; // next physical line (1-based)
      ignoredLines.set(targetLine, types);
      continue;
    }

    // default: ignore this line's subsequent node
    const targetLine = i + 1; // current line (1-based)
    ignoredLines.set(targetLine, types);
  }

  return {
    fileIgnored,
    isLineIgnored(line: number, issueType?: string) {
      if (fileIgnored) return true;
      const set = ignoredLines.get(line);
      if (!set) return false;
      if (!issueType || set === null) return true;
      return set.has(issueType);
    },
  };
}
