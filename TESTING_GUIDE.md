# CodeJanitor Extension Testing Guide

## ⚠️ About the Warnings

When you press F5, you may see these warnings in the output:
```
(node:27116) [DEP0040] DeprecationWarning: The `punycode` module is deprecated
(node:27116) ExperimentalWarning: SQLite is an experimental feature
```

**These are normal and can be ignored.** They come from VS Code itself and don't affect CodeJanitor's functionality.

## ✅ How to Test the Extension

### Step 1: Start the Extension

1. **Make sure TypeScript is compiled:**
   ```bash
   npm run compile
   ```

2. **Press F5** in VS Code (or select "Run Extension" from Run and Debug panel)

3. **A new VS Code window opens** - This is the Extension Development Host

4. **The sample project should load automatically** from `test-data/sample-project/`

### Step 2: Verify Extension is Loaded

In the new window, check the Output panel:

1. Open **View → Output** (or `Ctrl+Shift+U`)
2. Select **"CodeJanitor"** from the dropdown
3. You should see:
   ```
   CodeJanitor extension activated
   CodeJanitor workspace root: C:\...\test-data\sample-project
   CodeJanitor workspace initialized with tsconfig.json
   ```

### Step 3: Test Code Analysis

#### Option A: Analyze Current File

1. In the Extension Development Host window, open:
   ```
   test-data/sample-project/src/example.ts
   ```

2. You should see **red squiggly lines** under:
   - Line 5: `unused1, unused2` (unused imports)
   - Line 6: `fs` (unused import)
   - Line 11: `unusedVariable` (unused variable)
   - Line 14: `unusedFunction` (unused function)
   - Line 48: `API_KEY` (hardcoded secret)
   - Line 49: `PASSWORD` (hardcoded secret)

3. **Hover over any squiggly line** to see the issue details

4. **Click the lightbulb** 💡 to see quick fixes

#### Option B: Use Command Palette

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)

2. Type and select:
   - `CodeJanitor: Analyze Current File`
   - `CodeJanitor: Analyze Workspace`
   - `CodeJanitor: Show Enterprise Dashboard`

### Step 4: Check Problems Panel

1. Open **View → Problems** (or `Ctrl+Shift+M`)

2. You should see all detected issues listed:
   - Unused imports
   - Unused variables
   - Dead functions
   - Security issues (if security analysis is enabled)

### Step 5: Test Quick Fixes

1. Click on a line with an unused import

2. Click the **lightbulb** 💡 icon (or press `Ctrl+.`)

3. Select **"Remove unused import"**

4. The import should be removed

5. Press `Ctrl+Z` to undo if needed

## 🎯 Expected Results

### In example.ts, you should see:

| Line | Issue | Type |
|------|-------|------|
| 5 | `unused1, unused2` | Unused imports |
| 6 | `fs` | Unused import |
| 11 | `unusedVariable` | Unused variable |
| 14 | `unusedFunction` | Dead function |
| 48 | `API_KEY` | Hardcoded secret (if security enabled) |
| 49 | `PASSWORD` | Hardcoded secret (if security enabled) |
| 54 | SQL injection | Security vulnerability (if security enabled) |

### Total Issues Expected:
- **Minimum:** 4 issues (unused imports, variable, function)
- **With Security Enabled:** 7+ issues

## 🔧 Enable More Analyzers

To see security issues and other advanced features:

1. In the Extension Development Host, open **Settings** (`Ctrl+,`)

2. Search for **"codejanitor"**

3. Enable:
   - ✅ `Enable Security Analysis`
   - ✅ `Enable Complexity Analysis`
   - ✅ `Enable Circular Dependencies`
   - ✅ `Enable Accessibility Analysis`

4. Reload the window or re-analyze the file

## 🐛 Troubleshooting

### Extension Not Loading

**Check the Output panel:**
1. View → Output
2. Select "CodeJanitor" from dropdown
3. Look for error messages

**Common fixes:**
```bash
# Recompile TypeScript
npm run compile

# Check for compilation errors
npx tsc --noEmit

# Restart VS Code and try again
```

### No Issues Detected

**Possible causes:**

1. **File not in workspace:**
   - Make sure you opened the `test-data/sample-project` folder
   - Not just individual files

2. **TypeScript not compiled:**
   ```bash
   npm run compile
   ```

3. **Extension not activated:**
   - Check Output panel for "CodeJanitor extension activated"
   - Try opening a `.ts` or `.js` file

4. **Analyzers disabled:**
   - Check settings: `Ctrl+,` → search "codejanitor"
   - Enable the analyzers you want to test

### Issues Not Showing in Problems Panel

1. **Check diagnostics are enabled:**
   - Look for squiggly lines in the editor
   - If you see them, diagnostics are working

2. **Refresh the Problems panel:**
   - Close and reopen: View → Problems

3. **Re-analyze the file:**
   - Command Palette → `CodeJanitor: Analyze Current File`

## 📊 Testing Checklist

- [ ] Extension loads without errors
- [ ] Output shows "CodeJanitor extension activated"
- [ ] Opening example.ts shows squiggly lines
- [ ] Hovering shows issue details
- [ ] Problems panel lists all issues
- [ ] Quick fixes work (lightbulb icon)
- [ ] Commands work from Command Palette
- [ ] Workspace analysis works
- [ ] Settings can be changed
- [ ] Changes take effect after reload

## 🎉 Success Indicators

You'll know everything is working when:

✅ Extension activates without errors  
✅ Squiggly lines appear under issues  
✅ Hover shows detailed issue information  
✅ Problems panel lists all detected issues  
✅ Quick fixes are available (lightbulb)  
✅ Commands work from Command Palette  

## 📝 Notes

- **Deprecation warnings are normal** - They come from VS Code, not CodeJanitor
- **First analysis may be slow** - Subsequent analyses are cached
- **Changes require reload** - After changing settings, reload the window
- **Undo works** - All fixes can be undone with `Ctrl+Z`

## 🚀 Next Steps

Once basic testing works:

1. **Test on your own projects** - Open a real TypeScript/JavaScript project
2. **Try different analyzers** - Enable security, complexity, etc.
3. **Test workspace analysis** - Analyze entire projects
4. **Explore enterprise features** - Try the dashboard and reports

---

**Need help?** Check the Output panel (View → Output → CodeJanitor) for detailed logs.
