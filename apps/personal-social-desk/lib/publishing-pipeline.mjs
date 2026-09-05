const TARGET_LABELS = Object.freeze({
  'matthew-profile': 'Matthew Murphy personal profile',
  'matthew-page': 'Matthew Murphy fan page',
  'creditrepairchoices-page': 'Credit Repair Choices page',
});

const STAGE_LABELS = Object.freeze({
  ready: 'Ready',
  sending: 'Being sent',
  scheduled: 'Scheduled',
  performance: 'Performance',
  failed: 'Failed',
});

const DAY_LABELS = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const FACEBOOK_PROOF_WAIT_MS = 20 * 60 * 1000;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}#@ ]+/gu, ' ')
    .trim();
}

function interactionScore(metrics = {}) {
  const reactions = Math.max(0, Number(metrics.reactions || 0));
  const comments = Math.max(0, Number(metrics.comments || 0));
  const shares = Math.max(0, Number(metrics.shares || 0));
  return reactions + (comments * 2) + (shares * 3);
}

function stageRank(stage = '') {
  return {
    failed: 5,
    performance: 4,
    scheduled: 3,
    sending: 2,
    ready: 1,
  }[stage] || 0;
}

function similarTitle(left = '', right = '') {
  const leftText = normalizeText(left);
  const rightText = normalizeText(right);
  if (!leftText || !rightText) return false;
  return leftText.includes(rightText.slice(0, 48)) || rightText.includes(leftText.slice(0, 48));
}

function destinationLabel(target = '') {
  return TARGET_LABELS[target] || String(target || 'Facebook destination').replace(/-/g, ' ');
}

function verifiedScheduledProof(item = {}) {
  if (!item || item.source === 'facebook-scheduled-content-manual' && !item.graphId) return false;
  return Boolean(item.graphId || item.source === 'meta-page-api' || item.observedAt || item.capturedAt || item.scheduledContentObservedAt);
}

function statusReason(item = {}, record = {}) {
  return String(
    record.lastError
    || item.dispatchError
    || item.facebookHandoff?.error
    || '',
  ).trim();
}

export function publishingStage(item = {}, record = {}, now = new Date()) {
  const scheduledFor = new Date(record.scheduledFor || item.scheduledFor || 0);
  const reason = statusReason(item, record);
  const hasConfirmedSchedule = Boolean(record.scheduledLedgerProof || record.scheduledContentObservedAt);
  const scheduleClicked = Boolean(item.facebookHandoff?.scheduleClicked || record.scheduleClicked);
  const handoffState = String(item.facebookHandoff?.state || record.handoffState || '');
  const sendStartedAt = new Date(
    item.facebookHandoff?.scheduledAt
    || item.facebookHandoff?.preparedAt
    || record.dispatchedAt
    || record.preparedAt
    || 0,
  );
  const sendAge = now.valueOf() - sendStartedAt.valueOf();
  const activelyAwaitingProof = scheduleClicked
    && handoffState === 'schedule-clicked-awaiting-proof'
    && Number.isFinite(sendStartedAt.valueOf())
    && sendAge >= 0
    && sendAge <= FACEBOOK_PROOF_WAIT_MS;
  const locallyClaimedSchedule = Boolean(
    item.status === 'dispatched'
    || item.status === 'scheduled'
    || item.facebookHandoff?.facebookConfirmed
    || record.confirmedAt
    || record.graphId,
  );
  const pastScheduledTime = Number.isFinite(scheduledFor.valueOf()) && scheduledFor.valueOf() <= now.valueOf();
  const hasPerformance = interactionScore(record.performance?.metrics || {}) > 0;
  if (reason) return 'failed';
  if (hasPerformance && record.facebookUrl) return 'performance';
  if (hasConfirmedSchedule && pastScheduledTime && hasPerformance) return 'performance';
  if (hasConfirmedSchedule) return pastScheduledTime ? 'performance' : 'scheduled';
  if (activelyAwaitingProof) return 'sending';
  if (scheduleClicked || locallyClaimedSchedule) return 'failed';
  return 'ready';
}

