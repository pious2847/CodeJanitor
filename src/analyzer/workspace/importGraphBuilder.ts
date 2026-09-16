import { SourceFile } from 'ts-morph';
import { ImportGraph } from './types';

export class ImportGraphBuilder {
  private importGraph: ImportGraph = {};

  getGraph(): ImportGraph {
    return this.importGraph;
  }

  buildForFile(sourceFile: SourceFile): void {
    const filePath = sourceFile.getFilePath();
    const imports = sourceFile.getImportDeclarations();

    if (!this.importGraph[filePath]) {
      this.importGraph[filePath] = { imports: [] };
    }

    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (!moduleSpecifier) {
        continue;
      }

      // Get default import
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        this.importGraph[filePath].imports.push({
          symbol: defaultImport.getText(),
          source: moduleSpecifier,
        });
      }

      // Get namespace import
      const namespaceImport = importDecl.getNamespaceImport();
      if (namespaceImport) {
        this.importGraph[filePath].imports.push({
          symbol: namespaceImport.getText(),
          source: moduleSpecifier,
        });
      }

      // Get named imports
      const namedImports = importDecl.getNamedImports();
      for (const named of namedImports) {
        this.importGraph[filePath].imports.push({
          symbol: named.getName(),
          source: moduleSpecifier,
        });
      }
    }
  }

  getFilesImportingSymbol(symbol: string): string[] {
    const files = new Set<string>();

    for (const [filePath, graph] of Object.entries(this.importGraph)) {
      for (const imp of graph.imports) {
        if (imp.symbol === symbol) {
          files.add(filePath);
        }
      }
    }

    return Array.from(files);
  }
}
