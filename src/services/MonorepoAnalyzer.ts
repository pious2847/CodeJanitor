/**
 * MonorepoAnalyzer Service
 * 
 * Provides monorepo support including:
 * - Incremental analysis for changed packages only
 * - Dependency graph analysis for affected package detection
 * - Package-level quality gate configuration
 * 
 * Requirements: 4.7, 6.2
 */

import { WorkspaceAnalysisResult, FileAnalysisResult, AnalyzerConfig } from '../models/types';
import { QualityGate } from './CIIntegration';

/**
 * Package information in a monorepo
 */
export interface Package {
  /** Package name */
  name: string;
  /** Package path relative to monorepo root */
  path: string;
  /** Package version */
  version: string;
  /** Dependencies on other packages in the monorepo */
  dependencies: string[];
  /** Files belonging to this package */
  files: string[];
  /** Package-specific quality gate */
  qualityGate?: QualityGate;
}

/**
 * Monorepo structure
 */
export interface MonorepoStructure {
  /** Root path of the monorepo */
  rootPath: string;
  /** All packages in the monorepo */
  packages: Package[];
  /** Dependency graph between packages */
  dependencyGraph: PackageDependencyGraph;
  /** Monorepo type */
  type: 'npm-workspaces' | 'yarn-workspaces' | 'pnpm-workspaces' | 'lerna' | 'nx' | 'turborepo';
}

/**
 * Package dependency graph
 */
export interface PackageDependencyGraph {
  /** Map of package name to its dependencies */
  dependencies: Map<string, string[]>;
  /** Map of package name to packages that depend on it */
  dependents: Map<string, string[]>;
}

/**
 * Changed files information
 */
export interface ChangedFiles {
  /** List of changed file paths */
  files: string[];
  /** Commit or change identifier */
  changeId: string;
  /** Timestamp of changes */
  timestamp: Date;
}

/**
 * Affected packages result
 */
export interface AffectedPackages {
  /** Packages directly affected by changes */
  directlyAffected: Package[];
  /** Packages indirectly affected through dependencies */
  indirectlyAffected: Package[];
  /** All affected packages (direct + indirect) */
  allAffected: Package[];
  /** Dependency chain explaining why each package is affected */
  affectedChains: Map<string, string[]>;
}

/**
 * Package analysis result
 */
export interface PackageAnalysisResult {
  /** Package information */
  package: Package;
  /** Analysis result for this package */
  analysisResult: WorkspaceAnalysisResult;
  /** Quality gate result if applicable */
  qualityGateResult?: {
    passed: boolean;
    summary: string;
  };
  /** Analysis timestamp */
  timestamp: Date;
}

/**
 * Incremental analysis result
 */
export interface IncrementalAnalysisResult {
  /** Changed files that triggered the analysis */
  changedFiles: ChangedFiles;
  /** Affected packages */
  affectedPackages: AffectedPackages;
  /** Analysis results for each affected package */
  packageResults: PackageAnalysisResult[];
  /** Overall summary */
  summary: {
    totalPackages: number;
    analyzedPackages: number;
    skippedPackages: number;
    totalIssues: number;
    qualityGatesPassed: number;
    qualityGatesFailed: number;
  };
  /** Analysis timestamp */
  timestamp: Date;
}

/**
 * MonorepoAnalyzer service
 */
export class MonorepoAnalyzer {
  private monorepoStructure?: MonorepoStructure;
  private analysisCache: Map<string, PackageAnalysisResult> = new Map();

  /**
   * Detect and parse monorepo structure
   */
  async detectMonorepoStructure(rootPath: string): Promise<MonorepoStructure> {
    // In a real implementation, this would:
    // 1. Check for package.json with workspaces
    // 2. Check for lerna.json
    // 3. Check for nx.json
    // 4. Check for turbo.json
    // 5. Parse package locations and dependencies

    const packages = await this.discoverPackages(rootPath);
    const dependencyGraph = this.buildDependencyGraph(packages);

    const structure: MonorepoStructure = {
      rootPath,
      packages,
      dependencyGraph,
      type: this.detectMonorepoType(rootPath),
    };

    this.monorepoStructure = structure;
    return structure;
  }

