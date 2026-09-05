const FACEBOOK_HOST = 'www.facebook.com';

export const PAGE_FOLLOWER_CONFIG = Object.freeze({
  pageId: '61586176289229',
  pageName: 'Matthew Murphy : Built Not Begged',
  pageUrl: 'https://www.facebook.com/matthewxmurphybuiltnotbegged',
  followersUrl: 'https://www.facebook.com/matthewxmurphybuiltnotbegged/followers',
});

function facebookProfileUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.hostname !== FACEBOOK_HOST) return '';
    const path = url.pathname.replace(/\/+$/, '');
    if (!path || path === '/matthewxmurphybuiltnotbegged') return '';
    if (/^\/(?:groups|pages|watch|reel|videos|professional_dashboard|notifications|messages)(?:\/|$)/i.test(path)) return '';
    url.protocol = 'https:';
    url.search = url.pathname === '/profile.php' && /^\d+$/.test(url.searchParams.get('id') || '')
      ? `?id=${url.searchParams.get('id')}`
      : '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

function facebookId(value, url = '') {
  const explicit = String(value || '').replace(/\D/g, '');
  if (explicit) return explicit;
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/profile.php' ? String(parsed.searchParams.get('id') || '').replace(/\D/g, '') : '';
  } catch {
    return '';
  }
}

function identityKey(person = {}) {
  const actorUrl = facebookProfileUrl(person.actorUrl || person.url);
  const actorId = facebookId(person.actorId || person.id, actorUrl);
  return actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : '';
}

