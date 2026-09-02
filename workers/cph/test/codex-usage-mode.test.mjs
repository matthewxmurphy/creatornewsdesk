import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyUsage, detectUsageEvents } from '../cph-codex-usage-mode.mjs';

test('uses full bounded throughput while account usage is low', () => {
  assert.deepEqual(classifyUsage(20), {
    mode: 'burst',
    creator_interval_minutes: 15,
    creator_max_jobs: 8,
    fan_interval_minutes: 30,
    fan_max_roles: 8,
    pause_noncritical_fan_work: false,
  });
});

test('slows workload as the controlling usage window rises', () => {
  assert.equal(classifyUsage(50).mode, 'standard');
  assert.equal(classifyUsage(70).mode, 'conserve');
  assert.equal(classifyUsage(90).mode, 'protect');
  assert.equal(classifyUsage(10, 'primary').mode, 'protect');
});

test('detects a replenished usage window and newly granted reset credit', () => {
  assert.deepEqual(detectUsageEvents(
    { used_percent: 78, reset_credits_available: 0 },
    { used_percent: 12, reset_credits_available: 1 },
  ), {
    usage_window_reset_detected: true,
    new_reset_credit_detected: true,
  });
});
