import { classifyGroupPost } from './group-moderation.mjs';

export const PAGE_GROUP_DISTRIBUTION_CONFIG = Object.freeze({
  platform: 'facebook',
  actorName: 'Matthew Murphy : Built Not Begged',
  actorUrl: 'https://www.facebook.com/matthewxmurphybuiltnotbegged',
  timezone: 'America/Los_Angeles',
  approvalRequired: true,
  dailyLimitPerGroup: 4,
  minimumGapMinutes: 240,
  ruleFreshnessDays: 30,
});

export const DEFAULT_PAGE_GROUP = Object.freeze({
  groupId: '1451130882820932',
  groupName: 'Built Not Begged: Creator Growth Hub',
  groupUrl: 'https://www.facebook.com/groups/1451130882820932',
  allowShares: true,
  allowDirectPosts: true,
  autoApprovePublishedPosts: true,
  rules: Object.freeze([
    'No E4E, F4F, like-for-like, or share trains.',
    'Posts must teach or ask about creator growth, monetization, Professional Dashboard, audience building, publishing, or content strategy.',
    'No hate, bullying, privacy exposure, unrelated personal posts, or unrelated non-captioned Reels.',
  ]),
});

function timestamp(value, label) {
  const parsed = new Date(value || '');
  if (!Number.isFinite(parsed.getTime())) throw new TypeError(`${label} must be a valid timestamp.`);
  return parsed.toISOString();
}

function cloneLedger(ledger = {}) {
  return {
    version: 1,
    updatedAt: ledger.updatedAt || null,
    groups: (ledger.groups || []).map((group) => ({ ...group, rules: [...(group.rules || [])] })),
    items: (ledger.items || []).map((item) => ({ ...item, ruleReasons: [...(item.ruleReasons || [])], history: (item.history || []).map((entry) => ({ ...entry })) })),
  };
}

function normalizeFacebookUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['www.facebook.com', 'facebook.com', 'm.facebook.com'].includes(url.hostname)) return '';
    const photoId = /^\/photo(?:\.php|\/)?$/i.test(url.pathname)
      ? String(url.searchParams.get('fbid') || '').replace(/\D/g, '')
      : '';
    url.protocol = 'https:';
    url.hostname = 'www.facebook.com';
    url.search = '';
    if (photoId) {
      url.pathname = '/photo/';
      url.searchParams.set('fbid', photoId);
    }
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

function groupIdFromUrl(value) {
  return normalizeFacebookUrl(value).match(/\/groups\/(\d+)/i)?.[1] || '';
}

