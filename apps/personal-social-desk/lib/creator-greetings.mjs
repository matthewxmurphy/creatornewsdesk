import { createHash, randomUUID } from 'node:crypto';

import { cleanImportedText, parseCreatorTipCsv } from './creator-tip-csv.mjs';
import { matthewLikenessAnchor, matthewReferencePackInstruction } from './matthew-likeness.mjs';

export const CREATOR_GREETING_TIME_ZONE = 'America/Los_Angeles';
export const CREATOR_GREETING_SLOTS = Object.freeze({
  'good-morning': Object.freeze({ category: 'Good Morning', hour: 3, minute: 45, anchor: '4:00 AM', offsetMinutes: -15 }),
  'good-afternoon': Object.freeze({ category: 'Good Afternoon', hour: 11, minute: 45, anchor: '12:00 PM', offsetMinutes: -15 }),
  'good-night': Object.freeze({ category: 'Good Night', hour: 20, minute: 0, anchor: '9:00 PM AI lane', offsetMinutes: -60 }),
});

const zonedPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CREATOR_GREETING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function normalizedKey(value = '') {
  return cleanImportedText(value)
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function identityHash(parts = []) {
  return createHash('sha256')
    .update(parts.map((value) => String(value || '').trim().toLocaleLowerCase()).join('|'))
    .digest('hex')
    .slice(0, 24);
}

function formatterParts(date) {
  return Object.fromEntries(
    zonedPartsFormatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
}

function zonedLocalTimeToIso({ year, month, day, hour, minute }) {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidate = localAsUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = formatterParts(new Date(candidate));
    const renderedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0);
    candidate -= renderedAsUtc - localAsUtc;
  }
  return new Date(candidate).toISOString();
}

export function creatorGreetingSchedule(date = '', category = '') {
  const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const slot = CREATOR_GREETING_SLOTS[normalizedKey(category)];
  if (!match || !slot) return null;
  return zonedLocalTimeToIso({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: slot.hour,
    minute: slot.minute,
  });
}

function existingGreetingKeys(items = []) {
  return new Set((Array.isArray(items) ? items : [])
    .filter((item) => item?.campaign?.kind === 'creator-greeting')
    .flatMap((item) => [item?.campaign?.importKey, item?.source])
    .filter(Boolean)
    .map(String));
}

export function analyzeCreatorGreetingsCsv({ csvText = '', filename = 'creator-greetings.csv', queueItems = [] } = {}) {
  const parsed = parseCreatorTipCsv(csvText);
  const existingKeys = existingGreetingKeys(queueItems);
  const seenKeys = new Set(existingKeys);
  const rows = [];
  const duplicates = [];
  const errors = [];

  for (const parsedRow of parsed.rows) {
    const values = parsedRow.values || {};
    const date = cleanImportedText(values.date);
    const categoryKey = normalizedKey(values.category);
    const slot = CREATOR_GREETING_SLOTS[categoryKey];
    const caption = cleanImportedText(values.caption);
    const story = cleanImportedText(values.story);
    const imagePrompt = cleanImportedText(values.image_prompt).slice(0, 4000);
    const scheduledFor = creatorGreetingSchedule(date, categoryKey);
    if (!scheduledFor) {
      errors.push({ rowNumber: parsedRow.rowNumber, error: slot ? 'Date must use YYYY-MM-DD.' : 'Category must be Good Morning, Good Afternoon, or Good Night.' });
      continue;
    }
    if (!caption || !story || !imagePrompt) {
      errors.push({ rowNumber: parsedRow.rowNumber, error: 'Caption, Story text, and image prompt are required.' });
      continue;
    }
    const importKey = identityHash([date, categoryKey, caption, story, imagePrompt]);
    const source = `creator-greetings:${date}:${categoryKey}`;
    if (seenKeys.has(importKey) || seenKeys.has(source)) {
      duplicates.push({ rowNumber: parsedRow.rowNumber, date, category: slot.category });
      continue;
    }
    seenKeys.add(importKey);
    seenKeys.add(source);
    rows.push({
      rowNumber: parsedRow.rowNumber,
      date,
      category: slot.category,
      categoryKey,
      caption,
      story,
      imagePrompt,
      scheduledFor,
      anchor: slot.anchor,
      importKey,
      source,
    });
  }

  const dates = [...new Set(rows.map((row) => row.date))].sort();
  return {
    filename,
    headers: parsed.headers,
    totalRows: parsed.rows.length,
    accepted: rows.length,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    firstDate: dates[0] || null,
    lastDate: dates.at(-1) || null,
    rows,
    duplicates,
    errors,
  };
}

