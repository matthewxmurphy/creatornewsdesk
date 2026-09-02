import assert from 'node:assert/strict';
import test from 'node:test';

import { digestDecision, digestEmail, summarizeFleet } from '../facebook-delivery-digest-lib.mjs';

const now = new Date('2026-09-02T12:00:00Z');

test('ordinary delivery shortages stay with automation and do not email', () => {
  const summary = summarizeFleet([{
    site_name: 'The Factology Daily', checked_at: '2026-09-02T11:55:00Z', healthy: false,
    meta: { configured: true, api_ok: true }, delivery: { published_rolling_24h: 0, future_scheduled: 21, past_due_scheduled: 0 },
  }], { now });
  assert.equal(summary.actionable.length, 0);
  assert.equal(summary.automatic.length, 1);
  assert.equal(digestDecision({ summary, now }).send, false);
});

test('an expired Facebook connection becomes one human action', () => {
  const summary = summarizeFleet([{
    site_name: 'The Daily Smirk', checked_at: '2026-09-02T11:55:00Z', healthy: false,
    meta: { configured: true, api_ok: false, error: 'OAuth access token expired' }, delivery: {},
  }], { now });
  assert.equal(summary.actionable.length, 1);
  assert.match(summary.actionable[0].action, /Reconnect/);
});

test('digest waits three hours and never repeats the same unresolved issue', () => {
  const summary = { actionable: [{ site: 'Page', issue: 'Connection expired.', action: 'Reconnect.' }], automatic: [], healthy: [] };
  const first = digestDecision({ summary, now, minimumAgeHours: 3, repeatHours: 0 });
  assert.equal(first.send, false);
  const ready = digestDecision({ summary, previous: { fingerprint: first.fingerprint, first_seen_at: '2026-09-02T08:00:00Z' }, now, minimumAgeHours: 3, repeatHours: 0 });
  assert.equal(ready.send, true);
  const repeated = digestDecision({ summary, previous: { fingerprint: first.fingerprint, first_seen_at: '2026-09-02T08:00:00Z', last_sent_at: '2026-01-01T00:00:00Z' }, now, minimumAgeHours: 3, repeatHours: 0 });
  assert.equal(repeated.send, false);
});

test('email is plain English and contains the full fleet summary', () => {
  const email = digestEmail({
    actionable: [{ site: 'Credit Repair Choices', issue: 'Facebook connection expired.', action: 'Reconnect the Page.' }],
    automatic: [{ site: 'Factology', issue: '21 future posts queued.', response: 'No action is needed from you.' }],
    healthy: ['Daily Smirk'],
  });
  assert.match(email.subject, /needs your help/);
  assert.match(email.lines.join('\n'), /Already being handled automatically/);
  assert.doesNotMatch(email.lines.join('\n'), /rolling_24h_below_minimum|\{"attempted"/);
});
