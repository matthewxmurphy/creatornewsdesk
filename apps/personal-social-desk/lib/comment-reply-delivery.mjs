export const COMMENT_REPLY_CADENCE_MINUTES = 5;
export const COMMENT_REPLY_RETRY_AFTER_MS = 2 * 60_000;
export const COMMENT_REPLY_MAX_ATTEMPTS = 3;

function attemptCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function selectOwnedReplyDrafts(drafts = [], replies = [], {
  now = new Date(),
  limit = 10,
  retryAfterMs = COMMENT_REPLY_RETRY_AFTER_MS,
  maxAttempts = COMMENT_REPLY_MAX_ATTEMPTS,
} = {}) {
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const sentKeys = new Set(replies
    .filter((reply) => reply.status === 'sent' && reply.parentVerified === true)
    .map((reply) => reply.commentKey));
  const latestAttempts = new Map();
  for (const reply of replies) {
    if (reply.status !== 'attempted' || !reply.commentKey) continue;
    const current = latestAttempts.get(reply.commentKey);
    if (!current || Date.parse(reply.actionAt || 0) >= Date.parse(current.actionAt || 0)) latestAttempts.set(reply.commentKey, reply);
  }
  return drafts
    .filter((draft) => draft.kind === 'owned-post-reply' && ['approved', 'attempted'].includes(draft.status) && draft.postUrl && !sentKeys.has(draft.commentKey))
    .map((draft) => {
      const recordedLatest = latestAttempts.get(draft.commentKey);
      const targetRefreshedAt = draft.targetRefreshedAt ? Date.parse(draft.targetRefreshedAt) : Number.NaN;
      const latest = recordedLatest && Number.isFinite(targetRefreshedAt)
        && Date.parse(recordedLatest.actionAt || 0) < targetRefreshedAt
        ? null
        : recordedLatest;
      return {
        ...draft,
        attemptCount: Math.max(attemptCount(draft.attemptCount), attemptCount(latest?.attemptCount)),
        lastAttemptAt: draft.actionAt || latest?.actionAt || null,
      };
    })
    .filter((draft) => {
      if (draft.attemptCount >= maxAttempts) return false;
      if (draft.status === 'approved') return true;
      const attemptedAt = Date.parse(draft.lastAttemptAt || 0);
      return !Number.isFinite(attemptedAt) || nowMs - attemptedAt >= retryAfterMs;
    })
    .sort((left, right) => Date.parse(left.createdAt || 0) - Date.parse(right.createdAt || 0))
    .slice(0, Math.max(1, Number(limit) || 10));
}

export function nextCommentReplyAttempt(payloadAttemptCount = 0, existingAttemptCount = 0) {
  return Math.max(attemptCount(payloadAttemptCount), attemptCount(existingAttemptCount)) + 1;
}
