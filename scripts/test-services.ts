#!/usr/bin/env node
/**
 * Standalone Service Testing Script
 * 
 * Tests individual enterprise services without running the full API server
 */

import { AnalyticsEngine } from '../services/AnalyticsEngine';
import { TeamWorkspace } from '../services/TeamWorkspace';
import { PolicyEngine } from '../services/PolicyEngine';
import { NotificationSystem } from '../services/NotificationSystem';
import { BaselineManager } from '../services/BaselineManager';
import { CIIntegration } from '../services/CIIntegration';

async function testAnalyticsEngine() {
  console.log('\n📊 Testing Analytics Engine...');
  const analytics = new AnalyticsEngine();
  
  // Test metrics calculation
  const metrics = analytics.calculateMetrics({
    complexity: 15,
    duplications: 5,
    coverage: 75,
    issues: 10,
  });
  
  console.log('  ✓ Metrics calculated:', metrics);
  
  // Test trend analysis
  const trends = analytics.analyzeTrends([
    { date: new Date('2026-01-01'), score: 70 },
    { date: new Date('2026-02-01'), score: 75 },
    { date: new Date('2026-03-01'), score: 80 },
  ]);
  
  console.log('  ✓ Trends analyzed:', trends);
}

async function testTeamWorkspace() {
  console.log('\n👥 Testing Team Workspace...');
  const workspace = new TeamWorkspace();
  
  // Create a team
  const team = await workspace.createTeam({
    name: 'Test Team',
    organizationId: 'org-1',
    members: [],
  });
  
  console.log('  ✓ Team created:', team.id);
  
  // Assign a task
  await workspace.assignTask({
    id: 'task-1',
    type: 'code-cleanup',
    priority: 'high',
    issue: {
      type: 'unused-import',
      filePath: '/test/file.ts',
      line: 1,
      column: 1,
      message: 'Unused import',
      severity: 'warning',
    },
    status: 'pending',
    comments: [],
  }, {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'developer',
  });
  
  console.log('  ✓ Task assigned');
}

async function testPolicyEngine() {
  console.log('\n📋 Testing Policy Engine...');
  const policyEngine = new PolicyEngine();
  
  // Create a policy
  const policy = await policyEngine.createPolicy({
    id: 'policy-1',
    name: 'No Hardcoded Secrets',
    description: 'Detect hardcoded secrets in code',
    scope: 'organization',
    rules: [
      {
        type: 'security',
        condition: { pattern: 'hardcoded-secret' },
        action: { type: 'block' },
        parameters: {},
      },
    ],
    exceptions: [],
    severity: 'critical',
    autoFix: false,
  });
  
  console.log('  ✓ Policy created:', policy.id);
  
  // Test policy inheritance
  const inherited = policyEngine.inheritPolicies('team-1', 'org-1');
  console.log('  ✓ Policies inherited:', inherited.length);
}

async function testNotificationSystem() {
  console.log('\n🔔 Testing Notification System...');
  const notifications = new NotificationSystem();
  
  // Configure channels
  notifications.configureChannel('email', {
    enabled: true,
    recipients: ['test@example.com'],
  });
  
  // Send a test notification
  await notifications.sendNotification({
    type: 'issue-assigned',
    title: 'Test Notification',
    message: 'This is a test notification',
    priority: 'medium',
    recipients: ['test@example.com'],
    channels: ['email'],
    metadata: {},
  });
  
  console.log('  ✓ Notification sent');
}

async function testBaselineManager() {
  console.log('\n📈 Testing Baseline Manager...');
  const baselineManager = new BaselineManager();
  
  // Establish a baseline
  const baseline = await baselineManager.establishBaseline('project-1', {
    codeQuality: 80,
    technicalDebt: {
      totalMinutes: 120,
      breakdown: {
        security: 30,
        performance: 20,
        maintainability: 40,
        reliability: 20,
        duplications: 10,
      },
      trend: 'improving',
      priority: [],
    },
    testCoverage: 75,
    complexity: {
      average: 5,
      max: 15,
      distribution: {},
    },
    security: {
      vulnerabilities: 2,
      severity: {},
    },
    maintainability: 85,
  });
  
  console.log('  ✓ Baseline established:', baseline.version);
  
  // Detect regression
  const hasRegression = await baselineManager.detectRegression('project-1', {
    codeQuality: 70,
    technicalDebt: {
      totalMinutes: 150,
      breakdown: {
        security: 40,
        performance: 30,
        maintainability: 50,
        reliability: 20,
        duplications: 10,
      },
      trend: 'declining',
      priority: [],
    },
    testCoverage: 65,
    complexity: {
      average: 7,
      max: 20,
      distribution: {},
    },
    security: {
      vulnerabilities: 5,
      severity: {},
    },
    maintainability: 75,
  });
  
  console.log('  ✓ Regression detected:', hasRegression);
}

async function testCIIntegration() {
  console.log('\n🔄 Testing CI Integration...');
  const ciIntegration = new CIIntegration();
  
  // Register a webhook
  const webhook = await ciIntegration.registerWebhook(
    {
      id: 'repo-1',
      name: 'test-repo',
      url: 'https://github.com/test/repo',
      provider: 'github',
    },
    ['push', 'pull_request']
  );
  
  console.log('  ✓ Webhook registered:', webhook.id);
  
  // Evaluate quality gate
  const gateResult = await ciIntegration.evaluateQualityGate(
    {
      projectId: 'project-1',
      timestamp: new Date(),
      metrics: {
        codeQuality: 75,
        coverage: 80,
        complexity: 10,
        issues: 5,
      },
      issues: [],
      summary: {
        totalFiles: 100,
        analyzedFiles: 100,
        totalIssues: 5,
        criticalIssues: 0,
        highIssues: 2,
        mediumIssues: 3,
        lowIssues: 0,
      },
    },
    {
      id: 'gate-1',
      name: 'Production Gate',
      conditions: [
        {
          metric: 'coverage',
          operator: 'greater_than',
          threshold: 70,
          scope: 'overall',
        },
      ],
      blockOnFailure: true,
      notificationChannels: [],
    }
  );
  
  console.log('  ✓ Quality gate evaluated:', gateResult.passed ? 'PASSED' : 'FAILED');
}

async function runAllTests() {
  console.log('🚀 Starting CodeJanitor Enterprise Service Tests\n');
  console.log('=' .repeat(60));
  
  try {
    await testAnalyticsEngine();
    await testTeamWorkspace();
    await testPolicyEngine();
    await testNotificationSystem();
    await testBaselineManager();
    await testCIIntegration();
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ All service tests completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
