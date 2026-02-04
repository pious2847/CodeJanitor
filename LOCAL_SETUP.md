# CodeJanitor Enterprise - Local Testing Setup

This guide will help you set up and test CodeJanitor Enterprise locally.

## Prerequisites

- Node.js 18+ and npm
- VS Code 1.85.0 or higher
- Git (for testing Git integration features)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Compile TypeScript

```bash
npm run compile
```

### 3. Run Tests

```bash
npm test
```

### 4. Test in VS Code (Extension Mode)

Press `F5` in VS Code to launch the Extension Development Host with CodeJanitor loaded.

### 5. Test Enterprise API Server

```bash
npm run start:api
```

The API server will start at `http://localhost:3000`

## Testing Modes

### Mode 1: VS Code Extension Testing

1. Open this project in VS Code
2. Press `F5` to launch Extension Development Host
3. Open a TypeScript/JavaScript project in the new window
4. Use Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):
   - `CodeJanitor: Analyze Current File`
   - `CodeJanitor: Analyze Workspace`
   - `CodeJanitor: Show Enterprise Dashboard`
   - `CodeJanitor: Show Cleanup Report`

### Mode 2: Enterprise API Server Testing

1. Start the API server:
   ```bash
   npm run start:api
   ```

2. Test API endpoints:
   ```bash
   # Health check
   curl http://localhost:3000/api/v1/health
   
   # Get projects
   curl http://localhost:3000/api/v1/projects
   
   # Run analysis
   curl -X POST http://localhost:3000/api/v1/analysis/run \
     -H "Content-Type: application/json" \
     -d '{"projectId": "test-project", "path": "./src"}'
   ```

### Mode 3: Standalone Service Testing

Test individual services programmatically:

```bash
npm run test:services
```

### Mode 4: End-to-End Testing

Run complete workflow tests:

```bash
npm run test:e2e
```

## Configuration

### VS Code Extension Configuration

Edit `.vscode/settings.json` in your test project:

```json
{
  "codejanitor.enableUnusedImports": true,
  "codejanitor.enableUnusedVariables": true,
  "codejanitor.enableDeadFunctions": true,
  "codejanitor.enableCircularDependencies": true,
  "codejanitor.enableComplexityAnalysis": true,
  "codejanitor.enableSecurityAnalysis": true,
  "codejanitor.enableAccessibilityAnalysis": true,
  "codejanitor.autoFixOnSave": false,
  "codejanitor.ignorePatterns": [
    "**/node_modules/**",
    "**/dist/**"
  ]
}
```

### Enterprise API Configuration

Edit `config/local.json`:

```json
{
  "api": {
    "port": 3000,
    "host": "localhost",
    "version": "v1"
  },
  "database": {
    "type": "memory",
    "path": "./data/local.db"
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  },
  "authentication": {
    "enabled": false,
    "mode": "development"
  }
}
```

## Testing Scenarios

### Scenario 1: Basic Code Analysis

1. Create a test file with unused imports:
   ```typescript
   import { unused } from './module';
   import { used } from './other';
   
   console.log(used);
   ```

2. Run analysis and verify unused import is detected

### Scenario 2: Team Collaboration

1. Start the API server
2. Create a team via API
3. Assign quality issues to team members
4. Test discussion threads

### Scenario 3: CI/CD Integration

1. Configure a mock CI environment
2. Run analysis via CI integration
3. Test quality gate enforcement
4. Verify baseline regression detection

### Scenario 4: Policy Management

1. Create organizational policies
2. Test policy inheritance (org → team → project)
3. Create policy exceptions
4. Verify compliance reporting

### Scenario 5: Security Analysis

1. Create code with security vulnerabilities:
   ```typescript
   const apiKey = "hardcoded-secret-123";
   const query = `SELECT * FROM users WHERE id = ${userId}`;
   ```

2. Run security analysis
3. Verify vulnerabilities are detected

## Troubleshooting

### Extension Not Loading

- Check VS Code version (must be 1.85.0+)
- Run `npm run compile` to ensure TypeScript is compiled
- Check Output panel → CodeJanitor for errors

### API Server Not Starting

- Check if port 3000 is available
- Verify Node.js version (18+)
- Check logs in `logs/api-server.log`

### Tests Failing

- Run `npm run compile` first
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npx tsc --noEmit`

### Performance Issues

- Reduce concurrency in config
- Enable caching
- Use incremental analysis for large projects

## Development Workflow

### Watch Mode

Run TypeScript compiler in watch mode:

```bash
npm run watch
```

### Test Watch Mode

Run tests in watch mode:

```bash
npm run test:watch
```

### Debug Mode

1. Set breakpoints in VS Code
2. Press `F5` to start debugging
3. Extension runs in debug mode with breakpoints active

## Next Steps

After local testing:

1. Package the extension: `npm run package`
2. Install the `.vsix` file in VS Code
3. Test in production-like environment
4. Deploy API server to staging
5. Configure CI/CD pipelines

## Support

For issues or questions:
- Check `ARCHITECTURE.md` for system design
- Review `VALIDATION_SUMMARY.md` for feature status
- Check test files in `src/**/__tests__/` for examples
