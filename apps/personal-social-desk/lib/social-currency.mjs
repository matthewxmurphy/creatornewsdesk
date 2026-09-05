import { createHash, randomUUID } from 'node:crypto';

export const WEEKLY_SOCIAL_CURRENCY_KIND = 'weekly-social-currency';
export const SOCIAL_CURRENCY_STRUCTURE_REFERENCE = 'https://www.facebook.com/668481255/posts/pfbid07PP1R3y7ZQTK5H1RdtyGC82Q4PxXLeww4QyCfnu5vgqDuTTuKs6H9hC5U9WACr9vl';
const TIME_ZONE = 'America/Los_Angeles';
const SLOTS = [
  { hour: 5, minute: 55 },
  { hour: 9, minute: 25 },
  { hour: 12, minute: 40 },
  { hour: 17, minute: 55 },
  { hour: 19, minute: 10 },
];

const CONCEPTS = [
  {
    key: 'ai-tool-checklist',
    title: '7 Questions Before You Add Another AI Tool',
    points: ['Does it save a repeated step?', 'Can you export your work?', 'Does it protect your source material?', 'Will it still help without the hype?', 'Can the result be checked quickly?', 'Does it fit the tools you already use?', 'Would you pay for it after a real test?'],
  },
  {
    key: 'save-worthy-post',
    title: '7 Ways to Make a Post Worth Saving',
    points: ['Give the reader a usable checklist.', 'Show the order, not just the outcome.', 'Name the mistake that wastes the most time.', 'Include one example people can adapt.', 'Make the first line promise something specific.', 'Cut anything that does not help the reader act.', 'End with a question that improves the next version.'],
  },
  {
    key: 'creator-assets',
    title: '6 Assets Every Creator Should Own',
    points: ['An email list you can export.', 'A searchable idea library.', 'Original photos and brand files.', 'A simple offer people understand.', 'Proof of the results you create.', 'A repeatable publishing system.'],
  },
  {
    key: 'audience-trust',
    title: '7 Signals That Build Audience Trust',
    points: ['You correct mistakes instead of hiding them.', 'Your examples match your advice.', 'You disclose affiliate relationships.', 'You answer useful questions consistently.', 'You separate facts from opinions.', 'You show the process behind the result.', 'You keep promises about what comes next.'],
  },
  {
    key: 'one-idea-week',
    title: '7 Ways to Turn One Idea Into a Week of Content',
    points: ['Write the short lesson.', 'Record the practical example.', 'Turn the key steps into a checklist.', 'Answer the strongest objection.', 'Share the mistake behind the lesson.', 'Ask the audience for their version.', 'Collect the best parts into a recap.'],
  },
  {
    key: 'ai-assist-voice',
    title: '7 Creator Tasks AI Can Assist Without Replacing Your Voice',
    points: ['Organize rough notes.', 'Compare headline options.', 'Find gaps in an outline.', 'Create interview questions.', 'Condense a long transcript.', 'Suggest alternate formats.', 'Build a final fact-check list.'],
  },
  {
    key: 'beyond-views',
    title: '8 Things Worth Tracking Besides Views',
    points: ['Saves', 'Shares', 'Useful comments', 'Profile visits', 'Return viewers', 'Email signups', 'Qualified questions', 'Sales conversations'],
  },
  {
    key: 'social-currency-before-selling',
    title: '6 Ways to Build Social Currency Before You Sell',
    points: ['Introduce people who should know each other.', 'Share a resource with useful context.', 'Answer the question behind the question.', 'Celebrate somebody without making it about you.', 'Give credit to the source of an idea.', 'Follow up after the first conversation.'],
  },
  {
    key: 'better-comments',
    title: '8 Ways to Earn Better Comments',
    points: ['Ask for a choice, not a speech.', 'Invite examples from real experience.', 'State the tradeoff clearly.', 'Leave room for another point of view.', 'Answer early comments with substance.', 'Pin the response that moves the discussion forward.', 'Turn repeated questions into follow-up posts.', 'Thank people without using canned replies.'],
  },
  {
    key: 'ai-publish-checks',
    title: '7 Checks Before Publishing AI-Assisted Content',
    points: ['Verify every factual claim.', 'Remove invented quotes and sources.', 'Rewrite generic language in your voice.', 'Check names, dates, and links.', 'Confirm image text and anatomy.', 'Disclose material relationships.', 'Make sure the post helps a real person.'],
  },
  {
    key: 'creator-systems',
    title: '6 Low-Cost Systems That Make Creators More Consistent',
    points: ['One capture inbox for ideas.', 'One weekly planning block.', 'A reusable production checklist.', 'A clear review and approval step.', 'A small library of proven formats.', 'A monthly performance review.'],
  },
  {
    key: 'useful-not-loud',
    title: '8 Ways to Make Content More Useful Than Loud',
    points: ['Lead with the problem.', 'Use plain language.', 'Show the smallest next step.', 'Explain who the advice is not for.', 'Include a realistic constraint.', 'Give credit where it belongs.', 'Remove empty urgency.', 'Let the takeaway stand on its own.'],
  },
];

