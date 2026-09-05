export const AUDIENCE_INACTIVITY_MONTHS = 3;

const TRUSTED_ACTIVITY_REVISIONS = new Set([
  'multi-post-v4-shared-post-safe',
  'multi-post-v5-rolling-inactivity',
]);

export function activityEvidenceTrusted(person) {
  return TRUSTED_ACTIVITY_REVISIONS.has(String(person?.activityObserverRevision || ''));
}

export function removedFromRoster(person) {
  return person?.decision === 'removed';
}

export function minorBlockActive(person) {
  return person?.decision === 'blocked-minor' || person?.profileState === 'minor-blocked';
}

export function rollingMonthCutoff(nowValue = Date.now(), months = AUDIENCE_INACTIVITY_MONTHS) {
  const now = new Date(nowValue);
  if (!Number.isFinite(now.valueOf())) return new Date(Number.NaN);
  const cutoff = new Date(now);
  const day = cutoff.getUTCDate();
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - Math.max(1, Number(months) || AUDIENCE_INACTIVITY_MONTHS));
  const lastDay = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
  cutoff.setUTCDate(Math.min(day, lastDay));
  return cutoff;
}

export function lastVisiblePostTimestamp(person) {
  const observation = person?.profileObservation || {};
  for (const value of [observation.lastPostAt, observation.latestVisiblePost?.postedAt]) {
    const parsed = Date.parse(String(value || ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
}

export function compareInactiveOldestFirst(left, right) {
  const leftPost = lastVisiblePostTimestamp(left);
  const rightPost = lastVisiblePostTimestamp(right);
  if (Number.isFinite(leftPost) && Number.isFinite(rightPost) && leftPost !== rightPost) return leftPost - rightPost;
  if (Number.isFinite(leftPost) !== Number.isFinite(rightPost)) return Number.isFinite(leftPost) ? -1 : 1;
  return String(left?.name || '').localeCompare(String(right?.name || ''));
}

export function inactiveForReview(person, { now = Date.now(), months = AUDIENCE_INACTIVITY_MONTHS } = {}) {
  if (!activityEvidenceTrusted(person)) return false;
  const lastPost = lastVisiblePostTimestamp(person);
  if (Number.isFinite(lastPost)) return lastPost <= rollingMonthCutoff(now, months).valueOf();
  return ['inactive-review', 'stale-2024-or-earlier-review'].includes(String(person?.activityReviewState || ''));
}

export function matchesAudienceStatus(person, filter, { age = null, now = Date.now() } = {}) {
  const removed = removedFromRoster(person);
  if (filter === 'removed') return removed;
  if (removed) return false;

  const trusted = activityEvidenceTrusted(person);
  const minorBlocked = minorBlockActive(person);
  const inactive = inactiveForReview(person, { now });

  if (filter === 'all') return true;
  if (filter === 'candidate') {
    if (minorBlocked) return false;
    return person?.decision === 'candidate'
      || (trusted && (['closer-review', 'memorial-review'].includes(person?.profileState) || inactive));
  }
  if (filter === 'memorial') return !minorBlocked && trusted && person?.profileState === 'memorial-review';
  if (filter === 'minor') return minorBlocked || (age !== null && age < 18);
  if (filter === 'stale') return !minorBlocked && inactive;
  if (filter === 'linked') return Boolean(person?.id || person?.url);
  if (filter === 'unlinked') return !person?.id && !person?.url;
  if (filter === 'top-engager') return person?.engagementLevel === 'top-engager';
  if (filter === 'consistent') return person?.engagementLevel === 'consistent';
  if (filter === 'engaged') return ['engaged', 'light'].includes(person?.tier);
  return person?.tier === filter;
}

