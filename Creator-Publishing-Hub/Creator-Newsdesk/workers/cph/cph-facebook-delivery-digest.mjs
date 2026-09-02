#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { digestDecision, digestEmail, summarizeFleet } from './facebook-delivery-digest-lib.mjs';
import { parseRecipients, positiveInteger } from './facebook-delivery-watchdog-lib.mjs';

const workerDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(workerDirectory, '..', '..');
const now = new Date();
const profiles = String(process.env.CPH_DIGEST_PROFILES || 'thefactologydaily,dailysmirk,creditrepairchoices')
  .split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
const recipients = parseRecipients(process.env.CPH_DIGEST_EMAILS || process.env.CPH_ALERT_EMAILS);
const minimumAgeHours = positiveInteger(process.env.CPH_DIGEST_MIN_ISSUE_AGE_HOURS, 3);
const repeatHours = positiveInteger(process.env.CPH_DIGEST_REPEAT_HOURS, 168);
const statusRoot = path.resolve(process.env.CPH_FACEBOOK_DELIVERY_ARTIFACTS || path.join(projectRoot, 'artifacts', 'facebook-delivery'));
const outputRoot = path.resolve(process.env.CPH_FACEBOOK_DIGEST_ARTIFACTS || path.join(projectRoot, 'artifacts', 'facebook-delivery-digest'));
const stateFile = path.join(outputRoot, 'state.json');
const statusFile = path.join(outputRoot, 'latest.json');

async function readJson(file, fallback = {}) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

async function atomicWriteJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, file);
}

async function sendmail(subject, lines) {
  if (!recipients.length) return { attempted: false, reason: 'no_digest_recipients' };
  const message = [`To: ${recipients.join(', ')}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=UTF-8', '', ...lines, ''].join('\n');
  return new Promise((resolve) => {
    const child = spawn('/usr/sbin/sendmail', ['-t'], { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    const timeout = setTimeout(() => child.kill('SIGTERM'), 20_000);
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', (error) => { clearTimeout(timeout); resolve({ attempted: true, sent: false, error: String(error.message || error).slice(0, 300) }); });
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0 ? { attempted: true, sent: true, recipients: recipients.length } : { attempted: true, sent: false, error: `sendmail exited ${code}: ${stderr.slice(0, 240)}` });
    });
    child.stdin.end(message);
  });
}

const snapshots = await Promise.all(profiles.map(async (profile) => {
  const snapshot = await readJson(path.join(statusRoot, `${profile}.json`), null);
  return snapshot || { profile, site_name: profile, checked_at: null, healthy: false, meta: { configured: true, api_ok: true }, delivery: {} };
}));
const previous = await readJson(stateFile);
const summary = summarizeFleet(snapshots, { now });
const decision = digestDecision({ summary, previous, now, minimumAgeHours, repeatHours });
let email = { attempted: false, reason: decision.reason };
if (decision.send) {
  const content = digestEmail(summary);
  email = await sendmail(content.subject, content.lines);
}
const nextState = {
  fingerprint: decision.fingerprint,
  first_seen_at: decision.firstSeenAt,
  last_sent_at: email.sent ? now.toISOString() : (decision.fingerprint === previous.fingerprint ? previous.last_sent_at || null : null),
  checked_at: now.toISOString(),
};
const snapshot = {
  schema: 'cph-facebook-delivery-digest/v1',
  checked_at: now.toISOString(),
  profiles,
  summary,
  decision,
  email,
};
await atomicWriteJson(stateFile, nextState);
await atomicWriteJson(statusFile, snapshot);
console.log(JSON.stringify(snapshot, null, 2));
