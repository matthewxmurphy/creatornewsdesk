#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  classifyDelivery,
  nonNegativeInteger,
  parseRecipients,
  positiveInteger,
  recoveryDecision,
  safeProfileKey,
  shouldSendAlert,
} from './facebook-delivery-watchdog-lib.mjs';

const execFileAsync = promisify(execFile);
const WORKER_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(WORKER_DIR, '..', '..');
const now = new Date();
const profile = safeProfileKey(process.env.CPH_DELIVERY_PROFILE || process.env.CPH_PROFILE || process.env.CPH_SITE_HOST);
const siteName = String(process.env.CPH_SITE_NAME || process.env.CPH_SITE_HOST || profile).trim();
const pageId = String(process.env.CPH_FACEBOOK_PAGE_ID || '').trim();
const pageToken = String(process.env.CPH_FACEBOOK_PAGE_TOKEN || '').trim();
const graphVersion = /^v\d+\.\d+$/i.test(String(process.env.CPH_GRAPH_VERSION || 'v24.0'))
  ? String(process.env.CPH_GRAPH_VERSION || 'v24.0')
  : 'v24.0';
const minimumPosts = positiveInteger(process.env.CPH_FACEBOOK_MIN_POSTS_24H, 1);
const maximumAgeHours = positiveInteger(process.env.CPH_FACEBOOK_MAX_AGE_HOURS, 26);
const minimumFutureScheduled = nonNegativeInteger(process.env.CPH_FACEBOOK_MIN_FUTURE_SCHEDULED, 0);
const requiredBreaches = positiveInteger(process.env.CPH_FACEBOOK_RECOVERY_CONSECUTIVE_BREACHES, 2);
const recoveryCooldownHours = positiveInteger(process.env.CPH_FACEBOOK_RECOVERY_COOLDOWN_HOURS, 3);
const alertRepeatHours = positiveInteger(process.env.CPH_FACEBOOK_ALERT_REPEAT_HOURS, 6);
const directAlertsEnabled = process.env.CPH_FACEBOOK_DIRECT_ALERTS === '1';
const targetSignature = `${minimumPosts}:${maximumAgeHours}:${minimumFutureScheduled}`;
const recoveryUrl = String(process.env.CPH_FACEBOOK_RECOVERY_URL || '').trim();
const recoveryUnit = String(process.env.CPH_FACEBOOK_RECOVERY_UNIT || '').trim();
const recoveryFile = String(process.env.CPH_FACEBOOK_RECOVERY_FILE || '').trim();
const recoveryDryRun = process.env.CPH_FACEBOOK_RECOVERY_DRY_RUN === '1';
const failOnBreach = process.env.CPH_FACEBOOK_FAIL_ON_BREACH !== '0';
const recipients = parseRecipients(process.env.CPH_ALERT_EMAILS);
const outputRoot = path.resolve(process.env.CPH_FACEBOOK_DELIVERY_ARTIFACTS || path.join(PROJECT_ROOT, 'artifacts', 'facebook-delivery'));
const stateFile = path.join(outputRoot, `${profile}.state.json`);
const statusFile = path.join(outputRoot, `${profile}.json`);
const historyFile = path.join(outputRoot, `${profile}.jsonl`);

async function readJson(file, fallback = {}) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function atomicWriteJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, file);
}

