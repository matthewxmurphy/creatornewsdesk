const SOURCE_TYPES = new Set(['facebook-trending', 'dashboard-inspiration', 'your-performance']);

export function normalizeProfessionalHashtag(value) {
  const tag = String(value || '').normalize('NFKC').trim().replace(/^#+/, '').replace(/\s+/g, '');
  return /^[\p{L}\p{N}_]{2,64}$/u.test(tag) ? `#${tag}` : '';
}

function safeDashboardUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.hostname !== 'www.facebook.com' || !url.pathname.startsWith('/professional_dashboard')) return '';
    url.protocol = 'https:';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function validIso(value, fallback) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function normalizeSignal(signal, capturedAt) {
  const hashtag = normalizeProfessionalHashtag(signal?.hashtag);
  const sourceType = SOURCE_TYPES.has(signal?.sourceType) ? signal.sourceType : '';
  const sourceUrl = safeDashboardUrl(signal?.sourceUrl);
  if (!hashtag || !sourceType || !sourceUrl) return null;
  const metricValue = Number(signal.metricValue || 0);
  const rank = Number(signal.rank || 0);
  return {
    hashtag,
    sourceType,
    context: String(signal.context || '').replace(/\s+/g, ' ').trim().slice(0, 700),
    metricLabel: String(signal.metricLabel || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    metricValue: Number.isFinite(metricValue) && metricValue > 0 ? Math.round(metricValue) : 0,
    rank: Number.isInteger(rank) && rank > 0 && rank <= 1000 ? rank : null,
    sourceUrl,
    observedAt: validIso(signal.observedAt, capturedAt),
  };
}

function observationKey(observation) {
  const sixHourBucket = Math.floor(new Date(observation.observedAt).valueOf() / (6 * 60 * 60 * 1000));
  return [observation.sourceType, observation.sourceUrl, observation.context.toLocaleLowerCase(), observation.metricLabel.toLocaleLowerCase(), observation.metricValue, sixHourBucket].join('|');
}

export function mergeProfessionalTrendSignals(ledger = {}, signals = [], capturedAt = new Date().toISOString()) {
  const items = new Map((Array.isArray(ledger.items) ? ledger.items : []).map((item) => [String(item.hashtag || '').toLocaleLowerCase(), { ...item, observations: Array.isArray(item.observations) ? item.observations : [] }]));
  let accepted = 0;
  let added = 0;
  let updated = 0;
  for (const rawSignal of Array.isArray(signals) ? signals.slice(0, 250) : []) {
    const signal = normalizeSignal(rawSignal, capturedAt);
    if (!signal) continue;
    accepted += 1;
    const key = signal.hashtag.toLocaleLowerCase();
    const existing = items.get(key);
    if (!existing) {
      items.set(key, {
        hashtag: signal.hashtag,
        firstSeenAt: signal.observedAt,
        lastSeenAt: signal.observedAt,
        seenCount: 1,
        sourceTypes: [signal.sourceType],
        latest: signal,
        observations: [signal],
      });
      added += 1;
      continue;
    }
    const keys = new Set(existing.observations.map(observationKey));
    const duplicate = keys.has(observationKey(signal));
    existing.hashtag = signal.hashtag;
    existing.lastSeenAt = new Date(Math.max(new Date(existing.lastSeenAt || 0).valueOf() || 0, new Date(signal.observedAt).valueOf())).toISOString();
    existing.sourceTypes = [...new Set([...(existing.sourceTypes || []), signal.sourceType])];
    existing.latest = new Date(signal.observedAt) >= new Date(existing.latest?.observedAt || 0) ? signal : existing.latest;
    if (!duplicate) {
      existing.observations = [...existing.observations, signal].slice(-60);
      existing.seenCount = Number(existing.seenCount || 0) + 1;
      updated += 1;
    }
    items.set(key, existing);
  }
  const nextLedger = {
    updatedAt: accepted ? capturedAt : ledger.updatedAt || null,
    items: [...items.values()]
      .sort((left, right) => new Date(right.lastSeenAt || 0) - new Date(left.lastSeenAt || 0))
      .slice(0, 500),
  };
  return { ledger: nextLedger, accepted, added, updated };
}

function sourceWeight(item) {
  const types = new Set(item.sourceTypes || []);
  if (types.has('facebook-trending')) return 3;
  if (types.has('dashboard-inspiration')) return 2;
  return 1;
}

export function currentProfessionalTrends(ledger = {}, now = new Date(), maxAgeHours = 168) {
  const cutoff = now.valueOf() - maxAgeHours * 60 * 60 * 1000;
  return (Array.isArray(ledger.items) ? ledger.items : [])
    .filter((item) => new Date(item.lastSeenAt || 0).valueOf() >= cutoff)
    .sort((left, right) => sourceWeight(right) - sourceWeight(left)
      || Number(left.latest?.rank || 10_000) - Number(right.latest?.rank || 10_000)
      || Number(right.latest?.metricValue || 0) - Number(left.latest?.metricValue || 0)
      || new Date(right.lastSeenAt || 0) - new Date(left.lastSeenAt || 0));
}

export function professionalTrendSummary(ledger = {}, queue = {}, now = new Date()) {
  const current = currentProfessionalTrends(ledger, now);
  const sourceCount = (sourceType) => current.filter((item) => (item.sourceTypes || []).includes(sourceType)).length;
  const trendDrafts = (Array.isArray(queue.items) ? queue.items : []).filter((item) => String(item.source || '').startsWith('professional-trend:'));
  return {
    captured: Array.isArray(ledger.items) ? ledger.items.length : 0,
    active: current.length,
    facebookTrending: sourceCount('facebook-trending'),
    inspiration: sourceCount('dashboard-inspiration'),
    yourPerformance: sourceCount('your-performance'),
    draft: trendDrafts.filter((item) => item.status === 'draft').length,
    approved: trendDrafts.filter((item) => item.status === 'approved').length,
    scheduled: trendDrafts.filter((item) => item.status === 'dispatched').length,
    lastScanAt: ledger.updatedAt || null,
  };
}