function facebookProofFailureReason(item = {}, record = {}) {
  if (statusReason(item, record)) return statusReason(item, record);
  if (item.status === 'dispatched' && !item.facebookHandoff?.scheduleClicked) {
    return 'The legacy queue handoff never produced Facebook Scheduled Content proof. Resend this post.';
  }
  if (item.status === 'scheduled' || item.facebookHandoff?.facebookConfirmed || record.confirmedAt || record.graphId) {
    return 'Facebook Scheduled Content has no matching proof for this local schedule.';
  }
  if (item.facebookHandoff?.scheduleClicked || record.scheduleClicked) {
    return 'Facebook did not provide Scheduled Content proof before the confirmation window expired.';
  }
  return '';
}

function stageMeta(stage = '') {
  return {
    key: stage,
    label: STAGE_LABELS[stage] || 'Status',
  };
}

function timeKey(dateLike) {
  const date = new Date(dateLike || 0);
  return Number.isFinite(date.valueOf()) ? date.toISOString() : '';
}

function rowSort(left, right) {
  const rightStage = stageRank(right.stage);
  const leftStage = stageRank(left.stage);
  if (rightStage !== leftStage) return rightStage - leftStage;
  const leftTime = Date.parse(left.scheduledFor || left.updatedAt || left.createdAt || 0) || 0;
  const rightTime = Date.parse(right.scheduledFor || right.updatedAt || right.createdAt || 0) || 0;
  if (rightTime !== leftTime) return rightTime - leftTime;
  return String(left.title || '').localeCompare(String(right.title || ''));
}

function metricSummary(record = {}, followersAtPublish = null) {
  const metrics = record.performance?.metrics || {};
  const reactions = Math.max(0, Number(metrics.reactions || 0));
  const comments = Math.max(0, Number(metrics.comments || 0));
  const shares = Math.max(0, Number(metrics.shares || 0));
  const score = interactionScore(metrics);
  return {
    reactions,
    comments,
    shares,
    score,
    scorePerThousand: Number.isFinite(followersAtPublish) && followersAtPublish > 0
      ? Math.round((score / followersAtPublish) * 10000) / 10
      : null,
    source: record.performance?.source || '',
    observedAt: record.performance?.observedAt || null,
    postUrl: record.performance?.postUrl || record.facebookUrl || '',
  };
}

function styleBreakdown(rows = []) {
  return Object.values(rows.reduce((found, row) => {
    const styleKey = row.artworkVariant?.styleKey || 'unlabeled';
    if (!found[styleKey]) found[styleKey] = {
      styleKey,
      label: row.artworkVariant?.styleLabel || 'Unlabeled artwork',
      posts: 0,
      performancePosts: 0,
      totalScore: 0,
      normalizedPosts: 0,
      totalScorePerThousand: 0,
    };
    const current = found[styleKey];
    current.posts += 1;
    if (row.metrics.score > 0) {
      current.performancePosts += 1;
      current.totalScore += row.metrics.score;
    }
    if (row.metrics.score > 0 && Number.isFinite(row.metrics.scorePerThousand)) {
      current.normalizedPosts += 1;
      current.totalScorePerThousand += row.metrics.scorePerThousand;
    }
    return found;
  }, {})).map((entry) => ({
    ...entry,
    averageScore: entry.performancePosts ? Math.round(entry.totalScore / entry.performancePosts) : 0,
    averageScorePerThousand: entry.normalizedPosts
      ? Math.round((entry.totalScorePerThousand / entry.normalizedPosts) * 10) / 10
      : null,
  })).sort((left, right) => (right.averageScorePerThousand || 0) - (left.averageScorePerThousand || 0)
    || right.averageScore - left.averageScore
    || left.label.localeCompare(right.label));
}

function targetBreakdown(rows = []) {
  return Object.values(rows.reduce((found, row) => {
    const key = row.target || 'unknown';
    if (!found[key]) {
      found[key] = {
        target: key,
        label: destinationLabel(key),
        posts: 0,
        performancePosts: 0,
        totalScore: 0,
        totalDelta: 0,
        deltaCount: 0,
      };
    }
    const current = found[key];
    current.posts += 1;
    if (row.metrics.score > 0) {
      current.performancePosts += 1;
      current.totalScore += row.metrics.score;
    }
    if (Number.isFinite(row.followerDelta)) {
      current.totalDelta += row.followerDelta;
      current.deltaCount += 1;
    }
    return found;
  }, {})).map((entry) => ({
    ...entry,
    averageScore: entry.performancePosts ? Math.round(entry.totalScore / entry.performancePosts) : 0,
    averageDelta: entry.deltaCount ? Math.round(entry.totalDelta / entry.deltaCount) : null,
  })).sort((left, right) => right.averageScore - left.averageScore || left.label.localeCompare(right.label));
}

