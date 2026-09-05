const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
export const CREATOR_TIP_COVER_COLLECTION_KIND = 'creator-tip-cover-collection';

function queueItems(queueOrItems = []) {
  if (Array.isArray(queueOrItems)) return queueOrItems;
  return Array.isArray(queueOrItems?.items) ? queueOrItems.items : [];
}

function isoTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' || /^\d{13}$/.test(String(value))
    ? Number(value)
    : Date.parse(String(value));
  return Number.isFinite(numeric) ? new Date(numeric).toISOString() : null;
}

function validDateKey(value = '') {
  const match = String(value).match(/(?:^|[^0-9])(\d{4}-\d{2}-\d{2})(?:[^0-9]|$)/);
  if (!match) return null;
  const [year, month, day] = match[1].split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? match[1]
    : null;
}

function mediaLocatorValues(media = {}) {
  return [media.filename, media.path, media.url, media.localUrl, media.ryzenUrl]
    .filter(Boolean)
    .map(String);
}

function dailyCoverDate(media = {}) {
  for (const value of mediaLocatorValues(media)) {
    if (!/daily-set-cover/i.test(value)) continue;
    const date = validDateKey(value);
    if (date) return date;
  }
  return null;
}

function pathTimestampTimes(media = {}) {
  const times = [];
  for (const value of [media.path, media.url, media.localUrl, media.ryzenUrl].filter(Boolean)) {
    for (const match of String(value).matchAll(/(?:^|\D)(\d{13})(?=\D|$)/g)) {
      const parsed = isoTime(match[1]);
      if (parsed) times.push(parsed);
    }
  }
  return times;
}

export function creatorTipCoverExistenceAt(media = {}) {
  const candidates = [media.attachedAt, media.uploadedAt, media.createdAt]
    .map(isoTime)
    .filter(Boolean)
    .concat(pathTimestampTimes(media));
  return candidates.length
    ? new Date(Math.min(...candidates.map((value) => Date.parse(value)))).toISOString()
    : null;
}

function itemMedia(item = {}) {
  return ['media', 'feedMedia', 'storyMedia']
    .flatMap((key) => Array.isArray(item[key]) ? item[key] : []);
}

function coverReviewBlocked(item = {}, media = {}) {
  const review = item.imageReview || item.mediaReview || {};
  const values = [
    media.qcStatus,
    media.reviewStatus,
    media.status,
    review.story?.state,
    review.story?.status,
  ].map((value) => String(value || '').toLowerCase());
  return media.flagged === true
    || media.qcFlagged === true
    || media.needsRedo === true
    || values.some((value) => /reject|redo|fail|needs[-\s]?review|needs[-\s]?qc|flagged/.test(value));
}

function coverApproved(item = {}, media = {}) {
  if (coverReviewBlocked(item, media) || media.approved === false) return false;
  if (media.approved === true || String(media.status || '').toLowerCase() === 'approved') return true;
  return Boolean(item.mediaApproval?.hiddenAt || item.mediaApproval?.storyApprovedAt)
    || ['approved', 'dispatched', 'scheduled', 'published'].includes(String(item.status || '').toLowerCase());
}

function normalizedCoverFilename(media = {}) {
  const filename = String(media.filename || mediaLocatorValues(media).find((value) => /daily-set-cover/i.test(value)) || '');
  return filename.split('/').at(-1).replace(/^\d{13}-/, '').toLowerCase();
}

const publishDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function creatorTipItemDate(item = {}) {
  const direct = item.artworkDay?.publishDate || item.campaign?.publishDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(direct || ''))) return String(direct);
  const scheduled = item.intendedScheduledFor || item.scheduledFor;
  const parsed = new Date(scheduled || 0);
  return Number.isFinite(parsed.valueOf()) ? publishDateFormatter.format(parsed) : null;
}

