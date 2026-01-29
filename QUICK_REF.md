#!/# CodeJanitor Quick Reference

## Installation & Setup

```bash
cd CodeJanitor
pnpm install          # Install dependencies
pnpm run compile      # Build TypeScript
pnpm run watch        # Dev mode with watch
```

## File Organization

| File | Purpose |
|------|---------|
| `src/analyzer/base.ts` | Core `IAnalyzer` interface, `ProjectManager` |
| `src/analyzer/workspaceAnalyzer.ts` | Orchestrator, symbol graphs, cross-file analysis |
| `src/analyzer/*Analyzer.ts` | Individual detectors (imports, variables, functions, exports) |
| `src/diagnostics/provider.ts` | Convert issues to VS Code diagnostics |
| `src/codeActions/provider.ts` | Quick fixes for safe issues |
| `src/extension.ts` | VS Code entry point, commands, event handlers |
| `src/models/types.ts` | TypeScript interfaces (`CodeIssue`, `SourceLocation`, etc.) |

## The Core Issue Model

```typescript
CodeIssue {
  id: string;                           // "type:file:symbol:line"
  type: "unused-import" | "unused-variable" | "dead-function" | "dead-export";
  certainty: "high" | "medium" | "low"; // Safety level
  reason: string;                       // Human-readable message
  locations: SourceLocation[];          // File, line, column info
  safeFixAvailable: boolean;            // Can auto-fix?
  symbolName: string;                   // "foo", "unused", etc.
}
```

## Analyzer Quick Reference

| Analyzer | Certainty | Auto-Fix | Scope | Key Features |
|----------|-----------|----------|-------|--------------|
| UnusedImports | HIGH | ✓ | File | Detects unused named/default/namespace imports |
| UnusedVariables | HIGH | ✓ | Function | Handles let/const/var, params, destructuring |
| DeadFunctions | MEDIUM→HIGH | ✗ | File±WS | Skips exports, lifecycle hooks, patterns |
| DeadExports | MEDIUM | ✗ | Workspace | Finds exports never imported anywhere |

## Common Tasks

### Add a New Analyzer

1. Create `src/analyzer/myAnalyzer.ts`:
```typescript
export class MyAnalyzer implements IAnalyzer {
  readonly name = 'my-check';
  isEnabled(config: AnalyzerConfig) { return config.enableMyCheck; }
  analyzeFile(file: SourceFile, config: AnalyzerConfig): CodeIssue[] {
    // your logic
  }
}
```

2. Add to `WorkspaceAnalyzer.analyzers`
3. Add config flag to `AnalyzerConfig` interface
4. Test!

### Test an Analyzer

Create `test.ts`:
```typescript
// Patterns your analyzer should catch
const x = 1;  // If testing unused variables

// Patterns it should ignore
import { used } from './lib';
export function keep() { return used; }
```

Open in VS Code (with extension running) and verify squiggles.

### Enable Workspace Analysis

In code:
```typescript
const result = await workspaceAnalyzer.analyzeWorkspace(config);
```

This:
- Runs symbol graph analysis
- Detects cross-file references
- Increases certainty for dead functions/exports

### Debug

Check Debug Console (`Ctrl+Shift+Y`) for logs:
```typescript
console.log('CodeJanitor found', issues.length, 'issues');
```

## Configuration

Settings UI or `.vscode/settings.json`:
```json
{
  "codejanitor.enableUnusedImports": true,
  "codejanitor.enableUnusedVariables": true,
  "codejanitor.enableDeadFunctions": true,
  "codejanitor.enableDeadExports": false,
  "codejanitor.autoFixOnSave": false,
  "codejanitor.ignorePatterns": ["**/node_modules/**", "**/dist/**"],
  "codejanitor.respectUnderscoreConvention": true
}
```

## Build & Package

```bash
pnpm run compile           # Build
pnpm run lint             # Lint
pnpm run package          # Create .vsix
```

Install locally:
```bash
code --install-extension codejanitor-0.1.0.vsix
```

## Commands

| Command | What It Does |
|---------|------|
| `CodeJanitor: Analyze Current File` | Run analyzers on active file |
| `CodeJanitor: Analyze Workspace` | Full workspace analysis (slower) |
| `CodeJanitor: Show Cleanup Report` | Open report panel (coming soon) |
| `CodeJanitor: Cleanup with Preview` | Dry-run before applying fixes (coming soon) |

## Certainty Levels

| Level | Auto-Fix? | Example |
|-------|-----------|---------|
| **HIGH** | ✓ Yes | Unused import, unused variable |
| **MEDIUM** | ✗ No | Dead function, dead export |
| **LOW** | ✗ Info only | Framework hooks, dynamic access |

## Key Architecture

```
File Change Event
  ↓
extension.ts (event handler)
  ↓
WorkspaceAnalyzer.analyzeFile()
  ↓
[4 Analyzers] → CodeIssue[]
  ↓
DiagnosticProvider (show squiggles)
CodeActionsProvider (show quick fixes)
  ↓
VS Code UI
```

## Performance Tips

1. **Exclude heavy folders:** Add to `ignorePatterns`
2. **Disable unused analyzers:** Only enable what you need
3. **Use file analysis:** Single file < workspace analysis
4. **Check tsconfig.json:** ProjectManager reads it automatically

## Common Mistakes

❌ **Don't check `getLineStarts()`** — ts-morph doesn't have it
✅ Use `node.getStart()` and handle position math manually

❌ **Don't forget to import SyntaxKind** — needed for `getDescendantsOfKind()`
✅ `import { SyntaxKind } from 'ts-morph'`

❌ **Don't auto-fix MEDIUM certainty** — too risky
✅ Only auto-fix HIGH certainty issues

❌ **Don't flag exported symbols** — may be external APIs
✅ Skip exported functions, only flag internals

## Testing Patterns

```typescript
// Should flag
const unused = 5;
import { notUsed } from 'lib';

// Should NOT flag
import { used } from 'lib';
export function api() { return used; }
const x = 5; const y = x; // used variable
```

## Useful ts-morph APIs

```typescript
sourceFile.getFunctions()              // Top-level functions
sourceFile.getClasses()                // Classes
sourceFile.getVariableDeclarations()   // Variables
sourceFile.getImportDeclarations()     // Imports
sourceFile.getExportedDeclarations()   // Exports
sourceFile.getDescendantsOfKind(kind)  // All nodes of type

node.getText()                         // Source text
node.getStart()                        // Start offset
node.getEnd()                          // End offset
node.getStartLineNumber()              // 1-based line
node.getEndLineNumber()                // 1-based line
node.getParent()                       // Parent node
node.getChildren()                     // Child nodes
```

## FAQ

**Q: How do I add a new issue type?**
A: Extend `IssueType` enum in `models/types.ts`, create analyzer, add diagnostic mapping.

**Q: Can I ignore specific patterns?**
A: Yes, via `ignorePatterns` config. Per-file directives (// @codejanitor-ignore) coming soon.

**Q: How do I test changes locally?**
A: Run `pnpm run watch`, make changes, reload VS Code (`Ctrl+R`).

**Q: Why is X not being detected?**
A: Check certainty level (MEDIUM/LOW issues don't auto-fix). Check exclusion patterns. File a bug!

**Q: Is it safe to use in production?**
A: Yes—only HIGH certainty auto-fixes, all changes reversible. Test it first!

---

**Next Steps:**
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for deep dive
2. Read [README.md](./README.md) for user guide
3. Check [SESSION_SUMMARY.md](./SESSION_SUMMARY.md) for full context

Good luck! 🧹✨
