# CodeJanitor Enterprise - Features Overview

## 🎯 What's New in Enterprise Edition

CodeJanitor has been transformed from a simple unused code detector into a comprehensive enterprise code quality platform. Here's what's been added:

## ✅ Core Analysis Features (Working Now)

### 1. **Real-time Code Analysis**
- **What it does:** Automatically analyzes TypeScript/JavaScript files as you type
- **How to see it:** Open any `.ts` or `.js` file - issues appear as squiggly lines
- **Where to check:** Problems panel (`Ctrl+Shift+M`)

### 2. **Unused Import Detection**
- **What it does:** Finds imports that are never used
- **How to fix:** Click lightbulb 💡 → "Remove unused import"
- **Example:** `import { unused } from './module'` ← Will be flagged

### 3. **Unused Variable Detection**
- **What it does:** Finds variables, parameters, and destructured items never used
- **How to fix:** Click lightbulb 💡 → "Remove unused variable"
- **Example:** `const temp = 42;` ← Flagged if never read

### 4. **Dead Function Detection**
- **What it does:** Finds functions that are never called
- **How to see it:** Appears in Problems panel
- **Example:** Private functions with no callers

### 5. **Dead Export Detection** (Optional)
- **What it does:** Finds exported symbols never imported anywhere
- **Enable:** Settings → `codejanitor.enableDeadExports`
- **Note:** Requires workspace-wide analysis

### 6. **Circular Dependency Detection** (Optional)
- **What it does:** Detects circular import chains
- **Enable:** Settings → `codejanitor.enableCircularDependencies`
- **Example:** A imports B, B imports C, C imports A

### 7. **Complexity Analysis** (Optional)
- **What it does:** Calculates cyclomatic complexity for functions
- **Enable:** Settings → `codejanitor.enableComplexityAnalysis`
- **Shows:** Functions with high complexity scores

### 8. **Security Vulnerability Detection** (Optional)
- **What it does:** Detects common security issues
- **Enable:** Settings → `codejanitor.enableSecurityAnalysis`
- **Detects:**
  - Hardcoded secrets and API keys
  - SQL injection vulnerabilities
  - XSS vulnerabilities
  - Insecure crypto usage

### 9. **Accessibility Checking** (Optional)
- **What it does:** Checks React/Vue components for WCAG compliance
- **Enable:** Settings → `codejanitor.enableAccessibilityAnalysis`
- **Detects:**
  - Missing alt text on images
  - Missing ARIA labels
  - Keyboard navigation issues

## 📊 Enterprise Features (Backend Ready)

These features are fully implemented on the backend but need UI integration:

### 10. **Team Workspace**
- Shared team configurations
- Task assignment and tracking
- Discussion threads on quality issues
- Progress monitoring

### 11. **Policy Engine**
- Hierarchical policies (organization → team → project)
- Custom rule definitions
- Policy exceptions management
- Compliance reporting

### 12. **Analytics Engine**
- Trend analysis over time
- Code quality metrics
- Technical debt quantification
- Industry benchmarking

### 13. **CI/CD Integration**
- GitHub Actions support
- Jenkins integration
- GitLab CI support
- Quality gate enforcement
- Automated deployment blocking

### 14. **Notification System**
- Email notifications
- Slack integration
- Microsoft Teams integration
- Mobile push notifications

### 15. **Baseline Management**
- Quality baseline establishment
- Regression detection
- Historical comparison
- Version tracking

### 16. **Machine Learning**
- Code smell pattern recognition
- Bug prediction
- Refactoring recommendations
- Anomaly detection

### 17. **Security & Compliance**
- Role-based access control (RBAC)
- SSO integration (SAML, OAuth)
- Audit logging
- Data encryption

### 18. **Mobile Support**
- Responsive dashboard
- Offline access
- Mobile exception approval
- Real-time collaboration

## 🎮 Available Commands

Access these from Command Palette (`Ctrl+Shift+P`):

| Command | What It Does | Status |
|---------|--------------|--------|
| `CodeJanitor: Analyze Current File` | Analyzes the active file | ✅ Working |
| `CodeJanitor: Analyze Workspace` | Analyzes all files in workspace | ✅ Working |
| `CodeJanitor: Show Cleanup Report` | Shows summary report | ⚠️ Placeholder |
| `CodeJanitor: Cleanup with Preview` | Preview changes before applying | ⚠️ Placeholder |
| `CodeJanitor: Show Enterprise Dashboard` | Opens enterprise dashboard | ✅ Working |
| `CodeJanitor: Export Report` | Exports JSON/HTML report | ✅ Working |

## 🔧 Configuration Options

Access via Settings (`Ctrl+,`) → Search "codejanitor":

