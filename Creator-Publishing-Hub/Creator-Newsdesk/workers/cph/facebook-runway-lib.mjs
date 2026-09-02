export function normalizeCategory(value) {
  return String(value || 'Uncategorized')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function extractExternalUrl(value) {
  const matches = String(value || '').match(/https?:\/\/[^\s)]+/gi) || [];
  return matches.map((candidate) => candidate.replace(/[.,;!?]+$/, ''))
    .find((candidate) => !/facebook\.com|fb\.com/i.test(candidate)) || '';
}

export function categoryForItem(item) {
  const explicit = item?.category || item?.primary_category;
  if (explicit) return normalizeCategory(explicit);
  const link = String(item?.permalink || extractExternalUrl(item?.message) || '');
  try {
    const segment = new URL(link).pathname.split('/').filter(Boolean)[0];
    return normalizeCategory(segment || 'Uncategorized');
  } catch {
    return 'Uncategorized';
  }
}

export function rankCategoryPerformance(posts, knownCategories = [], metricsAvailable = false) {
  const rows = new Map();
  for (const category of knownCategories) {
    const normalized = normalizeCategory(category);
    rows.set(normalized, { category: normalized, posts: 0, reactions: 0, comments: 0, shares: 0, score: 0 });
  }
  for (const post of Array.isArray(posts) ? posts : []) {
    const category = categoryForItem(post);
    const row = rows.get(category) || { category, posts: 0, reactions: 0, comments: 0, shares: 0, score: 0 };
    row.posts += 1;
    const reactions = typeof post?.reactions === 'number' ? post.reactions : post?.reactions?.summary?.total_count;
    const comments = typeof post?.comments === 'number' ? post.comments : post?.comments?.summary?.total_count;
    const shares = typeof post?.shares === 'number' ? post.shares : post?.shares?.count;
    row.reactions += Number(reactions) || 0;
    row.comments += Number(comments) || 0;
    row.shares += Number(shares) || 0;
    rows.set(category, row);
  }
  for (const row of rows.values()) {
    const engagement = row.reactions + (row.comments * 2) + (row.shares * 3);
    row.score = metricsAvailable ? Math.round((engagement / Math.max(1, row.posts)) * 1000) / 1000 : 0;
  }
  return [...rows.values()].sort((left, right) => right.score - left.score
    || right.posts - left.posts
    || left.category.localeCompare(right.category));
}

export function missingRunwaySlots({
  now = new Date(),
  days = 29,
  postsPerDay = 12,
  leadMinutes = 30,
  existingEpochs = [],
}) {
  const slotSeconds = Math.floor(86_400 / postsPerDay);
  const first = Math.ceil((Math.floor(now.valueOf() / 1000) + (leadMinutes * 60)) / slotSeconds) * slotSeconds;
  const targetCount = days * postsPerDay;
  const occupied = new Set(existingEpochs.map((value) => Number(value)).filter(Number.isFinite));
  const slots = [];
  for (let index = 0; index < targetCount; index += 1) {
    const epoch = first + (index * slotSeconds);
    if (!occupied.has(epoch)) slots.push(epoch);
  }
  return { first, slotSeconds, targetCount, slots };
}

function categoryWeights(performance, categories) {
  const scores = new Map((performance || []).map((row) => [normalizeCategory(row.category), Number(row.score || 0)]));
  const maxScore = Math.max(0, ...scores.values());
  return new Map(categories.map((category) => {
    const score = scores.get(category) || 0;
    return [category, maxScore > 0 ? 1 + (score / maxScore) * 3 : 1];
  }));
}

export function selectUniqueCandidates({ candidates = [], scheduledMessages = [], performance = [], limit = 50 }) {
  const scheduledUrls = new Set(scheduledMessages.map(extractExternalUrl).filter(Boolean));
  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    const permalink = String(item?.permalink || '').trim();
    if (!permalink || Number(item?.featured_media || 0) <= 0 || seen.has(permalink) || scheduledUrls.has(permalink)) continue;
    seen.add(permalink);
    unique.push({ ...item, category: categoryForItem(item) });
  }

  const groups = new Map();
  for (const item of unique) {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  }
  const categories = [...groups.keys()].sort();
  const weights = categoryWeights(performance, categories);
  const served = new Map(categories.map((category) => [category, 0]));
  const selected = [];
  while (selected.length < limit && [...groups.values()].some((items) => items.length)) {
    const category = categories
      .filter((entry) => groups.get(entry).length)
      .sort((left, right) => (served.get(left) / weights.get(left)) - (served.get(right) / weights.get(right))
        || left.localeCompare(right))[0];
    selected.push(groups.get(category).shift());
    served.set(category, served.get(category) + 1);
  }
  return selected;
}

export function buildContentDemand({ missingSlots = 0, candidates = [], performance = [] }) {
  const categories = [...new Set(candidates.map(categoryForItem))];
  const ranked = performance.length
    ? performance.filter((row) => categories.includes(normalizeCategory(row.category)))
    : categories.map((category) => ({ category, score: 0 }));
  return {
    missing_slots: Math.max(0, Number(missingSlots) || 0),
    ready_unique_items: new Set(candidates.map((item) => item?.permalink).filter(Boolean)).size,
    priority_categories: ranked.map((row) => ({ category: normalizeCategory(row.category), score: Number(row.score || 0) })),
  };
}
