# CodeJanitor Enterprise - Quick Start Guide

Get up and running with CodeJanitor Enterprise in 5 minutes!

## 🚀 Quick Setup (3 steps)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Compile TypeScript
```bash
npm run compile
```

### Step 3: Verify Setup
```bash
npm run verify
```

If all checks pass, you're ready to go! ✅

## 🎯 Testing Options

### Option 1: Test VS Code Extension (Recommended First)

1. **Open this project in VS Code**
2. **Press `F5`** to launch Extension Development Host
3. **A new VS Code window opens** with the sample project loaded
4. **Try these commands** (Ctrl+Shift+P / Cmd+Shift+P):
   - `CodeJanitor: Analyze Current File`
   - `CodeJanitor: Analyze Workspace`
   - `CodeJanitor: Show Enterprise Dashboard`

The sample project in `test-data/sample-project/` contains intentional code quality issues for testing.

### Option 2: Test API Server

```bash
npm run start:api
```

Server starts at `http://localhost:3000`

**Test the API:**
```bash
# Health check
curl http://localhost:3000/api/v1/health

# Get projects
curl http://localhost:3000/api/v1/projects
```

### Option 3: Test Services Directly

```bash
npm run test:services
```

This runs standalone tests for all enterprise services.

### Option 4: Run Full Test Suite

```bash
npm test
```

Runs all 293 unit and integration tests.

## 📁 What's Included

### Sample Test Project
Location: `test-data/sample-project/`

Contains TypeScript files with various code quality issues:
- ✗ Unused imports
- ✗ Unused variables
- ✗ Dead functions
- ✗ High complexity
- ✗ Security vulnerabilities (hardcoded secrets, SQL injection)
- ✗ Accessibility issues
- ✗ Code duplication
- ✗ Performance anti-patterns

### Configuration
- `config/local.json` - API server configuration
- `.vscode/launch.json` - Debug configurations
- `.vscode/tasks.json` - Build and test tasks

## 🎮 VS Code Extension Features to Test

### 1. Real-time Analysis
- Open any `.ts` or `.js` file
- Issues appear as diagnostics (squiggly lines)
- Hover over issues for details

### 2. Code Actions
- Click on an issue
- Look for the lightbulb 💡
- Apply quick fixes

### 3. Workspace Analysis
- Command: `CodeJanitor: Analyze Workspace`
- Analyzes all files in the project
- Shows summary of all issues

### 4. Enterprise Dashboard
- Command: `CodeJanitor: Show Enterprise Dashboard`
- View team metrics
- Track technical debt
- See quality trends

### 5. Export Reports
- Command: `CodeJanitor: Export Report`
- Generates JSON and HTML reports
- Saved to workspace root

## 🔧 Configuration Options

Edit settings in VS Code (File → Preferences → Settings → CodeJanitor):

```json
{
  "codejanitor.enableUnusedImports": true,
  "codejanitor.enableUnusedVariables": true,
  "codejanitor.enableDeadFunctions": true,
  "codejanitor.enableCircularDependencies": true,
  "codejanitor.enableComplexityAnalysis": true,
  "codejanitor.enableSecurityAnalysis": true,
  "codejanitor.enableAccessibilityAnalysis": true,
  "codejanitor.autoFixOnSave": false
}
```

## 🐛 Debugging

### Debug Extension
1. Set breakpoints in source code
2. Press `F5`
3. Extension runs in debug mode

### Debug API Server
1. Open Run and Debug panel (Ctrl+Shift+D)
2. Select "Debug API Server"
3. Press F5

### Debug Services
1. Open Run and Debug panel
2. Select "Debug Service Tests"
3. Press F5

## 📊 Expected Test Results

When you run the sample project analysis, you should see:

- **Unused Imports:** 2 detected (`unused1`, `unused2`)
- **Unused Variables:** 1 detected (`unusedVariable`)
- **Dead Functions:** 1 detected (`unusedFunction`)
- **Security Issues:** 3 detected (hardcoded secrets, SQL injection)
- **Complexity Issues:** 1 detected (`complexFunction`)
- **Code Duplication:** 2 similar functions detected

## 🎯 Next Steps

After testing locally:

1. **Customize Configuration** - Adjust settings for your needs
2. **Test on Real Projects** - Try on your actual codebase
3. **Explore Enterprise Features** - Test team collaboration, CI/CD integration
4. **Package Extension** - Run `npm run package` to create `.vsix` file
5. **Deploy API Server** - Deploy to your infrastructure

## 📚 More Information

- **Full Setup Guide:** See `LOCAL_SETUP.md`
- **Architecture:** See `ARCHITECTURE.md`
- **Validation Report:** See `.kiro/specs/codejanitor-enterprise/VALIDATION_SUMMARY.md`

## 🆘 Troubleshooting

### Extension doesn't load
```bash
# Recompile TypeScript
npm run compile

# Check for errors
npx tsc --noEmit
```

### API server won't start
```bash
# Check if port 3000 is available
# On Windows:
netstat -ano | findstr :3000

# Change port in config/local.json if needed
```

### Tests fail
```bash
# Clean and reinstall
rm -rf node_modules out
npm install
npm run compile
npm test
```

## ✅ Success Indicators

You'll know everything is working when:

- ✅ `npm run verify` passes all checks
- ✅ Extension loads in VS Code (F5)
- ✅ Sample project shows detected issues
- ✅ API server responds to health check
- ✅ All tests pass (`npm test`)

---

**Ready to start?** Run `npm run verify` and press `F5` in VS Code!
