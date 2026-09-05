const HOUR_MS = 60 * 60 * 1000;
export const DAILY_SERIES_ITEM_COUNT = 12;
export const DAILY_SERIES_TIME_ZONE = 'America/Los_Angeles';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DAILY_SERIES_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dateKey(now = new Date()) {
  const parts = Object.fromEntries(dateFormatter.formatToParts(now)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function feedMedia(item = {}) {
  return (Array.isArray(item.media) ? item.media : []).filter((media) => (
    !['story', 'video'].includes(String(media?.role || '').toLowerCase())
  ));
}

function tipNumber(item = {}) {
  const value = Number(item?.campaign?.tipNumber || 0);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export function isRecurringPageDailySeriesItem(item = {}) {
  return item?.target === 'matthew-page'
    && Boolean(String(item?.recurringPageDailySeries?.seriesKey || '').trim());
}

function firstSafeHourlySlot(now) {
  let value = Math.floor(now.valueOf() / HOUR_MS) * HOUR_MS + HOUR_MS;
  if (value <= now.valueOf() + 10 * 60_000) value += HOUR_MS;
  return value;
}

export function ensureRecurringPageDailySeries(queue = {}, {
  now = new Date(),
  createId = randomUUID,
} = {}) {
  const items = Array.isArray(queue?.items) ? queue.items : [];
  const publishDate = dateKey(now);
  const sources = items
    .filter((item) => item?.target === 'matthew-profile' && item?.format !== 'story')
    .filter((item) => item?.campaign?.kind === 'facebook-creator-tips')
    .filter((item) => item?.mediaVariant?.publishDate === publishDate)
    .filter((item) => item?.mediaApproval?.hiddenAt && feedMedia(item).length)
    .sort((left, right) => Date.parse(left.scheduledFor || 0) - Date.parse(right.scheduledFor || 0)
      || tipNumber(left) - tipNumber(right));
  if (sources.length !== DAILY_SERIES_ITEM_COUNT || new Set(sources.map(tipNumber)).size !== DAILY_SERIES_ITEM_COUNT) {
    return { changed: false, ready: false, publishDate, sourceCount: sources.length, createdIds: [], updatedIds: [] };
  }

  const seriesKey = `creator-tips-daily-series:${publishDate}:tip-${tipNumber(sources[0])}-${tipNumber(sources.at(-1))}`;
  const existing = new Map(items
    .filter((item) => item?.recurringPageDailySeries?.seriesKey === seriesKey && item?.format !== 'story')
    .map((item) => [Number(item.recurringPageDailySeries.sequenceIndex), item]));
  const occupiedHours = new Set(items
    .filter((item) => item?.target === 'matthew-page' && item?.format !== 'story')
    .filter((item) => item?.facebookHandoff?.facebookConfirmed === true)
    .map((item) => Date.parse(item?.scheduledFor || ''))
    .filter(Number.isFinite)
    .map((value) => Math.floor(value / HOUR_MS)));
  let confirmedThrough = -1;
  while (existing.get(confirmedThrough + 1)?.facebookHandoff?.facebookConfirmed === true) confirmedThrough += 1;
  const confirmedThroughTime = Date.parse(existing.get(confirmedThrough)?.scheduledFor || '');
  let nextSlot = Math.max(
    firstSafeHourlySlot(now),
    Number.isFinite(confirmedThroughTime) ? confirmedThroughTime + HOUR_MS : 0,
  );
  const createdIds = [];
  const updatedIds = [];
  let changed = false;
  const createdAt = now.toISOString();

  for (let sequenceIndex = 0; sequenceIndex < sources.length; sequenceIndex += 1) {
    const source = sources[sequenceIndex];
    let edition = existing.get(sequenceIndex);
    if (edition?.facebookHandoff?.facebookConfirmed === true) continue;
    while (occupiedHours.has(Math.floor(nextSlot / HOUR_MS))) nextSlot += HOUR_MS;
    const scheduledFor = new Date(nextSlot).toISOString();
    occupiedHours.add(Math.floor(nextSlot / HOUR_MS));
    nextSlot += HOUR_MS;
    if (!edition) {
      edition = {
        ...source,
        id: createId(),
        parentId: source.id,
        target: 'matthew-page',
        format: 'feed',
        status: 'approved',
        scheduledFor,
        intendedScheduledFor: scheduledFor,
        source: `daily-series:${publishDate}:${source.id}:feed`,
        notes: 'Date-scoped fan-page Daily Series edition. The source profile draft remains unchanged; missed Page slots roll forward hourly without a burst.',
        media: feedMedia(source).map((media) => ({ ...media })),
        campaign: {
          ...(source.campaign || {}),
          destination: 'matthew-page',
          recurringPageDailySeries: true,
        },
        recurringPageDailySeries: {
          seriesKey,
          publishDate,
          sourceDraftId: source.id,
          sequenceIndex,
          position: sequenceIndex + 1,
          storyRepeatsPerDay: 2,
        },
        storyMode: 'paired',
        approvalRequired: false,
        publishToFacebook: true,
        facebookHandoff: {},
        createdAt,
        updatedAt: createdAt,
      };
      items.push(edition);
      createdIds.push(edition.id);
      changed = true;
    } else if (edition?.facebookHandoff?.facebookConfirmed !== true) {
      let itemChanged = false;
      if (edition.scheduledFor !== scheduledFor) { edition.scheduledFor = scheduledFor; itemChanged = true; }
      if (edition.intendedScheduledFor !== scheduledFor) { edition.intendedScheduledFor = scheduledFor; itemChanged = true; }
      if (!['approved', 'scheduled'].includes(edition.status)) { edition.status = 'approved'; itemChanged = true; }
      if (edition.schedulingBlockedReason) { delete edition.schedulingBlockedReason; itemChanged = true; }
      if (itemChanged) {
        edition.updatedAt = createdAt;
        updatedIds.push(edition.id);
        changed = true;
      }
    }
  }
  if (changed) queue.updatedAt = createdAt;
  return { changed, ready: true, publishDate, seriesKey, sourceCount: sources.length, createdIds, updatedIds };
}
import { randomUUID } from 'node:crypto';
