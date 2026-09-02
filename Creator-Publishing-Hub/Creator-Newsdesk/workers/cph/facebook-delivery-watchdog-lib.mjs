export function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function nonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function safeProfileKey(value) {
  return String(value || 'facebook-page')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'facebook-page';
}

export function parseRecipients(value) {
  return [...new Set(String(value || '')
    .split(/[;,\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entry)))];
}

export function classifyDelivery({
  configured,
  apiError = '',
  publishedCount = 0,
  minimumPosts = 1,
  latestPublishedAt = null,
  maximumAgeHours = 26,
  futureScheduledCount = 0,
  minimumFutureScheduled = 0,
  pastDueScheduledCount = 0,
  now = new Date(),
}) {
  if (!configured) {
    return {
      status: 'unconfigured',
      healthy: false,
      reasons: ['facebook_page_credentials_missing'],
      latestAgeHours: null,
    };
  }
  if (apiError) {
    return {
      status: 'api_error',
      healthy: false,
      reasons: ['meta_published_posts_unavailable'],
      latestAgeHours: null,
    };
  }

  const latestTime = latestPublishedAt ? Date.parse(latestPublishedAt) : NaN;
  const latestAgeHours = Number.isFinite(latestTime)
    ? Math.max(0, (now.valueOf() - latestTime) / 3_600_000)
    : null;
  const reasons = [];
  if (publishedCount < minimumPosts) reasons.push('rolling_24h_below_minimum');
  if (latestAgeHours === null) reasons.push('no_published_post_found');
  else if (latestAgeHours > maximumAgeHours) reasons.push('latest_post_too_old');
  if (futureScheduledCount < minimumFutureScheduled) reasons.push('future_schedule_below_minimum');
  if (pastDueScheduledCount > 0) reasons.push('past_due_scheduled_posts_present');

  if (!reasons.length) {
    return { status: 'healthy', healthy: true, reasons: [], latestAgeHours };
  }
  const critical = publishedCount === 0
    || latestAgeHours === null
    || latestAgeHours > maximumAgeHours
    || pastDueScheduledCount > 0;
  return {
    status: critical ? 'critical' : 'degraded',
    healthy: false,
    reasons,
    latestAgeHours,
  };
}

export function recoveryDecision({
  status,
  consecutiveBreaches,
  requiredBreaches,
  futureScheduledCount,
  pastDueScheduledCount,
  lastRecoveryAt,
  cooldownHours,
  recoveryConfigured,
  minimumFutureScheduled = 0,
  now = new Date(),
}) {
  if (!['critical', 'degraded'].includes(status)) return { attempt: false, reason: 'delivery_not_in_breach' };
  if (!recoveryConfigured) return { attempt: false, reason: 'recovery_not_configured' };
  if (consecutiveBreaches < requiredBreaches) return { attempt: false, reason: 'waiting_for_consecutive_confirmation' };

  const lastRecoveryTime = lastRecoveryAt ? Date.parse(lastRecoveryAt) : NaN;
  if (Number.isFinite(lastRecoveryTime) && now.valueOf() - lastRecoveryTime < cooldownHours * 3_600_000) {
    return { attempt: false, reason: 'recovery_cooldown_active' };
  }
  if (pastDueScheduledCount > 0) return { attempt: true, reason: 'past_due_schedule_recovery' };
  if (minimumFutureScheduled > 0 && futureScheduledCount >= minimumFutureScheduled) {
    return { attempt: false, reason: 'future_schedule_target_met' };
  }
  if (minimumFutureScheduled === 0 && futureScheduledCount > 0) {
    return { attempt: false, reason: 'future_schedule_already_present' };
  }
  return { attempt: true, reason: 'confirmed_delivery_breach' };
}

export function shouldSendAlert({
  previousStatus,
  status,
  previousTargetSignature = '',
  targetSignature = '',
  lastAlertAt,
  repeatHours,
  now = new Date(),
}) {
  if (status === 'healthy' || status === 'unconfigured') return false;
  if (previousStatus !== status) return true;
  if (previousTargetSignature !== targetSignature) return true;
  const lastAlertTime = lastAlertAt ? Date.parse(lastAlertAt) : NaN;
  return !Number.isFinite(lastAlertTime) || now.valueOf() - lastAlertTime >= repeatHours * 3_600_000;
}
