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

import type { Project, Node } from 'ts-morph';
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

    const previews: RenamePreview[] = [];
    const referencedNodes = target.findReferencesAsNodes();

    // Group referenced nodes by file path
    const nodesByFile = new Map<string, Node[]>();
    for (const node of referencedNodes) {
      const path = node.getSourceFile().getFilePath();
      if (!nodesByFile.has(path)) {
        nodesByFile.set(path, []);
      }
      nodesByFile.get(path)!.push(node);
    }

    for (const [path, nodes] of nodesByFile.entries()) {
      const edits = nodes.map(n => ({
        start: n.getStart(),
        length: n.getEnd() - n.getStart(),
        newText: newName
      }));
      previews.push({ filePath: path, edits });
    }

    return { success: true, preview: previews };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
