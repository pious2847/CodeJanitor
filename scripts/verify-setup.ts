#!/usr/bin/env node
/**
 * Setup Verification Script
 * 
 * Verifies that CodeJanitor Enterprise is properly set up for local testing
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const checks: CheckResult[] = [];

function check(name: string, condition: boolean, message: string): void {
  checks.push({ name, passed: condition, message });
}

function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function directoryExists(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

console.log('🔍 Verifying CodeJanitor Enterprise Setup\n');
console.log('='.repeat(60));

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
check(
  'Node.js Version',
  majorVersion >= 18,
  majorVersion >= 18 
    ? `✓ Node.js ${nodeVersion} (>= 18.0.0)` 
    : `✗ Node.js ${nodeVersion} (requires >= 18.0.0)`
);

// Check TypeScript compilation
check(
  'TypeScript Compiled',
  directoryExists('out'),
  directoryExists('out')
    ? '✓ TypeScript compiled to out/ directory'
    : '✗ Run "npm run compile" to compile TypeScript'
);

// Check configuration files
check(
  'Configuration File',
  fileExists('config/local.json'),
  fileExists('config/local.json')
    ? '✓ Local configuration file exists'
    : '✗ Configuration file missing'
);

// Check test data
check(
  'Test Data',
  directoryExists('test-data/sample-project'),
  directoryExists('test-data/sample-project')
    ? '✓ Sample test project exists'
    : '✗ Test data missing'
);

// Check source files
const requiredFiles = [
  'src/extension.ts',
  'src/api/server.ts',
  'src/services/AnalyticsEngine.ts',
  'src/services/TeamWorkspace.ts',
  'src/services/PolicyEngine.ts',
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (!fileExists(file)) {
    allFilesExist = false;
    break;
  }
}

check(
  'Source Files',
  allFilesExist,
  allFilesExist
    ? '✓ All required source files exist'
    : '✗ Some source files are missing'
);

// Check dependencies
check(
  'Dependencies',
  directoryExists('node_modules'),
  directoryExists('node_modules')
    ? '✓ Dependencies installed'
    : '✗ Run "npm install" to install dependencies'
);

// Check scripts
const scriptsExist = 
  fileExists('scripts/start-api-server.ts') &&
  fileExists('scripts/test-services.ts');

check(
  'Test Scripts',
  scriptsExist,
  scriptsExist
    ? '✓ Test scripts available'
    : '✗ Test scripts missing'
);

// Print results
console.log('\n📋 Check Results:\n');

let allPassed = true;
for (const result of checks) {
  console.log(`  ${result.passed ? '✅' : '❌'} ${result.name}`);
  console.log(`     ${result.message}`);
  if (!result.passed) {
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('\n✅ Setup verification PASSED!');
  console.log('\nYou can now:');
  console.log('  1. Press F5 in VS Code to test the extension');
  console.log('  2. Run "npm run start:api" to start the API server');
  console.log('  3. Run "npm run test:services" to test services');
  console.log('  4. Run "npm test" to run all tests');
  console.log('\nSee LOCAL_SETUP.md for detailed instructions.\n');
  process.exit(0);
} else {
  console.log('\n❌ Setup verification FAILED!');
  console.log('\nPlease fix the issues above and run this script again.');
  console.log('See LOCAL_SETUP.md for setup instructions.\n');
  process.exit(1);
}
