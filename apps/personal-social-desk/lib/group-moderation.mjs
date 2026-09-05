const GROUP_ID = '1451130882820932';

export const groupModerationConfig = Object.freeze({
  platform: 'facebook',
  groupId: GROUP_ID,
  admins: Object.freeze(["Joel O'Neils", 'Matthew Murphy : Built Not Begged', 'Matthew Murphy']),
  rules: Object.freeze([
    Object.freeze({ id: 'engagement', label: 'No E4E, F4F, or share trains' }),
    Object.freeze({ id: 'respect', label: 'Respect and kindness' }),
    Object.freeze({ id: 'follow-admins', label: 'Follow the admins' }),
    Object.freeze({ id: 'privacy', label: 'Respect everyone\'s privacy' }),
    Object.freeze({ id: 'hate-bullying', label: 'No hate speech or bullying' }),
    Object.freeze({
      id: 'creator-reels',
      label: 'Reels must cover creator growth, monetization, dashboards, or strategy',
    }),
    Object.freeze({ id: 'on-topic', label: 'No personal or off-topic posts' }),
  ]),
  points: Object.freeze({ approve: 2, offTopicOrReel: -1, engagementBait: -2, hateOrPrivacy: -5 }),
  autoApproval: Object.freeze({
    consecutiveApprovalsRequired: 50,
    violationResetsStreak: true,
    stillBlockRuleViolations: true,
  }),
  welcome: Object.freeze({
    inviteCount: 10,
    message: 'Welcome to Built Not Begged: Creator Growth Hub! Tell us what you create, and please invite 10 creators who would genuinely benefit from the group. Only invite people who fit the community; no follow-for-follow or engagement exchanges.',
  }),
});

const AUTO_APPROVAL_STREAK = groupModerationConfig.autoApproval.consecutiveApprovalsRequired;

const CREATOR_GROWTH_PATTERNS = [
  /\bcreator growth\b/i,
  /\bcontent (?:creation|creator|strategy|planning)\b/i,
  /\b(?:facebook|meta|professional) dashboard\b/i,
  /\bmoneti[sz](?:e|ed|ing|ation)\b/i,
  /\baudience growth\b/i,
  /\bgrow (?:your|a) (?:page|audience|following|channel)\b/i,
  /\b(?:reel|short-form video|social media) strateg(?:y|ies)\b/i,
  /\b(?:improve|optimi[sz]e|plan|script|edit) (?:your )?reels?\b/i,
  /\boriginal content\b/i,
  /\bcreator (?:business|tips?|tools?|workflow|analytics)\b/i,
  /\bAI (?:creator|content|publishing|audience|workflow)\b/i,
];

const ENGAGEMENT_BAIT_PATTERNS = [
  /\b(?:e4e|f4f|l4l|s4s)\b/i,
  /\b(?:engagement|follow|like|share)\s*(?:for|4)\s*(?:engagement|follow|like|share)\b/i,
  /\b(?:share|follow|engagement|like) train\b/i,
  /\bdrop (?:your )?(?:link|page|handle).{0,30}(?:follow|like|share) (?:everyone|each other|back)\b/i,
];

const HATE_OR_BULLYING_PATTERNS = [
  /\bkill yourself\b/i,
  /\b(?:you|they|he|she) (?:are|is) (?:an? )?(?:idiot|moron|loser|worthless)\b/i,
  /\b(?:threaten|harass|bully)(?:ing|ed)?\b/i,
];

const PRIVACY_PATTERNS = [
  /\b(?:here is|their|his|her) (?:home )?address\b/i,
  /\b(?:here is|their|his|her) (?:private )?(?:phone number|email address)\b/i,
  /\b(?:dox|doxx|doxxing|doxing)\b/i,
];

const CLEAR_OFF_TOPIC_PATTERNS = [
  /\b(?:who else )?talks? to the moon\b/i,
  /\bjust wanted to (?:introduce myself and )?share a photo i took\b/i,
  /\b(?:sports|music|soundcloud) (?:promotion|promo|share train)\b/i,
];