const INTROS = [
  'A useful list should save somebody time, not just collect reactions.',
  'Social currency starts when your post gives people something worth passing along.',
  'The strongest creator posts make the reader more useful to somebody else.',
  'Before chasing another trend, build something your audience can use this week.',
];

const OUTROS = [
  'Which one would improve your content first?',
  'What would you add before sharing this with another creator?',
  'Which point deserves its own post next?',
  'Save the list, test one step, and tell me what changed.',
];

function hashNumber(value) {
  return Number.parseInt(createHash('sha256').update(String(value)).digest('hex').slice(0, 12), 16);
}

function localParts(date) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
}

function localDateKey(date) {
  const parts = localParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function addLocalDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function weekStartKey(date) {
  const key = localDateKey(date);
  const [year, month, day] = key.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addLocalDays(key, -((weekday + 6) % 7));
}

function timeZoneOffsetMs(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - date.getTime();
}

function localDateTime(dateKey, hour, minute) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const first = new Date(guess.getTime() - timeZoneOffsetMs(guess));
  return new Date(guess.getTime() - timeZoneOffsetMs(first));
}

export function socialCurrencyFingerprint(value = '') {
  return createHash('sha256').update(String(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()).digest('hex');
}

function scheduledForWeek(queueItems, startKey, now, seed) {
  const minimum = now.getTime() + 2 * 60 * 60 * 1000;
  const candidates = [];
  for (let day = 0; day < 7; day += 1) {
    for (const slot of SLOTS) candidates.push(localDateTime(addLocalDays(startKey, day), slot.hour, slot.minute));
  }
  const future = candidates.filter((candidate) => candidate.getTime() >= minimum);
  if (!future.length) return scheduledForWeek(queueItems, addLocalDays(startKey, 7), now, seed);
  const occupied = new Set((queueItems || []).map((item) => Date.parse(item?.scheduledFor || '')).filter(Number.isFinite));
  const start = seed % future.length;
  for (let offset = 0; offset < future.length; offset += 1) {
    const candidate = future[(start + offset) % future.length];
    if (![...occupied].some((time) => Math.abs(time - candidate.getTime()) < 30 * 60 * 1000)) return candidate;
  }
  return future[start];
}

function bodyFor(concept, seed) {
  const intro = INTROS[seed % INTROS.length];
  const outro = OUTROS[Math.floor(seed / INTROS.length) % OUTROS.length];
  const list = concept.points.map((point, index) => `${index + 1}. ${point}`).join('\n');
  return `${intro}\n\n${concept.title.toUpperCase()}\n\n${list}\n\n${outro}\n\n#CreatorsListenUp #SocialCurrency #BuiltNotBegged`;
}

function mediaFieldsFor(concept, body, updatedAt) {
  const shared = `Use the post's exact idea and supporting points without inventing claims. Build a polished, original creator-business editorial graphic with strong hierarchy and useful visual detail. Keep all text, faces, and important objects at least 30 pixels inside every edge. Add the exact text "Matthew Murphy" as a legible handwritten signature near the bottom-right. Do not imitate another creator, copyrighted character, franchise, or recognizable layout.`;
  return {
    storyMode: 'linked-post',
    imagePrompt: `Create an exact 1200x630 wide Facebook feed image for a Social Currency post titled "${concept.title}". The main visible headline must read "${concept.title}" and a smaller series label may read "SOCIAL CURRENCY". ${shared} Source post: ${body}`,
    storyImagePrompt: `Create an exact 1080x1920 vertical Facebook Story image for a Social Currency post titled "${concept.title}". The main visible headline must read "${concept.title}" and a smaller series label may read "SOCIAL CURRENCY". Use a vertical composition that is distinct from the Landscape design. Leave extra clean space near the bottom for Facebook controls. ${shared} Source post: ${body}`,
    imageReview: {
      feed: { state: 'redo', note: 'Social Currency Landscape image is ready to make', updatedAt },
      story: { state: 'redo', note: 'Social Currency Story image is ready to make', updatedAt },
    },
  };
}

export function ensureWeeklySocialCurrencyDraft(queue = {}, now = new Date(), inspirationPosts = []) {
  const items = Array.isArray(queue.items) ? queue.items : (queue.items = []);
  let startKey = weekStartKey(now);
  const thisWeekCandidates = Array.from({ length: 7 }, (_, day) => localDateTime(addLocalDays(startKey, day), 23, 59));
  if (thisWeekCandidates.at(-1).getTime() < now.getTime() + 2 * 60 * 60 * 1000) startKey = addLocalDays(startKey, 7);
  const currentWeek = items.find((item) => item?.campaign?.kind === WEEKLY_SOCIAL_CURRENCY_KIND && item.campaign.weekKey === startKey);
  if (currentWeek?.status === 'published' || currentWeek?.facebookHandoff?.facebookConfirmed) startKey = addLocalDays(startKey, 7);
  const existing = items.find((item) => item?.campaign?.kind === WEEKLY_SOCIAL_CURRENCY_KIND && item.campaign.weekKey === startKey);
  if (existing) {
    let updated = false;
    if (!existing.campaign.structureReference) {
      existing.campaign.structureReference = {
        postUrl: SOCIAL_CURRENCY_STRUCTURE_REFERENCE,
        usage: 'Structure only. Never copy wording or treat this as a Built Not Begged post.',
      };
      updated = true;
    }
    if (existing.status === 'draft' && !existing.mediaApproval?.hiddenAt) {
      const concept = CONCEPTS.find((candidate) => candidate.key === existing.campaign.conceptKey)
        || { title: String(existing.title || '').replace(/^Social Currency\s+[—-]\s+/i, '') || 'Social Currency' };
      const fields = mediaFieldsFor(concept, existing.body || '', now.toISOString());
      for (const key of ['storyMode', 'imagePrompt', 'storyImagePrompt']) {
        if (!existing[key]) {
          existing[key] = fields[key];
          updated = true;
        }
      }
      if (!existing.imageReview && !(existing.media || []).length) {
        existing.imageReview = fields.imageReview;
        updated = true;
      }
    }
    if (updated) {
      existing.updatedAt = now.toISOString();
      queue.updatedAt = existing.updatedAt;
    }
    return { created: false, updated, item: existing, weekKey: startKey };
  }

  const usedConcepts = new Set(items.filter((item) => item?.campaign?.kind === WEEKLY_SOCIAL_CURRENCY_KIND).map((item) => item.campaign.conceptKey));
  const seed = hashNumber(startKey);
  const ordered = CONCEPTS.map((concept, index) => CONCEPTS[(seed + index) % CONCEPTS.length]);
  const concept = ordered.find((candidate) => !usedConcepts.has(candidate.key)) || ordered[0];
  let body = bodyFor(concept, seed);
  const priorFingerprints = new Set(items.map((item) => item?.campaign?.contentFingerprint || socialCurrencyFingerprint(item?.body || '')));
  let variant = 0;
  while (priorFingerprints.has(socialCurrencyFingerprint(body)) && variant < OUTROS.length * INTROS.length) {
    variant += 1;
    body = bodyFor(concept, seed + variant);
  }
  const scheduledFor = scheduledForWeek(items, startKey, now, seed);
  const inspiration = (Array.isArray(inspirationPosts) ? inspirationPosts : [])
    .filter((post) => post?.researchOnly === true && post?.postUrl)
    .slice(0, 5)
    .map((post) => ({ key: String(post.key || ''), sourceKey: String(post.sourceKey || ''), postUrl: String(post.postUrl || '') }));
  const createdAt = now.toISOString();
  const mediaFields = mediaFieldsFor(concept, body, createdAt);
  const item = {
    id: randomUUID(),
    title: `Social Currency — ${concept.title}`,
    body,
    category: 'Social Currency',
    target: 'matthew-page',
    format: 'feed',
    status: 'draft',
    scheduledFor: scheduledFor.toISOString(),
    source: `social-currency:weekly:${startKey}`,
    notes: 'Original weekly list post inspired by the research lane. Review facts, links, wording, and timing before approval. Never auto-publish.',
    ...mediaFields,
    approvalRequired: true,
    publishToFacebook: false,
    media: [],
    campaign: {
      kind: WEEKLY_SOCIAL_CURRENCY_KIND,
      weekKey: startKey,
      conceptKey: concept.key,
      contentFingerprint: socialCurrencyFingerprint(body),
      randomSeed: String(seed),
      inspiration,
      structureReference: {
        postUrl: SOCIAL_CURRENCY_STRUCTURE_REFERENCE,
        usage: 'Structure only. Never copy wording or treat this as a Built Not Begged post.',
      },
    },
    createdAt,
    updatedAt: createdAt,
  };
  items.unshift(item);
  queue.updatedAt = createdAt;
  return { created: true, updated: false, item, weekKey: startKey };
}

export function recordManualSocialCurrencyPost(queue = {}, post = {}, now = new Date()) {
  const items = Array.isArray(queue.items) ? queue.items : (queue.items = []);
  const postUrl = String(post.postUrl || '').trim();
  let parsed;
  try {
    parsed = new URL(postUrl);
  } catch {
    throw new Error('A valid Facebook post URL is required.');
  }
  if (!['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(parsed.hostname)) throw new Error('A Facebook post URL is required.');
  parsed.protocol = 'https:';
  parsed.hostname = 'www.facebook.com';
  parsed.search = '';
  parsed.hash = '';
  const canonicalUrl = parsed.toString().replace(/\/$/, '');
  const body = String(post.body || '').trim();
  const weekKey = weekStartKey(now);
  const existing = items.find((item) => item?.campaign?.kind === WEEKLY_SOCIAL_CURRENCY_KIND && item?.campaign?.facebookPostUrl === canonicalUrl);
  if (existing) return { created: false, item: existing, weekKey };

  queue.items = items.filter((item) => !(item?.campaign?.kind === WEEKLY_SOCIAL_CURRENCY_KIND
    && item.campaign.weekKey === weekKey
    && item.status === 'draft'
    && item.source === `social-currency:weekly:${weekKey}`));
  const observedAt = now.toISOString();
  const item = {
    id: randomUUID(),
    title: String(post.title || 'Social Currency — Manual Facebook post').trim().slice(0, 180),
    body,
    category: 'Social Currency',
    target: 'matthew-page',
    format: 'feed',
    status: 'published',
    scheduledFor: null,
    source: 'social-currency:manual-facebook',
    notes: 'Published manually on the Built Not Begged Facebook Page and recorded as the weekly Social Currency post.',
    storyMode: 'disabled',
    approvalRequired: false,
    publishToFacebook: false,
    media: [],
    campaign: {
      kind: WEEKLY_SOCIAL_CURRENCY_KIND,
      weekKey,
      conceptKey: String(post.conceptKey || 'community-social-currency').slice(0, 120),
      contentFingerprint: socialCurrencyFingerprint(body || canonicalUrl),
      origin: 'manual-facebook',
      facebookPostUrl: canonicalUrl,
    },
    facebookHandoff: {
      facebookConfirmed: true,
      proofSource: 'visible-facebook-post-url',
      facebookPostUrl: canonicalUrl,
      observedAt,
    },
    createdAt: observedAt,
    updatedAt: observedAt,
  };
  queue.items.unshift(item);
  queue.updatedAt = observedAt;
  return { created: true, item, weekKey };
}

export function removeManualSocialCurrencyPost(queue = {}, match = {}) {
  const items = Array.isArray(queue.items) ? queue.items : (queue.items = []);
  const id = String(match.id || '').trim();
  const postUrl = String(match.postUrl || '').trim().replace(/[?#].*$/, '').replace(/\/$/, '');
  if (!id && !postUrl) throw new Error('A queue item ID or Facebook post URL is required.');
  const removed = items.filter((item) => item?.campaign?.kind === WEEKLY_SOCIAL_CURRENCY_KIND
    && item?.campaign?.origin === 'manual-facebook'
    && ((id && item.id === id) || (postUrl && String(item.campaign.facebookPostUrl || '').replace(/\/$/, '') === postUrl)));
  if (!removed.length) return { removed: 0, items: [] };
  queue.items = items.filter((item) => !removed.includes(item));
  queue.updatedAt = new Date().toISOString();
  return { removed: removed.length, items: removed };
}