function localDay(value, timeZone = PAGE_GROUP_DISTRIBUTION_CONFIG.timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const fields = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function contentText(input = {}) {
  const title = String(input.title || '').trim();
  const body = String(input.body || input.text || input.caption || '').trim();
  return `${title} ${body}`.replace(/\s+/g, ' ').trim().slice(0, 5000);
}

function distributionMethod(candidate, group) {
  const sourcePostUrl = normalizeFacebookUrl(candidate.sourcePostUrl);
  if (sourcePostUrl && group.allowShares !== false) return 'share';
  if (group.allowDirectPosts === true) return 'direct';
  return '';
}

export function mergePageGroupRules(ledger = {}, payload = {}) {
  const observedAt = timestamp(payload.observedAt, 'observedAt');
  const groupId = String(payload.groupId || groupIdFromUrl(payload.groupUrl)).replace(/\D/g, '');
  if (!groupId) throw new TypeError('groupId or a Facebook groupUrl is required.');
  const rules = (payload.rules || []).map((rule) => String(rule || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 100);
  if (!rules.length) throw new TypeError('At least one visible group rule is required.');
  const next = cloneLedger(ledger);
  const existing = next.groups.find((group) => group.groupId === groupId);
  const group = {
    ...(existing || {}),
    groupId,
    groupName: String(payload.groupName || existing?.groupName || `Facebook group ${groupId}`).trim().slice(0, 200),
    groupUrl: normalizeFacebookUrl(payload.groupUrl) || existing?.groupUrl || `https://www.facebook.com/groups/${groupId}`,
    allowShares: payload.allowShares !== false,
    allowDirectPosts: payload.allowDirectPosts === true,
    autoApprovePublishedPosts: Object.prototype.hasOwnProperty.call(payload, 'autoApprovePublishedPosts')
      ? payload.autoApprovePublishedPosts === true
      : (existing?.autoApprovePublishedPosts ?? groupId === DEFAULT_PAGE_GROUP.groupId),
    rules,
    rulesObservedAt: observedAt,
    rulesSource: String(payload.rulesSource || 'facebook-visible-rules').slice(0, 80),
  };
  next.groups = [...next.groups.filter((entry) => entry.groupId !== groupId), group];
  next.updatedAt = observedAt;
  return next;
}

export function classifyPageGroupDistribution(candidate = {}, group = {}, nowValue = new Date()) {
  const text = contentText(candidate);
  const method = distributionMethod(candidate, group);
  const now = new Date(nowValue);
  const observedAt = Date.parse(group.rulesObservedAt || '');
  const rulesStale = !Number.isFinite(observedAt)
    || now.getTime() - observedAt > PAGE_GROUP_DISTRIBUTION_CONFIG.ruleFreshnessDays * 86_400_000;
  if (!text) return { eligible: false, decision: 'review', method, ruleReasons: ['Post copy is missing.'] };
  if (!method) return { eligible: false, decision: 'blocked', method: '', ruleReasons: ['This group does not allow an available posting method.'] };
  if (rulesStale) return { eligible: false, decision: 'review', method, ruleReasons: ['Visible group rules must be refreshed before distribution.'] };
  const classification = classifyGroupPost({ ...candidate, text });
  if (classification.decision === 'decline') {
    return { eligible: false, decision: 'blocked', method, ruleReasons: [classification.rationale], matchedRules: classification.matchedRules };
  }
  if (classification.decision !== 'approve') {
    return { eligible: false, decision: 'review', method, ruleReasons: [classification.rationale], matchedRules: classification.matchedRules };
  }
  return {
    eligible: true,
    decision: 'needs-approval',
    method,
    ruleReasons: [classification.rationale, `${group.rules.length} visible group rules checked.`],
    matchedRules: [],
  };
}

export function queuePageGroupDistribution(ledger = {}, payload = {}, nowValue = new Date()) {
  const next = cloneLedger(ledger);
  const now = new Date(nowValue);
  if (!Number.isFinite(now.getTime())) throw new TypeError('now must be a valid timestamp.');
  const groupIds = (payload.groupIds?.length ? payload.groupIds : next.groups.map((group) => group.groupId)).map(String);
  const body = contentText(payload);
  const sourcePostUrl = normalizeFacebookUrl(payload.sourcePostUrl);
  const sourceKey = String(payload.sourceKey || sourcePostUrl || `${payload.title || ''}|${body}`).trim().slice(0, 1000);
  if (!sourceKey) throw new TypeError('sourceKey, sourcePostUrl, title, or body is required.');
  const queued = [];
  const skipped = [];
  for (const groupId of groupIds) {
    const group = next.groups.find((entry) => entry.groupId === groupId);
    if (!group) {
      skipped.push({ groupId, reason: 'Group rules have not been captured.' });
      continue;
    }
    const duplicate = next.items.find((item) => item.groupId === groupId && item.sourceKey === sourceKey && !['rejected', 'cancelled'].includes(item.status));
    if (duplicate) {
      skipped.push({ groupId, reason: 'This source is already queued for the group.', itemId: duplicate.id });
      continue;
    }
    const classified = classifyPageGroupDistribution({ ...payload, body, sourcePostUrl }, group, now);
    const rulesNeedRefresh = classified.ruleReasons.some((reason) => /rules must be refreshed/i.test(reason));
    if (!classified.eligible && (classified.decision === 'blocked' || rulesNeedRefresh)) {
      skipped.push({ groupId, reason: classified.ruleReasons.join(' '), decision: classified.decision });
      continue;
    }
    const autoApproved = classified.eligible && group.autoApprovePublishedPosts === true;
    const item = {
      id: String(payload.id || `group-distribution-${groupId}-${now.getTime()}-${next.items.length + queued.length + 1}`),
      sourceKey,
      sourcePostUrl,
      title: String(payload.title || '').trim().slice(0, 300),
      body,
      actorName: PAGE_GROUP_DISTRIBUTION_CONFIG.actorName,
      actorUrl: PAGE_GROUP_DISTRIBUTION_CONFIG.actorUrl,
      groupId,
      groupName: group.groupName,
      groupUrl: group.groupUrl,
      method: classified.method,
      ruleReasons: classified.eligible
        ? [...classified.ruleReasons, ...(autoApproved ? ['This group has explicit automatic distribution approval.'] : [])]
        : [...classified.ruleReasons, 'Human approval is required because the automatic classifier could not make a safe final decision.'],
      rulesObservedAt: group.rulesObservedAt,
      status: autoApproved ? 'approved' : 'needs-approval',
      scheduledFor: timestamp(payload.scheduledFor || now.toISOString(), 'scheduledFor'),
      createdAt: now.toISOString(),
      reviewedAt: autoApproved ? now.toISOString() : undefined,
      reviewedBy: autoApproved ? 'approved-group-policy' : undefined,
      reviewNote: autoApproved ? 'Rules-current Page post approved by the group-level automatic distribution policy.' : undefined,
      history: autoApproved
        ? [{ action: 'approve', at: now.toISOString(), by: 'approved-group-policy', note: 'Rules-current Page post approved by the group-level automatic distribution policy.' }]
        : [],
    };
    next.items.push(item);
    queued.push(item);
  }
  next.updatedAt = now.toISOString();
  return { ledger: next, queued, skipped };
}

export function reviewPageGroupDistribution(ledger = {}, itemId, input = {}) {
  const next = cloneLedger(ledger);
  const item = next.items.find((entry) => entry.id === String(itemId));
  if (!item) throw new RangeError('Group distribution item was not found.');
  if (!['approve', 'reject'].includes(input.action)) throw new TypeError('action must be approve or reject.');
  if (!['needs-approval', 'approved'].includes(item.status)) throw new RangeError(`A ${item.status} item cannot be reviewed.`);
  const reviewedAt = timestamp(input.reviewedAt || new Date().toISOString(), 'reviewedAt');
  item.status = input.action === 'approve' ? 'approved' : 'rejected';
  item.reviewedAt = reviewedAt;
  item.reviewedBy = String(input.reviewedBy || 'mmurphy').slice(0, 80);
  item.reviewNote = String(input.note || '').trim().slice(0, 500);
  item.history.push({ action: input.action, at: reviewedAt, by: item.reviewedBy, note: item.reviewNote });
  next.updatedAt = reviewedAt;
  return next;
}

export function nextDuePageGroupDistribution(ledger = {}, nowValue = new Date()) {
  const now = new Date(nowValue);
  const items = ledger.items || [];
  return [...items]
    .filter((item) => item.status === 'approved' && Date.parse(item.scheduledFor) <= now.getTime())
    .sort((left, right) => Date.parse(left.scheduledFor) - Date.parse(right.scheduledFor))
    .find((item) => {
      const confirmed = items.filter((entry) => entry.groupId === item.groupId && entry.status === 'confirmed');
      const todayCount = confirmed.filter((entry) => localDay(entry.confirmedAt) === localDay(now)).length;
      if (todayCount >= PAGE_GROUP_DISTRIBUTION_CONFIG.dailyLimitPerGroup) return false;
      const latest = Math.max(0, ...confirmed.map((entry) => Date.parse(entry.confirmedAt) || 0));
      return now.getTime() - latest >= PAGE_GROUP_DISTRIBUTION_CONFIG.minimumGapMinutes * 60_000;
    }) || null;
}

export function recordPageGroupDistributionProof(ledger = {}, itemId, input = {}) {
  const next = cloneLedger(ledger);
  const item = next.items.find((entry) => entry.id === String(itemId));
  if (!item) throw new RangeError('Group distribution item was not found.');
  if (item.status !== 'approved') throw new RangeError('Only an approved group distribution can be confirmed.');
  const groupPostUrl = normalizeFacebookUrl(input.groupPostUrl);
  if (!groupPostUrl || !new URL(groupPostUrl).pathname.startsWith(`/groups/${item.groupId}/posts/`)) {
    throw new TypeError('A verified permalink for the exact Facebook group post is required.');
  }
  const confirmedAt = timestamp(input.confirmedAt || new Date().toISOString(), 'confirmedAt');
  item.status = 'confirmed';
  item.groupPostUrl = groupPostUrl;
  item.confirmedAt = confirmedAt;
  item.history.push({ action: 'confirmed', at: confirmedAt, proof: groupPostUrl });
  next.updatedAt = confirmedAt;
  return next;
}

export function pageGroupDistributionSummary(ledger = {}, nowValue = new Date()) {
  const items = ledger.items || [];
  const now = new Date(nowValue);
  const counts = Object.fromEntries(['needs-approval', 'approved', 'confirmed', 'rejected'].map((status) => [status, items.filter((item) => item.status === status).length]));
  return {
    config: PAGE_GROUP_DISTRIBUTION_CONFIG,
    updatedAt: ledger.updatedAt || null,
    groups: (ledger.groups || []).length,
    counts,
    due: nextDuePageGroupDistribution(ledger, now),
    confirmedToday: items.filter((item) => item.status === 'confirmed' && localDay(item.confirmedAt) === localDay(now)).length,
  };
}