async function graphEdge(edge, fields, { since } = {}) {
  const items = [];
  let next = new URL(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/${edge}`);
  next.searchParams.set('fields', fields);
  next.searchParams.set('limit', '100');
  if (since) next.searchParams.set('since', String(since));
  next.searchParams.set('access_token', pageToken);

  for (let page = 0; next && page < 10; page += 1) {
    const response = await fetch(next, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
      throw new Error(String(payload?.error?.message || `Meta ${edge} returned HTTP ${response.status}.`));
    }
    items.push(...(Array.isArray(payload.data) ? payload.data : []));
    const nextUrl = String(payload?.paging?.next || '');
    next = nextUrl ? new URL(nextUrl) : null;
  }
  return items;
}

async function sendAlert(subject, lines) {
  if (!recipients.length) return { attempted: false, reason: 'no_alert_recipients' };
  const message = [
    `To: ${recipients.join(', ')}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    ...lines,
    '',
  ].join('\n');
  try {
    await new Promise((resolve, reject) => {
      const child = spawn('/usr/sbin/sendmail', ['-t'], { stdio: ['pipe', 'ignore', 'pipe'] });
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('sendmail timed out'));
      }, 20_000);
      child.stderr.on('data', (chunk) => { stderr += String(chunk); });
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new Error(`sendmail exited ${code}${stderr ? `: ${stderr.slice(0, 240)}` : ''}`));
      });
      child.stdin.end(message);
    });
    return { attempted: true, sent: true, recipients: recipients.length };
  } catch (error) {
    return { attempted: true, sent: false, error: String(error.message || error).slice(0, 300) };
  }
}

