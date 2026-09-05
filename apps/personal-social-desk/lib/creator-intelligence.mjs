import { createHash } from 'node:crypto';

const TRACKED_METRICS = ['reactions', 'comments', 'shares', 'saves'];
const AI_CONTENT_PATTERN = /\b(?:a\.?i\.?|artificial intelligence|chatgpt|gpt(?:-[\w.]+)?|openai|claude|anthropic|gemini|midjourney|stable diffusion|dall-?e|sora|runway|llms?|large language models?|machine learning|generative ai|ai agents?|ai automation|prompts?|prompting|n8n)\b/i;
const FACEBOOK_SHELL_AUTHOR_PATTERN = /^(?:personal details|posts|other posts|links|about|photos|videos|reels|facebook)$/i;
const CREATOR_REFERENCE_CUE_PATTERN = /\b(?:creators?|people|pages?|profiles?|accounts?)\s+(?:to watch|to study|to follow|like|such as|including|include|named|are)\s+([^.!?\n]{4,240})|\b(?:look at|study|watch|follow)\s+([^.!?\n]{4,240})/gi;
const CREATOR_REFERENCE_TOKEN_PATTERN = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z'’-]+){0,3}\b/g;
const CREATOR_REFERENCE_STOP_WORDS = new Set([
  'AI',
  'And',
  'Because',
  'Build',
  'Built',
  'ChatGPT',
  'Claude',
  'Comment',
  'Creator',
  'Creators',
  'Facebook',
  'Follow',
  'For',
  'GPT',
  'Here',
  'If',
  'In',
  'Instagram',
  'Look',
  'Matthew',
  'Meta',
  'Not',
  'OpenAI',
  'Page',
  'Pages',
  'People',
  'Post',
  'Posts',
  'Profile',
  'Profiles',
  'Prompt',
  'Prompts',
  'Ryzen',
  'Social',
  'The',
  'These',
  'This',
  'Those',
  'Use',
  'Watch',
  'With',
  'You',
  'Your',
]);
const CLAIM_SIGNAL_PATTERNS = [
  ['solution-language', /\b(?:solution|solve|solves|solved|fix|fixes|fixed|blueprint|framework|formula|system)\b/i],
  ['hype-language', /\b(?:viral|blow up|explode|10x|overnight|instantly|easy win|easy fix|secret|hack|shortcut)\b/i],
  ['certainty-language', /\b(?:guaranteed|always|never|everyone|no one talks about|best way|must use)\b/i],
];
const PROOF_SIGNAL_PATTERNS = [
  ['step-breakdown', /\b(?:\d+\s*(?:steps?|ways?|tips?|examples?|mistakes?|lessons?)|here'?s how|how to|breakdown|walkthrough)\b/i],
  ['evidence-language', /\b(?:because|for example|case study|tested|results?|screenshots?|data|numbers?|process|workflow|experiment)\b/i],
  ['concrete-detail', /\b\d+(?:\.\d+)?\s*(?:%|percent|hours?|minutes?|days?|weeks?|months?|years?|x|k|m|b)?\b/i],
];

function cleanText(value, limit = 20_000) {
  return String(value || '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim().slice(0, limit);
}

function canonicalFacebookUrl(value = '') {
  try {
    const url = new URL(String(value || ''), 'https://www.facebook.com');
    if (!['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname)) return '';
    url.protocol = 'https:';
    url.hostname = 'www.facebook.com';
    for (const key of [...url.searchParams.keys()]) {
      if (!['id', 'story_fbid', 'fbid'].includes(key)) url.searchParams.delete(key);
    }
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function postIdentity(post = {}) {
  const url = canonicalFacebookUrl(post.postUrl);
  if (url) return url;
  const source = canonicalFacebookUrl(post.sourceUrl);
  const fingerprint = [source, cleanText(post.author, 300), cleanText(post.text, 10_000), cleanText(post.timestamp, 300)].join('|');
  return `fingerprint:${createHash('sha256').update(fingerprint).digest('hex')}`;
}

function normalizeCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function cleanList(values, limit = 20) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map((value) => cleanText(value, 80).toLowerCase())
    .filter(Boolean))).slice(0, limit);
}

export function creatorIntelligenceEngagementScore(post = {}) {
  const metrics = post.metrics || post;
  return normalizeCount(metrics.reactions)
    + normalizeCount(metrics.comments) * 2
    + normalizeCount(metrics.shares) * 3
    + normalizeCount(metrics.saves) * 4;
}

export function creatorIntelligenceDiscussionKey(post = {}) {
  const normalizedContent = cleanText(post.text, 10_000)
    .replace(/all reactions:\s*[\d.,]+\s*[kmb]?/gi, ' ')
    .replace(/\b[\d.,]+\s*[kmb]?\s+(?:comments?|shares?|reactions?)\b/gi, ' ')
    .replace(/\b(?:like|comment|share)\b\s*$/gim, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  const identity = normalizedContent
    ? `${cleanText(post.sourceKey, 160).toLowerCase()}|${normalizedContent}`
    : cleanText(post.key, 2_000) || postIdentity(post);
  return `ci:${createHash('sha256').update(identity).digest('hex').slice(0, 24)}`;
}

function creatorIntelligenceDisplayAuthor(post = {}) {
  const captured = cleanText(post.author, 300).replace(/\s+verified account$/i, '').trim();
  if (captured.length <= 60 && !/\b(?:tutorial|course|webinar|with)\b/i.test(captured)) return captured;
  const firstLine = cleanText(post.text, 300).split('\n').map((line) => line.trim()).find(Boolean) || '';
  return firstLine.length >= 2 && firstLine.length <= 80 ? firstLine : captured;
}

function normalizeCreatorReference(value = '') {
  const trimmed = cleanText(value, 120)
    .replace(/^[^A-Za-z]+/, '')
    .replace(/\s+(?:and|or)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!trimmed || trimmed.length < 4 || trimmed.length > 60) return '';
  const words = trimmed.split(' ');
  if (words.length < 2 || words.length > 4) return '';
  if (words.some((word) => CREATOR_REFERENCE_STOP_WORDS.has(word))) return '';
  if (words.every((word) => word.length <= 2)) return '';
  return trimmed;
}

export function extractCreatorIntelligenceMentions(text = '') {
  const value = cleanText(text, 20_000);
  const matches = [];
  for (const match of value.matchAll(CREATOR_REFERENCE_CUE_PATTERN)) {
    const segment = String(match[1] || match[2] || '');
    for (const token of segment.match(CREATOR_REFERENCE_TOKEN_PATTERN) || []) {
      const normalized = normalizeCreatorReference(token);
      if (normalized) matches.push(normalized);
    }
  }
  return Array.from(new Set(matches)).slice(0, 12);
}

export function filterCreatorIntelligencePosts(posts = []) {
  return (Array.isArray(posts) ? posts : []).filter((post) => post?.researchOnly === true && isCreatorIntelligenceDiscussionReady(post));
}

export function creatorIntelligenceEngagementOpportunities(posts = [], handledKeys = [], options = {}) {
  const handled = handledKeys instanceof Set ? handledKeys : new Set(handledKeys);
  const limit = Math.max(1, Math.min(100, Number(options.limit || 25)));
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const seen = new Set();
  return filterCreatorIntelligencePosts(posts)
    .filter((post) => {
      const fingerprint = creatorIntelligenceDiscussionKey(post);
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    })
    .map((post) => {
      const commentKey = creatorIntelligenceDiscussionKey(post);
      const observedAt = Date.parse(post.lastObservedAt || post.capturedAt || '');
      const ageHours = Number.isFinite(observedAt) ? Math.max(0, (now.getTime() - observedAt) / 3_600_000) : 168;
      const freshness = Math.max(0, 168 - Math.min(168, ageHours));
      const engagementScore = creatorIntelligenceEngagementScore(post);
      const claimVsProof = post.claimVsProof || analyzeClaimVsProof(post);
      return {
        key: post.key,
        commentKey,
        opportunityType: 'creator-intelligence',
        actorName: creatorIntelligenceDisplayAuthor(post),
        postUrl: post.postUrl,
        text: cleanText(post.text, 1_200),
        sourceKey: cleanText(post.sourceKey, 160),
        metrics: post.metrics || {},
        engagementScore,
        claimVsProof,
        priority: engagementScore + Math.round(freshness) + Number(claimVsProof.priorityAdjustment || 0),
        observedAt: post.lastObservedAt || post.capturedAt || null,
      };
    })
    .filter((item) => !handled.has(item.commentKey))
    .sort((left, right) => right.priority - left.priority
      || String(right.observedAt || '').localeCompare(String(left.observedAt || '')))
    .slice(0, limit);
}

function normalizeMethodology(value = {}) {
  const format = cleanText(value.format, 40).toLowerCase();
  return {
    hooks: cleanList(value.hooks),
    callsToAction: cleanList(value.callsToAction),
    format: ['reel', 'video', 'multi-image', 'image', 'link', 'text'].includes(format) ? format : 'unknown',
    hasQuestion: value.hasQuestion === true,
    hasBullets: value.hasBullets === true,
    hasExternalLink: value.hasExternalLink === true,
    textLength: Math.min(20_000, normalizeCount(value.textLength)),
  };
}

function creatorIntelligenceEngagementBand(score) {
  if (score >= 120) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function uniqueMatches(text, patterns = []) {
  return patterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label);
}

function analyzeClaimVsProof(post = {}) {
  const text = cleanText(post.text).toLowerCase();
  const methodology = normalizeMethodology(post.methodology);
  const engagementScore = creatorIntelligenceEngagementScore(post);
  const claimSignals = uniqueMatches(text, CLAIM_SIGNAL_PATTERNS);
  const proofSignals = uniqueMatches(text, PROOF_SIGNAL_PATTERNS);
  if (methodology.hasBullets) proofSignals.push('structured-breakdown');
  if (methodology.hasExternalLink) proofSignals.push('external-reference');
  const uniqueProofSignals = Array.from(new Set(proofSignals));
  const claimScore = claimSignals.length;
  const proofScore = uniqueProofSignals.length;
  const engagementBand = creatorIntelligenceEngagementBand(engagementScore);
  let label = 'observational';
  let mismatch = false;
  let priorityAdjustment = 0;
  let reason = 'Mostly observational content with no strong claim-vs-proof signal yet.';
  if (claimScore >= 2 && proofScore <= 1 && engagementBand !== 'high') {
    label = 'high-claim-low-proof';
    mismatch = true;
    priorityAdjustment = -45;
    reason = proofScore
      ? 'The post makes strong promises but shows only thin proof and weak visible engagement.'
      : 'The post makes strong promises without visible proof or strong engagement backing it up.';
  } else if ((claimScore >= 1 && proofScore >= 2) || proofScore >= 3 || (proofScore >= 2 && engagementBand !== 'low') || (proofScore >= 1 && engagementBand === 'high')) {
    label = 'supported-claim';
    priorityAdjustment = 12;
    reason = 'The post backs its claim with concrete proof signals, structure, or strong engagement.';
  } else if (claimScore >= 1 && engagementBand === 'low') {
    label = 'claim-needs-proof';
    priorityAdjustment = -18;
    reason = 'The claim may be useful, but it needs stronger proof or better audience response.';
  }
  return {
    label,
    mismatch,
    claimSignals,
    proofSignals: uniqueProofSignals,
    claimScore,
    proofScore,
    engagementBand,
    priorityAdjustment,
    reason,
  };
}

export function isAiRelatedCreatorContent(value = '') {
  return AI_CONTENT_PATTERN.test(cleanText(value));
}

export function isCreatorIntelligenceDiscussionReady(post = {}) {
  const author = cleanText(post.author, 300).replace(/\s+verified account$/i, '').trim();
  const text = cleanText(post.text);
  const postUrl = canonicalFacebookUrl(post.postUrl);
  const sourceUrl = canonicalFacebookUrl(post.sourceUrl);
  if (!author || FACEBOOK_SHELL_AUTHOR_PATTERN.test(author) || /\bupdated the description\.?$/i.test(author)) return false;
  if (!postUrl || postUrl === sourceUrl || !isAiRelatedCreatorContent(text)) return false;
  if (/^(?:facebook\s*){3,}/i.test(text) || (text.match(/\bfacebook\b/gi) || []).length >= 8) return false;
  if (/^(?:personal details|posts|other posts|filters|links)\b/i.test(text)) return false;
  const meaningfulWords = (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [])
    .filter((word) => word.toLowerCase() !== 'facebook');
  return meaningfulWords.length >= 4 && (text.match(/[\p{L}\p{N}]/gu) || []).length >= 16;
}

export function normalizeCreatorIntelligencePost(post = {}, capturedAt = new Date().toISOString()) {
  const sourceUrl = canonicalFacebookUrl(post.sourceUrl);
  const text = cleanText(post.text);
  const postUrl = canonicalFacebookUrl(post.postUrl);
  const author = cleanText(post.author, 300);
  const authorUrl = post.authorUrl ? canonicalFacebookUrl(post.authorUrl) : '';
  if (!sourceUrl || (!postUrl && !text)) return null;
  if (postUrl === sourceUrl && !text) return null;
  if (!author) return null;
  if (!isAiRelatedCreatorContent(text)) return null;
  if (!isCreatorIntelligenceDiscussionReady({ ...post, sourceUrl, postUrl, text, author })) return null;
  const metrics = {};
  for (const metric of TRACKED_METRICS) metrics[metric] = normalizeCount(post.metrics?.[metric] ?? post[metric]);
  const methodology = normalizeMethodology(post.methodology);
  const claimVsProof = analyzeClaimVsProof({ ...post, text, metrics, methodology });
  return {
    key: postIdentity({ ...post, sourceUrl, postUrl, text }),
    sourceKey: cleanText(post.sourceKey, 160),
    sourceType: post.sourceType === 'group' ? 'group' : 'profile',
    sourceUrl,
    postUrl,
    author,
    authorUrl,
    timestamp: cleanText(post.timestamp, 300),
    text,
    hashtags: Array.from(new Set((Array.isArray(post.hashtags) ? post.hashtags : [])
      .map((tag) => cleanText(tag, 120).replace(/^#/, '').toLocaleLowerCase())
      .filter(Boolean))).slice(0, 100),
    media: Array.from(new Set((Array.isArray(post.media) ? post.media : [])
      .map(canonicalFacebookUrl)
      .filter(Boolean))).slice(0, 100),
    metrics,
    engagementScore: creatorIntelligenceEngagementScore({ metrics }),
    metricVisibility: { saves: post.metricVisibility?.saves === true },
    methodology,
    mentionedCreators: extractCreatorIntelligenceMentions(text),
    claimVsProof,
    capturedAt,
    lastObservedAt: capturedAt,
    observations: 1,
    researchOnly: true,
  };
}

export function creatorIntelligenceSourceHealth(posts = []) {
  const sources = new Map();
  for (const post of Array.isArray(posts) ? posts : []) {
    if (!post || typeof post !== 'object') continue;
    const key = cleanText(post.sourceKey, 160) || 'unknown-source';
    const current = sources.get(key) || {
      sourceKey: key,
      sourceUrl: cleanText(post.sourceUrl, 500),
      total: 0,
      usable: 0,
      junk: 0,
      examples: [],
    };
    current.total += 1;
    if (isCreatorIntelligenceDiscussionReady(post)) {
      current.usable += 1;
      if (current.examples.length < 2 && post.postUrl) {
        current.examples.push({
          author: creatorIntelligenceDisplayAuthor(post),
          postUrl: post.postUrl,
          text: cleanText(post.text, 180),
        });
      }
    } else {
      current.junk += 1;
    }
    sources.set(key, current);
  }
  return [...sources.values()]
    .sort((left, right) => right.usable - left.usable || right.total - left.total || left.sourceKey.localeCompare(right.sourceKey))
    .slice(0, 50);
}

export function mergeCreatorIntelligenceCaptures(ledger = {}, posts = [], capturedAt = new Date().toISOString()) {
  const existing = new Map((Array.isArray(ledger.posts) ? ledger.posts : [])
    // Keep historical research intact even when a newer parser tightens what it
    // accepts. Filtering belongs at read/report time, not in the merge writer.
    .filter((post) => post && typeof post === 'object' && cleanText(post.key, 2_000))
    .map((post) => [post.key, post]));
  let accepted = 0;
  let added = 0;
  let updated = 0;
  for (const candidate of Array.isArray(posts) ? posts : []) {
    const post = normalizeCreatorIntelligencePost(candidate, capturedAt);
    if (!post) continue;
    accepted += 1;
    const previous = existing.get(post.key);
    if (!previous) {
      existing.set(post.key, post);
      added += 1;
      continue;
    }
    existing.set(post.key, {
      ...previous,
      ...post,
      authorUrl: post.authorUrl || previous.authorUrl || '',
      capturedAt: previous.capturedAt || post.capturedAt,
      lastObservedAt: capturedAt,
      observations: Number(previous.observations || 1) + 1,
      metrics: Object.fromEntries(TRACKED_METRICS.map((metric) => [
        metric,
        Math.max(normalizeCount(previous.metrics?.[metric]), normalizeCount(post.metrics?.[metric])),
      ])),
    });
    const merged = existing.get(post.key);
    merged.engagementScore = creatorIntelligenceEngagementScore(merged);
    merged.metricVisibility = {
      saves: previous.metricVisibility?.saves === true || post.metricVisibility?.saves === true,
    };
    merged.claimVsProof = analyzeClaimVsProof(merged);
    updated += 1;
  }
  return {
    accepted,
    added,
    updated,
    ledger: {
      updatedAt: capturedAt,
      policy: 'Research only. Detect topics and patterns; never copy or automatically republish source wording.',
      posts: [...existing.values()].sort((a, b) => creatorIntelligenceEngagementScore(b) - creatorIntelligenceEngagementScore(a)
        || String(b.lastObservedAt).localeCompare(String(a.lastObservedAt))).slice(0, 100_000),
    },
  };
}

export function creatorIntelligencePatternReport(posts = []) {
  const patterns = new Map();
  const creatorMentions = new Map();
  const claimVsProofCounts = {
    'high-claim-low-proof': 0,
    'claim-needs-proof': 0,
    'supported-claim': 0,
    observational: 0,
  };
  const add = (kind, value, post) => {
    if (!value) return;
    const key = `${kind}:${value}`;
    const current = patterns.get(key) || {
      key,
      kind,
      value,
      posts: 0,
      totalEngagement: 0,
      peakEngagement: 0,
      sources: new Set(),
      examples: [],
    };
    const score = creatorIntelligenceEngagementScore(post);
    current.posts += 1;
    current.totalEngagement += score;
    current.peakEngagement = Math.max(current.peakEngagement, score);
    if (post.sourceKey) current.sources.add(post.sourceKey);
    if (post.postUrl && current.examples.length < 3) current.examples.push(post.postUrl);
    patterns.set(key, current);
  };
  const rankedPosts = filterCreatorIntelligencePosts(posts)
    .sort((left, right) => creatorIntelligenceEngagementScore(right) - creatorIntelligenceEngagementScore(left));
  for (const post of rankedPosts) {
    const method = normalizeMethodology(post.methodology);
    const claimVsProof = post.claimVsProof || analyzeClaimVsProof(post);
    for (const hook of method.hooks) add('hook', hook, post);
    for (const cta of method.callsToAction) add('call-to-action', cta, post);
    add('format', method.format, post);
    if (method.hasQuestion) add('structure', 'question', post);
    if (method.hasBullets) add('structure', 'bulleted-or-numbered', post);
    if (method.hasExternalLink) add('structure', 'external-link', post);
    add('claim-vs-proof', claimVsProof.label, post);
    claimVsProofCounts[claimVsProof.label] = (claimVsProofCounts[claimVsProof.label] || 0) + 1;
    for (const name of Array.isArray(post.mentionedCreators) ? post.mentionedCreators : extractCreatorIntelligenceMentions(post.text)) {
      const current = creatorMentions.get(name) || { name, posts: 0, totalEngagement: 0, sources: new Set(), examples: [] };
      const score = creatorIntelligenceEngagementScore(post);
      current.posts += 1;
      current.totalEngagement += score;
      if (post.sourceKey) current.sources.add(post.sourceKey);
      if (post.postUrl && current.examples.length < 3) current.examples.push(post.postUrl);
      creatorMentions.set(name, current);
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    saves: {
      availableOnPosts: rankedPosts.filter((post) => post.metricVisibility?.saves === true).length,
      unavailableOnPosts: rankedPosts.filter((post) => post.metricVisibility?.saves !== true).length,
      note: 'Save counts are included only when Facebook visibly exposes them.',
    },
    claimVsProof: {
      highClaimLowProof: claimVsProofCounts['high-claim-low-proof'] || 0,
      claimNeedsProof: claimVsProofCounts['claim-needs-proof'] || 0,
      supportedClaim: claimVsProofCounts['supported-claim'] || 0,
      observational: claimVsProofCounts.observational || 0,
      note: 'High-claim creators with weak proof or weak visible engagement are ranked lower for CI follow-up.',
    },
    creatorMentions: [...creatorMentions.values()]
      .map((entry) => ({
        ...entry,
        averageEngagement: entry.posts ? Math.round(entry.totalEngagement / entry.posts) : 0,
        sources: [...entry.sources],
      }))
      .sort((left, right) => right.posts - left.posts || right.totalEngagement - left.totalEngagement)
      .slice(0, 25),
    patterns: [...patterns.values()].map((entry) => ({
      ...entry,
      averageEngagement: entry.posts ? Math.round(entry.totalEngagement / entry.posts) : 0,
      sources: [...entry.sources],
    })).sort((left, right) => right.totalEngagement - left.totalEngagement || right.averageEngagement - left.averageEngagement).slice(0, 50),
    topPosts: rankedPosts.slice(0, 25).map((post) => ({
      key: post.key,
      sourceKey: post.sourceKey,
      author: post.author,
      postUrl: post.postUrl,
      metrics: post.metrics,
      engagementScore: creatorIntelligenceEngagementScore(post),
      methodology: normalizeMethodology(post.methodology),
      mentionedCreators: Array.isArray(post.mentionedCreators) ? post.mentionedCreators : extractCreatorIntelligenceMentions(post.text),
      claimVsProof: post.claimVsProof || analyzeClaimVsProof(post),
    })),
  };
}
