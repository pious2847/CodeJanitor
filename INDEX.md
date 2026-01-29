#!/# CodeJanitor — Project Overview

👋 Welcome to **CodeJanitor**!

This VS Code extension safely detects and cleans code waste (unused imports, dead code, etc.) using TypeScript semantic analysis.

---

## 📚 Documentation Guide

### For Users
- **[README.md](./README.md)** — Installation, features, examples, troubleshooting
- **[QUICK_REF.md](./QUICK_REF.md)** — Configuration, commands, keyboard shortcuts

### For Developers
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Complete technical guide
  - How analyzers work
  - Data flow & issue model
  - Extending CodeJanitor
  - Certainty levels explained
- **[SESSION_SUMMARY.md](./SESSION_SUMMARY.md)** — Project status & roadmap
  - What was built
  - Design decisions
  - Known limitations
  - Testing strategy

### Quick Links
- [Analyzer Reference](./ARCHITECTURE.md#analyzer-reference)
- [Configuration](./README.md#configuration)
- [Safety Guarantees](./README.md#safety)
- [Troubleshooting](./README.md#troubleshooting)

---

## 🚀 Getting Started

### Installation
```bash
pnpm install          # Install dependencies
pnpm run compile      # Build TypeScript
```

### Try It Out
1. Open folder in VS Code
2. Press `F5` to launch extension in debug mode
3. Open any `.ts` or `.js` file
4. CodeJanitor analyzes automatically
5. Red squiggles = code issues
6. Click lightbulb for quick fixes

### Common Commands
| Command | Keyboard |
|---------|----------|
| Build | `pnpm run compile` |
| Watch | `pnpm run watch` |
| Lint | `pnpm run lint` |
| Package | `pnpm run package` |

---

## 📊 Project Structure

```
src/
├── analyzer/
│   ├── base.ts                    # Core interfaces & ProjectManager
│   ├── workspaceAnalyzer.ts       # Orchestration & symbol resolution
│   ├── unusedImportsAnalyzer.ts   # 🟢 HIGH certainty
│   ├── unusedVariablesAnalyzer.ts # 🟢 HIGH certainty  
│   ├── deadFunctionsAnalyzer.ts   # 🟡 MEDIUM/HIGH certainty
│   └── deadExportsAnalyzer.ts     # 🟡 MEDIUM certainty
│
├── diagnostics/
│   └── provider.ts                # CodeIssue → VS Code Diagnostic
│
├── codeActions/
│   └── provider.ts                # Quick fixes for safe issues
│
├── models/
│   ├── types.ts                   # Core interfaces (CodeIssue, etc.)
│   └── index.ts                   # Barrel export
│
└── extension.ts                   # VS Code extension entry point
```

---

## 🎯 What It Does

### Detects & Fixes

✅ **Unused Imports** (HIGH certainty, auto-fixable)
```typescript
import axios from 'axios'; // ← Flagged, auto-fixed
```

✅ **Unused Variables** (HIGH certainty, auto-fixable)
```typescript
const unused = 5; // ← Flagged, auto-fixed
function f(param) { // ← Flagged if unused
  return 1;
}
```

✅ **Dead Functions** (MEDIUM certainty, review required)
```typescript
function never_called() { // ← Flagged for review
  return 42;
}
```

✅ **Dead Exports** (MEDIUM certainty, review required)
```typescript
export function never_imported() { // ← Flagged in workspace analysis
  return "unused";
}
```

### Smart Exclusions
- ✅ Exported symbols (may be external APIs)
- ✅ Lifecycle hooks (React, Vue, Angular)
- ✅ Event handlers (`onClick`, `on*`)
- ✅ Entry points (`main`, `activate`, etc.)
- ✅ Decorated methods (framework-managed)
- ✅ Underscore convention (`_var` is intentional)

---

## 🔧 Configuration

Press `Ctrl+,` and search "codejanitor", or edit `.vscode/settings.json`:

```json
{
  "codejanitor.enableUnusedImports": true,
  "codejanitor.enableUnusedVariables": true,
  "codejanitor.enableDeadFunctions": true,
  "codejanitor.enableDeadExports": false,
  "codejanitor.autoFixOnSave": false,
  "codejanitor.ignorePatterns": [
    "**/node_modules/**",
    "**/dist/**"
  ],
  "codejanitor.respectUnderscoreConvention": true
}
```

---

## 🛡️ Safety Guarantees

✅ **Never breaks code**
- Only HIGH certainty issues auto-fixed
- MEDIUM/LOW issues view-only
- All changes reversible (`Ctrl+Z`)

✅ **Framework-aware**
- Lifecycle hooks excluded
- Decorators skipped
- Common patterns recognized

✅ **Precise analysis**
- Uses TypeScript Compiler API (semantic, not regex)
- Understands scoping, shadowing, re-exports
- Symbol-based detection

---

## 📖 How to Use

### For End Users
1. Install extension
2. Open TypeScript/JavaScript file
3. See red squiggles for issues
4. Click lightbulb for suggestions
5. Auto-fix HIGH certainty issues or review MEDIUM certainty ones

### For Developers
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Create new analyzer (extend `IAnalyzer`)
3. Add config flag to `AnalyzerConfig`
4. Test with sample files
5. Submit PR

---

## 🧪 Testing

### Manual Testing
```bash
# Terminal 1: Watch for changes
pnpm run watch

# Terminal 2: F5 in VS Code to launch extension
# Then open test files to see squiggles
```

### Test Files
```typescript
// test-unused.ts
import unused from 'lib';  // Should flag
const x = 5;               // Should flag
```

### Verification
- Squiggles appear ✓
- Quick fixes work ✓
- Changes reversible (Ctrl+Z) ✓

---

## 🎓 Learning Path

1. **Start here:** [README.md](./README.md) — Feature overview
2. **Then:** [QUICK_REF.md](./QUICK_REF.md) — Commands & config
3. **Deep dive:** [ARCHITECTURE.md](./ARCHITECTURE.md) — Technical details
4. **Reference:** [SESSION_SUMMARY.md](./SESSION_SUMMARY.md) — Complete status

---

## 🚦 Status

| Component | Status | Notes |
|-----------|--------|-------|
| Unused Imports Analyzer | ✅ Complete | HIGH certainty, auto-fixable |
| Unused Variables Analyzer | ✅ Complete | HIGH certainty, auto-fixable |
| Dead Functions Analyzer | ✅ Complete | MEDIUM certainty, review needed |
| Dead Exports Analyzer | ✅ Complete | MEDIUM certainty, workspace scoped |
| VS Code Integration | ✅ Complete | Diagnostics, code actions, commands |
| TypeScript Build | ✅ Complete | Clean compilation |
| Documentation | ✅ Complete | User & developer guides |
| Tests | 🔄 Coming | Unit tests in progress |
| Report UI | 🔄 Coming | Dashboard coming soon |

---

## 🤝 Contributing

### Add a New Detector
1. Create `src/analyzer/myDetector.ts` implementing `IAnalyzer`
2. Add to `WorkspaceAnalyzer.analyzers`
3. Add config flag to `AnalyzerConfig`
4. Test thoroughly
5. Update documentation

### File a Bug
Open an issue with:
- Example code
- Expected vs actual behavior
- Environment (VS Code version, OS)

### Suggest a Feature
Open a discussion with:
- Use case
- Proposed detection logic
- Impact on existing features

---

## 📞 Support

- 📖 **Documentation:** See links above
- 🐛 **Bug reports:** GitHub Issues
- 💬 **Questions:** GitHub Discussions
- 📧 **Email:** (TBD)

---

## 📝 License

TBD

---

## 🎉 Quick Links

| Want to... | Go to... |
|-----------|----------|
| Install & use | [README.md](./README.md) |
| Configure settings | [QUICK_REF.md](./QUICK_REF.md) |
| Understand architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| See project status | [SESSION_SUMMARY.md](./SESSION_SUMMARY.md) |
| Write code | [ARCHITECTURE.md#extending-codejanitor](./ARCHITECTURE.md#extending-codejanitor) |

---

## ✨ Philosophy

**CodeJanitor is built on three pillars:**

1. 🛡️ **Safety** — Never deletes code you care about
2. 🤝 **Trust** — Explains every suggestion clearly
3. 🚀 **Simplicity** — Works out of the box, customizable

> "Code cleanup should feel safe and trustworthy, not scary."

---

**Happy coding!** 🧹✨

Let CodeJanitor keep your codebase clean while you focus on what matters.