function greetingPrompt(row, role) {
  const story = role === 'story';
  const dimensions = story ? '1080x1920 vertical Facebook Story' : '1200x630 wide Facebook feed';
  const headline = row.category === 'Good Night' ? 'GOOD NIGHT, CREATORS' : `${row.category.toLocaleUpperCase()}, CREATORS`;
  const supportingText = story ? row.story : row.caption.split(/\n{2,}/).find((part) => !part.startsWith('#')) || row.story;
  return [
    `Create exact ${dimensions} finished artwork for Matthew Murphy : Built Not Begged.`,
    `Visual direction: ${row.imagePrompt}`,
    'Use an original energetic creator-business comic style with dramatic lighting, expressive but believable anatomy, strong mobile readability, and intentional time-of-day atmosphere.',
    matthewLikenessAnchor(),
    matthewReferencePackInstruction(),
    `Primary headline: "${headline}".`,
    `Supporting message: "${supportingText.slice(0, 500)}".`,
    'Authorized visible text only: render exactly the primary headline, supporting message, and the spaced handwritten "Matthew Murphy" signature. Do not add any other readable letters, numbers, words, labels, logos, badges, stickers, captions, UI text, or decorative microcopy anywhere.',
    'Keep all props wordless: mugs, notebooks, papers, screens, posters, walls, signs, books, folders, windows, desk objects, and background details must have no readable writing or logo-like marks.',
    story
      ? 'Keep important text and faces inside Facebook Story safe margins: 250 px clear at the top, 320 px clear at the bottom, and 90 px clear on both sides.'
      : 'Keep important text and faces inside a 30 px bleed-safe edge and strong feed-safe margins.',
    story
      ? 'Place the exact spaced handwritten signature "Matthew Murphy" in the lower-right artwork area, with the entire signature inside x=640-980 and y=1380-1480 on the 1080x1920 canvas; no part of the signature may sit below y=1500.'
      : 'Add the exact spaced handwritten signature "Matthew Murphy" near the lower-right safe area.',
    story
      ? 'Leave y=1500 through the bottom edge as clean background only: no readable text, signature, face, hands, or important prop may appear there. Do not place the signature at the bottom edge.'
      : '',
    'No copyrighted characters, platform logos, tattoos, black hair, black beard, extra limbs, malformed hands, tiny copy, misspellings, placeholders, or separate watermark pass.',
  ].filter(Boolean).join('\n\n').slice(0, 8000);
}

export function buildCreatorGreetingDrafts(analysis, { now = new Date() } = {}) {
  const createdAt = now.toISOString();
  return (analysis.rows || []).map((row) => ({
    id: randomUUID(),
    title: `${row.category} — ${row.date}`,
    body: row.caption.slice(0, 5000),
    target: 'matthew-page',
    format: 'feed',
    status: 'draft',
    scheduledFor: row.scheduledFor,
    intendedScheduledFor: row.scheduledFor,
    source: row.source,
    notes: `Imported from ${analysis.filename}. Runs before the ${row.anchor} creator anchor. Media approval is required before Facebook scheduling.`,
    tagTargets: [],
    media: [],
    imagePrompt: greetingPrompt(row, 'feed'),
    storyImagePrompt: greetingPrompt(row, 'story'),
    storyPromo: row.story.slice(0, 500),
    campaign: {
      kind: 'creator-greeting',
      csv: analysis.filename,
      date: row.date,
      category: row.category,
      categoryKey: row.categoryKey,
      importKey: row.importKey,
      anchor: row.anchor,
      offsetMinutes: CREATOR_GREETING_SLOTS[row.categoryKey].offsetMinutes,
      destination: 'matthew-page',
      timezone: CREATOR_GREETING_TIME_ZONE,
    },
    createdAt,
  }));
}

export function reserveCreatorGreetingSlots(queue = {}, drafts = [], { now = new Date() } = {}) {
  const reservedSlots = new Set((drafts || []).map((draft) => draft.scheduledFor).filter(Boolean));
  const releasedAt = now.toISOString();
  const released = [];
  for (const item of Array.isArray(queue.items) ? queue.items : []) {
    if (!reservedSlots.has(item?.scheduledFor)) continue;
    if (item?.target !== 'matthew-page' || item?.format === 'story') continue;
    if (item?.campaign?.kind !== 'creators-listen-up' || item?.status !== 'draft') continue;
    if ((item?.media || []).length || item?.mediaApproval?.hiddenAt || item?.facebookHandoff?.facebookConfirmed) continue;
    const releasedScheduledFor = item.scheduledFor;
    item.scheduledFor = null;
    item.schedulingBlockedReason = 'This slot is reserved for Creator Greetings. Reflow this backlog draft after media approval.';
    item.slotReservation = {
      reason: 'creator-greeting-priority',
      releasedScheduledFor,
      releasedAt,
    };
    item.updatedAt = releasedAt;
    released.push({ id: item.id, title: item.title, releasedScheduledFor });
  }
  return released;
}

export function pruneExpiredCreatorGreetings(queue = {}, { now = new Date() } = {}) {
  const items = Array.isArray(queue.items) ? queue.items : [];
  const removed = [];
  const cutoff = now.valueOf();
  queue.items = items.filter((item) => {
    if (item?.campaign?.kind !== 'creator-greeting') return true;
    if (item?.facebookHandoff?.facebookConfirmed || item?.status === 'published') return true;
    const scheduledTime = Date.parse(item?.intendedScheduledFor || item?.scheduledFor || 0);
    if (!Number.isFinite(scheduledTime) || scheduledTime > cutoff) return true;
    removed.push({
      id: item.id,
      title: item.title,
      scheduledFor: item.scheduledFor || null,
      intendedScheduledFor: item.intendedScheduledFor || null,
    });
    return false;
  });
  return removed;
}

