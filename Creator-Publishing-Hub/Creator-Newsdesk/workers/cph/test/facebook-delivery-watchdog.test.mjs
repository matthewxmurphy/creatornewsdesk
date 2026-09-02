import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyDelivery,
  parseRecipients,
  recoveryDecision,
  shouldSendAlert,
} from '../facebook-delivery-watchdog-lib.mjs';

const now = new Date('2026-09-02T00:00:00Z');

test('healthy delivery requires Meta-confirmed volume and freshness', () => {
  assert.deepEqual(classifyDelivery({
    configured: true,
    publishedCount: 12,
    minimumPosts: 12,
    latestPublishedAt: '2026-09-01T23:00:00Z',
    maximumAgeHours: 3,
    now,
  }), {
    status: 'healthy',
    healthy: true,
    reasons: [],
    latestAgeHours: 1,
  });
});

test('a green scheduler cannot hide zero confirmed posts', () => {
  const result = classifyDelivery({
    configured: true,
    publishedCount: 0,
    minimumPosts: 12,
    latestPublishedAt: null,
    maximumAgeHours: 3,
    now,
  });
  assert.equal(result.status, 'critical');
  assert.deepEqual(result.reasons, ['rolling_24h_below_minimum', 'no_published_post_found']);
});

test('past-due Meta schedule triggers bounded automatic recovery', () => {
  assert.deepEqual(recoveryDecision({
    status: 'critical',
    consecutiveBreaches: 3,
    requiredBreaches: 2,
    futureScheduledCount: 0,
    pastDueScheduledCount: 10,
    lastRecoveryAt: null,
    cooldownHours: 3,
    recoveryConfigured: true,
    now,
  }), { attempt: true, reason: 'past_due_schedule_recovery' });
});

test('a monthly runway gap is a delivery breach', () => {
  const result = classifyDelivery({
    configured: true,
    publishedCount: 12,
    minimumPosts: 12,
    latestPublishedAt: '2026-09-01T23:30:00Z',
    maximumAgeHours: 3,
    futureScheduledCount: 20,
    minimumFutureScheduled: 360,
    now,
  });
  assert.equal(result.status, 'degraded');
  assert.deepEqual(result.reasons, ['future_schedule_below_minimum']);
});

test('runway recovery can add supply even when some future posts exist', () => {
  const decision = recoveryDecision({
    status: 'degraded',
    consecutiveBreaches: 2,
    requiredBreaches: 2,
    futureScheduledCount: 20,
    minimumFutureScheduled: 360,
    pastDueScheduledCount: 0,
    lastRecoveryAt: null,
    cooldownHours: 3,
    recoveryConfigured: true,
    now,
  });
  assert.equal(decision.attempt, true);
});

test('recovery waits for repeated proof and respects cooldown', () => {
  assert.equal(recoveryDecision({
    status: 'degraded',
    consecutiveBreaches: 1,
    requiredBreaches: 2,
    futureScheduledCount: 0,
    pastDueScheduledCount: 0,
    lastRecoveryAt: null,
    cooldownHours: 3,
    recoveryConfigured: true,
    now,
  }).reason, 'waiting_for_consecutive_confirmation');
  assert.equal(recoveryDecision({
    status: 'degraded',
    consecutiveBreaches: 2,
    requiredBreaches: 2,
    futureScheduledCount: 0,
    pastDueScheduledCount: 0,
    lastRecoveryAt: '2026-09-01T23:00:00Z',
    cooldownHours: 3,
    recoveryConfigured: true,
    now,
  }).reason, 'recovery_cooldown_active');
});

test('alerts send on state transitions or bounded repeats', () => {
  assert.equal(shouldSendAlert({ previousStatus: 'healthy', status: 'critical', repeatHours: 6, now }), true);
  assert.equal(shouldSendAlert({ previousStatus: 'critical', status: 'critical', lastAlertAt: '2026-09-01T23:00:00Z', repeatHours: 6, now }), false);
  assert.equal(shouldSendAlert({ previousStatus: 'critical', status: 'critical', lastAlertAt: '2026-09-01T17:00:00Z', repeatHours: 6, now }), true);
});

test('a changed delivery target triggers a fresh breach alert', () => {
  assert.equal(shouldSendAlert({
    previousStatus: 'critical',
    status: 'critical',
    previousTargetSignature: '1:30',
    targetSignature: '12:3',
    lastAlertAt: '2026-09-01T11:30:00Z',
    repeatHours: 6,
    now,
  }), true);
});

test('recipient parsing is strict and deduplicated', () => {
  assert.deepEqual(parseRecipients('Ops@example.com, ops@example.com; owner@example.org nope'), ['ops@example.com', 'owner@example.org']);
});
