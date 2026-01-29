/**
 * Safe rename helper (scaffold)
 *
 * This module will provide a workspace-safe rename helper that:
 *  - validates symbol at location
 *  - computes all rename edits across the project
 *  - returns a previewable set of edits for the UI
 *
 * Currently this is a scaffold. Implementation will use `ts-morph` or the
 * TypeScript language service to produce precise edits.
 */

import type { Project } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';

export type RenamePreview = {
  filePath: string;
  edits: Array<{ start: number; length: number; newText: string }>;
};

export async function computeSafeRenamePreview(_project: Project, _filePath: string, _position: number, _newName: string): Promise<{ success: boolean; preview?: RenamePreview[]; error?: string }> {
  try {
    const project = _project;
    const filePath = _filePath;
    const position = _position;
    const newName = _newName;

    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) return { success: false, error: `File not found in project: ${filePath}` };

    // Find identifier node at position
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
    const target = identifiers.find(id => id.getStart() <= position && position < id.getEnd());
    if (!target) return { success: false, error: 'No identifier found at position' };

    const origSymbol = target.getSymbol();
    if (!origSymbol) return { success: false, error: 'Unable to resolve symbol for identifier' };

    // Build a set of declaration identity keys for the original symbol
    const origDecls = origSymbol.getDeclarations().map(d => ({ path: d.getSourceFile().getFilePath(), pos: d.getPos() }));

    const previews: RenamePreview[] = [];

    // Iterate all source files in project and collect matching identifier occurrences
    const allFiles = project.getSourceFiles();
    for (const sf of allFiles) {
      const edits: Array<{ start: number; length: number; newText: string }> = [];
      const ids = sf.getDescendantsOfKind(SyntaxKind.Identifier);
      for (const id of ids) {
        const sym = id.getSymbol();
        if (!sym) continue;
        const decls = sym.getDeclarations();
        // If any declaration matches an original declaration, consider it the same symbol
        const matches = decls.some(d => origDecls.some(od => od.path === d.getSourceFile().getFilePath() && od.pos === d.getPos()));
        if (matches) {
          edits.push({ start: id.getStart(), length: id.getEnd() - id.getStart(), newText: newName });
        }
      }
      if (edits.length > 0) {
        previews.push({ filePath: sf.getFilePath(), edits });
      }
    }

    return { success: true, preview: previews };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
