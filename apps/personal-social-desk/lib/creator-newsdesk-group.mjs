import { createHash, randomUUID } from 'node:crypto';

export const CREATOR_NEWSDESK_GROUP_CONFIG = Object.freeze({
  groupId: '1451130882820932',
  groupName: 'Built Not Begged: Creator Growth Hub',
  groupUrl: 'https://www.facebook.com/groups/1451130882820932/',
  actorName: 'Creator Newsdesk',
  actorGroupUserId: '61588385573147',
  businessPageId: '1036705946185500',
  sourceProfileName: 'Matthew Murphy',
  sourceProfileUrl: 'https://www.facebook.com/xmatthewxmurphyx',
  requiredHashtag: '#CreatorsListenUp',
  timezone: 'America/Chicago',
  dailyLimit: 6,
  minimumGapMinutes: 90,
  scheduleTimes: ['07:30', '10:30', '13:30', '16:30', '19:30', '22:30'],
  membershipState: 'joined-preapproved',
  publishingState: 'waiting-for-dedicated-page-context',
});

const PLATFORM_PATTERN = /\b(?:meta(?:\s+ai)?|facebook|instagram|threads|reels?|professional\s+(?:mode|dashboard)|content\s+monetization|stars\s+on\s+facebook|facebook\s+stars|meta\s+business\s+suite)\b/i;
const CREATOR_PATTERN = /\b(?:creator|content|monetiz(?:e|ed|ation|ing)|dashboard|reach|algorithm|audience|followers?|reels?|post(?:ing|s)?|video|page|engagement|copyright|original|translation|lip\s*sync)\b/i;
const PERSONAL_DATA_PATTERN = /\b(?:private\s+message|inbox\s+message|date\s+of\s+birth|home\s+address|phone\s+number|relationship\s+status|under\s*18\s+list)\b/i;

