export const CREATOR_TIP_GROUP_SHARE_CONFIG = Object.freeze({
  platform: 'facebook',
  groupId: '1451130882820932',
  groupName: 'Built Not Begged: Creator Growth Hub',
  actorName: 'Matthew Murphy : Built Not Begged',
  timezone: 'America/Los_Angeles',
  dailyLimit: 4,
  scheduleTimes: Object.freeze(['01:00', '07:00', '13:00', '19:00']),
  companionMedia: Object.freeze({
    assetId: 'elevator-pitch-v1',
    label: 'Elevator pitch',
    mediaUrl: '/assets/group-share/matthew-murphy-elevator-pitch.jpg',
    fileName: 'matthew-murphy-elevator-pitch.jpg',
    mimeType: 'image/jpeg',
    width: 886,
    height: 886,
    attachPolicy: 'when-share-composer-supports-photo',
    fallbackPolicy: 'share-source-post-without-companion',
    altText: 'Matthew Murphy Built Not Begged elevator pitch comic graphic.',
  }),
});

function dateParts(date, timezone) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function dayKey(date, timezone) {
  const parts = dateParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function minutesIntoDay(date, timezone) {
  const parts = dateParts(date, timezone);
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function tipNumber(item) {
  const match = String(item?.title || item?.body || '').match(/\b(?:Creator\s+)?Tip\s*#?\s*(\d+)\b/i);
  return Number(match?.[1] || 0);
}

function eligiblePageTips(scheduledContent = {}, now = new Date()) {
  const byTip = new Map();
  for (const item of scheduledContent.items || []) {
    const number = tipNumber(item);
    if (!(number > 0) || item.target !== 'matthew-page' || item.source !== 'meta-page-api') continue;
    if (!item.sourceUrl || !item.scheduledFor || new Date(item.scheduledFor) > now) continue;
    const existing = byTip.get(number);
    if (!existing || new Date(item.observedAt || 0) > new Date(existing.observedAt || 0)) byTip.set(number, item);
  }
  return [...byTip.entries()].sort((left, right) => left[0] - right[0]).map(([number, item]) => ({
    tipNumber: number,
    title: item.title,
    sourcePostUrl: item.sourceUrl,
    sourceGraphId: item.graphId || '',
    sourceScheduledFor: item.scheduledFor,
  }));
}

export function creatorTipGroupShareSummary(scheduledContent = {}, ledger = {}, nowValue = new Date()) {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  const items = Array.isArray(ledger.items) ? ledger.items : [];
  const confirmed = items.filter((item) => item.status === 'confirmed' && item.groupPostUrl);
  const sharedTips = new Set(confirmed.map((item) => Number(item.tipNumber)).filter((number) => number > 0));
  const eligible = eligiblePageTips(scheduledContent, now);
  let expectedTipNumber = 1;
  while (sharedTips.has(expectedTipNumber)) expectedTipNumber += 1;
  const nextTip = eligible.find((item) => item.tipNumber === expectedTipNumber) || null;
  const next = nextTip ? { ...nextTip, companionMedia: CREATOR_TIP_GROUP_SHARE_CONFIG.companionMedia } : null;
  const today = dayKey(now, CREATOR_TIP_GROUP_SHARE_CONFIG.timezone);
  const todayItems = confirmed.filter((item) => dayKey(new Date(item.confirmedAt), CREATOR_TIP_GROUP_SHARE_CONFIG.timezone) === today);
  const slot = CREATOR_TIP_GROUP_SHARE_CONFIG.scheduleTimes[Math.min(todayItems.length, CREATOR_TIP_GROUP_SHARE_CONFIG.dailyLimit - 1)];
  const [hour, minute] = String(slot || '23:59').split(':').map(Number);
  const slotDue = minutesIntoDay(now, CREATOR_TIP_GROUP_SHARE_CONFIG.timezone) >= hour * 60 + minute;
  return {
    config: CREATOR_TIP_GROUP_SHARE_CONFIG,
    updatedAt: ledger.updatedAt || null,
    today,
    confirmedToday: todayItems.length,
    remainingToday: Math.max(0, CREATOR_TIP_GROUP_SHARE_CONFIG.dailyLimit - todayItems.length),
    nextScheduledTime: todayItems.length < CREATOR_TIP_GROUP_SHARE_CONFIG.dailyLimit ? slot : null,
    due: Boolean(next && todayItems.length < CREATOR_TIP_GROUP_SHARE_CONFIG.dailyLimit && slotDue),
    next,
    waitingForTipNumber: next ? null : expectedTipNumber,
    confirmedTotal: confirmed.length,
    recent: [...confirmed].sort((a, b) => new Date(b.confirmedAt) - new Date(a.confirmedAt)).slice(0, 20),
  };
}

export function recordCreatorTipGroupShare(ledger = {}, input = {}) {
  const tip = Number(input.tipNumber || 0);
  const confirmedAt = new Date(input.confirmedAt || '');
  if (!(tip > 0)) throw new TypeError('tipNumber is required.');
  if (!Number.isFinite(confirmedAt.getTime())) throw new TypeError('confirmedAt must be a valid timestamp.');
  let groupPostUrl;
  try {
    groupPostUrl = new URL(String(input.groupPostUrl || ''));
  } catch {
    throw new TypeError('A verified Facebook group post URL is required.');
  }
  if (groupPostUrl.hostname !== 'www.facebook.com' || !groupPostUrl.pathname.startsWith(`\/groups\/${CREATOR_TIP_GROUP_SHARE_CONFIG.groupId}\/posts\/`)) {
    throw new TypeError('groupPostUrl must be a post in the configured Facebook group.');
  }
  const items = Array.isArray(ledger.items) ? [...ledger.items] : [];
  const duplicate = items.find((item) => item.status === 'confirmed' && (Number(item.tipNumber) === tip || item.groupPostUrl === groupPostUrl.href));
  if (duplicate) return { ...ledger, items };
  items.push({
    id: String(input.id || `tip-${tip}-${confirmedAt.getTime()}`),
    tipNumber: tip,
    title: String(input.title || '').slice(0, 300),
    sourcePostUrl: String(input.sourcePostUrl || '').slice(0, 1000),
    groupPostUrl: groupPostUrl.href,
    actorName: CREATOR_TIP_GROUP_SHARE_CONFIG.actorName,
    groupId: CREATOR_TIP_GROUP_SHARE_CONFIG.groupId,
    status: 'confirmed',
    confirmedAt: confirmedAt.toISOString(),
    companionMedia: {
      assetId: CREATOR_TIP_GROUP_SHARE_CONFIG.companionMedia.assetId,
      attached: input.companionMediaAttached === true,
      fallbackReason: input.companionMediaAttached === true
        ? ''
        : String(input.companionMediaFallbackReason || 'Facebook share composer did not accept an additional photo.').slice(0, 300),
    },
  });
  return { updatedAt: confirmedAt.toISOString(), items };
}

