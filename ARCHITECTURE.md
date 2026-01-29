#!/# CodeJanitor: Architecture & Developer Guide

## Overview

CodeJanitor is a VS Code extension that safely detects and suggests cleanup of code waste in TypeScript/JavaScript projects. It uses the TypeScript Compiler API (via ts-morph) for precise, symbol-based analysis.

**Key Principles:**
- ✅ Safety first — never breaks code
- ✅ High confidence only — no risky auto-fixes
- ✅ Workspace-aware — understands cross-file references
- ✅ Explainable — every finding includes reason & context

## Architecture

### Core Layers

```
extension.ts (VS Code entry point)
    ↓
WorkspaceAnalyzer (orchestration & symbol resolution)
    ↓
[Analyzers]
  ├── UnusedImportsAnalyzer (HIGH certainty)
  ├── UnusedVariablesAnalyzer (HIGH certainty)
  ├── DeadFunctionsAnalyzer (MEDIUM/HIGH certainty)
  └── DeadExportsAnalyzer (MEDIUM certainty)
    ↓
CodeIssue objects (unified issue model)
    ↓
[VS Code Integration]
  ├── DiagnosticProvider (visual indicators)
  ├── CodeActionsProvider (quick fixes)
  └── Commands (analyze, report, cleanup)
```

### Data Flow

```
1. File Open/Change Event
   ↓
2. extension.ts → onDocumentOpen() / onDocumentChange()
   ↓
3. WorkspaceAnalyzer.analyzeFile(sourceFile, config)
   ↓
4. Each enabled analyzer runs: analyzer.analyzeFile(sourceFile, config)
   ↓
5. Returns CodeIssue[] with:
   - id, type, certainty, reason
   - locations (file, line, column)
   - safeFixAvailable flag
   ↓
6. DiagnosticProvider converts to VS Code Diagnostics
   ↓
7. CodeActionsProvider offers safe auto-fixes
   ↓
8. User sees squiggles + code actions in editor
```

---

## Analyzer Reference

### 1. UnusedImportsAnalyzer

**Certainty:** HIGH  
**Auto-fix:** YES (safe removal)  
**Scope:** File-scoped

Detects:
- Named imports never used (`import { foo }`)
- Default imports never used (`import foo`)
- Namespace imports never used (`import * as foo`)

Excludes:
- Side-effect imports (`import 'style.css'`)
- Type-only imports (often used by TS for declarations)

**Example:**
```typescript
// ❌ Flagged
import { unused } from './utils';
import axios from 'axios'; // not used

export function doSomething() {
  console.log('hello');
}

// ✅ Fixed
export function doSomething() {
  console.log('hello');
}
```

---

### 2. UnusedVariablesAnalyzer

**Certainty:** HIGH  
**Auto-fix:** YES (safe removal)  
**Scope:** Function/block scoped

Detects:
- Variable declarations never read (`let x = 1;`)
- Function parameters never used
- Destructured variables never used
- Catch clause parameters never used
- Loop variables never used

Special Handling:
- Respects underscore convention (`_param` is ignored by default)
- Excludes rest parameters (`...args` often intentionally unused)
- Handles complex scoping correctly

**Example:**
```typescript
// ❌ Flagged
function process(data, unused) {
  const result = compute(data);
  const debug = true;  // never read
  return result;
}

// ✅ Fixed
function process(data, _unused) {  // or remove param
  const result = compute(data);
  return result;
}

// ✅ Also OK
function process(data, _unused) {  // convention-based ignore
  const result = compute(data);
  return result;
}
```

---

### 3. DeadFunctionsAnalyzer

**Certainty:** MEDIUM (file-scoped) → HIGH (workspace-scoped)  
**Auto-fix:** NO (requires review)  
**Scope:** File-scoped with optional workspace context

Detects:
- Function declarations never called
- Class methods never called
- Static methods never referenced

Excludes (automatically skipped):
- Exported functions (may be used externally)
- Lifecycle hooks (React: `render`, `componentDidMount`, etc.)
- Event handlers (`onClick`, `onSubmit`, etc.)
- Entry points (`main`, `activate`, `handler`, etc.)
- Decorated methods (framework-managed)

**Certainty Levels:**
- **MEDIUM:** File-scoped only — function might be used in other files
- **HIGH:** Workspace-scoped with `externalReferenceChecker` — truly dead

**Example:**
```typescript
// ❌ Flagged (MEDIUM certainty in file view)
function unusedHelper() {
  return 42;
}

export function used() {
  return 1;
}

// ✅ Not flagged (exported)
export function mayBeUsedExternally() {
  return true;
}

// ✅ Not flagged (lifecycle hook)
componentDidMount() {
  this.loadData();
}

// ✅ Not flagged (event handler)
handleClick(e) {
  console.log('clicked');
}
```

---

### 4. DeadExportsAnalyzer

**Certainty:** MEDIUM  
**Auto-fix:** NO (intentional APIs)  
**Scope:** Workspace-scoped

Detects:
- Exported symbols never imported anywhere in the workspace