| Setting | Default | Description |
|---------|---------|-------------|
| `enableUnusedImports` | ✅ | Detect unused imports |
| `enableUnusedVariables` | ✅ | Detect unused variables |
| `enableDeadFunctions` | ✅ | Detect dead functions |
| `enableDeadExports` | ❌ | Detect dead exports (workspace-wide) |
| `enableCircularDependencies` | ❌ | Detect circular imports |
| `enableComplexityAnalysis` | ❌ | Calculate complexity metrics |
| `enableSecurityAnalysis` | ❌ | Detect security vulnerabilities |
| `enableAccessibilityAnalysis` | ❌ | Check accessibility compliance |
| `autoFixOnSave` | ❌ | Auto-fix issues on save |
| `ignorePatterns` | `node_modules/**`, `dist/**` | Paths to exclude |
| `respectUnderscoreConvention` | ✅ | Ignore `_variable` naming |

## 📈 What You'll See

### In the Editor:
- **Squiggly lines** under issues (yellow for warnings, blue for hints)
- **Hover tooltips** with detailed explanations
- **Lightbulb icon** 💡 for quick fixes
- **Related information** for cross-file references

### In the Problems Panel (`Ctrl+Shift+M`):
- List of all detected issues
- Grouped by file
- Severity indicators
- Click to jump to issue

### Toast Notifications:
- "CodeJanitor analysis complete" after file analysis
- "X issues found in Y files" after workspace analysis
- Error messages if analysis fails

## 🎯 How to Use Each Feature

### Basic Usage (No Configuration Needed):
1. Open a TypeScript/JavaScript file
2. Issues appear automatically
3. Check Problems panel for full list
4. Click lightbulb for quick fixes

### Enable Advanced Features:
1. Open Settings (`Ctrl+,`)
2. Search "codejanitor"
3. Enable desired analyzers:
   - Security Analysis
   - Complexity Analysis
   - Circular Dependencies
   - Accessibility Analysis
4. Reload window or re-analyze file

### Workspace Analysis:
1. Command Palette → `CodeJanitor: Analyze Workspace`
2. Wait for progress notification
3. Check Problems panel for all issues
4. Issues grouped by file

### Export Reports:
1. Command Palette → `CodeJanitor: Export Report`
2. Report saved to workspace root
3. Formats: JSON and HTML
4. Open in browser to view

### Enterprise Dashboard:
1. Command Palette → `CodeJanitor: Show Enterprise Dashboard`
2. View team metrics
3. Track technical debt
4. See quality trends

## 🚀 REST API Server

The enterprise API server provides programmatic access:

### Start the Server:
```bash
npm run start:api
```

### Available Endpoints:
- `GET /api/v1/health` - Health check
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/teams` - List teams
- `POST /api/v1/analysis/run` - Run analysis
- `GET /api/v1/reports` - Get reports
- `GET /api/v1/policies` - List policies

### Test the API:
```bash
curl http://localhost:3000/api/v1/health
```

## 🎨 UI Status

### ✅ Working UI:
- Real-time diagnostics (squiggly lines)
- Problems panel integration
- Quick fixes (lightbulb)
- Hover tooltips
- Toast notifications
- Enterprise dashboard (webview)

### ⚠️ Needs Improvement:
- Report viewer (currently just exports files)
- Preview panel (placeholder UI)
- Mobile dashboard (backend ready, needs UI)
- Team workspace UI (backend ready, needs UI)

## 🔮 Roadmap

### Short Term (UI Improvements):
- [ ] Better report viewer with charts
- [ ] Interactive preview panel
- [ ] Team workspace UI
- [ ] Policy management UI
- [ ] Inline code actions menu

### Medium Term (Feature Enhancements):
- [ ] Real-time collaboration
- [ ] Mobile app
- [ ] IDE plugins (IntelliJ, WebStorm)
- [ ] More integrations (Jira, Azure DevOps)

### Long Term (Advanced Features):
- [ ] AI-powered refactoring suggestions
- [ ] Automated code fixes
- [ ] Custom analyzer plugins
- [ ] Industry benchmarking dashboard

## 💡 Tips

1. **Start Simple:** Enable only basic analyzers first
2. **Check Problems Panel:** Don't rely only on squiggly lines
3. **Use Workspace Analysis:** For cross-file issues
4. **Export Reports:** For team reviews
5. **Enable Security:** Catches hardcoded secrets
6. **Try Enterprise Dashboard:** See the full platform

## 🐛 Known Limitations

1. **Toast messages only:** Analysis results shown in toast, not detailed UI
2. **Report viewer:** Exports files but no built-in viewer
3. **Preview panel:** Placeholder UI, not fully functional
4. **Team features:** Backend ready but no UI yet
5. **Mobile dashboard:** Backend ready but no UI yet

## 📚 Documentation

- **QUICKSTART.md** - Get started in 5 minutes
- **TESTING_GUIDE.md** - How to test the extension
- **LOCAL_SETUP.md** - Comprehensive setup guide
- **ARCHITECTURE.md** - System architecture
- **VALIDATION_SUMMARY.md** - Feature validation report

---

**Summary:** CodeJanitor Enterprise has a powerful backend with 28 enterprise services, but the UI is still basic. The core analysis features work great, but enterprise features need UI integration.
