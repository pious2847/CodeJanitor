export interface SymbolReference {
  symbol: string;
  filePath: string;
  line: number;
  column: number;
  isDeclaration: boolean;
  isExport: boolean;
  isImport: boolean;
}

export interface ImportGraph {
  [sourceFile: string]: {
    imports: {
      symbol: string;
      source: string;
    }[];
  };
}
