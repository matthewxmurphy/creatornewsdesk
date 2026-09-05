import { createHash, randomUUID } from 'node:crypto';

import { creatorTipLaunchSchedule, creatorTipNumberFromItem } from './creator-tip-schedule.mjs';

const FIELD_ALIASES = {
  category: ['category', 'content_category', 'pillar', 'topic'],
  categoryNumber: ['category_number', 'category_tip_number', 'category_id', 'tip_number'],
  sourceId: ['source_id', 'external_id', 'row_id', 'id'],
  title: ['tip_title', 'title', 'headline', 'hook', 'name'],
  body: ['facebook_post', 'post', 'body', 'caption', 'content'],
  landscapePrompt: ['landscape_image_prompt', 'image_prompt', 'feed_image_prompt', 'landscape_prompt'],
  storyPrompt: ['story_image_prompt', 'story_prompt', 'vertical_image_prompt'],
  videoPrompt: ['video_prompt', 'reel_prompt'],
  storyPromo: ['story_promo', 'story_text', 'story_caption'],
  sourceTitle: ['source_title', 'source_name'],
  sourceUrl: ['source_url', 'url', 'link'],
};

const CATEGORY_EMOJIS = [
  [/(mindset|mental|confidence|belief)/i, '🧠💪'],
  [/(reel|short.?form|video)/i, '🎬📱'],
  [/(growth|audience|discovery|reach)/i, '📈🚀'],
  [/(story|writing|narrative)/i, '📖✨'],
  [/(engage|community|comment|conversation)/i, '💬🤝'],
  [/(money|monet|income|business|sales)/i, '💰🎯'],
  [/(brand|identity|position)/i, '🎨🧭'],
  [/(consisten|habit|routine|discipline)/i, '📅🔥'],
  [/(audio|music|sound)/i, '🎵🎧'],
  [/(camera|photo|visual|design)/i, '📸⚡'],
];

function normalizedHeader(value = '') {
  return String(value)
    .replace(/^\uFEFF/, '')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function parseCreatorTipCsv(text = '') {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const records = [];
  let field = '';
  let record = [];
  let quoted = false;
  const pushField = () => {
    record.push(field.trim());
    field = '';
  };
  const pushRecord = () => {
    if (record.some((value) => value.length)) records.push(record);
    record = [];
  };
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === ',') {
      pushField();
    } else if (!quoted && (character === '\n' || character === '\r')) {
      pushField();
      if (character === '\r' && next === '\n') index += 1;
      pushRecord();
    } else {
      field += character;
    }
  }
  if (field.length || record.length) {
    pushField();
    pushRecord();
  }
  if (!records.length) return { headers: [], rows: [] };
  const headers = records.shift().map(normalizedHeader);
  return {
    headers,
    rows: records.map((values, rowIndex) => ({
      rowNumber: rowIndex + 2,
      values: Object.fromEntries(headers.map((header, index) => [header, String(values[index] || '').trim()])),
    })),
  };
}

