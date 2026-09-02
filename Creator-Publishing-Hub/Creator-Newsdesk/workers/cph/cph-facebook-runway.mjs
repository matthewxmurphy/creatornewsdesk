#!/usr/bin/env node

import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildContentDemand,
  categoryForItem,
  missingRunwaySlots,
  rankCategoryPerformance,
  selectUniqueCandidates,
} from './facebook-runway-lib.mjs';

const workerDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(workerDirectory, '..', '..');
const profile = String(process.env.CPH_RUNWAY_PROFILE || process.env.CPH_PROFILE || 'facebook-page').trim();
const siteName = String(process.env.CPH_SITE_NAME || profile).trim();
const wpBase = String(process.env.CPH_WP_BASE || '').trim();
const workerToken = String(process.env.CPH_WORKER_TOKEN || '').trim();
const pageId = String(process.env.CPH_FACEBOOK_PAGE_ID || process.env.FACEBOOK_PAGE_ID || '').trim();
const pageToken = String(process.env.CPH_FACEBOOK_PAGE_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || '').trim();
const graphVersion = /^v\d+\.\d+$/i.test(String(process.env.CPH_GRAPH_VERSION || 'v24.0'))
  ? String(process.env.CPH_GRAPH_VERSION || 'v24.0')
  : 'v24.0';
const requestedDays = Math.max(1, Number.parseInt(process.env.CPH_FACEBOOK_RUNWAY_DAYS || '29', 10) || 29);
const days = Math.min(29, requestedDays);
const postsPerDay = Math.max(1, Number.parseInt(process.env.CPH_FACEBOOK_POSTS_PER_DAY || '12', 10) || 12);
const leadMinutes = Math.max(20, Number.parseInt(process.env.CPH_FACEBOOK_RUNWAY_LEAD_MINUTES || '60', 10) || 60);
const maxAdd = Math.min(100, Math.max(1, Number.parseInt(process.env.CPH_FACEBOOK_RUNWAY_MAX_ADD || '50', 10) || 50));
const reschedulePastDue = process.env.CPH_FACEBOOK_RESCHEDULE_PAST_DUE !== '0';
const metricsDays = Math.max(7, Number.parseInt(process.env.CPH_FACEBOOK_PERFORMANCE_DAYS || '30', 10) || 30);
const schedule = process.argv.includes('--schedule');
const hashtags = String(process.env.CPH_SOCIAL_HASHTAGS || '#learnmore')
  .split(/[\s,]+/)
  .map((tag) => tag.trim())
  .filter(Boolean)
  .map((tag) => tag.startsWith('#') ? tag : `#${tag}`)
  .slice(0, 5)
  .join(' ');
const artifactRoot = path.resolve(process.env.CPH_FACEBOOK_RUNWAY_ARTIFACTS || path.join(projectRoot, 'artifacts', 'facebook-runway'));
const currentFile = path.join(artifactRoot, `${profile}.json`);
const historyFile = path.join(artifactRoot, `${profile}.jsonl`);

