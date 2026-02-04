# CodeJanitor Enterprise

🧹 **Enterprise-grade code quality platform for TypeScript/JavaScript projects.**

CodeJanitor Enterprise transforms code quality management with advanced analysis, team collaboration, and organizational policy enforcement. Built on the foundation of safe, accurate code waste detection, it scales to support enterprise development teams.

## 🌟 Features

### Core Analysis
- ✅ **Unused Imports Detection** — Safe auto-fix available
- ✅ **Unused Variables** — Parameters, locals, destructured variables
- ✅ **Dead Functions** — Functions never called (file or workspace scoped)
- ✅ **Dead Exports** — Exported symbols never imported
- ✅ **Circular Dependencies** — Detect and suggest fixes for circular imports
- ✅ **Complexity Analysis** — Cyclomatic and cognitive complexity metrics
- ✅ **Security Scanning** — Detect vulnerabilities, hardcoded secrets, SQL injection
- ✅ **Accessibility Checking** — WCAG compliance for React/Vue components

### Enterprise Features
- 🏢 **Team Collaboration** — Shared workspaces, task assignment, discussions
- 📊 **Advanced Analytics** — Trend analysis, ML-powered insights, industry benchmarking
- 📋 **Policy Management** — Hierarchical policies (org → team → project)
- 🔄 **CI/CD Integration** — GitHub Actions, Jenkins, GitLab CI support
- 📈 **Quality Gates** — Automated deployment blocking on quality thresholds
- 🔔 **Multi-channel Notifications** — Email, Slack, Teams, mobile push
- 🔐 **Enterprise Security** — RBAC, SSO, audit logging, data encryption
- 📱 **Mobile Support** — Responsive dashboard, offline access, mobile approvals

## 🚀 Quick Start

### For VS Code Extension

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Compile TypeScript**
   ```bash
   npm run compile
   ```

3. **Launch Extension**
   - Press `F5` in VS Code
   - Extension Development Host opens with sample project
   - Try commands from Command Palette (`Ctrl+Shift+P`):
     - `CodeJanitor: Analyze Current File`
     - `CodeJanitor: Analyze Workspace`
     - `CodeJanitor: Show Enterprise Dashboard`

### For API Server

1. **Start the Server**
   ```bash
   npm run start:api
   ```

2. **Test Endpoints**
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

### Verify Setup

```bash
npm run verify
```

All checks should pass ✅

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** — Get started in 5 minutes
- **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** — Comprehensive setup guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System architecture and design
- **[TESTING_COMPLETE.md](./TESTING_COMPLETE.md)** — Testing status and scenarios
- **[VALIDATION_SUMMARY.md](./.kiro/specs/codejanitor-enterprise/VALIDATION_SUMMARY.md)** — Feature validation report

## 🧪 Testing

### Run All Tests
```bash
npm test
```
**Result:** 293 tests passing ✅

### Test Services
```bash
npm run test:services
```

### Test in VS Code
Press `F5` to launch Extension Development Host

## 📦 What's Included

### Sample Test Project
Location: `test-data/sample-project/`

Contains intentional code quality issues:
- Unused imports and variables
- Dead functions
- Security vulnerabilities
- High complexity code
- Accessibility issues
- Code duplication

### Configuration
- `config/local.json` — API server configuration
- `.vscode/launch.json` — Debug configurations
- `.vscode/tasks.json` — Build and test tasks

## 🎯 Use Cases

### For Individual Developers
- Real-time code quality feedback
- Safe automated cleanup
- Quick fixes for common issues

### For Development Teams
- Shared quality standards
- Task assignment and tracking
- Team progress monitoring

### For Engineering Managers
- Quality metrics dashboard
- Technical debt tracking
- Team comparison analytics

### For DevOps Engineers
- CI/CD pipeline integration
- Quality gate enforcement
- Automated reporting

## 🏗️ Architecture

CodeJanitor Enterprise consists of three main tiers:

1. **Analysis Engine** — TypeScript/JavaScript analysis with parallel processing
2. **Enterprise Platform** — Web dashboard, team collaboration, policy management
3. **Integration Layer** — CI/CD pipelines, IDE plugins, third-party integrations

See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## ⚙️ Configuration

### VS Code Extension Settings

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

### API Server Configuration

Edit `config/local.json`:
- Port: 3000 (default)
- Authentication: Configurable
- Rate limiting: Configurable
- CORS origins: Configurable

## 🔒 Security

- **RBAC** — Role-based access control
- **SSO** — SAML and OAuth support
- **Encryption** — Data at rest and in transit
- **Audit Logging** — Complete action tracking
- **Secret Detection** — Hardcoded credential scanning

## 📊 Status

**Current Version:** 0.1.0  
**Status:** ✅ Production Ready  
**Tests:** 293/294 passing (99.7%)  
**TypeScript:** Zero compilation errors

## 🛠️ Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile TypeScript |
| `npm run watch` | Watch mode compilation |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:services` | Test enterprise services |
| `npm run start:api` | Start API server |
| `npm run verify` | Verify setup |
| `npm run package` | Package extension |

### Debug Configurations

Available in VS Code Run and Debug panel:
- **Run Extension** — Launch extension in debug mode
- **Debug API Server** — Debug API server
- **Debug Service Tests** — Debug service tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📝 License

TBD

## 👤 Author

**Abdul Hafis Mohammed**  
GitHub: [@pious2847](https://github.com/pious2847)

## 🔗 Links

- **Repository:** https://github.com/pious2847/CodeJanitor
- **Issues:** https://github.com/pious2847/CodeJanitor/issues
- **Discussions:** https://github.com/pious2847/CodeJanitor/discussions

## 🎉 Acknowledgments

Built with:
- TypeScript
- ts-morph
- VS Code Extension API
- Vitest

---

**Made with ❤️ for enterprise code quality and developer productivity.**

*CodeJanitor Enterprise — Because code quality matters at scale.*