function creatorTipNumber(item = {}) {
  const campaignNumber = Number(item.campaign?.tipNumber);
  if (Number.isInteger(campaignNumber) && campaignNumber > 0) return campaignNumber;
  const match = `${item.source || ''} ${item.title || ''}`.match(/(?:tip[-\s#:]*)?(\d+)\b/i);
  return match ? Number(match[1]) : 0;
}

function isCreatorTipCampaignItem(item = {}) {
  return item.campaign?.kind === 'facebook-creator-tips'
    || /^facebook-creator-tips:/i.test(String(item.source || ''));
}

function approvedCreatorTipDay(items = [], date = '') {
  const candidates = items.filter((item) => item?.format !== 'story'
    && isCreatorTipCampaignItem(item)
    && creatorTipNumber(item) > 0
    && creatorTipItemDate(item) === date);
  if (!candidates.length) return true;
  const byTip = new Map();
  for (const item of candidates) {
    const number = creatorTipNumber(item);
    if (!byTip.has(number)) byTip.set(number, []);
    byTip.get(number).push(item);
  }
  return byTip.size === 12 && [...byTip.values()].every((copies) => copies.every((item) => (
    Boolean(item.mediaApproval?.hiddenAt)
    && !coverReviewBlocked(item)
  )));
}

export function deriveDailyIssueCovers(queueOrItems = []) {
  const byDateAndFile = new Map();
  for (const item of queueItems(queueOrItems)) {
    for (const media of itemMedia(item)) {
      const date = dailyCoverDate(media);
      if (!date) continue;
      const normalizedFilename = normalizedCoverFilename(media);
      const key = `${date}|${normalizedFilename}`;
      const existenceAt = creatorTipCoverExistenceAt(media);
      const existing = byDateAndFile.get(key);
      if (!existing) {
        byDateAndFile.set(key, {
          date,
          filename: String(media.filename || ''),
          normalizedFilename,
          media,
          existenceAt,
          copyCount: 1,
          itemIds: item.id ? [String(item.id)] : [],
          usable: coverApproved(item, media),
        });
        continue;
      }
      existing.copyCount += 1;
      if (item.id && !existing.itemIds.includes(String(item.id))) existing.itemIds.push(String(item.id));
      existing.usable ||= coverApproved(item, media);
      if (existenceAt && (!existing.existenceAt || Date.parse(existenceAt) < Date.parse(existing.existenceAt))) {
        existing.existenceAt = existenceAt;
        existing.filename = String(media.filename || existing.filename);
        existing.media = media;
      }
    }
  }
  const filesByDate = new Map();
  for (const cover of byDateAndFile.values()) {
    if (!filesByDate.has(cover.date)) filesByDate.set(cover.date, []);
    filesByDate.get(cover.date).push(cover);
  }
  return [...filesByDate.entries()]
    .map(([date, versions]) => {
      const usableVersions = versions.filter((cover) => cover.usable);
      const selected = usableVersions.length === 1 ? usableVersions[0] : versions[0];
      return {
        ...selected,
        date,
        usable: usableVersions.length === 1,
        ambiguous: usableVersions.length > 1,
        filenames: versions.map((cover) => cover.filename).sort(),
        itemIds: [...new Set(versions.flatMap((cover) => cover.itemIds))].sort(),
        copyCount: versions.reduce((total, cover) => total + cover.copyCount, 0),
      };
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

function dateFromKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, count) {
  return new Date(date.getTime() + count * DAY_MS);
}

function datesBetween(startDate, endDate) {
  const dates = [];
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) dates.push(dateKey(cursor));
  return dates;
}

function weekStartFor(date) {
  return addDays(date, -date.getUTCDay());
}

function monthStartFor(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function periodEndAt(endDate) {
  return new Date(endDate.getTime() + DAY_MS - 1).toISOString();
}

function stableHash(value = '') {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicCollectionSchedule(collectionKey, availableAfter, type = 'week') {
  const base = Date.parse(String(availableAfter || ''));
  if (!Number.isFinite(base)) return null;
  const [minimumHours, maximumHours] = type === 'month' ? [48, 168] : [12, 72];
  const minimumMinutes = minimumHours * 60;
  const maximumMinutes = maximumHours * 60;
  const offsetMinutes = minimumMinutes + (stableHash(collectionKey) % (maximumMinutes - minimumMinutes + 1));
  return new Date(base + offsetMinutes * 60 * 1000).toISOString();
}

export function isCreatorTipCoverCollectionDraft(item = {}) {
  return item?.campaign?.kind === CREATOR_TIP_COVER_COLLECTION_KIND;
}

export function creatorTipCoverCollectionDrafts(queueOrItems = []) {
  return queueItems(queueOrItems).filter(isCreatorTipCoverCollectionDraft);
}

function draftCollectionKey(item = {}) {
  const campaign = item.campaign || {};
  if (campaign.collectionKey) return String(campaign.collectionKey);
  if (campaign.key) return String(campaign.key);
  const type = campaign.collectionType || campaign.periodType || campaign.type;
  const start = campaign.periodStart || campaign.startDate;
  if (type === 'week' && validDateKey(start)) return `week:${validDateKey(start)}`;
  if (type === 'month' && /^\d{4}-\d{2}$/.test(String(start || ''))) return `month:${start}`;
  if (type === 'month' && validDateKey(start)) return `month:${String(start).slice(0, 7)}`;
  return null;
}

function collectionPromptBase(plan) {
  return [
    'Create a 1200x630 landscape editorial collection photograph.',
    `Use exactly the ${plan.requiredCount} supplied, approved daily comic-book issue covers for ${plan.periodStart} through ${plan.periodEnd}.`,
    'Preserve every supplied cover design, logo, face, title, signature, color, and printed word exactly as approved.',
    'Do not redraw, rewrite, duplicate, replace, or invent any cover text or branding.',
    'Keep the scene photorealistic with believable paper, binding, shadows, depth, and natural room light.',
    'No extra books, people, hands, watermarks, captions, floating graphics, or unrelated props.',
  ].join(' ');
}

export function creatorTipCollectionPrompts(plan = {}) {
  const base = collectionPromptBase(plan);
  const definitions = plan.type === 'month'
    ? [
      ['table-overhead', 'Table overhead', 'Arrange every monthly issue across a large wooden table in a readable overhead composition, with natural overlap but every cover visibly represented.'],
      ['comic-box-month', 'Full comic box', 'Arrange the complete month upright inside a realistic labeled comic-book storage box, with enough stagger to show that every daily issue is present.'],
      ['table-open-comic', 'Open comic on table', 'Place the monthly issues around one open comic on the table. The open pages must show only supplied approved tip artwork, with no invented panels, dialogue, captions, letters, numbers, or logos.'],
      ['display-case-month', 'Filled display case', 'Show the full month arranged in a photorealistic collector display case that is now visibly full, while keeping the supplied cover art exact and identifiable.'],
    ]
    : [
      ['coffee-table-overhead', 'Coffee table', 'Arrange all seven weekly issues across a realistic coffee table in a balanced overhead composition, with every approved cover clearly visible.'],
      ['bed-open-comic', 'Open comic on bed', 'Place six closed weekly issues around one open comic on a textured bed. The open pages must show only supplied approved tip artwork, with no invented panels, dialogue, captions, letters, numbers, or logos.'],
      ['comic-box-week', 'Comic book box', 'Place all seven weekly issues upright in a realistic comic-book storage box, slightly staggered so every supplied cover is represented and identifiable.'],
      ['display-case-week', 'Display case', 'Show all seven weekly issues in a photorealistic collector display case, continuing the same case that fills one approved issue at a time during the month.'],
    ];
  return definitions.map(([role, label, direction]) => ({
    role,
    label,
    width: 1200,
    height: 630,
    prompt: `${base} ${direction}`,
  }));
}

function availableAfterFor(endDate, covers) {
  const candidates = [periodEndAt(endDate), ...covers.map((cover) => cover.existenceAt).filter(Boolean)];
  return new Date(Math.max(...candidates.map((value) => Date.parse(value)))).toISOString();
}

function buildPlan({ type, startDate, endDate, coversByDate, draftsByKey }) {
  const requiredDates = datesBetween(startDate, endDate);
  const covers = requiredDates.map((date) => coversByDate.get(date)).filter(Boolean);
  const missingDates = requiredDates.filter((date) => !coversByDate.has(date));
  const periodStart = dateKey(startDate);
  const periodEnd = dateKey(endDate);
  const collectionKey = type === 'month' ? `month:${periodStart.slice(0, 7)}` : `week:${periodStart}`;
  const availableAfter = availableAfterFor(endDate, covers);
  const existingDrafts = draftsByKey.get(collectionKey) || [];
  const plan = {
    type,
    collectionKey,
    periodStart,
    periodEnd,
    covers,
    coverCount: covers.length,
    requiredCount: requiredDates.length,
    missingDates,
    ready: missingDates.length === 0,
    newestCoverExistenceAt: covers.map((cover) => cover.existenceAt).filter(Boolean).sort().at(-1) || null,
    availableAfter,
    suggestedScheduledFor: deterministicCollectionSchedule(collectionKey, availableAfter, type),
    existingDraft: existingDrafts.length > 0,
    existingDraftIds: existingDrafts.map((item) => item.id).filter(Boolean),
  };
  return { ...plan, prompts: creatorTipCollectionPrompts(plan) };
}

export function buildCreatorTipCollectionPlans(queueOrItems = []) {
  const items = queueItems(queueOrItems);
  const covers = deriveDailyIssueCovers(items).map((cover) => ({
    ...cover,
    dayApproved: approvedCreatorTipDay(items, cover.date),
  })).map((cover) => ({ ...cover, usable: cover.usable && cover.dayApproved }));
  const coversByDate = new Map(covers.filter((cover) => cover.usable).map((cover) => [cover.date, cover]));
  const draftsByKey = new Map();
  for (const draft of creatorTipCoverCollectionDrafts(items)) {
    const key = draftCollectionKey(draft);
    if (!key) continue;
    if (!draftsByKey.has(key)) draftsByKey.set(key, []);
    draftsByKey.get(key).push(draft);
  }

  const weekStarts = new Map();
  const monthStarts = new Map();
  for (const cover of covers) {
    const date = dateFromKey(cover.date);
    const weekStart = weekStartFor(date);
    const monthStart = monthStartFor(date);
    weekStarts.set(dateKey(weekStart), weekStart);
    monthStarts.set(dateKey(monthStart), monthStart);
  }

  const weeks = [...weekStarts.values()]
    .sort((left, right) => left - right)
    .map((startDate) => buildPlan({
      type: 'week',
      startDate,
      endDate: addDays(startDate, 6),
      coversByDate,
      draftsByKey,
    }));
  const months = [...monthStarts.values()]
    .sort((left, right) => left - right)
    .map((startDate) => buildPlan({
      type: 'month',
      startDate,
      endDate: new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0)),
      coversByDate,
      draftsByKey,
    }));

  return { covers, weeks, months };
}

export function buildCreatorTipWeekPlans(queueOrItems = []) {
  return buildCreatorTipCollectionPlans(queueOrItems).weeks;
}

export function buildCreatorTipMonthPlans(queueOrItems = []) {
  return buildCreatorTipCollectionPlans(queueOrItems).months;
}