function cleanText(value = '') {
  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeForHash(value = '') {
  return cleanText(value).toLocaleLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[^a-z0-9#]+/g, ' ').trim();
}

function sourceId(postUrl, body) {
  return createHash('sha256').update(`${postUrl}|${normalizeForHash(body)}`).digest('hex').slice(0, 24);
}

export function canonicalMatthewPostUrl(value = '') {
  try {
    const url = new URL(value);
    if (!['facebook.com', 'www.facebook.com'].includes(url.hostname.toLocaleLowerCase())) return '';
    const path = url.pathname.replace(/\/{2,}/g, '/');
    const photoId = String(url.searchParams.get('fbid') || '').replace(/\D/g, '');
    if (path === '/photo/' && photoId) return `https://www.facebook.com/photo/?fbid=${photoId}`;
    const storyId = String(url.searchParams.get('story_fbid') || '').replace(/[^A-Za-z0-9_-]/g, '');
    const ownerId = String(url.searchParams.get('id') || '').replace(/\D/g, '');
    if (storyId) return `https://www.facebook.com/permalink.php?story_fbid=${storyId}${ownerId ? `&id=${ownerId}` : ''}`;
    const match = path.match(/^\/(xmatthewxmurphyx\/(?:posts|videos|reels?)\/[A-Za-z0-9._-]+|reel\/[A-Za-z0-9._-]+|videos\/[A-Za-z0-9._-]+)/i);
    return match ? `https://www.facebook.com/${match[1].replace(/\/$/, '')}` : '';
  } catch {
    return '';
  }
}

export function classifyCreatorNews(body = '') {
  const text = cleanText(body);
  const hashtag = /#creatorslistenup\b/i.test(text);
  const platform = PLATFORM_PATTERN.test(text);
  const creator = CREATOR_PATTERN.test(text);
  const personalData = PERSONAL_DATA_PATTERN.test(text);
  const topics = [];
  if (/\bfacebook\b/i.test(text)) topics.push('facebook');
  if (/\bmeta(?:\s+ai)?\b/i.test(text)) topics.push('meta');
  if (/\binstagram\b/i.test(text)) topics.push('instagram');
  if (/\bthreads\b/i.test(text)) topics.push('threads');
  if (/\breels?\b/i.test(text)) topics.push('reels');
  if (/\bmonetiz|\bstars\b/i.test(text)) topics.push('monetization');
  if (/\bdashboard|\bprofessional\s+mode/i.test(text)) topics.push('creator-tools');
  if (/\bcopyright|\boriginal\s+content/i.test(text)) topics.push('rights-and-originality');
  const reasons = [];
  if (!hashtag) reasons.push('missing #CreatorsListenUp');
  if (!platform) reasons.push('no Meta/Facebook platform signal');
  if (!creator) reasons.push('no creator-news context');
  if (personalData) reasons.push('contains private-person data');
  if (text.length < 40) reasons.push('too little source text');
  const eligible = hashtag && platform && creator && !personalData && text.length >= 40;
  return { eligible, score: Number(hashtag) * 40 + Number(platform) * 35 + Number(creator) * 25 - Number(personalData) * 100, reasons, topics: [...new Set(topics)] };
}

export function normalizeCreatorNewsSource(raw = {}, capturedAt = new Date().toISOString()) {
  const postUrl = canonicalMatthewPostUrl(raw.postUrl || raw.sourceUrl || '');
  const body = cleanText(raw.body || raw.postText || raw.text || '').slice(0, 12_000);
  if (!postUrl || !body) return null;
  const classification = classifyCreatorNews(body);
  const id = sourceId(postUrl, body);
  return {
    id,
    postKey: cleanText(raw.postKey).replace(/[^A-Za-z0-9:._-]/g, '').slice(0, 180),
    postUrl,
    body,
    hashtags: [...new Set((body.match(/#[\p{L}\p{N}_]+/gu) || []).map((tag) => tag.toLocaleLowerCase()))].slice(0, 30),
    timestampLabel: cleanText(raw.timestamp || raw.timestampLabel).slice(0, 160),
    sourceProfileName: CREATOR_NEWSDESK_GROUP_CONFIG.sourceProfileName,
    sourceProfileUrl: CREATOR_NEWSDESK_GROUP_CONFIG.sourceProfileUrl,
    capturedAt,
    lastSeenAt: capturedAt,
    eligibility: classification.eligible ? 'eligible' : 'filtered',
    relevanceScore: classification.score,
    filterReasons: classification.reasons,
    topics: classification.topics,
  };
}

export function mergeCreatorNewsSources(ledger = {}, rawSources = [], capturedAt = new Date().toISOString()) {
  const sources = Array.isArray(ledger.sources) ? ledger.sources : [];
  const byId = new Map(sources.map((source) => [source.id, source]));
  let accepted = 0;
  let added = 0;
  let eligibleAdded = 0;
  for (const raw of rawSources.slice(0, 250)) {
    const normalized = normalizeCreatorNewsSource(raw, capturedAt);
    if (!normalized) continue;
    accepted += 1;
    const existing = byId.get(normalized.id);
    if (existing) {
      byId.set(normalized.id, { ...existing, ...normalized, capturedAt: existing.capturedAt || normalized.capturedAt, lastSeenAt: capturedAt });
      continue;
    }
    byId.set(normalized.id, normalized);
    added += 1;
    if (normalized.eligibility === 'eligible') eligibleAdded += 1;
  }
  const merged = [...byId.values()]
    .sort((left, right) => new Date(right.lastSeenAt || right.capturedAt || 0) - new Date(left.lastSeenAt || left.capturedAt || 0))
    .slice(0, 20_000);
  return { ledger: { updatedAt: capturedAt, sources: merged }, accepted, added, eligibleAdded };
}

function dateParts(date, timezone) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return values;
}

function dateKey(date, timezone) {
  const parts = dateParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
}

function zonedDate(key, time, timezone) {
  const [year, month, day] = key.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  let value = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = dateParts(new Date(value), timezone);
    const actualAsUtc = Date.UTC(Number(actual.year), Number(actual.month) - 1, Number(actual.day), Number(actual.hour), Number(actual.minute));
    value += Date.UTC(year, month - 1, day, hour, minute) - actualAsUtc;
  }
  return new Date(value);
}

function groupPostBody(source) {
  const body = cleanText(source.body)
    .replace(/(?:\n|^)\s*[—-]\s*Matthew Murphy\s*(?=\n|$)/gi, '')
    .trim();
  const hashtags = [];
  if (!/#creatorslistenup\b/i.test(body)) hashtags.push('#CreatorsListenUp');
  if (!/#creatornewsdesk\b/i.test(body)) hashtags.push('#CreatorNewsdesk');
  return cleanText([
    body,
    `Source discussion: ${source.postUrl}`,
    '— Creator Newsdesk',
    hashtags.join(' '),
  ].filter(Boolean).join('\n\n')).slice(0, 5000);
}

function groupPostTitle(source) {
  const first = cleanText(source.body).split(/\n|(?<=[.!?])\s+/)[0] || 'Creator platform update';
  return first.replace(/#[\p{L}\p{N}_]+/gu, '').trim().slice(0, 120) || 'Creator platform update';
}

export function rebuildCreatorNewsdeskGroupQueue(ledger = {}, existingQueue = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const config = { ...CREATOR_NEWSDESK_GROUP_CONFIG, ...(existingQueue.config || {}) };
  const items = Array.isArray(existingQueue.items) ? [...existingQueue.items] : [];
  const usedSources = new Set(items.filter((item) => !['rejected', 'cancelled'].includes(item.status)).map((item) => item.sourceId).filter(Boolean));
  const occupiedSlots = new Set(items.filter((item) => !['rejected', 'cancelled'].includes(item.status)).map((item) => item.scheduledFor).filter(Boolean));
  const eligible = (ledger.sources || [])
    .filter((source) => source.eligibility === 'eligible' && !usedSources.has(source.id))
    .sort((left, right) => new Date(right.lastSeenAt || right.capturedAt || 0) - new Date(left.lastSeenAt || left.capturedAt || 0));
  const slots = [];
  const firstDate = dateKey(now, config.timezone);
  for (let offset = 0; offset < Number(options.days || 7); offset += 1) {
    const key = addDays(firstDate, offset);
    for (const time of config.scheduleTimes) {
      const scheduled = zonedDate(key, time, config.timezone);
      if (scheduled <= new Date(now.getTime() + 5 * 60_000)) continue;
      if (occupiedSlots.has(scheduled.toISOString())) continue;
      slots.push(scheduled);
    }
  }
  let created = 0;
  while (eligible.length && slots.length) {
    const source = eligible.shift();
    const scheduled = slots.shift();
    items.push({
      id: randomUUID(),
      sourceId: source.id,
      sourcePostUrl: source.postUrl,
      target: 'creatornewsdesk-group',
      format: 'group-post',
      actorName: config.actorName,
      actorGroupUserId: config.actorGroupUserId,
      groupId: config.groupId,
      title: groupPostTitle(source),
      body: groupPostBody(source),
      topics: source.topics || [],
      scheduledFor: scheduled.toISOString(),
      status: 'ready',
      attempts: 0,
      createdAt: now.toISOString(),
    });
    created += 1;
  }
  items.sort((left, right) => new Date(left.scheduledFor || 0) - new Date(right.scheduledFor || 0));
  return { queue: { updatedAt: now.toISOString(), config, items: items.slice(-20_000) }, created };
}

export function creatorNewsdeskGroupSummary(ledger = {}, queue = {}, nowValue = new Date()) {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  const sources = Array.isArray(ledger.sources) ? ledger.sources : [];
  const items = Array.isArray(queue.items) ? queue.items : [];
  const today = dateKey(now, queue.config?.timezone || CREATOR_NEWSDESK_GROUP_CONFIG.timezone);
  const postedToday = items.filter((item) => item.status === 'published' && dateKey(new Date(item.publishedAt || item.scheduledFor), queue.config?.timezone || CREATOR_NEWSDESK_GROUP_CONFIG.timezone) === today).length;
  return {
    captured: sources.length,
    eligible: sources.filter((source) => source.eligibility === 'eligible').length,
    filtered: sources.filter((source) => source.eligibility !== 'eligible').length,
    ready: items.filter((item) => item.status === 'ready').length,
    due: items.filter((item) => item.status === 'ready' && new Date(item.scheduledFor) <= now).length,
    posting: items.filter((item) => item.status === 'posting').length,
    published: items.filter((item) => item.status === 'published').length,
    failed: items.filter((item) => item.status === 'failed').length,
    postedToday,
    dailyLimit: Number(queue.config?.dailyLimit || CREATOR_NEWSDESK_GROUP_CONFIG.dailyLimit),
    nextScheduledFor: items.find((item) => item.status === 'ready')?.scheduledFor || null,
    lastPublishedAt: [...items].reverse().find((item) => item.status === 'published')?.publishedAt || null,
  };
}

export function nextDueCreatorNewsdeskGroupPost(ledger = {}, queue = {}, nowValue = new Date()) {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  const config = { ...CREATOR_NEWSDESK_GROUP_CONFIG, ...(queue.config || {}) };
  const summary = creatorNewsdeskGroupSummary(ledger, queue, now);
  if (summary.postedToday >= config.dailyLimit) return { item: null, reason: 'daily-limit', summary };
  const lastPublished = (queue.items || []).filter((item) => item.status === 'published' && item.publishedAt).sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt))[0];
  if (lastPublished && now - new Date(lastPublished.publishedAt) < config.minimumGapMinutes * 60_000) return { item: null, reason: 'minimum-gap', summary };
  const item = (queue.items || []).find((entry) => entry.status === 'ready' && new Date(entry.scheduledFor) <= now) || null;
  return { item, reason: item ? 'due' : 'not-due', summary };
}

export function updateCreatorNewsdeskGroupPost(queue = {}, id, payload = {}, nowValue = new Date()) {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  const items = Array.isArray(queue.items) ? [...queue.items] : [];
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return { queue, item: null, error: 'Group queue item not found.' };
  const current = items[index];
  const status = String(payload.status || '');
  if (!['posting', 'published', 'failed'].includes(status)) return { queue, item: null, error: 'Invalid group queue status.' };
  if (payload.observedActorName && cleanText(payload.observedActorName).toLocaleLowerCase() !== CREATOR_NEWSDESK_GROUP_CONFIG.actorName.toLocaleLowerCase()) {
    return { queue, item: null, error: `Publishing actor must be ${CREATOR_NEWSDESK_GROUP_CONFIG.actorName}.` };
  }
  const updated = {
    ...current,
    status,
    attempts: status === 'posting' ? Number(current.attempts || 0) + 1 : Number(current.attempts || 0),
    lastAttemptAt: status === 'posting' ? now.toISOString() : current.lastAttemptAt,
    publishedAt: status === 'published' ? now.toISOString() : current.publishedAt,
    publishedPostUrl: status === 'published' ? cleanText(payload.publishedPostUrl).slice(0, 1000) : current.publishedPostUrl,
    lastError: status === 'failed' ? cleanText(payload.error).slice(0, 1000) : '',
    retryAfter: status === 'failed' ? new Date(now.getTime() + 30 * 60_000).toISOString() : null,
    updatedAt: now.toISOString(),
  };
  items[index] = updated;
  return { queue: { ...queue, updatedAt: now.toISOString(), items }, item: updated, error: '' };
}