function fieldValue(values = {}, aliases = []) {
  for (const alias of aliases) {
    const value = String(values[alias] || '').trim();
    if (value) return value;
  }
  return '';
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function cleanImportedText(value = '') {
  return decodeHtml(String(value || ''))
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function categoryLabel(value = '') {
  const source = cleanImportedText(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!source) return '';
  return source.split(' ').map((word) => {
    if (/^[A-Z0-9]{2,5}$/.test(word)) return word;
    return `${word.charAt(0).toLocaleUpperCase()}${word.slice(1).toLocaleLowerCase()}`;
  }).join(' ');
}

export function categoryKey(value = '') {
  return categoryLabel(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function categoryHashtag(value = '') {
  const label = categoryLabel(value);
  return label ? `#${label.replace(/[^A-Za-z0-9]+/g, '')}` : '';
}

function categoryEmoji(value = '', title = '') {
  const haystack = `${value} ${title}`;
  return CATEGORY_EMOJIS.find(([pattern]) => pattern.test(haystack))?.[1] || '💡✨';
}

function normalizeSpacing(value = '') {
  return cleanImportedText(value)
    .replace(/([.!?])(?=[A-Za-z0-9"'“”‘’([{#@])/g, '$1 ')
    .replace(/([^\s#])(?=#[A-Za-z0-9_])/g, '$1 ')
    .replace(/[ \t]+([,;:!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hashtagKey(value = '') {
  return String(value).toLocaleLowerCase();
}

export function formatFacebookPost({ body = '', title = '', category = '' } = {}) {
  let copy = normalizeSpacing(body || title);
  const hashtags = [];
  copy = copy.replace(/(^|\s)(#[A-Za-z0-9_]+)/g, (match, spacing, hashtag) => {
    if (!hashtags.some((value) => hashtagKey(value) === hashtagKey(hashtag))) hashtags.push(hashtag);
    return spacing;
  }).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!/\p{Extended_Pictographic}/u.test(copy.slice(0, 12))) {
    copy = `${categoryEmoji(category, title)} ${copy}`.trim();
  }
  const requiredTags = ['#creatorslistenup', categoryHashtag(category)].filter(Boolean);
  for (const hashtag of requiredTags) {
    if (!hashtags.some((value) => hashtagKey(value) === hashtagKey(hashtag))) hashtags.push(hashtag);
  }
  return normalizeSpacing([copy, hashtags.join(' ')].filter(Boolean).join('\n\n'));
}

function identityHash(parts = []) {
  return createHash('sha256').update(parts.map((value) => String(value || '').trim().toLocaleLowerCase()).join('|')).digest('hex').slice(0, 24);
}

const IDEA_VARIANT_SUFFIX = /\s*:\s*(?:two[- ]line thought|unpopular opinion|creator conversation|built not begged|quick audit|do this next|myth vs\.? reality|creator reminder)\.?\s*$/i;
const IDEA_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'into', 'is', 'it',
  'of', 'on', 'or', 'that', 'the', 'this', 'to', 'use', 'with', 'you', 'your',
]);

export function creatorTipIdeaKey(value = '') {
  return cleanImportedText(value)
    .replace(/^.{0,80}#\d+\s*[—–:-]\s*/u, '')
    .replace(/^tip\s*#?\d+\s*[—–:-]\s*/i, '')
    .replace(IDEA_VARIANT_SUFFIX, '')
    .toLocaleLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function ideaTokens(value = '') {
  return creatorTipIdeaKey(value).split(/\s+/)
    .filter((word) => word.length > 1 && !IDEA_STOP_WORDS.has(word))
    .map((word) => word.replace(/(?:ing|ed|es|s)$/i, ''))
    .filter(Boolean);
}

function ideaSimilarity(left = '', right = '') {
  const leftTokens = new Set(ideaTokens(left));
  const rightTokens = new Set(ideaTokens(right));
  if (leftTokens.size < 3 || rightTokens.size < 3) return 0;
  let intersection = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1;
  return intersection / Math.max(1, leftTokens.size + rightTokens.size - intersection);
}

function repeatMatch(row, knownIdeas = []) {
  const key = creatorTipIdeaKey(row.title);
  const exact = knownIdeas.find((idea) => idea.key && idea.key === key);
  if (exact) return { ...exact, similarity: 1, type: 'same core idea' };
  let closest = null;
  for (const idea of knownIdeas) {
    const similarity = ideaSimilarity(key, idea.key);
    if (similarity < 0.84 || (closest && similarity <= closest.similarity)) continue;
    closest = { ...idea, similarity, type: 'near-repeat idea' };
  }
  return closest;
}

function existingCategoryState(items = []) {
  const maximums = new Map();
  const importKeys = new Set();
  const contentKeys = new Set();
  let globalMaximum = 0;
  for (const item of items) {
    globalMaximum = Math.max(globalMaximum, creatorTipNumberFromItem(item));
    const campaign = item?.campaign || {};
    const key = categoryKey(campaign.category || '');
    if (key) {
      const localNumber = Number(campaign.categoryNumber || campaign.tipNumber || 0);
      if (Number.isInteger(localNumber) && localNumber > 0) maximums.set(key, Math.max(maximums.get(key) || 0, localNumber));
    }
    if (campaign.importKey) importKeys.add(String(campaign.importKey));
    if (campaign.contentKey) contentKeys.add(String(campaign.contentKey));
  }
  const ideas = [];
  const seenIdeas = new Set();
  for (const item of items) {
    if (item?.format === 'story') continue;
    const title = cleanImportedText(item?.title || '');
    const key = creatorTipIdeaKey(title);
    if (!key || seenIdeas.has(key)) continue;
    seenIdeas.add(key);
    ideas.push({ key, title, source: 'Social Desk', rowNumber: null });
  }
  return { maximums, importKeys, contentKeys, ideas, globalMaximum };
}

function normalizedRow(parsedRow, fallbackCategory = '') {
  const values = parsedRow.values || {};
  const category = categoryLabel(fieldValue(values, FIELD_ALIASES.category) || fallbackCategory);
  const title = cleanImportedText(fieldValue(values, FIELD_ALIASES.title));
  const rawBody = fieldValue(values, FIELD_ALIASES.body);
  const sourceId = cleanImportedText(fieldValue(values, FIELD_ALIASES.sourceId)).slice(0, 160);
  const sourceCategoryNumber = Number.parseInt(fieldValue(values, FIELD_ALIASES.categoryNumber), 10) || null;
  const body = formatFacebookPost({ body: rawBody, title, category });
  const importKey = identityHash([categoryKey(category), sourceId || title, sourceId ? '' : body]);
  const contentKey = identityHash([categoryKey(category), title, body]);
  return {
    rowNumber: parsedRow.rowNumber,
    category,
    categoryKey: categoryKey(category),
    sourceCategoryNumber,
    sourceId,
    title,
    body,
    importKey,
    contentKey,
    landscapePrompt: cleanImportedText(fieldValue(values, FIELD_ALIASES.landscapePrompt)).slice(0, 8000),
    storyPrompt: cleanImportedText(fieldValue(values, FIELD_ALIASES.storyPrompt)).slice(0, 8000),
    videoPrompt: cleanImportedText(fieldValue(values, FIELD_ALIASES.videoPrompt)).slice(0, 8000),
    storyPromo: cleanImportedText(fieldValue(values, FIELD_ALIASES.storyPromo)).slice(0, 500),
    sourceTitle: cleanImportedText(fieldValue(values, FIELD_ALIASES.sourceTitle)).slice(0, 300),
    sourceUrl: cleanImportedText(fieldValue(values, FIELD_ALIASES.sourceUrl)).slice(0, 1200),
  };
}

export function analyzeCreatorTipCsv({ csvText = '', filename = 'creator-tips.csv', queueItems = [], fallbackCategory = '' } = {}) {
  const parsed = parseCreatorTipCsv(csvText);
  const state = existingCategoryState(queueItems);
  const nextByCategory = new Map(state.maximums);
  let nextGlobal = state.globalMaximum;
  const seenImportKeys = new Set(state.importKeys);
  const seenContentKeys = new Set(state.contentKeys);
  const knownIdeas = [...state.ideas];
  const rows = [];
  const errors = [];
  const duplicates = [];
  for (const parsedRow of parsed.rows) {
    const row = normalizedRow(parsedRow, fallbackCategory);
    if (!row.category) {
      errors.push({ rowNumber: row.rowNumber, error: 'Category is required.' });
      continue;
    }
    if (!row.title || !row.body) {
      errors.push({ rowNumber: row.rowNumber, error: 'Each row needs a title and Facebook post text.' });
      continue;
    }
    const ideaMatch = repeatMatch(row, knownIdeas);
    if (seenImportKeys.has(row.importKey) || seenContentKeys.has(row.contentKey) || ideaMatch) {
      duplicates.push({
        rowNumber: row.rowNumber,
        title: row.title,
        category: row.category,
        reason: ideaMatch?.type || 'same imported content',
        matchedTitle: ideaMatch?.title || row.title,
        matchedRowNumber: ideaMatch?.rowNumber || null,
        matchedSource: ideaMatch?.source || 'Social Desk',
        similarity: ideaMatch?.similarity || 1,
      });
      continue;
    }
    seenImportKeys.add(row.importKey);
    seenContentKeys.add(row.contentKey);
    knownIdeas.push({ key: creatorTipIdeaKey(row.title), title: row.title, source: filename, rowNumber: row.rowNumber });
    const existingMaximum = nextByCategory.get(row.categoryKey) || 0;
    const categoryNumber = existingMaximum + 1;
    nextByCategory.set(row.categoryKey, categoryNumber);
    nextGlobal += 1;
    rows.push({ ...row, categoryNumber, globalTipNumber: nextGlobal, filename });
  }
  const categories = [...new Set(rows.map((row) => row.categoryKey))].map((key) => {
    const categoryRows = rows.filter((row) => row.categoryKey === key);
    const existingMax = state.maximums.get(key) || 0;
    return {
      key,
      category: categoryRows[0]?.category || key,
      existingMax,
      added: categoryRows.length,
      first: categoryRows[0]?.categoryNumber || null,
      last: categoryRows.at(-1)?.categoryNumber || null,
    };
  }).sort((left, right) => left.category.localeCompare(right.category));
  return {
    filename,
    headers: parsed.headers,
    totalRows: parsed.rows.length,
    accepted: rows.length,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    globalTipStart: rows[0]?.globalTipNumber || null,
    globalTipEnd: rows.at(-1)?.globalTipNumber || null,
    categories,
    rows,
    duplicates,
    errors,
  };
}

function promptForRole(row, role) {
  const isStory = role === 'story';
  const dimensions = isStory ? '1080x1920 vertical Facebook Story' : '1200x630 wide Facebook feed';
  const supplied = isStory ? row.storyPrompt : row.landscapePrompt;
  const badge = `${row.category.toLocaleUpperCase()} #${row.categoryNumber}`;
  const base = supplied || `Create an exact ${dimensions} creator-education comic poster for "${row.title}". Use one dominant idea, bold readable typography, original comic energy, clear visual hierarchy, and Matthew Murphy as the only recognizable branded person when a person appears.`;
  return [
    base,
    '',
    'CSV INTAKE IDENTITY (AUTHORITATIVE):',
    `The visible series badge must say exactly "${badge}".`,
    `This is global scheduling tip ${row.globalTipNumber}, but do not print that global number on the artwork.`,
    `Build specifically for ${dimensions}; do not crop another format.`,
    `Main headline: "${row.title}".`,
    'Keep all important text and faces inside safe margins. Use correct spelling, clean anatomy, and a clearly spaced "Matthew Murphy" signature.',
  ].join('\n').slice(0, 8000);
}

function storyPromo(row) {
  if (row.storyPromo) return formatFacebookPost({ body: row.storyPromo, title: row.title, category: row.category }).slice(0, 500);
  return row.body.split(/\n{2,}/).find((part) => part && !part.startsWith('#'))?.slice(0, 500) || row.title;
}

export function buildCreatorTipImportDrafts(analysis, { targets = ['matthew-page', 'matthew-profile'], now = new Date() } = {}) {
  const allowedTargets = [...new Set(targets)].filter((target) => ['matthew-page', 'matthew-profile'].includes(target));
  const destinations = allowedTargets.length ? allowedTargets : ['matthew-page', 'matthew-profile'];
  const createdAt = now.toISOString();
  const drafts = [];
  for (const row of analysis.rows || []) {
    const scheduledFor = creatorTipLaunchSchedule(row.globalTipNumber);
    const displayIdentity = `${row.category} #${row.categoryNumber}`;
    for (const target of destinations) {
      drafts.push({
        id: randomUUID(),
        title: `${displayIdentity} — ${row.title}`.slice(0, 140),
        body: row.body.slice(0, 5000),
        target,
        format: 'feed',
        status: 'draft',
        scheduledFor,
        intendedScheduledFor: scheduledFor,
        source: `facebook-creator-tips:${target}:cycle-1:tip-${row.globalTipNumber}`,
        notes: `Imported from ${analysis.filename}. ${displayIdentity}. Global scheduling tip ${row.globalTipNumber}.${row.sourceCategoryNumber ? ` Source CSV category ID ${row.sourceCategoryNumber}.` : ''}`.slice(0, 1000),
        tagTargets: [],
        media: [],
        imagePrompt: promptForRole(row, 'feed'),
        storyImagePrompt: promptForRole(row, 'story'),
        videoPrompt: row.videoPrompt,
        storyPromo: storyPromo(row),
        sourceTitle: row.sourceTitle,
        sourceUrl: row.sourceUrl,
        campaign: {
          kind: 'facebook-creator-tips',
          csv: analysis.filename,
          tipNumber: String(row.globalTipNumber),
          category: row.category,
          categoryKey: row.categoryKey,
          categoryNumber: String(row.categoryNumber),
          sourceCategoryNumber: row.sourceCategoryNumber ? String(row.sourceCategoryNumber) : '',
          sourceId: row.sourceId,
          importKey: row.importKey,
          contentKey: row.contentKey,
          cycle: 1,
          destination: target,
        },
        createdAt,
      });
    }
  }
  return drafts;
}

export function creatorTipCategoryInventory(items = []) {
  const state = existingCategoryState(items);
  return [...state.maximums.entries()].map(([key, maximum]) => {
    const item = items.find((entry) => categoryKey(entry?.campaign?.category || '') === key);
    return { key, category: categoryLabel(item?.campaign?.category || key), maximum };
  }).sort((left, right) => left.category.localeCompare(right.category));
}

export function creatorTipDisplayIdentity(item = {}) {
  const campaign = item?.campaign || {};
  const category = categoryLabel(campaign.category || '');
  const number = Number(campaign.categoryNumber || 0);
  return category && number > 0 ? `${category} #${number}` : `Creator Tip #${creatorTipNumberFromItem(item)}`;
}

