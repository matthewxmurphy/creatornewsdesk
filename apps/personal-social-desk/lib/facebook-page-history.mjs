function messageText(post = {}) {
  return String(post?.message || '').replace(/\r\n?/g, '\n').trim();
}

function postIdentity(post = {}, index = 0) {
  return String(post?.id || post?.permalink_url || `${post?.created_time || 'unknown'}:${index}`).trim();
}

export function isOfficialCreatorTipRecap(post = {}) {
  return /^CREATOR TIPS RECAP\s*[·:-]/i.test(messageText(post));
}

export function isExtraCreatorTipRecap(post = {}) {
  return /^CREATOR TIPS\s+\d+\s*[-–]\s*\d+\s+RECAP\b/i.test(messageText(post));
}

export function summarizeFacebookPageHistory(posts = [], {
  pageId = '',
  observedAt = new Date().toISOString(),
} = {}) {
  const unique = [];
  const seen = new Set();
  for (const [index, post] of (Array.isArray(posts) ? posts : []).entries()) {
    const identity = postIdentity(post, index);
    if (seen.has(identity)) continue;
    seen.add(identity);
    unique.push(post);
  }
  const officialRecapPosts = unique.filter(isOfficialCreatorTipRecap).length;
  const extraRecapPosts = unique.filter(isExtraCreatorTipRecap).length;
  const createdTimes = unique
    .map((post) => Date.parse(post?.created_time || 0))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  return {
    pageId: String(pageId || ''),
    source: 'meta-published-posts',
    observedAt,
    publishedPosts: unique.length,
    officialCreatorTipRecapPosts: officialRecapPosts,
    extraCreatorTipRecapPosts: extraRecapPosts,
    creatorTipRecapPosts: officialRecapPosts + extraRecapPosts,
    oldestPublishedAt: createdTimes.length ? new Date(createdTimes[0]).toISOString() : null,
    newestPublishedAt: createdTimes.length ? new Date(createdTimes.at(-1)).toISOString() : null,
  };
}