function cleanName(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function countValue(value) {
  const parsed = Number(String(value || '').replace(/[^\d]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

export function emptyPageFollowerRoster() {
  return {
    version: 1,
    pageId: PAGE_FOLLOWER_CONFIG.pageId,
    pageName: PAGE_FOLLOWER_CONFIG.pageName,
    pageUrl: PAGE_FOLLOWER_CONFIG.pageUrl,
    followersUrl: PAGE_FOLLOWER_CONFIG.followersUrl,
    reportedTotal: 0,
    complete: false,
    people: [],
    snapshots: [],
    updatedAt: null,
  };
}

export function mergePageFollowerCapture(ledger = {}, capture = {}, capturedAtValue = new Date().toISOString()) {
  const capturedAt = new Date(capturedAtValue).toISOString();
  const sourceUrl = String(capture.sourceUrl || '');
  if (!sourceUrl.startsWith(PAGE_FOLLOWER_CONFIG.followersUrl)) {
    throw new TypeError('The Built Not Begged Page followers URL is required.');
  }
  const next = { ...emptyPageFollowerRoster(), ...ledger };
  const records = new Map((next.people || []).map((person) => [person.identityKey || identityKey(person), person]).filter(([key]) => key));
  let accepted = 0;
  for (const raw of Array.isArray(capture.people) ? capture.people : []) {
    const actorUrl = facebookProfileUrl(raw.actorUrl || raw.url);
    const actorId = facebookId(raw.actorId || raw.id, actorUrl);
    const actorName = cleanName(raw.actorName || raw.name);
    const key = actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : '';
    if (!key || !actorName) continue;
    const existing = records.get(key) || {};
    records.set(key, {
      ...existing,
      identityKey: key,
      actorId,
      actorUrl,
      actorName,
      avatar: String(raw.avatar || existing.avatar || '').slice(0, 1500),
      subtitle: String(raw.subtitle || existing.subtitle || '').replace(/\s+/g, ' ').trim().slice(0, 500),
      firstSeenAt: existing.firstSeenAt || capturedAt,
      lastSeenAt: capturedAt,
    });
    accepted += 1;
  }
  const capturedTotal = Math.max(countValue(capture.pageTotal), countValue(capture.reportedTotal));
  const incomingComplete = capture.complete === true && capturedTotal > 0 && incomingIdentityCount(capture.people) === capturedTotal;
  const reportedTotal = incomingComplete ? capturedTotal : Math.max(countValue(next.reportedTotal), capturedTotal);
  next.people = (incomingComplete
    ? [...(capture.people || [])].map((person) => records.get(identityKey(person))).filter(Boolean)
    : [...records.values()]
  ).sort((left, right) => left.actorName.localeCompare(right.actorName));
  next.reportedTotal = reportedTotal || next.people.length;
  next.complete = incomingComplete || (next.complete === true && next.reportedTotal > 0 && next.people.length === next.reportedTotal);
  next.updatedAt = capturedAt;
  const previousSnapshot = [...(next.snapshots || [])].at(-1);
  if (!previousSnapshot || previousSnapshot.reportedTotal !== next.reportedTotal || previousSnapshot.linked !== next.people.length) {
    next.snapshots = [...(next.snapshots || []), {
      observedAt: capturedAt,
      reportedTotal: next.reportedTotal,
      linked: next.people.length,
      complete: next.complete,
    }].slice(-180);
  }
  return { ledger: next, accepted };
}

function incomingIdentityCount(people = []) {
  return new Set((Array.isArray(people) ? people : []).map(identityKey).filter(Boolean)).size;
}

export function pageFollowerRosterSummary(ledger = {}, engagementRows = []) {
  const rows = new Map();
  for (const row of engagementRows || []) {
    const idKey = row.actorId ? `facebook-id:${String(row.actorId).replace(/\D/g, '')}` : '';
    const urlKey = row.actorUrl ? `facebook-url:${facebookProfileUrl(row.actorUrl)}` : '';
    if (idKey) rows.set(idKey, row);
    if (urlKey && urlKey !== 'facebook-url:') rows.set(urlKey, row);
  }
  const people = (ledger.people || []).map((person) => {
    const engagement = rows.get(person.identityKey)
      || rows.get(person.actorId ? `facebook-id:${person.actorId}` : '')
      || rows.get(person.actorUrl ? `facebook-url:${facebookProfileUrl(person.actorUrl)}` : '')
      || null;
    return {
      ...person,
      engagement: engagement ? {
        score: Number(engagement.engagementScore || 0),
        level: engagement.engagementLevel || 'light',
        reactions: Number(engagement.reactions || 0),
        comments: Number(engagement.comments || 0),
        shares: Number(engagement.shares || 0),
        mentions: Number(engagement.mentions || 0),
        posts: Number(engagement.uniquePosts || 0),
        lastEngagedAt: engagement.lastEngagedAt || null,
      } : { score: 0, level: 'monitoring', reactions: 0, comments: 0, shares: 0, mentions: 0, posts: 0, lastEngagedAt: null },
    };
  }).sort((left, right) => right.engagement.score - left.engagement.score || left.actorName.localeCompare(right.actorName));
  const reportedTotal = countValue(ledger.reportedTotal) || people.length;
  const linkedFollowers = people.length;
  const engagedFollowers = people.filter((person) => person.engagement.score > 0).length;
  return {
    pageId: PAGE_FOLLOWER_CONFIG.pageId,
    pageName: PAGE_FOLLOWER_CONFIG.pageName,
    pageUrl: PAGE_FOLLOWER_CONFIG.pageUrl,
    followersUrl: PAGE_FOLLOWER_CONFIG.followersUrl,
    reportedTotal,
    linkedFollowers,
    unlinkedFollowers: Math.max(0, reportedTotal - linkedFollowers),
    coveragePercent: reportedTotal ? Math.min(100, Math.round((linkedFollowers / reportedTotal) * 1000) / 10) : 0,
    complete: ledger.complete === true && reportedTotal > 0 && linkedFollowers === reportedTotal,
    engagedFollowers,
    monitoringFollowers: Math.max(0, linkedFollowers - engagedFollowers),
    updatedAt: ledger.updatedAt || null,
    people,
    topEngaged: people.filter((person) => person.engagement.score > 0).slice(0, 8),
    unfollowPolicy: 'Roster changes remain aggregate until complete consecutive Facebook rosters prove a loss. No individual is labeled as an unfollower from a partial scroll.',
  };
}

