import { createHash } from 'node:crypto';

export const WEEKLY_THEME_PLAN = Object.freeze([
  { day: 0, key: 'reflection-planning', label: 'Reflection & planning', keywords: ['goal*', 'plan*', 'week', 'learn*', 'lesson*', 'future', 'gratitude', 'reflect*', 'progress', 'focus', 'think*', 'thought*', 'journey', 'milestone*', 'priority*', 'review*', 'reset*', 'improve*', 'intention*', 'habit*'] },
  { day: 1, key: 'creator-growth', label: 'Creator growth', keywords: ['creator*', 'content', 'audience', 'facebook', 'follower*', 'engagement', 'post*', 'reel*', 'page', 'community', 'social media', 'reach', 'algorithm*', 'viral', 'views', 'comment*', 'share*', 'professional mode', 'group*'] },
  { day: 2, key: 'money-business', label: 'Money & business', keywords: ['money', 'business*', 'credit', 'debt', 'bank*', 'income', 'job*', 'customer*', 'sale*', 'entrepreneur*', 'loan*', 'investment*', 'stock*', 'dividend*', 'portfolio*', 'revenue', 'profit*', 'tax*', 'irs', 'finance*', 'market*', 'cost*', 'price*', 'pay*', 'dollar*', 'wealth', 'cash', 'company', 'mortgage', 'budget*'] },
  { day: 3, key: 'technology-ai', label: 'Technology & AI', keywords: ['ai', 'artificial intelligence', 'technology*', 'tech*', 'app', 'apps', 'application*', 'software', 'internet', 'computer*', 'apple', 'mac', 'macos', 'macbook', 'chatgpt', 'code', 'coding', 'android', 'iphone', 'ipad', 'windows', 'linux', 'ubuntu', 'docker', 'python', 'javascript', 'api', 'json', 'server*', 'cloud*', 'automat*', 'website*', 'browser*', 'llm*', 'openai', 'claude', 'grok', 'gemini', 'ollama', 'meta ai', 'ryzen', 'nvidia', 'network*', 'hardware', 'device*', 'saas', 'cyber*', 'password*', 'gmail'] },
  { day: 4, key: 'marketing-monetization', label: 'Marketing & monetization', keywords: ['marketing', 'brand*', 'monetiz*', 'revenue', 'reach', 'growth', 'creator*', 'content', 'customer*', 'advertis*', 'sales', 'campaign*', 'seo', 'cta', 'conversion*', 'funnel*', 'offer*', 'sponsor*', 'analytics'] },
  { day: 5, key: 'creator-community', label: 'Creator community', keywords: ['community', 'friend*', 'support*', 'together', 'comment*', 'share*', 'conversation*', 'creator*', 'audience', 'tag*', 'welcome', 'connect*', 'collaborat*', 'group*', 'engage*', 'follower*', 'network*'] },
  { day: 6, key: 'humor-personality', label: 'Humor & personality', keywords: ['funny', 'joke*', 'laugh*', 'lol', 'humor*', 'meme*', 'smile*', 'crazy', '😂', '🤣', 'lmao', 'sarcas*', 'ridiculous', 'hilarious', 'silly', 'prank*', 'roast*'] },
]);

export const OFFICIAL_CREATOR_GUIDANCE = Object.freeze([
  {
    key: 'official-create-strategy',
    sourceType: 'official-facebook-creators',
    category: 'create',
    title: 'Create a content strategy',
    angle: 'A repeatable content strategy should work for both the creator and the audience.',
    url: 'https://creators.facebook.com/tools/create',
  },
  {
    key: 'official-grow-community',
    sourceType: 'official-facebook-creators',
    category: 'grow',
    title: 'Grow a following and community',
    angle: 'Follower growth works better when it is tied to a real community.',
    url: 'https://creators.facebook.com/tools/grow',
  },
  {
    key: 'official-engage-audience',
    sourceType: 'official-facebook-creators',
    category: 'engage',
    title: 'Engage with your audience',
    angle: 'Engagement gets stronger when followers have a clear reason to answer and participate.',
    url: 'https://creators.facebook.com/tools/engage',
  },
  {
    key: 'official-earn-money',
    sourceType: 'official-facebook-creators',
    category: 'earn',
    title: 'Understand Facebook monetization',
    angle: 'Monetization starts with content people consistently return to.',
    url: 'https://creators.facebook.com/tools/earn-money',
  },
]);

