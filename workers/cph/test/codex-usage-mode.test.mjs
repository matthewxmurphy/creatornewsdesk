import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyUsage, detectUsageEvents } from '../cph-codex-usage-mode.mjs';

test('uses the available capacity aggressively while more than half remains', () => {
  assert.deepEqual(classifyUsage(20), {
    mode: 'capacity_burst',
    governor_interval_hours: 12,
    production_interval_minutes: 15,
    recommended_rrule: 'RRULE:FREQ=MINUTELY;INTERVAL=15',
    creator_max_jobs: 8,
    fan_max_roles: 8,
    burst_trigger: 'more_than_50_percent_usage_remaining',
    pause_noncritical_fan_work: false,
  });
});

test('labels a confirmed reset as the reason restored capacity is used aggressively', () => {
  assert.deepEqual(classifyUsage(20, null, true), {
    mode: 'capacity_burst',
    governor_interval_hours: 12,
    production_interval_minutes: 15,
    recommended_rrule: 'RRULE:FREQ=MINUTELY;INTERVAL=15',
    creator_max_jobs: 8,
    fan_max_roles: 8,
    burst_trigger: 'automatic_usage_reset_detected',
    pause_noncritical_fan_work: false,
  });
});

test('slows back down once 50 percent of the controlling window is used', () => {
  assert.equal(classifyUsage(49, null, true).mode, 'capacity_burst');
  assert.equal(classifyUsage(50, null, true).mode, 'slow');
  assert.equal(classifyUsage(70).mode, 'slow');
  assert.equal(classifyUsage(90).mode, 'protect');
  assert.equal(classifyUsage(10, 'primary').mode, 'protect');
});

test('detects a replenished usage window and newly granted reset credit', () => {
  assert.deepEqual(detectUsageEvents(
    { used_percent: 78, primary: { resetsAt: 100 }, reset_credits_available: 0 },
    { used_percent: 12, primary: { resetsAt: 200 }, reset_credits_available: 1 },
  ), {
    usage_window_reset_detected: true,
    usage_percent_drop: 66,
    reset_timestamp_advanced: true,
    new_reset_credit_detected: true,
  });
});

test('detects an automatic replenishment from a newly advanced reset window', () => {
  assert.deepEqual(detectUsageEvents(
    { used_percent: 2, primary: { resetsAt: 100 }, reset_credits_available: 0 },
    { used_percent: 2, primary: { resetsAt: 200 }, reset_credits_available: 0 },
  ), {
    usage_window_reset_detected: true,
    usage_percent_drop: 0,
    reset_timestamp_advanced: true,
    new_reset_credit_detected: false,
  });
});
