const DAY_MS = 86_400_000;

export const FOLLOWER_GROWTH_CONFIG = Object.freeze({
  pageId: '61586176289229',
  pageName: 'Matthew Murphy : Built Not Begged',
  pageUrl: 'https://www.facebook.com/matthewxmurphybuiltnotbegged',
  targetFollowers: 500,
  targetPaceDays: 30,
  holdDaysRequired: 30,
});

function timestamp(value, label) {
  const parsed = new Date(value || '');
  if (!Number.isFinite(parsed.getTime())) throw new TypeError(`${label} must be a valid timestamp.`);
  return parsed.toISOString();
}

function followerCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) throw new TypeError('followers must be a non-negative number.');
  return Math.round(count);
}

function verifiedPageUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.hostname !== 'www.facebook.com' || !url.pathname.startsWith('/matthewxmurphybuiltnotbegged')) return '';
    url.protocol = 'https:';
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

export function mergeFollowerGrowthCapture(ledger = {}, capture = {}, observedAtValue = new Date().toISOString()) {
  const observedAt = timestamp(observedAtValue, 'observedAt');
  const sourceUrl = verifiedPageUrl(capture.sourceUrl);
  if (!sourceUrl) throw new TypeError('A visible Built Not Begged Facebook Page URL is required.');
  const followers = followerCount(capture.followers);
  const targetFollowers = Number(ledger.targetFollowers || FOLLOWER_GROWTH_CONFIG.targetFollowers);
  const baselineAt = ledger.baselineAt || observedAt;
  const baselineFollowers = Number.isFinite(Number(ledger.baselineFollowers))
    ? Number(ledger.baselineFollowers)
    : followers;
  const targetDate = ledger.targetDate
    || new Date(Date.parse(baselineAt) + FOLLOWER_GROWTH_CONFIG.targetPaceDays * DAY_MS).toISOString();
  let holdStartedAt = ledger.holdStartedAt || null;
  let holdQualifiedAt = ledger.holdQualifiedAt || null;
  if (followers >= targetFollowers) {
    holdStartedAt ||= observedAt;
    if (!holdQualifiedAt && Date.parse(observedAt) - Date.parse(holdStartedAt) >= FOLLOWER_GROWTH_CONFIG.holdDaysRequired * DAY_MS) {
      holdQualifiedAt = observedAt;
    }
  } else {
    holdStartedAt = null;
    holdQualifiedAt = null;
  }
  const history = [...(Array.isArray(ledger.history) ? ledger.history : [])];
  const last = history[history.length - 1];
  if (!last || last.followers !== followers || last.observedAt !== observedAt) {
    history.push({
      followers,
      observedAt,
      source: String(capture.source || 'facebook-visible-page').slice(0, 80),
      sourceUrl,
    });
  }
  return {
    version: 1,
    pageId: FOLLOWER_GROWTH_CONFIG.pageId,
    pageName: FOLLOWER_GROWTH_CONFIG.pageName,
    pageUrl: FOLLOWER_GROWTH_CONFIG.pageUrl,
    targetFollowers,
    targetPaceDays: FOLLOWER_GROWTH_CONFIG.targetPaceDays,
    holdDaysRequired: FOLLOWER_GROWTH_CONFIG.holdDaysRequired,
    baselineFollowers,
    baselineAt,
    targetDate,
    currentFollowers: followers,
    observedAt,
    source: String(capture.source || 'facebook-visible-page').slice(0, 80),
    sourceUrl,
    holdStartedAt,
    holdQualifiedAt,
    history: history.slice(-400),
    updatedAt: observedAt,
  };
}

export function followerGrowthSummary(ledger = {}, nowValue = new Date()) {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  const targetFollowers = Number(ledger.targetFollowers || FOLLOWER_GROWTH_CONFIG.targetFollowers);
  const currentFollowers = Math.max(0, Number(ledger.currentFollowers || 0));
  const baselineFollowers = Math.max(0, Number(ledger.baselineFollowers || currentFollowers));
  const remainingFollowers = Math.max(0, targetFollowers - currentFollowers);
  const targetDateTime = Date.parse(ledger.targetDate || '');
  const daysToTarget = Number.isFinite(targetDateTime)
    ? Math.max(1, Math.ceil((targetDateTime - now.getTime()) / DAY_MS))
    : FOLLOWER_GROWTH_CONFIG.targetPaceDays;
  const holdObservedThrough = Date.parse(ledger.observedAt || '');
  const holdStartedAt = Date.parse(ledger.holdStartedAt || '');
  const holdDaysCompleted = Number.isFinite(holdObservedThrough) && Number.isFinite(holdStartedAt)
    ? Math.min(FOLLOWER_GROWTH_CONFIG.holdDaysRequired, Math.max(0, Math.floor((holdObservedThrough - holdStartedAt) / DAY_MS)))
    : 0;
  return {
    ...FOLLOWER_GROWTH_CONFIG,
    updatedAt: ledger.updatedAt || null,
    observedAt: ledger.observedAt || null,
    source: ledger.source || '',
    baselineFollowers,
    baselineAt: ledger.baselineAt || null,
    currentFollowers,
    targetFollowers,
    targetDate: ledger.targetDate || null,
    remainingFollowers,
    netGain: currentFollowers - baselineFollowers,
    progressPercent: targetFollowers ? Math.min(100, Math.round((currentFollowers / targetFollowers) * 1000) / 10) : 0,
    sprintProgressPercent: targetFollowers > baselineFollowers
      ? Math.min(100, Math.max(0, Math.round(((currentFollowers - baselineFollowers) / (targetFollowers - baselineFollowers)) * 1000) / 10))
      : 100,
    daysToTarget,
    requiredPerDay: remainingFollowers ? Math.ceil(remainingFollowers / daysToTarget) : 0,
    targetReached: currentFollowers >= targetFollowers,
    holdStartedAt: ledger.holdStartedAt || null,
    holdQualifiedAt: ledger.holdQualifiedAt || null,
    holdDaysCompleted,
    holdDaysRemaining: Math.max(0, FOLLOWER_GROWTH_CONFIG.holdDaysRequired - holdDaysCompleted),
    history: [...(ledger.history || [])].slice(-60),
  };
}

