import { SourceFile, SyntaxKind } from 'ts-morph';
import { SymbolReference } from './types';
import { ImportGraphBuilder } from './importGraphBuilder';

export class SymbolReferenceCache {
  private symbolReferences: Map<string, SymbolReference[]> = new Map();
  private gitMetadata: Map<string, { hash: string; author: string; date: string }>;
  private importGraphBuilder: ImportGraphBuilder;

  constructor(
    importGraphBuilder: ImportGraphBuilder,
    gitMetadata: Map<string, { hash: string; author: string; date: string }>
  ) {
    this.importGraphBuilder = importGraphBuilder;
    this.gitMetadata = gitMetadata;
  }

  getReferences(symbol: string): SymbolReference[] {
    return this.symbolReferences.get(symbol) || [];
  }

  extractFromFile(sourceFile: SourceFile): void {
    const filePath = sourceFile.getFilePath();

    // Get exported symbols
    const exportedDeclarations = sourceFile.getExportedDeclarations();
    for (const [symbolName] of exportedDeclarations) {
      if (!this.symbolReferences.has(symbolName)) {
        this.symbolReferences.set(symbolName, []);
      }

      const refs = this.symbolReferences.get(symbolName)!;
      refs.push({
        symbol: symbolName,
        filePath,
        line: 0,
        column: 0,
        isDeclaration: true,
        isExport: true,
        isImport: false,
      });
      // attach git metadata if available
      const gitInfo = this.gitMetadata.get(filePath);
      if (gitInfo) {
        refs.push({ symbol: `__git_meta__${gitInfo.hash}`, filePath, line: 0, column: 0, isDeclaration: false, isExport: false, isImport: false });
      }
    }

    // Get all identifier references
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
    for (const identifier of identifiers) {
      const text = identifier.getText();
      if (!text || text.length === 0) {
        continue;
      }

      if (!this.symbolReferences.has(text)) {
        this.symbolReferences.set(text, []);
      }

      this.symbolReferences.get(text)!.push({
        symbol: text,
        filePath,
        line: identifier.getStartLineNumber(),
        column: 0,
        isDeclaration: false,
        isExport: false,
        isImport: false,
      });
    }
  }

  isSymbolReferencedExternally(symbol: string, sourceFile: SourceFile): boolean {
    const filePath = sourceFile.getFilePath();
    const refs = this.symbolReferences.get(symbol) || [];

    // Check if symbol is referenced in any file OTHER than the one it's declared in
    return refs.some(
      (ref) => ref.filePath !== filePath && !ref.isDeclaration
    );
  }

  getReferenceChains(symbol: string): string[][] {
    const refs = this.symbolReferences.get(symbol) || [];

    // declaration files (where the symbol is declared/exported)
    const declFiles = Array.from(new Set(refs.filter(r => r.isDeclaration).map(r => r.filePath)));
    // usage files (where the symbol appears but not declared)
    const usageFiles = Array.from(new Set(refs.filter(r => !r.isDeclaration).map(r => r.filePath)));

    const chains: string[][] = [];
    const importGraph = this.importGraphBuilder.getGraph();

    // For each usage, attempt to find import origin and attach declaration
    for (const usage of usageFiles) {
      // try to find import entry in usage file that imports this symbol
      const impEntry = importGraph[usage]?.imports.find(i => i.symbol === symbol);
      if (impEntry) {
        // attempt to resolve the module source to a workspace file by looking for a declaration with same exported name
        const possibleOrigins = declFiles.length > 0 ? declFiles : [];
        if (possibleOrigins.length > 0) {
          for (const origin of possibleOrigins) {
            chains.push([origin, usage]);
          }
        } else {
          chains.push([impEntry.source, usage]);
        }
      } else {
        // direct usage in file (maybe same file declaration)
        if (declFiles.includes(usage)) {
          chains.push([usage]);
        } else if (declFiles.length > 0) {
          for (const d of declFiles) chains.push([d, usage]);
        } else {
          chains.push([usage]);
        }
      }
    }

    // If no explicit usages were found but declarations exist, return declarations
    if (chains.length === 0 && declFiles.length > 0) {
      for (const d of declFiles) chains.push([d]);
    }

    // Deduplicate chains
    const uniq = new Map<string, string[]>();
    for (const c of chains) {
      uniq.set(c.join('->'), c);
    }

    return Array.from(uniq.values());
  }
}