function validTimestamp(value, label) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${label} must be a valid timestamp`);
  }
  return new Date(value).toISOString();
}

function optionalTimestamp(value, label) {
  return value === undefined || value === null ? null : validTimestamp(value, label);
}

function normalizeText(post) {
  return String(post?.text ?? post?.body ?? post?.caption ?? '').trim();
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function adminNote(message) {
  const text = String(message || '').trim().replace(/^AI review:\s*/i, '');
  return `AI review: ${text || 'Manual review required.'}`;
}

function result(decision, matchedRules, rationale, pointsDelta) {
  return {
    decision,
    recommendation: decision,
    matchedRules,
    rationale,
    pointsDelta,
    adminNote: adminNote(rationale),
  };
}

function isReel(post) {
  return post?.isReel === true || /^(?:reel|video)$/i.test(String(post?.mediaType || ''));
}

function explicitOffTopic(post, text) {
  const topic = String(post?.topic ?? post?.category ?? '').trim().toLowerCase();
  return post?.offTopic === true
    || ['off-topic', 'personal', 'unrelated'].includes(topic)
    || matchesAny(text, CLEAR_OFF_TOPIC_PATTERNS);
}

export function classifyGroupPost(post = {}) {
  const text = normalizeText(post);
  const creatorGrowth = matchesAny(text, CREATOR_GROWTH_PATTERNS)
    || post.creatorGrowthContext === true;

  if (post.containsHateOrBullying === true || matchesAny(text, HATE_OR_BULLYING_PATTERNS)) {
    return result('decline', ['hate-bullying'], 'Clear hate speech or bullying violates the group rules.', -5);
  }

  if (post.exposesPrivateInformation === true || matchesAny(text, PRIVACY_PATTERNS)) {
    return result('decline', ['privacy'], 'Private personal information must not be exposed in the group.', -5);
  }

  if (post.engagementBait === true || matchesAny(text, ENGAGEMENT_BAIT_PATTERNS)) {
    return result('decline', ['engagement'], 'Engagement-for-engagement and share trains are not allowed.', -2);
  }

  if (isReel(post)) {
    const language = String(post.language || '').trim().toLowerCase();
    const nonEnglish = Boolean(language && !['en', 'eng', 'english'].includes(language));
    const hasAccessibleContext = post.hasCaptions === true || post.hasEnglishContext === true;
    if (nonEnglish && !hasAccessibleContext) {
      return result(
        'decline',
        ['creator-reels'],
        'A non-English Reel needs captions or clear English creator-growth context.',
        -1,
      );
    }
    if (!creatorGrowth) {
      return result(
        'decline',
        ['creator-reels', 'on-topic'],
        'The Reel has no explicit creator-growth, monetization, dashboard, or strategy focus.',
        -1,
      );
    }
  }

  if (explicitOffTopic(post, text) && !creatorGrowth) {
    return result('decline', ['on-topic'], 'The post is clearly personal or unrelated to creator growth.', -1);
  }

  if (creatorGrowth) {
    return result('approve', [], 'The post explicitly provides creator-growth, monetization, dashboard, or strategy value.', 2);
  }

  // An AI label is metadata, not evidence that a post is good or bad.
  return result('review', [], 'The post is not explicit enough for a safe automated decision.', 0);
}

function cloneLedger(ledger = {}) {
  return {
    version: 1,
    groupId: GROUP_ID,
    updatedAt: ledger.updatedAt || null,
    pendingCount: Number.isSafeInteger(ledger.pendingCount) ? ledger.pendingCount : null,
    spamCount: Number.isSafeInteger(ledger.spamCount) ? ledger.spamCount : null,
    items: (ledger.items || []).map((item) => ({
      ...item,
      matchedRules: [...(item.matchedRules || [])],
      decisionHistory: (item.decisionHistory || []).map((entry) => ({ ...entry })),
    })),
    members: (ledger.members || []).map((member) => ({
      ...member,
      notes: (member.notes || []).map((note) => ({ ...note })),
    })),
    welcomes: (ledger.welcomes || []).map((welcome) => ({ ...welcome })),
  };
}

function captureKey(capture) {
  const value = capture?.key ?? capture?.postId ?? capture?.postUrl ?? capture?.url;
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError('each capture must provide key, postId, postUrl, or url');
  }
  return value.trim();
}

function optionalCount(value, label) {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return value;
}

export function mergeGroupModerationCaptures(ledger = {}, captures = {}) {
  const batch = Array.isArray(captures) ? { items: captures } : captures;
  if (!batch || !Array.isArray(batch.items)) {
    throw new TypeError('captures must be an array or provide an items array');
  }
  if (batch.groupId !== undefined && String(batch.groupId) !== GROUP_ID) {
    throw new RangeError(`captures must belong to Facebook group ${GROUP_ID}`);
  }

  const observedAt = validTimestamp(
    batch.observedAt ?? batch.items[0]?.observedAt,
    'captures.observedAt',
  );
  const next = cloneLedger(ledger);
  refreshMemberTrustStats(next);
  if (next.updatedAt && Date.parse(observedAt) < Date.parse(next.updatedAt)) {
    throw new RangeError('captures must be merged in chronological order');
  }

  const byKey = new Map(next.items.map((item) => [item.key, item]));
  for (const capture of batch.items) {
    const key = captureKey(capture);
    const baseClassification = classifyGroupPost(capture);
    const existing = byKey.get(key);
    const capturedAuthor = {
      key,
      authorId: typeof capture.authorId === 'string' ? capture.authorId : existing?.authorId || null,
      authorName: typeof capture.authorName === 'string' ? capture.authorName.trim() : existing?.authorName || '',
    };
    const member = next.members.find((candidate) => candidate.key === memberKey(capturedAuthor));
    const trustedMember = member?.autoApproveEligible === true;
    const trustedAutoApproval = trustedMember && baseClassification.decision === 'review';
    const classified = trustedAutoApproval
      ? result(
        'approve',
        [],
        `Trusted member has ${member.approvalStreak} consecutive verified rule-compliant posts.`,
        groupModerationConfig.points.approve,
      )
      : baseClassification;
    const item = {
      ...(existing || {}),
      key,
      postId: typeof capture.postId === 'string' ? capture.postId : existing?.postId || null,
      postUrl: typeof capture.postUrl === 'string'
        ? capture.postUrl
        : typeof capture.url === 'string' ? capture.url : existing?.postUrl || null,
      authorId: typeof capture.authorId === 'string' ? capture.authorId : existing?.authorId || null,
      authorName: typeof capture.authorName === 'string' ? capture.authorName.trim() : existing?.authorName || '',
      body: normalizeText(capture),
      queueType: ['pending', 'spam'].includes(capture.queueType) ? capture.queueType : existing?.queueType || 'pending',
      recommendation: classified.decision,
      matchedRules: classified.matchedRules,
      rationale: classified.rationale,
      suggestedPointsDelta: classified.pointsDelta,
      adminNote: classified.adminNote,
      recommendationSource: trustedAutoApproval ? 'trusted-member' : 'content-policy',
      trustedMember,
      approvalStreakAtCapture: Number(member?.approvalStreak || 0),
      status: existing?.status || 'captured',
      firstSeenAt: existing?.firstSeenAt || observedAt,
      lastSeenAt: observedAt,
      decisionHistory: existing?.decisionHistory || [],
    };
    byKey.set(key, item);
  }

  next.items = [...byKey.values()].sort((left, right) => left.firstSeenAt.localeCompare(right.firstSeenAt));
  next.pendingCount = optionalCount(batch.pendingCount, 'captures.pendingCount') ?? next.pendingCount;
  next.spamCount = optionalCount(batch.spamCount, 'captures.spamCount') ?? next.spamCount;
  next.updatedAt = observedAt;
  return next;
}

function memberKey(item) {
  if (item.authorId) return `facebook:${item.authorId}`;
  if (item.authorName) return `name:${item.authorName.toLowerCase()}`;
  return `post:${item.key}`;
}

function activeVerifiedDecision(item) {
  const active = [...(item.decisionHistory || [])].reverse().find((entry) => entry.active !== false);
  if (active && ['approve', 'decline'].includes(active.action) && active.verifiedAt) return active;
  if (!item.facebookVerifiedAt || !['approved', 'declined'].includes(item.status)) return null;
  return {
    action: item.status === 'approved' ? 'approve' : 'decline',
    decidedAt: item.decidedAt || item.facebookVerifiedAt,
    verifiedAt: item.facebookVerifiedAt,
  };
}

function memberTrustStats(items, member) {
  const key = member.key;
  const decisions = items
    .filter((item) => memberKey(item) === key)
    .map((item) => activeVerifiedDecision(item))
    .filter(Boolean)
    .sort((left, right) => Date.parse(left.decidedAt || left.verifiedAt) - Date.parse(right.decidedAt || right.verifiedAt));
  let approvalStreak = 0;
  let verifiedApprovals = 0;
  let verifiedViolations = 0;
  let trustedSince = null;
  for (const decision of decisions) {
    if (decision.action === 'approve') {
      verifiedApprovals += 1;
      approvalStreak += 1;
      if (approvalStreak === AUTO_APPROVAL_STREAK) trustedSince = decision.verifiedAt;
    } else {
      verifiedViolations += 1;
      approvalStreak = 0;
      trustedSince = null;
    }
  }
  return {
    approvalStreak,
    verifiedApprovals,
    verifiedViolations,
    identityVerified: Boolean(member.authorId && key.startsWith('facebook:')),
    autoApproveEligible: Boolean(member.authorId && key.startsWith('facebook:') && approvalStreak >= AUTO_APPROVAL_STREAK),
    remainingForAutoApproval: Math.max(0, AUTO_APPROVAL_STREAK - approvalStreak),
    trustedSince,
  };
}

function refreshMemberTrustStats(ledger) {
  for (const member of ledger.members) Object.assign(member, memberTrustStats(ledger.items, member));
  return ledger;
}

export function recordGroupModerationDecision(ledger = {}, decision = {}) {
  const next = cloneLedger(ledger);
  const key = captureKey(decision);
  const item = next.items.find((candidate) => candidate.key === key);
  if (!item) throw new RangeError(`moderation item ${key} was not captured`);

  const action = String(decision.action || decision.decision || '').toLowerCase();
  if (!['approve', 'decline', 'review'].includes(action)) {
    throw new TypeError('decision.action must be approve, decline, or review');
  }
  const override = decision.override === true;
  if (action !== 'review' && item.recommendation !== action && !override) {
    throw new RangeError(`cannot ${action} a post classified as ${item.recommendation}`);
  }
  if (override && !String(decision.adminNote || '').trim()) {
    throw new TypeError('An override requires an explicit adminNote.');
  }

  const decidedAt = validTimestamp(decision.decidedAt, 'decision.decidedAt');
  const verifiedAt = optionalTimestamp(decision.verifiedAt, 'decision.verifiedAt');
  if (action !== 'review' && !verifiedAt) {
    throw new TypeError('approve and decline decisions require decision.verifiedAt');
  }
  if (next.updatedAt && Date.parse(decidedAt) < Date.parse(next.updatedAt)) {
    throw new RangeError('decisions must be recorded in chronological order');
  }

  const requestedPoints = Number(decision.pointsDelta);
  const pointsDelta = action === 'review'
    ? 0
    : override && Number.isInteger(requestedPoints) && requestedPoints >= -5 && requestedPoints <= 2
      ? requestedPoints
      : item.suggestedPointsDelta;
  const note = adminNote(decision.adminNote || item.rationale);
  const previousEntry = [...item.decisionHistory].reverse().find((entry) => entry.active !== false);
  if (previousEntry) previousEntry.active = false;
  item.decisionHistory.push({ action, pointsDelta, adminNote: note, decidedAt, verifiedAt, override, active: true });
  item.status = action === 'review' ? 'review' : action === 'approve' ? 'approved' : 'declined';
  item.pointsDelta = pointsDelta;
  item.adminNote = note;
  item.decidedAt = decidedAt;
  item.facebookVerifiedAt = verifiedAt;

  const keyForMember = memberKey(item);
  let member = next.members.find((candidate) => candidate.key === keyForMember);
  if (!member) {
    member = {
      key: keyForMember,
      authorId: item.authorId,
      authorName: item.authorName,
      points: 0,
      notes: [],
    };
    next.members.push(member);
  }
  const priorPoints = previousEntry?.pointsDelta || 0;
  member.points += pointsDelta - priorPoints;
  member.notes.push({ postKey: item.key, action, pointsDelta, adminNote: note, decidedAt });

  refreshMemberTrustStats(next);

  next.updatedAt = decidedAt;
  return next;
}

export function recordGroupMemberWelcome(ledger = {}, input = {}) {
  const next = cloneLedger(ledger);
  const welcomedAt = validTimestamp(input.welcomedAt, 'welcome.welcomedAt');
  if (next.updatedAt && Date.parse(welcomedAt) < Date.parse(next.updatedAt)) {
    throw new RangeError('welcomes must be recorded in chronological order');
  }
  let groupPostUrl;
  try {
    groupPostUrl = new URL(String(input.groupPostUrl || ''));
  } catch {
    throw new TypeError('A verified Facebook welcome-post URL is required.');
  }
  if (groupPostUrl.hostname !== 'www.facebook.com' || !groupPostUrl.pathname.startsWith(`/groups/${GROUP_ID}/posts/`)) {
    throw new TypeError('groupPostUrl must be a post in the configured Facebook group.');
  }
  if (!Array.isArray(input.members) || input.members.length === 0) {
    throw new TypeError('welcome.members must contain at least one Facebook member.');
  }

  const welcomedIds = new Set(next.welcomes.map((welcome) => welcome.authorId));
  for (const candidate of input.members) {
    const authorId = String(candidate?.authorId || '').trim();
    const authorName = String(candidate?.authorName || '').trim();
    if (!authorId) throw new TypeError('Each welcomed member requires a stable Facebook authorId.');
    if (welcomedIds.has(authorId)) continue;
    next.welcomes.push({
      authorId,
      authorName,
      groupPostUrl: groupPostUrl.href,
      welcomedAt,
      inviteCountRequested: groupModerationConfig.welcome.inviteCount,
    });
    welcomedIds.add(authorId);
  }
  next.updatedAt = welcomedAt;
  return next;
}

export function groupModerationSummary(ledger = {}) {
  const next = cloneLedger(ledger);
  refreshMemberTrustStats(next);
  const counts = { captured: 0, review: 0, approved: 0, declined: 0 };
  for (const item of next.items) {
    const status = Object.hasOwn(counts, item.status) ? item.status : 'captured';
    counts[status] += 1;
  }

  return {
    groupId: GROUP_ID,
    updatedAt: next.updatedAt,
    queue: { pending: next.pendingCount, spam: next.spamCount },
    counts: { total: next.items.length, ...counts },
    trust: {
      threshold: AUTO_APPROVAL_STREAK,
      trustedMembers: next.members.filter((member) => member.autoApproveEligible).length,
    },
    welcome: {
      inviteCount: groupModerationConfig.welcome.inviteCount,
      welcomedMembers: next.welcomes.length,
      recent: [...next.welcomes].sort((left, right) => Date.parse(right.welcomedAt) - Date.parse(left.welcomedAt)).slice(0, 20),
    },
    pointsTotal: next.members.reduce((sum, member) => sum + member.points, 0),
    members: [...next.members]
      .sort((left, right) => right.points - left.points || left.key.localeCompare(right.key))
      .map((member) => ({ ...member, notes: [...member.notes] })),
  };
}
