#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';

const workerDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(workerDirectory, '..', '..');
const statePath = path.resolve(process.env.CPH_CODEX_USAGE_STATE || path.join(projectRoot, 'artifacts', 'locks', 'cph-codex-usage-state.json'));

export function classifyUsage(usedPercent, reachedType = null, resetDetected = false) {
  const used = Math.max(0, Math.min(100, Number(usedPercent) || 0));
  if (reachedType || used > 80) {
    return {
      mode: 'protect',
      governor_interval_hours: 12,
      production_interval_minutes: 240,
      recommended_rrule: 'RRULE:FREQ=HOURLY;INTERVAL=4',
      creator_max_jobs: 2,
      fan_max_roles: 0,
      pause_noncritical_fan_work: true,
    };
  }
  if (used >= 50) {
    return {
      mode: 'slow',
      governor_interval_hours: 12,
      production_interval_minutes: 60,
      recommended_rrule: 'RRULE:FREQ=HOURLY;INTERVAL=1',
      creator_max_jobs: 4,
      fan_max_roles: 4,
      pause_noncritical_fan_work: false,
    };
  }
  return {
    mode: 'capacity_burst',
    governor_interval_hours: 12,
    production_interval_minutes: 15,
    recommended_rrule: 'RRULE:FREQ=MINUTELY;INTERVAL=15',
    creator_max_jobs: 8,
    fan_max_roles: 8,
    burst_trigger: resetDetected
      ? 'automatic_usage_reset_detected'
      : 'more_than_50_percent_usage_remaining',
    pause_noncritical_fan_work: false,
  };
}

export function detectUsageEvents(previous, current) {
  const previousUsed = Number(previous?.used_percent);
  const currentUsed = Number(current?.used_percent);
  const previousResetsAt = Number(previous?.primary?.resetsAt);
  const currentResetsAt = Number(current?.primary?.resetsAt);
  const previousCredits = Number(previous?.reset_credits_available || 0);
  const currentCredits = Number(current?.reset_credits_available || 0);
  const usageDropped = Number.isFinite(previousUsed)
    && Number.isFinite(currentUsed)
    && previousUsed - currentUsed >= 5;
  const resetTimestampAdvanced = Number.isFinite(previousResetsAt)
    && Number.isFinite(currentResetsAt)
    && currentResetsAt > previousResetsAt
    && currentUsed <= previousUsed;
  return {
    usage_window_reset_detected: usageDropped || resetTimestampAdvanced,
    usage_percent_drop: usageDropped ? previousUsed - currentUsed : 0,
    reset_timestamp_advanced: resetTimestampAdvanced,
    new_reset_credit_detected: currentCredits > previousCredits,
  };
}

async function readPreviousState() {
  try {
    return JSON.parse(await readFile(statePath, 'utf8'));
  } catch {
    return null;
  }
}

async function atomicWriteJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, file);
}

async function readRateLimits() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.CODEX_CLI_BIN || 'codex', ['app-server'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const lines = readline.createInterface({ input: child.stdout });
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Codex rate-limit read timed out.'));
    }, 15_000);
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);
    lines.on('line', (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      if (message.id === 0) {
        send({ method: 'initialized', params: {} });
        send({ method: 'account/rateLimits/read', id: 6, params: {} });
      }
      if (message.id === 6) {
        clearTimeout(timeout);
        child.kill();
        if (message.error) {
          reject(new Error(String(message.error.message || JSON.stringify(message.error))));
          return;
        }
        resolve(message.result || {});
      }
    });
    child.on('close', (code) => {
      if (code && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(stderr.trim() || `Codex app-server exited ${code}.`));
      }
    });
    send({
      method: 'initialize',
      id: 0,
      params: {
        clientInfo: {
          name: 'cph_usage_monitor',
          title: 'Creator Publishing Hub Usage Monitor',
          version: '0.1.0',
        },
      },
    });
  });
}

async function main() {
  const payload = await readRateLimits();
  const bucket = payload?.rateLimitsByLimitId?.codex || payload?.rateLimits || {};
  const windowRows = [bucket?.primary, bucket?.secondary].filter(Boolean);
  const usedPercent = Math.max(0, ...windowRows.map((row) => Number(row?.usedPercent) || 0));
  const resetCredits = payload?.rateLimitResetCredits;
  const current = {
    checked_at: new Date().toISOString(),
    limit_id: bucket?.limitId || 'codex',
    used_percent: usedPercent,
    primary: bucket?.primary || null,
    secondary: bucket?.secondary || null,
    rate_limit_reached_type: bucket?.rateLimitReachedType || null,
    reset_credits_available: Math.max(0, Number(resetCredits?.availableCount) || 0),
  };
  const previous = await readPreviousState();
  const events = detectUsageEvents(previous, current);
  const throttle = classifyUsage(
    current.used_percent,
    current.rate_limit_reached_type,
    events.usage_window_reset_detected,
  );
  const state = {
    schema: 'cph-codex-usage-mode/v1',
    ...current,
    ...events,
    throttle,
    reset_credit_policy: 'detect_only_never_consume_without_explicit_user_authorization',
  };
  await atomicWriteJson(statePath, state);
  console.log(JSON.stringify(state, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exit(1);
  });
}