function timeBreakdowns(rows = []) {
  const byHour = Array.from({ length: 24 }, (_value, hour) => ({
    hour,
    posts: 0,
    performancePosts: 0,
    totalScore: 0,
  }));
  const byDay = DAY_LABELS.map((label, day) => ({
    day,
    label,
    posts: 0,
    performancePosts: 0,
    totalScore: 0,
  }));
  const heatmap = DAY_LABELS.flatMap((label, day) => Array.from({ length: 24 }, (_value, hour) => ({
    day,
    hour,
    label,
    posts: 0,
    performancePosts: 0,
    totalScore: 0,
  })));
  for (const row of rows) {
    const scheduled = new Date(row.scheduledFor || row.confirmedAt || 0);
    if (!Number.isFinite(scheduled.valueOf())) continue;
    const hour = scheduled.getHours();
    const day = scheduled.getDay();
    const score = row.metrics.score;
    byHour[hour].posts += 1;
    byDay[day].posts += 1;
    heatmap[(day * 24) + hour].posts += 1;
    if (score > 0) {
      byHour[hour].performancePosts += 1;
      byHour[hour].totalScore += score;
      byDay[day].performancePosts += 1;
      byDay[day].totalScore += score;
      heatmap[(day * 24) + hour].performancePosts += 1;
      heatmap[(day * 24) + hour].totalScore += score;
    }
  }
  const addAverage = (entry) => ({
    ...entry,
    averageScore: entry.performancePosts ? Math.round(entry.totalScore / entry.performancePosts) : 0,
  });
  return {
    hours: byHour.map(addAverage),
    days: byDay.map(addAverage),
    heatmap: heatmap.map(addAverage),
  };
}

function bestWindows(rows = []) {
  const { heatmap } = timeBreakdowns(rows);
  return heatmap
    .filter((entry) => entry.performancePosts > 0)
    .sort((left, right) => right.averageScore - left.averageScore || right.performancePosts - left.performancePosts)
    .slice(0, 8)
    .map((entry) => ({
      day: entry.day,
      label: `${entry.label} ${String(entry.hour).padStart(2, '0')}:00`,
      hour: entry.hour,
      averageScore: entry.averageScore,
      posts: entry.posts,
      performancePosts: entry.performancePosts,
    }));
}

