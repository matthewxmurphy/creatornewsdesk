const CREATOR_TIP_KIND = 'facebook-creator-tips';
const REEL_JOB_TYPE = 'creator-tip-reel-production';
const REEL_ENGINE = 'fish-speech';
const REQUESTED_BY = 'mmurphy';
const TIME_ZONE = 'America/Los_Angeles';
const APPROVED_STATES = new Set(['approved', 'dispatched', 'scheduled', 'published']);
const BOILERPLATE_PATTERNS = [
  /^creator\s+tip(?:\s*#?\s*\d+)?\b.*(?:matthew\s+murphy)?\s*$/i,
  /^matthew\s+murphy\s*(?:[|\-:]\s*built\s+not\s+begged)?\s*$/i,
  /^built\s+not\s+begged\s*$/i,
  /^(?:follow|like|share|comment|save)\s+(?:for|this|if)\b/i,
];
const HASHTAG_STOP_WORDS = new Set([
  'and', 'are', 'but', 'for', 'from', 'have', 'into', 'not', 'that', 'the', 'their',
  'this', 'through', 'tip', 'tips', 'use', 'with', 'your',
]);

const publishDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dateKey(value) {
  const direct = String(value || '').match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  if (direct) return direct;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) return null;
  return publishDateFormatter.format(parsed);
}

function itemPublishDate(item = {}) {
  return dateKey(
    item.mediaVariant?.publishDate
      || item.artworkDay?.publishDate
      || item.publishDate
      || item.campaign?.publishDate
      || item.intendedScheduledFor
      || item.scheduledFor,
  );
}