async function attemptRecovery() {
  if (recoveryDryRun) return { attempted: false, dry_run: true, reason: 'recovery_dry_run' };
  if (recoveryFile) {
    await atomicWriteJson(path.resolve(recoveryFile), {
      requested_at: now.toISOString(),
      source: 'facebook-delivery-watchdog',
      profile,
    });
    return { attempted: true, kind: 'path', accepted: true, file: path.resolve(recoveryFile) };
  }
  if (recoveryUrl) {
    const response = await fetch(recoveryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'facebook-delivery-watchdog', profile }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Recovery URL returned HTTP ${response.status}: ${body.slice(0, 240)}`);
    return { attempted: true, kind: 'url', accepted: true, http: response.status };
  }
  await execFileAsync('/usr/bin/systemctl', ['start', recoveryUnit], { timeout: 30_000 });
  return { attempted: true, kind: 'systemd', accepted: true, unit: recoveryUnit };
}

const previous = await readJson(stateFile);
let published = [];
let scheduled = [];
let apiError = '';
const configured = Boolean(pageId && pageToken);

if (configured) {
  try {
    published = await graphEdge('published_posts', 'id,created_time,permalink_url', {
      since: Math.floor(now.valueOf() / 1000) - 86_400,
    });
    scheduled = await graphEdge('scheduled_posts', 'id,scheduled_publish_time');
  } catch (error) {
    apiError = String(error.message || error).slice(0, 500);
  }
}

const nowEpoch = Math.floor(now.valueOf() / 1000);
const pastDueScheduled = scheduled.filter((item) => Number(item.scheduled_publish_time || 0) <= nowEpoch);
const futureScheduled = scheduled.filter((item) => Number(item.scheduled_publish_time || 0) > nowEpoch);
const latest = published
  .filter((item) => item.created_time)
  .sort((left, right) => Date.parse(right.created_time) - Date.parse(left.created_time))[0] || null;
const classification = classifyDelivery({
  configured,
  apiError,
  publishedCount: published.length,
  minimumPosts,
  latestPublishedAt: latest?.created_time || null,
  maximumAgeHours,
  futureScheduledCount: futureScheduled.length,
  minimumFutureScheduled,
  pastDueScheduledCount: pastDueScheduled.length,
  now,
});
const consecutiveBreaches = classification.healthy || classification.status === 'unconfigured'
  ? 0
  : nonNegativeInteger(previous.consecutive_breaches, 0) + 1;
const recovery = recoveryDecision({
  status: classification.status,
  consecutiveBreaches,
  requiredBreaches,
  futureScheduledCount: futureScheduled.length,
  pastDueScheduledCount: pastDueScheduled.length,
  lastRecoveryAt: previous.last_recovery_at || null,
  cooldownHours: recoveryCooldownHours,
  recoveryConfigured: Boolean(recoveryFile || recoveryUrl || recoveryUnit),
  minimumFutureScheduled,
  now,
});

let recoveryResult = { attempted: false, reason: recovery.reason };
let lastRecoveryAt = previous.last_recovery_at || null;
if (recovery.attempt) {
  try {
    recoveryResult = await attemptRecovery();
    if (recoveryResult.attempted && recoveryResult.accepted !== false) lastRecoveryAt = now.toISOString();
  } catch (error) {
    recoveryResult = { attempted: true, accepted: false, error: String(error.message || error).slice(0, 500) };
  }
}

let alert = { attempted: false, reason: directAlertsEnabled ? 'state_unchanged' : 'direct_alerts_disabled_use_digest' };
let lastAlertAt = previous.last_alert_at || null;
if (directAlertsEnabled && shouldSendAlert({
  previousStatus: previous.status || null,
  status: classification.status,
  previousTargetSignature: previous.target_signature || '',
  targetSignature,
  lastAlertAt,
  repeatHours: alertRepeatHours,
  now,
})) {
  alert = await sendAlert(
    `[CPH] ${siteName} Facebook delivery ${classification.status}`,
    [
      `${siteName} is below its confirmed Facebook delivery target.`,
      `Published in rolling 24 hours: ${published.length} (minimum ${minimumPosts})`,
      `Latest confirmed post: ${latest?.created_time || 'none'}`,
      `Future scheduled posts: ${futureScheduled.length}`,
      `Future schedule minimum: ${minimumFutureScheduled}`,
      `Past-due scheduled posts: ${pastDueScheduled.length}`,
      `Reasons: ${classification.reasons.join(', ') || 'unknown'}`,
      `Recovery: ${JSON.stringify(recoveryResult)}`,
      `Checked: ${now.toISOString()}`,
    ],
  );
  lastAlertAt = now.toISOString();
} else if (directAlertsEnabled && classification.healthy && previous.status && !['healthy', 'unconfigured'].includes(previous.status)) {
  alert = await sendAlert(
    `[CPH] ${siteName} Facebook delivery recovered`,
    [
      `${siteName} has recovered to ${published.length} confirmed Facebook posts in the rolling 24-hour window.`,
      `Minimum: ${minimumPosts}`,
      `Latest confirmed post: ${latest?.created_time || 'none'}`,
      `Checked: ${now.toISOString()}`,
    ],
  );
  lastAlertAt = now.toISOString();
}

const snapshot = {
  schema: 'cph-facebook-delivery-watchdog/v1',
  checked_at: now.toISOString(),
  profile,
  site_name: siteName,
  status: classification.status,
  healthy: classification.healthy,
  reasons: classification.reasons,
  target: {
    minimum_posts_rolling_24h: minimumPosts,
    maximum_latest_post_age_hours: maximumAgeHours,
    minimum_future_scheduled_posts: minimumFutureScheduled,
  },
  delivery: {
    published_rolling_24h: published.length,
    latest_published_at: latest?.created_time || null,
    latest_permalink: latest?.permalink_url || null,
    latest_age_hours: classification.latestAgeHours === null ? null : Math.round(classification.latestAgeHours * 100) / 100,
    future_scheduled: futureScheduled.length,
    past_due_scheduled: pastDueScheduled.length,
  },
  meta: {
    configured,
    api_ok: configured && !apiError,
    error: apiError || null,
  },
  consecutive_breaches: consecutiveBreaches,
  recovery: recoveryResult,
  alert,
};
const nextState = {
  status: classification.status,
  consecutive_breaches: consecutiveBreaches,
  last_alert_at: lastAlertAt,
  last_recovery_at: lastRecoveryAt,
  target_signature: targetSignature,
  checked_at: now.toISOString(),
};

await atomicWriteJson(statusFile, snapshot);
await atomicWriteJson(stateFile, nextState);
await appendFile(historyFile, `${JSON.stringify(snapshot)}\n`, { mode: 0o600 });
console.log(JSON.stringify(snapshot, null, 2));

if (failOnBreach && !classification.healthy && classification.status !== 'unconfigured') {
  process.exitCode = 1;
}