  /**
   * Perform incremental analysis on changed files
   */
  async analyzeIncremental(
    changedFiles: ChangedFiles,
    config: AnalyzerConfig
  ): Promise<IncrementalAnalysisResult> {
    if (!this.monorepoStructure) {
      throw new Error('Monorepo structure not detected. Call detectMonorepoStructure first.');
    }

    // Determine affected packages
    const affectedPackages = this.determineAffectedPackages(changedFiles.files);

    // Analyze only affected packages
    const packageResults: PackageAnalysisResult[] = [];
    let totalIssues = 0;
    let qualityGatesPassed = 0;
    let qualityGatesFailed = 0;

    for (const pkg of affectedPackages.allAffected) {
      // Check cache first
      const cacheKey = this.generateCacheKey(pkg, changedFiles.changeId);
      let result = this.analysisCache.get(cacheKey);

      if (!result) {
        // Perform analysis
        const analysisResult = await this.analyzePackage(pkg, config);
        
        // Evaluate quality gate if configured
        let qualityGateResult;
        if (pkg.qualityGate) {
          qualityGateResult = this.evaluatePackageQualityGate(analysisResult, pkg.qualityGate);
          if (qualityGateResult.passed) {
            qualityGatesPassed++;
          } else {
            qualityGatesFailed++;
          }
        }

        result = {
          package: pkg,
          analysisResult,
          qualityGateResult,
          timestamp: new Date(),
        };

        // Cache the result
        this.analysisCache.set(cacheKey, result);
      }

      packageResults.push(result);
      totalIssues += result.analysisResult.totalIssues;
    }

    return {
      changedFiles,
      affectedPackages,
      packageResults,
      summary: {
        totalPackages: this.monorepoStructure.packages.length,
        analyzedPackages: affectedPackages.allAffected.length,
        skippedPackages: this.monorepoStructure.packages.length - affectedPackages.allAffected.length,
        totalIssues,
        qualityGatesPassed,
        qualityGatesFailed,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Determine which packages are affected by changed files
   */
  determineAffectedPackages(changedFilePaths: string[]): AffectedPackages {
    if (!this.monorepoStructure) {
      throw new Error('Monorepo structure not detected');
    }

    const directlyAffected: Package[] = [];
    const directlyAffectedNames = new Set<string>();

    // Find packages that contain changed files
    for (const filePath of changedFilePaths) {
      for (const pkg of this.monorepoStructure.packages) {
        if (this.filebelongsToPackage(filePath, pkg)) {
          if (!directlyAffectedNames.has(pkg.name)) {
            directlyAffected.push(pkg);
            directlyAffectedNames.add(pkg.name);
          }
        }
      }
    }

    // Find packages that depend on directly affected packages
    const indirectlyAffected: Package[] = [];
    const indirectlyAffectedNames = new Set<string>();
    const affectedChains = new Map<string, string[]>();

    for (const affectedPkg of directlyAffected) {
      affectedChains.set(affectedPkg.name, [affectedPkg.name]);
      this.findDependentPackages(
        affectedPkg.name,
        indirectlyAffectedNames,
        indirectlyAffected,
        affectedChains,
        [affectedPkg.name]
      );
    }

    const allAffected = [...directlyAffected, ...indirectlyAffected];

    return {
      directlyAffected,
      indirectlyAffected,
      allAffected,
      affectedChains,
    };
  }

  /**
   * Get package by name
   */
  getPackage(packageName: string): Package | undefined {
    return this.monorepoStructure?.packages.find(p => p.name === packageName);
  }

  /**
   * Get all packages
   */
  getAllPackages(): Package[] {
    return this.monorepoStructure?.packages || [];
  }

  /**
   * Set quality gate for a package
   */
  setPackageQualityGate(packageName: string, qualityGate: QualityGate): void {
    const pkg = this.getPackage(packageName);
    if (pkg) {
      pkg.qualityGate = qualityGate;
    }
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): PackageDependencyGraph | undefined {
    return this.monorepoStructure?.dependencyGraph;
  }

  // Private helper methods

  private async discoverPackages(_rootPath: string): Promise<Package[]> {
    // Placeholder implementation
    // In a real implementation, this would:
    // 1. Read package.json workspaces configuration
    // 2. Glob for package.json files in workspace directories
    // 3. Parse each package.json for name, version, dependencies
    // 4. Build file lists for each package

    return [
      {
        name: 'package-a',
        path: 'packages/package-a',
        version: '1.0.0',
        dependencies: [],
        files: ['packages/package-a/src/index.ts'],
      },
      {
        name: 'package-b',
        path: 'packages/package-b',
        version: '1.0.0',
        dependencies: ['package-a'],
        files: ['packages/package-b/src/index.ts'],
      },
    ];
  }

  private buildDependencyGraph(packages: Package[]): PackageDependencyGraph {
    const dependencies = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();

    // Initialize maps
    for (const pkg of packages) {
      dependencies.set(pkg.name, pkg.dependencies);
      dependents.set(pkg.name, []);
    }

    // Build dependents map
    for (const pkg of packages) {
      for (const dep of pkg.dependencies) {
        const depList = dependents.get(dep) || [];
        depList.push(pkg.name);
        dependents.set(dep, depList);
      }
    }

    return {
      dependencies,
      dependents,
    };
  }

  private detectMonorepoType(_rootPath: string): MonorepoStructure['type'] {
    // Placeholder - would check for specific config files
    return 'npm-workspaces';
  }

  private filebelongsToPackage(filePath: string, pkg: Package): boolean {
    // Normalize paths for comparison
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const normalizedPkgPath = pkg.path.replace(/\\/g, '/');
    
    return normalizedFilePath.startsWith(normalizedPkgPath);
  }

  private findDependentPackages(
    packageName: string,
    indirectlyAffectedNames: Set<string>,
    indirectlyAffected: Package[],
    affectedChains: Map<string, string[]>,
    chain: string[]
  ): void {
    if (!this.monorepoStructure) {
      return;
    }

    const dependents = this.monorepoStructure.dependencyGraph.dependents.get(packageName) || [];

    for (const dependentName of dependents) {
      if (!indirectlyAffectedNames.has(dependentName)) {
        const pkg = this.getPackage(dependentName);
        if (pkg) {
          indirectlyAffectedNames.add(dependentName);
          indirectlyAffected.push(pkg);
          
          const newChain = [...chain, dependentName];
          affectedChains.set(dependentName, newChain);
          
          // Recursively find dependents
          this.findDependentPackages(
            dependentName,
            indirectlyAffectedNames,
            indirectlyAffected,
            affectedChains,
            newChain
          );
        }
      }
    }
  }

  private async analyzePackage(
    pkg: Package,
    _config: AnalyzerConfig
  ): Promise<WorkspaceAnalysisResult> {
    // Placeholder implementation
    // In a real implementation, this would call the actual analyzer
    // on the files belonging to this package

    const fileResults: FileAnalysisResult[] = pkg.files.map(filePath => ({
      filePath,
      issues: [],
      analysisTimeMs: 10,
      success: true,
    }));

    return {
      fileResults,
      totalFiles: pkg.files.length,
      totalIssues: 0,
      issuesByType: {} as any,
      issuesByCertainty: {} as any,
      totalTimeMs: fileResults.reduce((sum, r) => sum + r.analysisTimeMs, 0),
    };
  }

  private evaluatePackageQualityGate(
    analysisResult: WorkspaceAnalysisResult,
    qualityGate: QualityGate
  ): { passed: boolean; summary: string } {
    // Simplified quality gate evaluation
    // In a real implementation, this would use the full CIIntegration.evaluateQualityGate
    
    const hasIssues = analysisResult.totalIssues > 0;
    const passed = !hasIssues || !qualityGate.blockOnFailure;

    return {
      passed,
      summary: passed
        ? `Quality gate passed: ${analysisResult.totalIssues} issues found`
        : `Quality gate failed: ${analysisResult.totalIssues} issues found`,
    };
  }

  private generateCacheKey(pkg: Package, changeId: string): string {
    return `${pkg.name}-${changeId}`;
  }
}
