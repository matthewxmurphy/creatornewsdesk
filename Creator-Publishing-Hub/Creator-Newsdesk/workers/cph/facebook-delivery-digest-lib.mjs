import { createHash } from 'node:crypto';

function siteName(snapshot) {
  return String(snapshot?.site_name || snapshot?.profile || 'Unknown Page');
}

function authFailure(snapshot) {
  if (snapshot?.meta?.configured === false) return true;
  const error = String(snapshot?.meta?.error || '');
  return snapshot?.meta?.api_ok === false && /oauth|access token|permission|session|credential|authorized/i.test(error);
}

export function summarizeFleet(snapshots = [], { now = new Date(), staleHours = 2 } = {}) {
  const actionable = [];
  const automatic = [];
  const healthy = [];
  for (const snapshot of snapshots) {
    const name = siteName(snapshot);
    const checked = Date.parse(snapshot?.checked_at || '');
    const stale = !Number.isFinite(checked) || now.valueOf() - checked > staleHours * 3_600_000;
    if (stale) {
      automatic.push({ site: name, issue: 'Its monitor is late.', response: 'The monitoring service will be restarted automatically.' });
      continue;
    }
    if (snapshot?.healthy) {
      healthy.push(name);
      continue;
    }
    if (authFailure(snapshot)) {
      actionable.push({
        site: name,
        issue: 'Facebook is no longer accepting the saved Page connection.',
        action: 'Reconnect this Facebook Page in Creator Publishing Hub. No other troubleshooting is needed.',
      });
      continue;
    }
    const published = Number(snapshot?.delivery?.published_rolling_24h || 0);
    const scheduled = Number(snapshot?.delivery?.future_scheduled || 0);
    const pastDue = Number(snapshot?.delivery?.past_due_scheduled || 0);
    const details = [
      `${published} ${published === 1 ? 'post' : 'posts'} confirmed in the last 24 hours`,
      `${scheduled} future ${scheduled === 1 ? 'post' : 'posts'} queued`,
    ];
    if (pastDue) details.push(`${pastDue} older scheduled posts being moved forward`);
    automatic.push({
      site: name,
      issue: details.join('; ') + '.',
      response: 'The scheduler, image queue, and recovery workers own this issue. No action is needed from you.',
    });
  }
  return { actionable, automatic, healthy };
}

export function digestFingerprint(actionable = []) {
  const normalized = actionable.map((item) => ({ site: item.site, issue: item.issue, action: item.action }))
    .sort((left, right) => left.site.localeCompare(right.site));
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function digestDecision({ summary, previous = {}, now = new Date(), minimumAgeHours = 3, repeatHours = 168 }) {
  if (!summary.actionable.length) {
    return { send: false, reason: 'no_human_action_required', fingerprint: '', firstSeenAt: null };
  }
  const fingerprint = digestFingerprint(summary.actionable);
  const sameIssue = previous.fingerprint === fingerprint;
  const firstSeenAt = sameIssue && previous.first_seen_at ? previous.first_seen_at : now.toISOString();
  const firstSeenTime = Date.parse(firstSeenAt);
  if (!Number.isFinite(firstSeenTime) || now.valueOf() - firstSeenTime < minimumAgeHours * 3_600_000) {
    return { send: false, reason: 'waiting_for_automatic_recovery', fingerprint, firstSeenAt };
  }
  const lastSentTime = sameIssue ? Date.parse(previous.last_sent_at || '') : NaN;
  if (Number.isFinite(lastSentTime) && now.valueOf() - lastSentTime < repeatHours * 3_600_000) {
    return { send: false, reason: 'digest_repeat_suppressed', fingerprint, firstSeenAt };
  }
  return { send: true, reason: 'human_action_required', fingerprint, firstSeenAt };
}

export function digestEmail(summary) {
  const count = summary.actionable.length;
  const subject = `[CPH] ${count} publishing ${count === 1 ? 'issue needs' : 'issues need'} your help`;
  const lines = [
    'Creator Publishing Hub tried automatic recovery before sending this summary.',
    '',
    'What you need to do:',
  ];
  summary.actionable.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.site}`);
    lines.push(`   Issue: ${item.issue}`);
    lines.push(`   Action: ${item.action}`);
  });
  if (summary.automatic.length) {
    lines.push('', 'Already being handled automatically:');
    for (const item of summary.automatic) lines.push(`- ${item.site}: ${item.issue} ${item.response}`);
  }
  if (summary.healthy.length) lines.push('', `Healthy: ${summary.healthy.join(', ')}.`);
  lines.push('', 'You will not receive another email for the same issue for seven days unless the required action changes.');
  return { subject, lines };
}
