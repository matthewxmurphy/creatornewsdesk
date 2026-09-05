const HOUR_MS = 60 * 60 * 1000;
export const PAGE_STORY_REUSE_COOLDOWN_DAYS = 90;
const PAGE_STORY_REUSE_COOLDOWN_MS = PAGE_STORY_REUSE_COOLDOWN_DAYS * 24 * HOUR_MS;
export const PAGE_STORY_DAILY_SERIES_COUNT = 12;

function timestamp(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : null;
}

function mediaKey(media = {}) {
  return String(media.path || media.url || media.filename || '').trim();
}

function isStoryMedia(media = {}) {
  return ['story', 'video'].includes(String(media.role || '').toLowerCase())
    && Boolean(String(media.path || '').trim())
    && !/daily-set-cover/i.test(mediaKey(media));
}

function storyMediaFor(item = {}) {
  return (Array.isArray(item.media) ? item.media : []).find(isStoryMedia) || null;
}

function storyActivityTime(item = {}) {
  const times = [
    item?.facebookHandoff?.publishedAt,
    item?.facebookHandoff?.confirmedAt,
    item?.dispatchedAt,
    item?.lastDispatchAttemptAt,
    item?.scheduledFor,
    item?.updatedAt,
    item?.createdAt,
  ].map(timestamp).filter((time) => time !== null);
  return times.length ? Math.max(...times) : null;
}

