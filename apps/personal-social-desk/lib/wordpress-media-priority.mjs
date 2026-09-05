function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function priorityReason(site) {
  const days = Number.isFinite(site.runwayDays) ? `${site.runwayDays} day${site.runwayDays === 1 ? '' : 's'}` : 'no measured';
  const shortage = site.targetShortfall > 0
    ? ` and ${site.targetShortfall.toLocaleString()} images short of its ${site.targetWindowDays}-day target`
    : '';
  return `${days} of image-backed runway${shortage}`;
}

export function rankWordpressMediaSites(inventorySites = [], mediaSites = []) {
  const mediaById = new Map((Array.isArray(mediaSites) ? mediaSites : []).map((site) => [site.id, site]));
  return (Array.isArray(inventorySites) ? inventorySites : [])
    .map((inventory) => {
      const { missingFeatured: _missingFeatured, ...inventorySummary } = inventory || {};
      const media = mediaById.get(inventory.id) || {};
      const targetWindowDays = Math.max(1, finiteNumber(inventory.targetWindowDays, 45));
      const targetShares = Math.max(0, finiteNumber(inventory.targetShares));
      const shareReady = Math.max(0, finiteNumber(inventory.shareReady));
      const runwayValue = Number(inventory.runwayDays);
      const runwayDays = Number.isFinite(runwayValue) ? Math.max(0, runwayValue) : Number.POSITIVE_INFINITY;
      const workload = {
        total: Math.max(0, finiteNumber(media?.workload?.total)),
        missing: Math.max(0, finiteNumber(media?.workload?.missing)),
        redo: Math.max(0, finiteNumber(media?.workload?.redo)),
        providerReplace: Math.max(0, finiteNumber(media?.workload?.providerReplace)),
        providerReview: Math.max(0, finiteNumber(media?.workload?.providerReview)),
      };
      const targetShortfall = Math.max(0, targetShares - shareReady);
      const eligible = media.connected === true && !media.error && workload.total > 0;
      return {
        ...inventorySummary,
        connected: media.connected === true,
        stale: media.stale === true,
        workload,
        targetWindowDays,
        targetShares,
        targetShortfall,
        runwayDays,
        eligible,
        urgency: runwayDays < 7 ? 'critical' : runwayDays < 14 ? 'high' : runwayDays < targetWindowDays ? 'building' : 'healthy',
      };
    })
    .filter((site) => site.eligible)
    .sort((left, right) => (
      left.runwayDays - right.runwayDays
      || right.targetShortfall - left.targetShortfall
      || right.workload.total - left.workload.total
      || String(left.name || left.id).localeCompare(String(right.name || right.id))
    ))
    .map((site, index) => ({
      ...site,
      rank: index + 1,
      reason: priorityReason(site),
    }));
}

export function wordpressMediaPrioritySummary(inventorySites = [], mediaSites = [], options = {}) {
  const ranked = rankWordpressMediaSites(inventorySites, mediaSites);
  const pollMinutes = Math.max(15, finiteNumber(options.pollMinutes, 45));
  const batchSize = Math.max(1, Math.min(10, finiteNumber(options.batchSize, 3)));
  return {
    selected: ranked[0] || null,
    ranked,
    pollMinutes,
    batchSize,
    policy: 'shortest-image-backed-runway-first',
  };
}

