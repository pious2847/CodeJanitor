#!/# CodeJanitor

🧹 **Safely detect and clean code waste in TypeScript/JavaScript projects.**

CodeJanitor is a VS Code extension that finds unused imports, dead code, and other code waste with high confidence and **never breaks your code**.

## Features

- ✅ **Unused Imports Detection** — Safe auto-fix available
- ✅ **Unused Variables** — Parameters, locals, destructured variables
- ✅ **Dead Functions** — Functions never called (file or workspace scoped)
- ✅ **Dead Exports** — Exported symbols never imported
- ✅ **Zero False Positives** — Smart exclusion of framework patterns
- ✅ **Fully Reversible** — All changes can be undone
- ✅ **Symbol-Based** — Not regex heuristics, real TypeScript analysis

## Quick Start

### Installation

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "CodeJanitor"
4. Click Install

### Usage

1. Open any TypeScript or JavaScript file
2. CodeJanitor automatically analyzes it
3. Red squiggles = issues found
4. Click "Quick Fix" (lightbulb) for suggestions
5. Or run `CodeJanitor: Analyze Workspace` from Command Palette

## Examples

### Before & After

**Unused Import:**
```typescript
import axios from 'axios';  // ← Flagged (never used)
import { parse } from 'url';  // ← Used ✓

export function getHost(url) {
  return parse(url).hostname;
}
```

→ Quick fix removes unused import

**Unused Variable:**
```typescript
function process(data, _config) {  // ← _config flagged (unused)
  const temp = 42;                 // ← temp flagged (never read)
  return data.map(x => x * 2);
}
```

→ Quick fix removes both

**Dead Function:**
```typescript
function helper() {     // ← Flagged (never called)
  return "internal";
}

export function main() {
  return true;
}
```

→ Shown in diagnostics (no auto-fix, requires review)

## Safety

CodeJanitor is **designed to never break your code:**

- 🔒 **HIGH certainty only** — Auto-fixes only for safe cases
- 🔒 **Respects exports** — Won't delete exported APIs
- 🔒 **Framework aware** — Excludes lifecycle hooks, decorators, etc.
- 🔒 **Reversible** — All changes can be undone with `Ctrl+Z`

## Configuration

Press `Ctrl+,` and search "codejanitor":

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Unused Imports | ✓ | Detect unused imports |
| Enable Unused Variables | ✓ | Detect unused variables |
| Enable Dead Functions | ✓ | Detect dead functions |
| Enable Dead Exports | ✗ | Detect dead exports (workspace-wide) |
| Auto Fix on Save | ✗ | Automatically fix HIGH certainty issues |
| Ignore Patterns | `node_modules/**`, `dist/**` | Paths to exclude |
| Respect Underscore | ✓ | Ignore `_var` naming convention |

## Commands

| Command | Keyboard | Description |
|---------|----------|-------------|
| Analyze Current File | — | Analyze active file |
| Analyze Workspace | — | Full workspace analysis |
| Show Cleanup Report | — | View summary report |

_Available in Command Palette (`Ctrl+Shift+P`)_

## Performance

- **File analysis:** < 100ms
- **Workspace analysis:** 2-10s (depends on project size)

Exclude heavy folders via `ignorePatterns` for faster analysis.

## Limitations

- **Cross-file references:** Not detected by default (enable workspace analysis)
- **Dynamic calls:** Cannot analyze `obj['methodName']()`
- **Decorators:** Framework-decorated methods are excluded

## Troubleshooting

**Issue: False positives on framework hooks**
→ These should be auto-excluded. File a bug!

**Issue: Dead function not detected**
→ Maybe it's exported or called dynamically. Run workspace analysis.

**Issue: Analysis is slow**
→ Add `node_modules/**` and `dist/**` to `ignorePatterns`.

## Next Steps

- 📖 Read the [Architecture Guide](./ARCHITECTURE.md) for details
- 🐛 Report issues on GitHub
- 💬 Discuss features in Discussions

## License

TBD

---

**Made with ❤️ for code quality and developer trust.**

*CodeJanitor never deletes code you care about. Only use it if you trust it.*
