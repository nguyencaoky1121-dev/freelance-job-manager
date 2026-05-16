#!/usr/bin/env node
/**
 * Test script for monitoring system
 * Run: node test-monitoring.js
 */

require('dotenv').config();
const { JobMonitor } = require('./backend/services/jobMonitor');

async function testMonitoring() {
  console.log('🧪 Testing Monitoring System\n');

  const monitor = new JobMonitor();

  // Test 1: Check for new messages
  console.log('📬 Test 1: Checking for new messages...');
  const messagesResult = await monitor.checkNewMessages();
  console.log(`   Result: ${messagesResult.newMessages} new message(s)`);
  if (messagesResult.error) {
    console.log(`   Error: ${messagesResult.error}`);
  }
  console.log('');

  // Test 2: Check for job awards
  console.log('🎯 Test 2: Checking for job awards...');
  const awardsResult = await monitor.checkJobAwards();
  console.log(`   Result: ${awardsResult.newAwards} new award(s)`);
  if (awardsResult.error) {
    console.log(`   Error: ${awardsResult.error}`);
  }
  console.log('');

  // Test 3: Full monitoring cycle
  console.log('🔄 Test 3: Running full monitoring cycle...');
  await monitor.runMonitoringCycle();
  const status = monitor.getStatus();
  console.log(`   Status: ${JSON.stringify(status, null, 2)}`);
  console.log('');

  console.log('✅ Monitoring tests complete!');
  process.exit(0);
}

testMonitoring().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
