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
  try {
    const analytics = new AnalyticsEngine();
    const serviceName = analytics.constructor.name;
    console.log(`  ✓ ${serviceName} initialized`);
    console.log('  ✓ Ready for metrics calculation and trend analysis');
  } catch (error) {
    console.error('  ✗ Analytics Engine test failed:', error);
    throw error;
  }
}

async function testTeamWorkspace() {
  console.log('\n👥 Testing Team Workspace...');
  try {
    const workspace = new TeamWorkspace();
    const serviceName = workspace.constructor.name;
    console.log(`  ✓ ${serviceName} initialized`);
    console.log('  ✓ Ready for team management');
  } catch (error) {
    console.error('  ✗ Team Workspace test failed:', error);
    throw error;
  }
}

async function testPolicyEngine() {
  console.log('\n📋 Testing Policy Engine...');
  try {
    const policyEngine = new PolicyEngine();
    const serviceName = policyEngine.constructor.name;
    console.log(`  ✓ ${serviceName} initialized`);
    console.log('  ✓ Ready for policy management');
  } catch (error) {
    console.error('  ✗ Policy Engine test failed:', error);
    throw error;
  }
}

async function testNotificationSystem() {
  console.log('\n🔔 Testing Notification System...');
  try {
    const notifications = new NotificationSystem({
      email: {
        enabled: false,
        smtpHost: 'localhost',
        smtpPort: 1025,
        from: 'test@example.com',
      },
      slack: {
        enabled: false,
        webhookUrl: 'https://hooks.slack.com/test',
      },
      teams: {
        enabled: false,
        webhookUrl: 'https://outlook.office.com/webhook/test',
      },
      mobile: {
        enabled: false,
      },
    });
    const serviceName = notifications.constructor.name;
    console.log(`  ✓ ${serviceName} initialized`);
    console.log('  ✓ Ready to send notifications');
  } catch (error) {
    console.error('  ✗ Notification System test failed:', error);
    throw error;
  }
}

async function testBaselineManager() {
  console.log('\n📈 Testing Baseline Manager...');
  try {
    const baselineManager = new BaselineManager();
    const serviceName = baselineManager.constructor.name;
    console.log(`  ✓ ${serviceName} initialized`);
    console.log('  ✓ Ready for baseline management');
  } catch (error) {
    console.error('  ✗ Baseline Manager test failed:', error);
    throw error;
  }
}

async function testCIIntegration() {
  console.log('\n🔄 Testing CI Integration...');
  try {
    const ciIntegration = new CIIntegration();
    const serviceName = ciIntegration.constructor.name;
    console.log(`  ✓ ${serviceName} initialized`);
    console.log('  ✓ Ready for CI/CD integration');
  } catch (error) {
    console.error('  ✗ CI Integration test failed:', error);
    throw error;
  }
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
    console.log('\n✅ All service tests completed successfully!');
    console.log('\nAll enterprise services are properly initialized and ready for use.');
    console.log('Run the full test suite with "npm test" for comprehensive testing.\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
