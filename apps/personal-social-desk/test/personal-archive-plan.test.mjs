import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonalArchivePlan } from '../lib/personal-archive-plan.mjs';

const candidate = (id, extra = {}) => ({ id, kind: 'post', originalAt: '2023-11-20T04:00:00Z',
  originalCaption: 'An older original idea.', review: { state: 'shortlist', ownership: 'authored-text' },
  destinations: [{ id: 'matthew-personal' }],
  remix: { state: 'generated', provider: 'manual-engagement-remix', title: id, caption: 'An expanded new angle on the old idea, ready for editorial review.' }, ...extra });
const now = new Date('2026-09-05T03:00:00Z');

test('plans for the personal profile, in Central time, without scheduling or copying approval', () => {
  const plan = buildPersonalArchivePlan({ library: { candidates: [candidate('one')] }, now });
  assert.equal(plan.items[0].target, 'matthew-profile');
  assert.equal(plan.items[0].proposedFor, '2026-09-05T23:30:00.000Z');
  assert.equal(plan.items[0].state, 'needs-review');
  assert.equal(plan.items[0].facebookConfirmed, false);
  assert.equal(plan.items[0].scheduledFor, undefined);
  assert.equal(plan.policy.autoSchedule, false);
});
test('ignores Page slots, skips personal occupied days and is idempotent', () => {
  const library = { candidates: [candidate('one'), candidate('one'), candidate('two')] };
  const plan = buildPersonalArchivePlan({ library, now, occupied: [
    { target: 'matthew-profile', scheduledFor: '2026-09-05T13:00:00Z' },
    { target: 'matthew-page', scheduledFor: '2026-09-06T13:00:00Z' },
  ] });
  assert.equal(plan.items.length, 2);
  assert.equal(plan.items[0].proposedFor, '2026-09-06T23:30:00.000Z');
  const repeated = buildPersonalArchivePlan({ library, plan, now });
  assert.equal(repeated.created, 0);
  assert.deepEqual(repeated.items, plan.items);
});
test('excludes newer, skipped, Page-only, placeholder, media, and flagged sources', () => {
  const good = candidate('good');
  const candidates = [good, candidate('new', { originalAt: '2026-01-01' }),
    candidate('skip', { review: { state: 'skip' } }), candidate('page', { destinations: [{ id: 'matthew-page' }] }),
    candidate('template', { remix: { ...good.remix, provider: 'editorial-template' } }),
    candidate('video', { kind: 'reel' }), candidate('private', { flags: ['privacy-review'] })];
  assert.deepEqual(buildPersonalArchivePlan({ library: { candidates }, now }).items.map((item) => item.candidateId), ['good']);
});
test('caps outstanding review work at seven and preserves existing dates across DST', () => {
  const library = { candidates: Array.from({ length: 12 }, (_, i) => candidate(String(i))) };
  const plan = buildPersonalArchivePlan({ library, now: new Date('2026-11-01T03:00:00Z') });
  assert.equal(plan.items.length, 7);
  assert.equal(plan.items[0].proposedFor, '2026-11-02T00:30:00.000Z');
  const repeat = buildPersonalArchivePlan({ library, plan, now: new Date('2026-11-05T03:00:00Z') });
  assert.equal(repeat.created, 0);
  assert.deepEqual(repeat.items, plan.items);
});