Excludes:
- Entry point files (`index.ts`, `main.ts`, etc.)
- Package API files (may be consumed externally)

**Example:**
```typescript
// myUtils.ts
// ❌ Flagged (exported but never imported)
export function internalHelper() {
  return true;
}

// ✅ Not flagged (imported in another file)
export function used() {
  return false;
}

// ✅ Not flagged (entry point file — skipped)
// index.ts
export * from './utils';
```

---

## Certainty Levels

### HIGH
✅ **Safe to auto-fix**  
Examples: unused imports, declared-but-never-read variables

Rules:
- File-scoped or workspace-scoped analysis with high confidence
- No framework ambiguity
- Clear semantic proof of non-usage

### MEDIUM
⚠️ **Review recommended, NO auto-fix**  
Examples: dead functions (file-scoped), dead exports

Rules:
- Potential external references outside workspace
- Framework patterns reduce but don't eliminate certainty
- Require manual review before deletion

### LOW
❌ **Never auto-fix, info-only**  
Examples: potential framework hooks, dynamic access, reflection

Rules:
- Cannot reliably prove usage/non-usage
- Too much developer intent variance
- Only shown as informational

---

## Configuration

Edit `.vscode/settings.json` or VS Code settings UI:

```json
{
  "codejanitor.enableUnusedImports": true,
  "codejanitor.enableUnusedVariables": true,
  "codejanitor.enableDeadFunctions": true,
  "codejanitor.enableDeadExports": false,
  "codejanitor.enableMissingImplementations": false,
  "codejanitor.autoFixOnSave": false,
  "codejanitor.ignorePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.d.ts"
  ],
  "codejanitor.respectUnderscoreConvention": true
}
```

**Settings:**

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enableUnusedImports` | bool | true | Detect unused imports |
| `enableUnusedVariables` | bool | true | Detect unused variables |
| `enableDeadFunctions` | bool | true | Detect dead functions |
| `enableDeadExports` | bool | false | Detect dead exports (workspace-wide) |
| `enableMissingImplementations` | bool | false | Detect missing implementations (future) |
| `autoFixOnSave` | bool | false | Auto-apply HIGH certainty fixes on save |
| `ignorePatterns` | array | [...] | Paths to exclude from analysis |
| `respectUnderscoreConvention` | bool | true | Ignore `_var` naming convention |

---

## Commands

Via Command Palette (`Ctrl+Shift+P`):

### `CodeJanitor: Analyze Current File`
Analyze the active editor file and show results.

### `CodeJanitor: Analyze Workspace`
Full workspace analysis (can be slow on large projects).

### `CodeJanitor: Show Cleanup Report`
Open a report panel with all findings (coming soon).

### `CodeJanitor: Cleanup with Preview`
Run a dry-run and show what would be changed (coming soon).

---

## Usage Examples

### Example 1: Unused Variable

**File:** `src/utils.ts`
```typescript
export function process(data) {
  const unused = "never read";  // ← Red squiggle
  return data.map(x => x * 2);
}
```

**Diagnostic shown:**
> Variable 'unused' is declared but never used (HIGH certainty)
> Suggestion: Remove unused variable 'unused'

**Quick fix:** Click "Remove unused variable 'unused'" → Code is fixed

---

### Example 2: Dead Function

**File:** `src/helpers.ts`
```typescript
function helper() {  // ← Appears in problems panel (MEDIUM certainty)
  return 42;
}

export function used() {
  return true;
}
```

**Diagnostic shown:**
> Function 'helper' appears to be unused (no references found in this file) (MEDIUM certainty)
> Note: This analysis is file-scoped. The function might be referenced in other files.

**Action:** Manual review required (not auto-fixed)

---

### Example 3: Dead Export

**File:** `src/old-api.ts`
```typescript
// ❌ MEDIUM certainty
export function legacyAPI() {  
  return "old";
}

// ✅ Not flagged (imported elsewhere)
export function newAPI() {
  return "new";
}
```

**Workspace analysis shows:** `legacyAPI` is exported but never imported anywhere.

---

## Code Object Model

Every issue is represented as a `CodeIssue`:

```typescript
interface CodeIssue {
  id: string;                           // "dead-function:path:symbol:line"
  type: IssueType;                      // e.g. "unused-import"
  certainty: "high" | "medium" | "low"; // Safety level
  reason: string;                       // "Function 'foo' is unused..."
  locations: SourceLocation[];          // File, line, column, source text
  safeFixAvailable: boolean;            // Can this be auto-fixed?
  symbolName: string;                   // "foo", "unused", etc.
  explanation?: string;                 // Detailed "why"
  suggestedFix?: string;                // How to fix it
  tags?: string[];                      // ["function", "requires-review"]
}

interface SourceLocation {
  filePath: string;
  startLine: number;     // 1-based
  startColumn: number;   // 1-based
  endLine: number;
  endColumn: number;
  sourceText?: string;
}
```

---

## Extending CodeJanitor

### Adding a New Analyzer

1. **Create analyzer file:** `src/analyzer/myAnalyzer.ts`

```typescript
import { SourceFile } from 'ts-morph';
import { IAnalyzer } from './base';
import { CodeIssue, AnalyzerConfig } from '../models';