function creatorTipNumber(item = {}) {
  const campaignNumber = Number(item.campaign?.tipNumber);
  if (Number.isInteger(campaignNumber) && campaignNumber > 0) return campaignNumber;
  const match = `${item.source || ''} ${item.title || ''}`.match(/(?:tip[-\s#:]*)?(\d+)\b/i);
  return match ? Number(match[1]) : 0;
}

function mediaValues(media = {}) {
  return [media.path, media.url, media.localUrl, media.ryzenUrl, media.filename]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function mediaKey(media = {}) {
  return mediaValues(media)[0] || null;
}

function mediaRole(media = {}) {
  return String(media.role || media.format || media.kind || '').trim().toLowerCase();
}

function isDailyCoverMedia(media = {}) {
  return mediaValues(media).some((value) => /daily-set-cover/i.test(value));
}

function isQcBlocked(item = {}, media = {}) {
  const states = [
    media.qcStatus,
    media.reviewStatus,
    item.mediaApproval?.storyStatus,
    item.mediaReview?.storyStatus,
  ].map((value) => String(value || '').toLowerCase());
  return media.flagged === true
    || media.qcFlagged === true
    || media.needsRedo === true
    || item.storyNeedsRedo === true
    || item.mediaRedo?.story === true
    || states.some((state) => /flag|reject|redo|fail|pending|needs?[-\s]?qc/.test(state));
}

function storyIsApproved(item = {}, media = {}) {
  if (isQcBlocked(item, media)) return false;
  if (media.approved === false || media.status === 'rejected') return false;
  return media.approved === true
    || media.status === 'approved'
    || Boolean(item.mediaApproval?.storyApprovedAt)
    || Boolean(item.mediaApproval?.hiddenAt)
    || APPROVED_STATES.has(String(item.status || '').toLowerCase());
}

function storyMediaFor(item = {}) {
  const media = Array.isArray(item.media) ? item.media : [];
  return media.find((asset) => mediaRole(asset) === 'story' && mediaKey(asset) && !isDailyCoverMedia(asset));
}

function creatorTipFeedItems(items = []) {
  return items.filter((item) => item?.campaign?.kind === CREATOR_TIP_KIND && item?.format !== 'story');
}

function removeEmoji(value = '') {
  return String(value)
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]/gu, '')
    .replace(/[0-9#*]\uFE0F?\u20E3/gu, '');
}

export function stripCreatorTipNarrationText(value = '', { title = '' } = {}) {
  const normalizedTitle = removeEmoji(title).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const lines = removeEmoji(value)
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((line) => !BOILERPLATE_PATTERNS.some((pattern) => pattern.test(line)))
    .filter((line) => {
      const normalizedLine = line.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      return !normalizedTitle || normalizedLine !== normalizedTitle;
    });
  return lines.join(' ').replace(/\s+([,.!?;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

function sentenceExcerpt(value = '', maximum = 240) {
  const text = String(value).trim();
  if (text.length <= maximum) return text;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let excerpt = '';
  for (const sentence of sentences) {
    if (`${excerpt} ${sentence}`.trim().length > maximum) break;
    excerpt = `${excerpt} ${sentence}`.trim();
  }
  if (excerpt) return excerpt;
  return `${text.slice(0, maximum - 1).trimEnd()}\u2026`;
}

function cleanTitle(item = {}) {
  return removeEmoji(item.title || `Creator Tip ${creatorTipNumber(item)}`)
    .replace(/^\s*(?:creator\s+)?tip\s*#?\s*\d+\s*[-:\u2013\u2014]?\s*/i, '')
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashtagFrom(value = '') {
  const words = removeEmoji(value)
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word && !HASHTAG_STOP_WORDS.has(word.toLowerCase()));
  if (!words.length) return null;
  return `#${words.slice(0, 3).map((word) => word[0].toUpperCase() + word.slice(1)).join('')}`;
}

export function creatorTipReelHashtags(items = []) {
  const relevant = [];
  const add = (value) => {
    const hashtag = hashtagFrom(value);
    if (!hashtag || hashtag.toLowerCase() === '#creatorslistenup') return;
    if (!relevant.some((existing) => existing.toLowerCase() === hashtag.toLowerCase())) relevant.push(hashtag);
  };
  for (const item of items) add(item.campaign?.category);
  relevant.push('#CreatorTips', '#BuiltNotBegged');
  const uniqueRelevant = [...new Map(relevant.map((tag) => [tag.toLowerCase(), tag])).values()].slice(0, 3);
  return ['#CreatorsListenUp', ...uniqueRelevant].slice(0, 5);
}

function dailyCaption(date, tips, hashtags) {
  const categories = [...new Set(tips.map((tip) => tip.category).filter(Boolean))].slice(0, 3);
  const topic = categories.length ? categories.join(', ') : 'creator strategy and audience growth';
  const first = tips[0].tipNumber;
  const last = tips.at(-1).tipNumber;
  return [
    `Twelve practical creator lessons for ${date}, covering ${topic}. Tips ${first}-${last} turn the day's ideas into one focused playbook.`,
    '',
    hashtags.join(' '),
  ].join('\n');
}

function coverFrame(dailyCover) {
  if (!dailyCover) return null;
  const key = mediaKey(dailyCover);
  return key ? { type: 'daily-cover', position: 0, source: key, media: dailyCover } : null;
}

function coverDate(cover = {}, fallbackDate = null) {
  const explicit = dateKey(cover.date || cover.publishDate);
  if (explicit) return explicit;
  for (const value of mediaValues(cover.media || cover)) {
    const match = value.match(/(?:^|\D)(\d{4}-\d{2}-\d{2})(?:\D|$)/);
    if (match) return match[1];
  }
  return fallbackDate;
}

function displayCaseCoverManifest(publishDate, dailyCover, monthToDateCovers = []) {
  const month = publishDate.slice(0, 7);
  const candidates = [...monthToDateCovers, ...(dailyCover ? [dailyCover] : [])];
  const bySource = new Map();
  for (const candidate of candidates) {
    const media = candidate?.media || candidate;
    const source = mediaKey(media);
    const date = coverDate(candidate, candidate === dailyCover ? publishDate : null);
    if (!source || !date || !date.startsWith(month) || date > publishDate) continue;
    if (media.approved === false || isQcBlocked({}, media)) continue;
    bySource.set(source, { date, source, media });
  }
  return [...bySource.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function creatorTipDisplayCasePrompt({ publishDate, covers = [] } = {}) {
  const count = covers.length;
  return [
    'Create a photorealistic collector display-case photograph.',
    `Show exactly the ${count} supplied, approved daily comic-book issue cover${count === 1 ? '' : 's'} accumulated from ${String(publishDate || '').slice(0, 7)}-01 through ${publishDate}.`,
    'Arrange the covers in chronological order, visibly filling exactly one additional book slot for each completed issue day while all later slots remain naturally empty.',
    'Preserve every supplied cover exactly as approved, including its artwork, face, title, colors, logo, signature, and printed words.',
    'Do not redraw covers, duplicate issues, fill future slots, alter text, or invent any text, branding, books, people, hands, or props.',
    'Use realistic glass reflections, shelving, paper edges, binding depth, shadows, and gallery lighting while keeping every accumulated cover identifiable.',
  ].join(' ');
}

export function creatorTipWeeklyCollectionPrompts({ periodStart, periodEnd, covers = [] } = {}) {
  const base = [
    'Create a photorealistic 1200x630 collector photograph.',
    `Use exactly the ${covers.length} supplied, approved daily comic-book issue covers accumulated from ${periodStart} through ${periodEnd}.`,
    'Preserve every cover exactly as approved, including artwork, faces, titles, colors, logos, signatures, and printed words.',
    'Do not redraw, rewrite, duplicate, omit, or invent any cover, page text, dialogue, branding, person, or hand.',
  ].join(' ');
  return [
    {
      role: 'coffee-table',
      label: 'Coffee table',
      prompt: `${base} Arrange all supplied issues naturally across a real coffee table with believable paper, depth, overlap, and warm room light while keeping every cover identifiable.`,
    },
    {
      role: 'bed-open-page',
      label: 'Bed with open page',
      prompt: `${base} Arrange the issues on a neatly textured bed, with one comic open to supplied approved Story artwork only and the remaining covers visible around it. Do not invent interior panels or text.`,
    },
    {
      role: 'comic-storage-box',
      label: 'Comic book storage box',
      prompt: `${base} Place the issues in and around a realistic collector comic-book storage box, ordered by date, with convincing sleeves, dividers, paper edges, and archival detail.`,
    },
    {
      role: 'display-case',
      label: 'Display case',
      prompt: `${base} Show the issues chronologically filling the collector display case one slot at a time, with later slots left naturally empty and realistic glass reflections and gallery lighting.`,
    },
  ];
}

function validateDailyItems(items, requestedDate) {
  const feedItems = creatorTipFeedItems(items);
  if (feedItems.length !== 12) throw new Error(`Daily Creator Tip reels require exactly 12 feed items; received ${feedItems.length}.`);
  const dates = [...new Set(feedItems.map(itemPublishDate).filter(Boolean))];
  if (dates.length !== 1 || feedItems.some((item) => !itemPublishDate(item))) {
    throw new Error('All 12 Creator Tip feed items must have the same valid publish date.');
  }
  if (requestedDate && dateKey(requestedDate) !== dates[0]) throw new Error(`Creator Tip items do not match requested date ${requestedDate}.`);
  const tipNumbers = feedItems.map(creatorTipNumber);
  if (tipNumbers.some((number) => !number) || new Set(tipNumbers).size !== 12) {
    throw new Error('Daily Creator Tip reels require 12 distinct numbered tips.');
  }
  return { feedItems, publishDate: dates[0] };
}

export function buildDailyCreatorTipReelPlan({
  items = [],
  publishDate = null,
  dailyCover = null,
  monthToDateCovers = [],
} = {}) {
  const validated = validateDailyItems(items, publishDate);
  const sorted = [...validated.feedItems].sort((left, right) => creatorTipNumber(left) - creatorTipNumber(right));
  const seenStories = new Set();
  const tips = sorted.map((item) => {
    const story = storyMediaFor(item);
    if (!story || !storyIsApproved(item, story)) {
      throw new Error(`Creator Tip ${creatorTipNumber(item)} needs a distinct approved Story image.`);
    }
    const storyKey = mediaKey(story);
    if (seenStories.has(storyKey)) throw new Error(`Story image ${storyKey} is reused by more than one Creator Tip.`);
    seenStories.add(storyKey);
    const title = cleanTitle(item);
    const narration = sentenceExcerpt(stripCreatorTipNarrationText(item.body || item.caption || '', { title }));
    if (!narration) throw new Error(`Creator Tip ${creatorTipNumber(item)} has no usable narration after cleanup.`);
    return {
      tipNumber: creatorTipNumber(item),
      title,
      category: String(item.campaign?.category || '').trim(),
      narration,
      sourceItemId: item.id || null,
      story,
      storyKey,
    };
  });
  const hashtags = creatorTipReelHashtags(sorted);
  const cover = coverFrame(dailyCover);
  const displayCaseCovers = displayCaseCoverManifest(
    validated.publishDate,
    dailyCover,
    monthToDateCovers,
  );
  const frames = [
    ...(cover ? [cover] : []),
    ...tips.map((tip, index) => ({
      type: 'story',
      position: index + (cover ? 1 : 0),
      tipNumber: tip.tipNumber,
      source: tip.storyKey,
      media: tip.story,
    })),
  ];
  return {
    type: 'creator-tip-reel-plan',
    cadence: 'daily',
    publishDate: validated.publishDate,
    periodStart: validated.publishDate,
    periodEnd: validated.publishDate,
    tipCount: tips.length,
    tips,
    narrationScript: tips.map((tip) => `Tip ${tip.tipNumber}: ${tip.title}. ${tip.narration}`).join('\n\n'),
    caption: dailyCaption(validated.publishDate, tips, hashtags),
    hashtags,
    frames,
    dailyCoverIncluded: Boolean(cover),
    displayCaseCovers,
    displayCasePrompt: creatorTipDisplayCasePrompt({
      publishDate: validated.publishDate,
      covers: displayCaseCovers,
    }),
    completed: true,
  };
}

function dailyPlanIsComplete(plan = {}) {
  return plan.cadence === 'daily'
    && plan.completed !== false
    && /^\d{4}-\d{2}-\d{2}$/.test(String(plan.publishDate || ''))
    && plan.tipCount === 12
    && Array.isArray(plan.frames)
    && plan.frames.filter((frame) => frame.type === 'story').length === 12;
}

export function buildWeeklyCreatorTipReelPlan({ dailyPlans = [], throughDate = null } = {}) {
  if (!dailyPlans.length) throw new Error('A weekly Creator Tip reel requires completed daily plans.');
  const endDate = dateKey(throughDate || dailyPlans.map((plan) => plan.publishDate).sort().at(-1));
  if (!endDate) throw new Error('A weekly Creator Tip reel requires a valid through date.');
  const month = endDate.slice(0, 7);
  const included = dailyPlans
    .filter(dailyPlanIsComplete)
    .filter((plan) => plan.publishDate.startsWith(month) && plan.publishDate <= endDate)
    .sort((left, right) => left.publishDate.localeCompare(right.publishDate));
  if (!included.length) throw new Error(`No completed daily Creator Tip reels exist through ${endDate}.`);
  const dates = included.map((plan) => plan.publishDate);
  if (new Set(dates).size !== dates.length) throw new Error('Weekly Creator Tip reel inputs contain duplicate daily plans.');
  const allItems = included.flatMap((plan) => plan.tips || []).map((tip) => ({ campaign: { category: tip.category } }));
  const hashtags = creatorTipReelHashtags(allItems);
  const frames = included.flatMap((plan) => plan.frames.map((frame) => ({ ...frame, publishDate: plan.publishDate })))
    .map((frame, position) => ({ ...frame, position }));
  const collectionCovers = [...new Map(
    included.flatMap((plan) => plan.displayCaseCovers || [])
      .map((cover) => [cover.source, cover]),
  ).values()].sort((left, right) => left.date.localeCompare(right.date));
  const weekNumber = Math.ceil(Number(endDate.slice(8, 10)) / 7);
  return {
    type: 'creator-tip-reel-plan',
    cadence: 'weekly',
    month,
    weekNumber,
    periodStart: `${month}-01`,
    periodEnd: endDate,
    includedDates: dates,
    dailyPlanCount: included.length,
    tipCount: included.reduce((total, plan) => total + plan.tipCount, 0),
    narrationScript: included.map((plan) => `${plan.publishDate}\n${plan.narrationScript}`).join('\n\n'),
    caption: [
      `The month-to-date Creator Tips recap through week ${weekNumber}: ${included.length} completed days and ${included.length * 12} practical lessons in one reel.`,
      '',
      hashtags.join(' '),
    ].join('\n'),
    hashtags,
    frames,
    collectionCovers,
    collectionPrompts: creatorTipWeeklyCollectionPrompts({
      periodStart: `${month}-01`,
      periodEnd: endDate,
      covers: collectionCovers,
    }),
    completed: true,
  };
}

export function buildCreatorTipReelRyzenJobPayload(plan = {}) {
  if (!['daily', 'weekly'].includes(plan.cadence)) throw new Error('Ryzen reel jobs require a daily or weekly Creator Tip reel plan.');
  if (!plan.narrationScript || !Array.isArray(plan.frames) || !plan.frames.length) {
    throw new Error('Ryzen reel jobs require narration and ordered frames.');
  }
  return {
    type: REEL_JOB_TYPE,
    engine: REEL_ENGINE,
    pageFlip: true,
    requestedBy: REQUESTED_BY,
    approvalRequired: true,
    returnForReview: true,
    publishToFacebook: false,
    publishAllowed: false,
    cadence: plan.cadence,
    periodStart: plan.periodStart,
    periodEnd: plan.periodEnd,
    narration: plan.narrationScript,
    caption: plan.caption,
    hashtags: [...plan.hashtags],
    notBeforeAt: plan.notBeforeAt || null,
    frames: plan.frames.map((frame) => ({
      type: frame.type,
      position: frame.position,
      publishDate: frame.publishDate || plan.publishDate || null,
      tipNumber: frame.tipNumber || null,
      source: frame.source,
    })),
  };
}

export const buildRyzenCreatorTipReelJob = buildCreatorTipReelRyzenJobPayload;