export function buildPublishingRows({
  queueItems = [],
  scheduledItems = [],
  metricsLedger = {},
  now = new Date(),
} = {}) {
  const records = Array.isArray(metricsLedger.posts) ? metricsLedger.posts : [];
  const recordsByDraftId = new Map(records.filter((record) => record.draftId).map((record) => [record.draftId, record]));
  const recordsByGraphId = new Map(records.filter((record) => record.graphId).map((record) => [record.graphId, record]));
  const scheduledByDraftId = new Map((scheduledItems || []).filter((item) => item.draftId).map((item) => [item.draftId, item]));
  const rows = [];
  const seen = new Set();
  const relevantQueueItems = (queueItems || []).filter((item) => item?.format !== 'story')
    .filter((item) => !['removed', 'rejected'].includes(item?.status))
    .filter((item) => item?.mediaApproval?.hiddenAt || ['approved', 'dispatched', 'scheduled', 'published'].includes(item.status));
  for (const item of relevantQueueItems) {
    const record = recordsByDraftId.get(item.id)
      || recordsByGraphId.get(item.facebookHandoff?.graphId || '')
      || records.find((entry) => entry.facebookUrl && item.facebookHandoff?.sourceUrl && entry.facebookUrl === item.facebookHandoff.sourceUrl)
      || {};
    const scheduledProofCandidate = scheduledByDraftId.get(item.id)
      || (item.target === 'matthew-page' ? (scheduledItems || []).find((entry) => (!entry.target || entry.target === item.target)
        && similarTitle(entry.title, item.title)
        && Date.parse(entry.scheduledFor || 0)
        && Date.parse(item.scheduledFor || 0)
        && Math.abs(Date.parse(entry.scheduledFor || 0) - Date.parse(item.scheduledFor || 0)) < 90_000) : null)
      || null;
    const scheduledProof = verifiedScheduledProof(scheduledProofCandidate) ? scheduledProofCandidate : null;
    const stageRecord = scheduledProof
      ? {
          ...record,
          // Facebook Scheduled Content is authoritative over an earlier handoff error.
          lastError: '',
          scheduledLedgerProof: true,
          scheduledContentObservedAt: scheduledProof.observedAt || scheduledProof.capturedAt || metricsLedger.updatedAt || null,
          scheduledFor: scheduledProof.scheduledFor || record.scheduledFor,
          graphId: scheduledProof.graphId || record.graphId,
          facebookUrl: scheduledProof.sourceUrl || record.facebookUrl,
        }
      : record;
    const draftId = item.id;
    if (seen.has(draftId)) continue;
    seen.add(draftId);
    const currentFollowers = finiteNumber(stageRecord.currentFollowers ?? metricsLedger.destinations?.[item.target]?.currentFollowers);
    const followersAtPublish = finiteNumber(stageRecord.followersAtPublish);
    const stage = publishingStage(item, stageRecord, now);
    const row = {
      draftId,
      target: item.target,
      targetLabel: destinationLabel(item.target),
      stage,
      stageMeta: stageMeta(stage),
      title: item.title || record.title || 'Untitled post',
      body: item.body || record.body || '',
      status: item.status || record.status || 'approved',
      scheduledFor: item.scheduledFor || record.scheduledFor || scheduledProof?.scheduledFor || null,
      intendedScheduledFor: item.intendedScheduledFor || item.scheduledFor || record.intendedScheduledFor || null,
      createdAt: item.createdAt || record.createdAt || null,
      updatedAt: item.updatedAt || record.updatedAt || null,
      approvedAt: item.approvedAt || record.approvedAt || item.mediaApproval?.hiddenAt || null,
      preparedAt: item.facebookHandoff?.preparedAt || record.preparedAt || null,
      dispatchedAt: item.dispatchedAt || record.dispatchedAt || null,
      confirmedAt: item.facebookHandoff?.confirmedAt || record.confirmedAt || null,
      graphId: item.facebookHandoff?.graphId || record.graphId || scheduledProof?.graphId || '',
      facebookUrl: record.facebookUrl || item.facebookHandoff?.sourceUrl || scheduledProof?.sourceUrl || '',
      draftReference: `D-${String(draftId).slice(0, 8).toUpperCase()}`,
      mediaApprovalHiddenAt: item.mediaApproval?.hiddenAt || null,
      dispatchError: statusReason(item, stageRecord) || (stage === 'failed' ? facebookProofFailureReason(item, stageRecord) : ''),
      followersAtPublish,
      currentFollowers,
      followerDelta: Number.isFinite(followersAtPublish) && Number.isFinite(currentFollowers)
        ? currentFollowers - followersAtPublish
        : null,
      followerSourceAtPublish: record.followerSourceAtPublish || '',
      currentFollowerSource: record.currentFollowerSource || metricsLedger.destinations?.[item.target]?.currentFollowerSource || '',
      followerObservedAt: record.currentFollowerObservedAt || metricsLedger.destinations?.[item.target]?.observedAt || null,
      unfollowSupport: record.unfollowSupport || 'aggregate-only',
      metrics: metricSummary(record, followersAtPublish),
      artworkVariant: {
        id: item.mediaVariant?.id || [
          item.campaign?.tipNumber ? `tip-${item.campaign.tipNumber}` : draftId,
          item.artworkDay?.key || item.mediaVariant?.styleKey || 'unlabeled',
          item.artworkDay?.publishDate || 'undated',
        ].join(':'),
        styleKey: item.mediaVariant?.styleKey || item.artworkDay?.key || 'unlabeled',
        styleLabel: item.mediaVariant?.styleLabel || item.artworkDay?.label || 'Unlabeled artwork',
        publishDate: item.mediaVariant?.publishDate || item.artworkDay?.publishDate || null,
        private: true,
      },
      campaignKey: item.campaign?.tipNumber
        ? `creator-tip:${item.campaign.tipNumber}:cycle-${item.campaign.cycle || 1}`
        : '',
      campaignTipNumber: Number(item.campaign?.tipNumber || 0),
      notes: record.notes || '',
    };
    rows.push(row);
  }
  return rows.sort(rowSort);
}