if (!wpBase || !workerToken || !pageId || !pageToken) {
  throw new Error('WordPress and Facebook credentials are required for runway management.');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const error = new Error(String(payload?.error?.message || payload?.message || `HTTP ${response.status}`));
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function wordpressEdge(pathname) {
  return fetchJson(new URL(pathname, wpBase), {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
}

async function wordpressMutation(pathname, body) {
  return fetchJson(new URL(pathname, wpBase), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${workerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function graphEdge(edge, fields, { since = null, pages = 10 } = {}) {
  const items = [];
  let url = new URL(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/${edge}`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', '100');
  if (since) url.searchParams.set('since', String(since));
  url.searchParams.set('access_token', pageToken);
  for (let page = 0; url && page < pages; page += 1) {
    const payload = await fetchJson(url);
    items.push(...(Array.isArray(payload.data) ? payload.data : []));
    url = payload?.paging?.next ? new URL(payload.paging.next) : null;
  }
  return items;
}

async function atomicWriteJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, file);
}

function captionFor(item) {
  if (item?._source === 'social_queue' && String(item?.social_caption || '').trim()) {
    return String(item.social_caption).trim();
  }
  const title = String(item?.title || '').trim();
  const excerpt = String(item?.excerpt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return [
    `Worth another look from ${siteName}:`,
    '',
    title,
    excerpt ? '' : null,
    excerpt || null,
    '',
    `Read it here: ${item.permalink}`,
    '',
    hashtags,
  ].filter((line) => line !== null).join('\n');
}

async function scheduleCandidate(item, epoch) {
  const body = new URLSearchParams({
    message: captionFor(item),
    link: item.permalink,
    published: 'false',
    scheduled_publish_time: String(epoch),
    access_token: pageToken,
  });
  return fetchJson(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

async function reschedulePost(postId, epoch) {
  const body = new URLSearchParams({
    published: 'false',
    scheduled_publish_time: String(epoch),
    access_token: pageToken,
  });
  return fetchJson(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(postId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

const now = new Date();
const since = Math.floor(now.valueOf() / 1000) - (metricsDays * 86_400);
const [queuePayload, recyclePayload, scheduledPosts] = await Promise.all([
  wordpressEdge('/wp-json/creator-publishing-hub/v1/social-queue?per_page=100'),
  wordpressEdge('/wp-json/creator-publishing-hub/v1/recycle-candidates?per_page=75'),
  graphEdge('scheduled_posts', 'id,scheduled_publish_time,message', { pages: 10 }),
]);
const queueCandidates = (Array.isArray(queuePayload.items) ? queuePayload.items : [])
  .map((item) => ({ ...item, _source: 'social_queue' }));
const recycleCandidates = (Array.isArray(recyclePayload.items) ? recyclePayload.items : [])
  .map((item) => ({ ...item, _source: 'recycle' }));
const candidates = [...queueCandidates, ...recycleCandidates]
  .filter((item) => Number(item?.featured_media || 0) > 0 && item?.permalink);
const nowEpoch = Math.floor(now.valueOf() / 1000);
const future = scheduledPosts.filter((item) => Number(item?.scheduled_publish_time || 0) > nowEpoch);
const pastDue = scheduledPosts.filter((item) => {
  const epoch = Number(item?.scheduled_publish_time || 0);
  return epoch > 0 && epoch <= nowEpoch;
});

let published = [];
let metricsAvailable = true;
let metricsError = '';
try {
  published = await graphEdge('published_posts', 'id,created_time,message,shares,comments.limit(0).summary(true),reactions.limit(0).summary(true)', { since, pages: 10 });
} catch (error) {
  metricsAvailable = false;
  metricsError = String(error.message || error).slice(0, 400);
  published = await graphEdge('published_posts', 'id,created_time,message', { since, pages: 10 });
}

const knownCategories = [...new Set(candidates.map(categoryForItem))];
const performance = rankCategoryPerformance(published, knownCategories, metricsAvailable);
const runway = missingRunwaySlots({
  now,
  days,
  postsPerDay,
  leadMinutes,
  existingEpochs: future.map((item) => item.scheduled_publish_time),
});
const rescheduled = [];
const rescheduleErrors = [];
if (schedule && reschedulePastDue && pastDue.length) {
  const orderedPastDue = [...pastDue].sort((left, right) => Number(left.scheduled_publish_time || 0) - Number(right.scheduled_publish_time || 0));
  const limit = Math.min(maxAdd, orderedPastDue.length, runway.slots.length);
  for (let index = 0; index < limit; index += 1) {
    const item = orderedPastDue[index];
    const epoch = runway.slots[index];
    try {
      await reschedulePost(item.id, epoch);
      rescheduled.push({
        facebook_post_id: String(item.id || ''),
        previous_scheduled_publish_time: Number(item.scheduled_publish_time || 0),
        scheduled_publish_time: epoch,
        scheduled_at: new Date(epoch * 1000).toISOString(),
      });
    } catch (error) {
      rescheduleErrors.push({ facebook_post_id: String(item.id || ''), error: String(error.message || error).slice(0, 400) });
      break;
    }
  }
}

const remainingSlots = runway.slots.slice(rescheduled.length);
const selected = selectUniqueCandidates({
  candidates,
  scheduledMessages: scheduledPosts.map((item) => item.message || ''),
  performance,
  limit: Math.min(Math.max(0, maxAdd - rescheduled.length), remainingSlots.length),
});

const additions = [];
let blockedReason = '';
const pastDueRemaining = Math.max(0, pastDue.length - rescheduled.length);
if (pastDueRemaining && !schedule) blockedReason = 'past_due_reschedule_waiting_for_schedule_mode';
else if (pastDueRemaining && !reschedulePastDue) blockedReason = 'past_due_reschedule_disabled';
else if (pastDueRemaining && rescheduleErrors.length) blockedReason = 'past_due_reschedule_failed';
else if (pastDueRemaining) blockedReason = 'past_due_reschedule_in_progress';
else if (!selected.length) blockedReason = 'no_unscheduled_image_backed_candidates';
else if (!schedule) blockedReason = 'dry_run';
else {
  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const epoch = remainingSlots[index];
    const result = await scheduleCandidate(item, epoch);
    let queueMarkedShared = null;
    if (item._source === 'social_queue') {
      queueMarkedShared = await wordpressMutation('/wp-json/creator-publishing-hub/v1/social-queue/mark-shared', {
        post_id: item.post_id,
        share_id: String(result.id || ''),
      });
    }
    additions.push({
      facebook_post_id: String(result.id || ''),
      post_id: item.post_id,
      permalink: item.permalink,
      category: categoryForItem(item),
      scheduled_publish_time: epoch,
      scheduled_at: new Date(epoch * 1000).toISOString(),
      source: item._source,
      queue_marked_shared: item._source === 'social_queue' ? Boolean(queueMarkedShared?.ok ?? true) : null,
    });
  }
}

const futureAfter = future.length + rescheduled.length + additions.length;
const missingAfter = Math.max(0, runway.targetCount - futureAfter);
const snapshot = {
  schema: 'cph-facebook-runway/v1',
  checked_at: now.toISOString(),
  profile,
  site_name: siteName,
  mode: schedule ? 'schedule' : 'dry_run',
  status: pastDueRemaining ? 'recovering' : missingAfter > 0 ? 'building' : 'full',
  target: {
    days,
    requested_days: requestedDays,
    meta_max_days: 29,
    posts_per_day: postsPerDay,
    future_slots: runway.targetCount,
  },
  runway: {
    future_before: future.length,
    added: additions.length,
    rescheduled_past_due: rescheduled.length,
    future_after: futureAfter,
    missing_after: missingAfter,
    past_due_before: pastDue.length,
    past_due_remaining: pastDueRemaining,
    blocked_reason: blockedReason || null,
  },
  supply: {
    image_backed_unique: new Set(candidates.map((item) => item.permalink)).size,
    social_queue_image_backed: queueCandidates.filter((item) => Number(item?.featured_media || 0) > 0).length,
    recycle_image_backed: recycleCandidates.filter((item) => Number(item?.featured_media || 0) > 0).length,
    unscheduled_selected: selected.length,
  },
  performance: {
    measurement_status: metricsAvailable ? 'meta_engagement_available' : 'balanced_fallback_permission_unavailable',
    error: metricsError || null,
    posts_sampled: published.length,
    categories: performance,
  },
  content_demand: buildContentDemand({
    missingSlots: missingAfter,
    candidates,
    performance,
  }),
  past_due_recovery: {
    enabled: reschedulePastDue,
    rescheduled,
    errors: rescheduleErrors,
  },
  additions,
};

await atomicWriteJson(currentFile, snapshot);
await appendFile(historyFile, `${JSON.stringify(snapshot)}\n`, { mode: 0o600 });
console.log(JSON.stringify(snapshot, null, 2));
if (pastDueRemaining || rescheduleErrors.length) process.exitCode = 1;
