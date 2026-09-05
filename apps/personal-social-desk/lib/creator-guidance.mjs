const ALLOWED_SOURCE_TYPES = new Set(['official-facebook-creators', 'professional-dashboard-tip']);

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    const official = url.hostname === 'creators.facebook.com';
    const dashboard = url.hostname === 'www.facebook.com' && url.pathname.startsWith('/professional_dashboard');
    if (!official && !dashboard) return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function normalizeGuidance(raw, capturedAt) {
  const sourceType = String(raw?.sourceType || '');
  const url = normalizeUrl(raw?.url || raw?.sourceUrl);
  const title = String(raw?.title || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const angle = String(raw?.angle || raw?.context || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  if (!ALLOWED_SOURCE_TYPES.has(sourceType) || !url || !title || !angle) return null;
  return {
    key: `${sourceType}|${url}|${title.toLocaleLowerCase()}`,
    sourceType,
    category: String(raw?.category || '').replace(/[^a-z-]/gi, '').toLocaleLowerCase().slice(0, 40),
    title,
    angle,
    url,
    capturedAt: raw?.observedAt || capturedAt,
  };
}

export function mergeCreatorGuidance(ledger = {}, rawItems = [], capturedAt = new Date().toISOString()) {
  const items = new Map((ledger.items || []).map((item) => [item.key, item]));
  let accepted = 0;
  let added = 0;
  for (const raw of Array.isArray(rawItems) ? rawItems.slice(0, 200) : []) {
    const normalized = normalizeGuidance(raw, capturedAt);
    if (!normalized) continue;
    accepted += 1;
    const existing = items.get(normalized.key);
    if (!existing) added += 1;
    items.set(normalized.key, {
      ...existing,
      ...normalized,
      firstSeenAt: existing?.firstSeenAt || normalized.capturedAt,
      lastSeenAt: normalized.capturedAt,
      seenCount: Number(existing?.seenCount || 0) + 1,
    });
  }
  return { accepted, added, ledger: { updatedAt: capturedAt, items: [...items.values()].slice(-500) } };
}

export function currentCreatorGuidance(ledger = {}, now = new Date()) {
  const cutoff = now.valueOf() - 180 * 86400000;
  return (ledger.items || [])
    .filter((item) => new Date(item.lastSeenAt || item.capturedAt || 0).valueOf() >= cutoff)
    .sort((left, right) => new Date(right.lastSeenAt || 0) - new Date(left.lastSeenAt || 0));
}