function repairMojibake(value) {
  let current = String(value || '');
  for (let pass = 0; pass < 3 && /(?:Ã.|Â.|à[¸¹]|â[-™])/.test(current); pass += 1) {
    const next = Buffer.from(current, 'latin1').toString('utf8');
    if (!next || next.includes('\uFFFD') || next === current) break;
    current = next;
  }
  return current.normalize('NFC');
}

function sourceKey(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 20);
}

function archiveBody(row) {
  return repairMojibake((row?.data || []).map((item) => typeof item?.post === 'string' ? item.post : '').filter(Boolean).join('\n'))
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function likelyOriginalMatthewPost(title) {
  const value = repairMojibake(title).replace(/\s+/g, ' ').trim();
  if (!/^Matthew Murphy\b/i.test(value) || /\bshared\b|\bgroup:/i.test(value)) return false;
  return /\bupdated his status\b|\badded (?:\d+ new )?(?:photo|photos|video|videos)\b|^Matthew Murphy$/i.test(value);
}

function timeSensitive(body) {
  return /\b(?:today|tonight|tomorrow|yesterday|this morning|this afternoon|just now|recently|breaking|sale ends|ends tonight|giveaway ends|happy birthday|rest in peace|passed away|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(body)
    || /\bshout[ -]?out to\b/i.test(body)
    || /\b(?:KornHub|OnlyF@ns)\b/i.test(body)
    || /\b20(?:1\d|2[0-5])\b/.test(body)
    || /\b\d{1,2}[/-]\d{1,2}[/-](?:\d{2}|\d{4})\b/.test(body);
}

function themeScore(body, theme) {
  const haystack = body.toLocaleLowerCase();
  return theme.keywords.reduce((score, keyword) => {
    const prefix = keyword.endsWith('*');
    const literal = keyword.replace(/\*$/, '');
    if (!/[\p{L}\p{N}]/u.test(literal)) return score + Number(haystack.includes(literal));
    const value = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const pattern = new RegExp(`\\b${value}${prefix ? '[\\p{L}\\p{N}_-]*' : ''}\\b`, 'iu');
    return score + Number(pattern.test(haystack));
  }, 0);
}

function themedCandidates(archivePosts, theme, usedArchiveKeys) {
  return archivePosts
    .filter((post) => !usedArchiveKeys.has(post.key))
    .map((post) => {
      const themeScores = WEEKLY_THEME_PLAN.map((candidateTheme) => ({
        key: candidateTheme.key,
        score: themeScore(post.body, candidateTheme),
      }));
      const score = themeScores.find((entry) => entry.key === theme.key)?.score || 0;
      const competingScore = Math.max(0, ...themeScores.filter((entry) => entry.key !== theme.key).map((entry) => entry.score));
      const strong = score >= 2 && (score > competingScore || (score >= 4 && score >= competingScore - 1));
      return { post, score, competingScore, strong };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (left.strong !== right.strong) return Number(right.strong) - Number(left.strong);
      const scoreDifference = right.score - left.score;
      const marginDifference = (right.score - right.competingScore) - (left.score - left.competingScore);
      if (left.strong) return scoreDifference || marginDifference || new Date(right.post.originalAt) - new Date(left.post.originalAt);
      return marginDifference || scoreDifference || new Date(right.post.originalAt) - new Date(left.post.originalAt);
    });
}

export function normalizeArchivePosts(rows = []) {
  const unique = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const body = archiveBody(row);
    const timestamp = Number(row?.timestamp || 0);
    if (!likelyOriginalMatthewPost(row?.title) || body.length < 40 || body.length > 4800 || !Number.isFinite(timestamp) || timestamp <= 0 || timeSensitive(body)) continue;
    const key = sourceKey(`${timestamp}|${body.replace(/\s+/g, ' ').toLocaleLowerCase()}`);
    if (unique.has(key)) continue;
    unique.set(key, {
      key,
      body,
      originalAt: new Date(timestamp * 1000).toISOString(),
      originalTitle: repairMojibake(row.title).replace(/\s+/g, ' ').trim().slice(0, 240),
    });
  }
  return [...unique.values()].sort((left, right) => new Date(right.originalAt) - new Date(left.originalAt));
}

export function themeForDate(date = new Date()) {
  const parsed = date instanceof Date ? date : new Date(date);
  return WEEKLY_THEME_PLAN.find((theme) => theme.day === parsed.getDay()) || WEEKLY_THEME_PLAN[0];
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function scheduledDate(value) {
  const parsed = new Date(value || 0);
  return Number.isFinite(parsed.valueOf()) ? parsed : null;
}

function candidateSlots(day, count) {
  const startMinutes = 7 * 60;
  const endMinutes = 21 * 60 + 30;
  const total = Math.max(1, count);
  return Array.from({ length: total }, (_value, index) => {
    const ratio = total === 1 ? 0.5 : index / (total - 1);
    const minutes = Math.round((startMinutes + (endMinutes - startMinutes) * ratio) / 5) * 5;
    const slot = new Date(day);
    slot.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return slot;
  });
}

function creatorGuidanceBody(guidance, theme) {
  const sourceLabel = guidance.sourceType === 'professional-dashboard-tip'
    ? "Facebook's Professional Dashboard"
    : 'Facebook for Creators';
  const angle = String(guidance.angle || '').trim() || `Consistency matters, but today's ${theme.label.toLocaleLowerCase()} theme still needs a clear audience payoff.`;
  return `Creators, listen up: ${sourceLabel} is pointing creators back to a simple idea—${angle.charAt(0).toLocaleLowerCase()}${angle.slice(1)}\n\nToday’s theme is ${theme.label}. What is one change you can make to your next post so people know why they should stop, respond, and come back?\n\nDrop what you create below. I want to see who is building with a plan instead of posting at random.\n\n— Matthew Murphy\n\n#CreatorsListenUp #DigitalCreators #ContentCreators`;
}

function appendSignature(body) {
  return /(?:—|-)\s*Matthew Murphy\s*$/i.test(body.trim()) ? body.trim() : `${body.trim()}\n\n— Matthew Murphy`;
}

export function buildThemedArchiveSchedule({
  archivePosts = [],
  queueItems = [],
  externalScheduledItems = [],
  guidanceItems = [],
  startDate = null,
  days = 1,
  postsPerDay = 30,
  now = new Date(),
} = {}) {
  const safeDays = Math.min(7, Math.max(1, Number(days) || 1));
  const safePostsPerDay = Math.min(36, Math.max(1, Number(postsPerDay) || 30));
  const firstDay = startDate ? new Date(`${String(startDate).slice(0, 10)}T00:00:00`) : new Date(now);
  if (!startDate) firstDay.setDate(firstDay.getDate() + 1);
  firstDay.setHours(0, 0, 0, 0);
  const existingSources = new Set((queueItems || []).map((item) => String(item.source || '')));
  const usedArchiveKeys = new Set((queueItems || []).map((item) => item.archiveRotation?.sourceKey).filter(Boolean));
  const occupied = [...(queueItems || []), ...(externalScheduledItems || [])]
    .filter((item) => item.status !== 'rejected')
    .map((item) => scheduledDate(item.scheduledFor))
    .filter(Boolean);
  const guidance = [...(guidanceItems || []), ...OFFICIAL_CREATOR_GUIDANCE]
    .filter((item, index, all) => item?.url && all.findIndex((candidate) => candidate.url === item.url) === index);
  const created = [];
  const daysBuilt = [];

  for (let dayIndex = 0; dayIndex < safeDays; dayIndex += 1) {
    const day = new Date(firstDay);
    day.setDate(firstDay.getDate() + dayIndex);
    const dayKey = localDateKey(day);
    const theme = themeForDate(day);
    const existingForDay = (queueItems || []).filter((item) => {
      const scheduled = scheduledDate(item.scheduledFor);
      return item.status !== 'rejected' && scheduled && localDateKey(scheduled) === dayKey;
    });
    const externalForDay = (externalScheduledItems || []).filter((item) => {
      const scheduled = scheduledDate(item.scheduledFor);
      return scheduled && localDateKey(scheduled) === dayKey;
    });
    const totalExisting = existingForDay.length + externalForDay.length;
    const needed = Math.max(0, safePostsPerDay - totalExisting);
    const slots = candidateSlots(day, safePostsPerDay).filter((slot) => occupied.every((time) => Math.abs(time.valueOf() - slot.valueOf()) >= 10 * 60_000));
    const hasCreatorGuidance = [...existingForDay, ...externalForDay].some((item) => item.creatorGuidance?.url
      || /^creator-listen-up:themed:/i.test(item.source || '')
      || /creators?[,\s]+listen up\b/i.test(`${item.title || ''} ${item.body || ''}`));
    let builtForDay = 0;

    if (needed > 0 && !hasCreatorGuidance && slots.length) {
      const guidanceItem = guidance[(day.getDay() + dayIndex) % guidance.length];
      const creatorSlotIndex = slots.reduce((best, slot, index) => Math.abs(slot.getHours() * 60 + slot.getMinutes() - 10 * 60) < Math.abs(slots[best].getHours() * 60 + slots[best].getMinutes() - 10 * 60) ? index : best, 0);
      const [slot] = slots.splice(creatorSlotIndex, 1);
      const source = `creator-listen-up:themed:${dayKey}`;
      if (!existingSources.has(source)) {
        const item = {
          title: `Creators Listen Up · ${theme.label}`,
          body: creatorGuidanceBody(guidanceItem, theme),
          target: 'matthew-page',
          format: 'feed',
          status: 'draft',
          scheduledFor: slot.toISOString(),
          source,
          notes: `Daily Creators Listen Up review draft. Theme: ${theme.label}. Source: ${guidanceItem.title || guidanceItem.url} (${guidanceItem.url}). Review the wording and source before approval.`,
          tagTargets: [],
          media: [],
          creatorGuidance: { key: guidanceItem.key || sourceKey(guidanceItem.url), sourceType: guidanceItem.sourceType, title: guidanceItem.title, url: guidanceItem.url },
        };
        created.push(item);
        occupied.push(slot);
        existingSources.add(source);
        builtForDay += 1;
      }
    }

    const remaining = Math.max(0, needed - builtForDay);
    const candidates = themedCandidates(archivePosts, theme, usedArchiveKeys);
    for (const { post, score, competingScore, strong } of candidates.slice(0, Math.min(remaining, slots.length))) {
      const slot = slots.shift();
      const source = `archive-rotation:${dayKey}:${post.key}`;
      if (existingSources.has(source)) continue;
      created.push({
        title: `Archive rotation · ${theme.label}`,
        body: appendSignature(post.body),
        target: 'matthew-page',
        format: 'feed',
        status: 'draft',
        scheduledFor: slot.toISOString(),
        source,
        notes: `Themed archive review draft from Matthew Murphy's Facebook export (${post.originalAt.slice(0, 10)}). Theme score ${score}; competing theme score ${competingScore}; ${strong ? 'strong theme match' : 'fallback theme match'}. Check for stale context, dead links, or facts that changed before approval.`,
        tagTargets: [],
        media: [],
        archiveRotation: { sourceKey: post.key, originalAt: post.originalAt, originalTitle: post.originalTitle, theme: theme.key },
      });
      occupied.push(slot);
      existingSources.add(source);
      usedArchiveKeys.add(post.key);
      builtForDay += 1;
    }
    daysBuilt.push({ date: dayKey, theme: theme.key, themeLabel: theme.label, target: safePostsPerDay, existing: totalExisting, created: builtForDay, shortfall: Math.max(0, safePostsPerDay - totalExisting - builtForDay) });
  }

  return { created, days: daysBuilt, postsPerDay: safePostsPerDay };
}