function creatorTipNumber(item = {}) {
  const campaignNumber = Number(item?.campaign?.tipNumber || 0);
  if (Number.isInteger(campaignNumber) && campaignNumber > 0) return campaignNumber;
  const match = String(item?.title || item?.source || '').match(/(?:tip[-\s#]*)(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function dailySeriesStorySources(items = []) {
  const groups = new Map();
  for (const item of items) {
    const series = item?.recurringPageDailySeries;
    if (item?.target !== 'matthew-page' || item?.format === 'story' || !series?.seriesKey) continue;
    if (!(item?.status === 'published' || item?.facebookHandoff?.facebookConfirmed === true)) continue;
    const media = storyMediaFor(item);
    const sequenceIndex = Number(series.sequenceIndex);
    if (!media || !Number.isInteger(sequenceIndex) || sequenceIndex < 0 || sequenceIndex >= PAGE_STORY_DAILY_SERIES_COUNT) continue;
    const group = groups.get(series.seriesKey) || [];
    group.push({ item, media, sequenceIndex, publishDate: String(series.publishDate || '') });
    groups.set(series.seriesKey, group);
  }
  return [...groups.entries()]
    .map(([seriesKey, sources]) => ({ seriesKey, sources, publishDate: sources[0]?.publishDate || '' }))
    .filter(({ sources }) => new Set(sources.map(({ sequenceIndex }) => sequenceIndex)).size === PAGE_STORY_DAILY_SERIES_COUNT)
    .sort((left, right) => right.publishDate.localeCompare(left.publishDate))[0] || null;
}

function dailySeriesAnchor(items = [], seriesKey, fallback) {
  const anchors = items
    .filter((item) => item?.format === 'story' && item?.hourlyStory?.dailySeriesKey === seriesKey)
    .map((item) => timestamp(item?.hourlyStory?.dailySeriesAnchorAt))
    .filter((time) => time !== null)
    .sort((left, right) => left - right);
  return anchors[0] ?? fallback;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function storyContentKey(item = {}) {
  const currentTip = creatorTipNumber(item);
  const originalTip = Number(item?.campaign?.originalTipNumber || item?.campaign?.remappedFromTipNumber || 0);
  if (originalTip > 0) return `creator-tip:${originalTip}`;
  if (currentTip > 0) return `creator-tip:${currentTip}`;
  return String(item?.source || item?.id || '').trim();
}

function remappedInsideCooldown(item = {}, nowTime = Date.now()) {
  if (!String(item?.campaign?.originalTipNumber || item?.campaign?.remappedFromTipNumber || '').trim()) return false;
  const remappedAt = timestamp(item?.campaign?.remappedAt) ?? timestamp(item?.createdAt) ?? nowTime;
  return nowTime - remappedAt < PAGE_STORY_REUSE_COOLDOWN_MS;
}

export function nextHourlyStorySlots(now = new Date(), hours = 24) {
  const safeHours = Math.max(1, Math.min(72, Number(hours) || 24));
  const first = Math.floor(now.valueOf() / HOUR_MS) * HOUR_MS + HOUR_MS;
  return Array.from({ length: safeHours }, (_unused, index) => new Date(first + index * HOUR_MS).toISOString());
}

export function buildHourlyPageStoryPlan(items = [], { now = new Date(), hours = 24 } = {}) {
  const slots = nextHourlyStorySlots(now, hours);
  const firstTime = Date.parse(slots[0]);
  const endTime = Date.parse(slots.at(-1)) + HOUR_MS;
  const cooldownCutoff = now.valueOf() - PAGE_STORY_REUSE_COOLDOWN_MS;
  const usedMedia = new Set();
  const usedSources = new Set();
  const usedContent = new Set();
  const occupiedHours = new Set();
  const itemsById = new Map(items.filter((item) => item?.id).map((item) => [String(item.id), item]));

  for (const item of items) {
    if (item?.format !== 'story') continue;
    const activityTime = storyActivityTime(item);
    const insideCooldown = activityTime !== null && activityTime >= cooldownCutoff;
    if (insideCooldown && !['rejected', 'removed'].includes(String(item.status || ''))) {
      for (const media of Array.isArray(item.media) ? item.media : []) {
        const key = mediaKey(media);
        if (key) usedMedia.add(key);
      }
    }
    const sourceDraftId = String(item.hourlyStory?.sourceDraftId || '').trim();
    if (insideCooldown && sourceDraftId) {
      usedSources.add(sourceDraftId);
      const source = itemsById.get(sourceDraftId);
      if (source) usedContent.add(storyContentKey(source));
    }
    const scheduledTime = timestamp(item.scheduledFor);
    if (scheduledTime === null || scheduledTime < firstTime || scheduledTime >= endTime) continue;
    if (!['approved', 'dispatched', 'scheduled', 'published'].includes(String(item.status || ''))) continue;
    if (!storyMediaFor(item) && !(item.media || []).some((media) => ['story', 'video'].includes(String(media.role || '').toLowerCase()))) continue;
    occupiedHours.add(Math.floor(scheduledTime / HOUR_MS));
  }

  const dailySeries = dailySeriesStorySources(items);
  if (dailySeries) {
    const orderedSources = dailySeries.sources.sort((left, right) => left.sequenceIndex - right.sequenceIndex);
    const anchorTime = dailySeriesAnchor(items, dailySeries.seriesKey, firstTime);
    const dailySeriesAnchorAt = new Date(anchorTime).toISOString();
    const assignments = [];
    for (const slot of slots) {
      const slotTime = Date.parse(slot);
      const hour = Math.floor(slotTime / HOUR_MS);
      if (occupiedHours.has(hour)) continue;
      const sequenceIndex = Math.round((slotTime - anchorTime) / HOUR_MS);
      const dailySeriesPosition = positiveModulo(sequenceIndex, PAGE_STORY_DAILY_SERIES_COUNT) + 1;
      const candidate = orderedSources[dailySeriesPosition - 1];
      occupiedHours.add(hour);
      assignments.push({
        scheduledFor: slot,
        source: candidate.item,
        media: candidate.media,
        dailySeries: {
          key: dailySeries.seriesKey,
          position: dailySeriesPosition,
          tipNumber: creatorTipNumber(candidate.item),
          anchorAt: dailySeriesAnchorAt,
          sequenceIndex,
        },
      });
    }
    return {
      generatedAt: now.toISOString(),
      targetPerRollingDay: slots.length,
      occupied: occupiedHours.size,
      created: assignments.length,
      shortage: Math.max(0, slots.length - occupiedHours.size),
      assignments,
      slots,
      dailySeries: {
        key: dailySeries.seriesKey,
        ready: true,
        sourceCount: orderedSources.length,
        tipNumbers: orderedSources.map(({ item }) => creatorTipNumber(item)),
        anchorAt: dailySeriesAnchorAt,
      },
    };
  }

  const candidates = items
    .filter((item) => item?.target === 'matthew-page' && item?.format !== 'story')
    .filter((item) => item?.storyMode !== 'disabled' && item?.mediaApproval?.hiddenAt)
    .filter((item) => item?.status === 'published' || item?.facebookHandoff?.facebookConfirmed === true)
    .filter((item) => !remappedInsideCooldown(item, now.valueOf()))
    .map((item) => ({ item, media: storyMediaFor(item), sourceTime: timestamp(item.scheduledFor), contentKey: storyContentKey(item) }))
    .filter(({ item, media, sourceTime, contentKey }) => media && sourceTime !== null
      && !usedSources.has(String(item.id || ''))
      && !usedMedia.has(mediaKey(media))
      && !usedContent.has(contentKey))
    .sort((left, right) => right.sourceTime - left.sourceTime
      || timestamp(right.item.createdAt) - timestamp(left.item.createdAt)
      || String(left.item.id || '').localeCompare(String(right.item.id || '')));

  const assignments = [];
  for (const slot of slots) {
    const slotTime = Date.parse(slot);
    const hour = Math.floor(slotTime / HOUR_MS);
    if (occupiedHours.has(hour)) continue;
    const candidateIndex = candidates.findIndex(({ item, media, sourceTime, contentKey }) => sourceTime < slotTime
      && !usedSources.has(String(item.id || ''))
      && !usedMedia.has(mediaKey(media))
      && !usedContent.has(contentKey));
    if (candidateIndex < 0) continue;
    const [{ item, media, contentKey }] = candidates.splice(candidateIndex, 1);
    usedSources.add(String(item.id || ''));
    usedMedia.add(mediaKey(media));
    usedContent.add(contentKey);
    occupiedHours.add(hour);
    assignments.push({ scheduledFor: slot, source: item, media });
  }

  return {
    generatedAt: now.toISOString(),
    targetPerRollingDay: slots.length,
    occupied: occupiedHours.size,
    created: assignments.length,
    shortage: Math.max(0, slots.length - occupiedHours.size),
    assignments,
    slots,
    dailySeries: {
      key: null,
      ready: false,
      sourceCount: 0,
      tipNumbers: [],
      anchorAt: null,
    },
  };
}