export function buildPublishingAnalytics(rows = []) {
  const performanceRows = rows.filter((row) => row.metrics.score > 0 && row.scheduledFor);
  const targets = targetBreakdown(rows);
  const times = timeBreakdowns(performanceRows);
  return {
    targets,
    styles: styleBreakdown(rows),
    hours: times.hours,
    days: times.days,
    heatmap: times.heatmap,
    bestWindows: bestWindows(performanceRows),
    totals: {
      trackedPosts: rows.length,
      performancePosts: performanceRows.length,
      ready: rows.filter((row) => row.stage === 'ready').length,
      sending: rows.filter((row) => row.stage === 'sending').length,
      scheduled: rows.filter((row) => row.stage === 'scheduled').length,
      performance: rows.filter((row) => row.stage === 'performance').length,
      failed: rows.filter((row) => row.stage === 'failed').length,
    },
  };
}

export function buildPublishingPipeline({
  queueItems = [],
  scheduledItems = [],
  metricsLedger = {},
  now = new Date(),
} = {}) {
  const rows = buildPublishingRows({ queueItems, scheduledItems, metricsLedger, now });
  const analytics = buildPublishingAnalytics(rows);
  const columns = ['ready', 'sending', 'scheduled', 'performance', 'failed'].map((stage) => ({
    ...stageMeta(stage),
    rows: rows.filter((row) => row.stage === stage),
  }));
  return {
    updatedAt: metricsLedger.updatedAt || null,
    destinations: metricsLedger.destinations || {},
    facebookPageHistory: metricsLedger.facebookPageHistory || null,
    creatorTipPageProgress: metricsLedger.creatorTipPageProgress || null,
    rows,
    columns,
    analytics,
  };
}

function questionPrompt(text = '') {
  if (!text) return 'What part of this stood out to you most?';
  if (/\?/.test(text)) return 'What answer would you add to this?';
  if (/\blaunch|released|new\b/i.test(text)) return 'What part of the launch are you most excited about?';
  if (/\btip|lesson|learned|advice\b/i.test(text)) return 'What is the best takeaway here for your own work?';
  return 'What is your take on this?';
}

export function buildEngagementAssistSuggestions({
  url = '',
  text = '',
  authorLabel = '',
} = {}) {
  const cleanedText = String(text || '').replace(/\s+/g, ' ').trim();
  const label = String(authorLabel || 'this creator').trim() || 'this creator';
  const reactionPool = /\b(lol|haha|funny|smirk)\b/i.test(cleanedText)
    ? ['Haha', 'Like', 'Wow']
    : /\b(congrats|congratulations|proud|win|celebrat|launch)\b/i.test(cleanedText)
      ? ['Love', 'Care', 'Wow']
      : /\b(hard|struggle|loss|sad|tough|healing)\b/i.test(cleanedText)
        ? ['Care', 'Love', 'Like']
        : /\b(tip|lesson|how to|teach|explains?)\b/i.test(cleanedText)
          ? ['Like', 'Care', 'Wow']
          : ['Like', 'Love', 'Care'];
  const comments = [
    `Interesting perspective from ${label}.`,
    `That is a strong point. ${questionPrompt(cleanedText)}`,
    `Clear message. This is the kind of post that makes people pause.`,
    `There is a real takeaway here. ${questionPrompt(cleanedText)}`,
    `Worth opening the post and leaving a thoughtful reply if it fits the page voice.`,
  ];
  return {
    url: String(url || '').trim(),
    reactionSuggestions: reactionPool,
    commentSuggestions: comments,
    manualOnly: true,
    policyNote: 'Suggestions only. Open the post and confirm any reaction or comment yourself.',
  };
}