export class MyAnalyzer implements IAnalyzer {
  readonly name = 'my-analysis';

  isEnabled(config: AnalyzerConfig): boolean {
    return config.enableMyAnalysis;  // Add to AnalyzerConfig interface
  }

  analyzeFile(sourceFile: SourceFile, config: AnalyzerConfig): CodeIssue[] {
    const issues: CodeIssue[] = [];
    // Your analysis logic here
    return issues;
  }
}
```

2. **Add to WorkspaceAnalyzer:**

```typescript
this.analyzers = [
  new UnusedImportsAnalyzer(),
  new UnusedVariablesAnalyzer(),
  new DeadFunctionsAnalyzer(),
  new MyAnalyzer(),  // ← Add here
];
```

3. **Add config option:** Update `AnalyzerConfig` interface in `models/types.ts`

---

## Safety Guarantees

CodeJanitor provides these guarantees:

### ✅ Never Auto-Delete Without High Certainty
- Only HIGH certainty issues are auto-fixed
- MEDIUM/LOW issues are view-only

### ✅ All Changes Are Reversible
- Code actions are applied via VS Code's edit API
- User can Undo (`Ctrl+Z`) any change

### ✅ No False Positives for Imports
- Import analysis uses precise symbol resolution
- Not regex-based string matching

### ✅ Respects TypeScript Semantics
- Uses TypeScript Compiler API for accurate scoping
- Understands type-only imports, ambient declarations, etc.

### ✅ Workspace Aware
- Can track references across files (when enabled)
- Understands re-exports and barrel files

---

## Known Limitations

1. **Dead functions (file-scoped):**
   - Cannot detect cross-file references by default
   - Run workspace analysis for higher certainty
   - Dynamic calls (`obj['methodName']()`) may not be detected

2. **Class methods:**
   - Cannot track indirect calls via inheritance
   - Assumes public methods may be used externally if exported

3. **Decorators:**
   - Methods with decorators are skipped (framework-managed)
   - Future: smarter decorator analysis

4. **Large workspaces:**
   - Workspace analysis can be slow
   - Consider excluding `node_modules`, `dist` via `ignorePatterns`

---

## Performance Tips

- **Exclude heavy folders:** Set `ignorePatterns` to skip `node_modules`, `dist`, etc.
- **Disable unnecessary analyzers:** Only enable what you need
- **Use file analysis:** Single-file analysis is faster than workspace-wide
- **Respect `tsconfig.json`:** ProjectManager uses `tsconfig.json` for optimal setup

---

## Debugging

**Enable debug logging:**

In `.vscode/settings.json`:
```json
{
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

Check Debug Console (`Ctrl+Shift+Y`) for `CodeJanitor:` logs.

---

## Contributing

### Project Structure

```
src/
  analyzer/
    base.ts                        # IAnalyzer interface & ProjectManager
    workspaceAnalyzer.ts           # Orchestration & symbol resolution
    unusedImportsAnalyzer.ts       # HIGH certainty
    unusedVariablesAnalyzer.ts     # HIGH certainty
    deadFunctionsAnalyzer.ts       # MEDIUM/HIGH certainty
    deadExportsAnalyzer.ts         # MEDIUM certainty
  diagnostics/
    provider.ts                    # CodeIssue → VS Code Diagnostic
  codeActions/
    provider.ts                    # Quick fixes & code actions
  models/
    types.ts                       # Core interfaces
    index.ts                       # Barrel export
  extension.ts                     # VS Code entry point
```

### Testing

```bash
# Build
npm run compile

# Watch mode
npm run watch

# Run tests (coming soon)
npm run test
```

---

## Roadmap

- [ ] Missing function implementations detection
- [ ] Cleanup report panel UI
- [ ] Dry-run/preview mode
- [ ] Git-aware cleanup (avoid uncommitted files)
- [ ] Configuration per-file (`.codejanitor.json`)
- [ ] Custom ignore directives (`// @codejanitor-ignore`)
- [ ] Performance optimizations for large workspaces

---

## FAQ

**Q: Will CodeJanitor delete my exported APIs?**  
A: No. Exported functions are never flagged by `DeadFunctionsAnalyzer`. Only `DeadExportsAnalyzer` (with MEDIUM certainty) checks exports, and it never auto-fixes.

**Q: Can I undo changes?**  
A: Yes. All code actions use VS Code's Undo (`Ctrl+Z`).

**Q: Does it work with JavaScript?**  
A: Yes. TypeScript analysis works on `.js` files too (via ts-morph's allowJs option).

**Q: What about frameworks (React, Vue, Angular)?**  
A: Lifecycle hooks, decorators, and common patterns are excluded. If you find false positives, let us know!

**Q: Can I disable checks per-file?**  
A: Soon — we're adding `// @codejanitor-ignore` directives.

---

## License

TBD

---

**CodeJanitor Team**  
Built with safety and trust at its core. 🧹✨
