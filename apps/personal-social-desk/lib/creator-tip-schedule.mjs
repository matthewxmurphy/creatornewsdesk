export const CREATOR_TIP_SHARES_PER_DAY = 12;
export const CREATOR_TIP_TIME_ZONE = 'America/Los_Angeles';
export const CREATOR_TIP_REUSE_COOLDOWN_DAYS = 90;
export const CREATOR_TIP_LAUNCH_DATE = Object.freeze({ year: 2026, month: 7, day: 31 });
export const CREATOR_TIP_DAILY_SLOTS = Object.freeze([
  [4, 0],
  [5, 0],
  [6, 0],
  [7, 0],
  [8, 0],
  [9, 0],
  [10, 0],
  [11, 0],
  [12, 0],
  [13, 0],
  [14, 0],
  [18, 0],
].map(Object.freeze));
const AUGUST_FIRST_CATCHUP_FIRST_TIP = 13;
const AUGUST_FIRST_CATCHUP_LAST_TIP = 25;
const AUGUST_FIRST_CATCHUP_SLOTS = Object.freeze([
  [4, 0],
  [5, 0],
  [6, 0],
  [7, 0],
  [8, 0],
  [9, 0],
  [10, 0],
  [11, 0],
  [12, 0],
  [13, 0],
  [14, 0],
  [15, 0],
  [18, 0],
].map(Object.freeze));

const zonedPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CREATOR_TIP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function formatterParts(date) {
  return Object.fromEntries(
    zonedPartsFormatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
}

function zonedLocalTimeToIso({ year, month, day, hour, minute }) {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidate = localAsUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = formatterParts(new Date(candidate));
    const renderedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0);
    candidate -= renderedAsUtc - localAsUtc;
  }
  return new Date(candidate).toISOString();
}

export function creatorTipNumberFromItem(item = {}) {
  const campaignNumber = String(item?.campaign?.tipNumber || '').trim();
  if (/^\d+$/.test(campaignNumber)) return Number(campaignNumber);
  const source = String(item?.source || '');
  let match = source.match(/facebook-creator-tips:[^:]+:(?:cycle-\d+:)?tip-(\d+)/i);
  if (match) return Number(match[1]);
  match = String(item?.title || '').match(/(?:^|[^\w])tip\s*#?\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

export function creatorTipLaunchSchedule(tipNumber) {
  const numericTip = Number(tipNumber || 0);
  if (!Number.isInteger(numericTip) || numericTip < 1) return null;
  let dayOffset;
  let slot;
  if (numericTip < AUGUST_FIRST_CATCHUP_FIRST_TIP) {
    dayOffset = 0;
    slot = CREATOR_TIP_DAILY_SLOTS[numericTip - 1];
  } else if (numericTip <= AUGUST_FIRST_CATCHUP_LAST_TIP) {
    dayOffset = 1;
    slot = AUGUST_FIRST_CATCHUP_SLOTS[numericTip - AUGUST_FIRST_CATCHUP_FIRST_TIP];
  } else {
    const postCatchupIndex = numericTip - (AUGUST_FIRST_CATCHUP_LAST_TIP + 1);
    dayOffset = 2 + Math.floor(postCatchupIndex / CREATOR_TIP_SHARES_PER_DAY);
    slot = CREATOR_TIP_DAILY_SLOTS[postCatchupIndex % CREATOR_TIP_SHARES_PER_DAY];
  }
  const launchDay = new Date(Date.UTC(
    CREATOR_TIP_LAUNCH_DATE.year,
    CREATOR_TIP_LAUNCH_DATE.month - 1,
    CREATOR_TIP_LAUNCH_DATE.day + dayOffset,
  ));
  const [hour, minute] = slot;
  return zonedLocalTimeToIso({
    year: launchDay.getUTCFullYear(),
    month: launchDay.getUTCMonth() + 1,
    day: launchDay.getUTCDate(),
    hour,
    minute,
  });
}

export function isCreatorTipItem(item = {}) {
  return String(item?.campaign?.kind || '').trim() === 'facebook-creator-tips'
    && creatorTipNumberFromItem(item) > 0;
}

export function isRecurringPageDailySeriesItem(item = {}) {
  return item?.target === 'matthew-page'
    && Boolean(String(item?.recurringPageDailySeries?.seriesKey || '').trim());
}

function creatorTipCycle(item = {}) {
  const campaignCycle = Number(item?.campaign?.cycle || 0);
  if (campaignCycle > 0) return campaignCycle;
  const match = String(item?.source || '').match(/:cycle-(\d+):/i);
  return match ? Number(match[1]) : 1;
}

function creatorTipOriginalNumber(item = {}) {
  const original = Number(item?.campaign?.originalTipNumber || item?.campaign?.remappedFromTipNumber || 0);
  return Number.isInteger(original) && original > 0 ? original : creatorTipNumberFromItem(item);
}

function creatorTipContentFingerprint(item = {}) {
  return String(item?.body || item?.title || '')
    .normalize('NFKC')
    .replace(/Creator Tip\s*#?\s*\d+/gi, '')
    .replace(/—\s*Matthew Murphy/gi, '')
    .replace(/#\S+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLocaleLowerCase();
}

function creatorTipActivityTime(item = {}) {
  const times = [
    item?.facebookHandoff?.publishedAt,
    item?.facebookHandoff?.confirmedAt,
    item?.facebookHandoff?.scheduledFor,
    item?.dispatchedAt,
    item?.lastDispatchAttemptAt,
    item?.scheduledFor,
    item?.campaign?.remappedAt,
    item?.updatedAt,
    item?.createdAt,
  ].map((value) => Date.parse(value || '')).filter(Number.isFinite);
  return times.length ? Math.max(...times) : null;
}

export function creatorTipReuseGate(queue = {}, item = {}, now = new Date()) {
  const tipNumber = creatorTipNumberFromItem(item);
  if (item?.target !== 'matthew-page' || item?.format === 'story' || !isCreatorTipItem(item)) {
    return { allowed: true, tipNumber: tipNumber || null };
  }
  if (isRecurringPageDailySeriesItem(item)) {
    return { allowed: true, tipNumber, recurringPageDailySeries: true };
  }
  const originalTipNumber = creatorTipOriginalNumber(item);
  const fingerprint = creatorTipContentFingerprint(item);
  const remapped = originalTipNumber !== tipNumber
    || Boolean(String(item?.campaign?.remappedFromTipNumber || item?.campaign?.originalTipNumber || '').trim());
  const prior = (Array.isArray(queue?.items) ? queue.items : [])
    .filter((candidate) => candidate !== item && candidate?.format !== 'story' && isCreatorTipItem(candidate))
    .filter((candidate) => !['rejected', 'removed'].includes(String(candidate?.status || '')))
    .filter((candidate) => {
      const candidateTipNumber = creatorTipNumberFromItem(candidate);
      if (candidateTipNumber === tipNumber) return false;
      return creatorTipOriginalNumber(candidate) === originalTipNumber
        || (fingerprint && creatorTipContentFingerprint(candidate) === fingerprint);
    })
    .map((candidate) => ({ candidate, time: creatorTipActivityTime(candidate) }))
    .filter(({ time }) => time !== null)
    .sort((left, right) => right.time - left.time)[0];
  if (!remapped && !prior) return { allowed: true, tipNumber, originalTipNumber };

  const referenceTime = prior?.time ?? creatorTipActivityTime(item) ?? now.valueOf();
  const cooldownUntil = referenceTime + CREATOR_TIP_REUSE_COOLDOWN_DAYS * 86400000;
  if (now.valueOf() >= cooldownUntil) {
    return { allowed: true, tipNumber, originalTipNumber, cooldownUntil: new Date(cooldownUntil).toISOString() };
  }
  return {
    allowed: false,
    tipNumber,
    originalTipNumber,
    cooldownUntil: new Date(cooldownUntil).toISOString(),
    conflictingDraftId: prior?.candidate?.id || '',
    reason: `Creator Tip #${tipNumber} repeats Creator Tip #${originalTipNumber}. The 90-day cross-format reuse lock lasts until ${new Date(cooldownUntil).toISOString()}.`,
  };
}

export function nextUnconfirmedCreatorTipNumber(queue = {}) {
  const confirmed = new Set((Array.isArray(queue?.items) ? queue.items : [])
    .filter((item) => item?.target === 'matthew-page')
    .filter((item) => item?.format !== 'story' && isCreatorTipItem(item))
    .filter((item) => !isRecurringPageDailySeriesItem(item))
    .filter((item) => hasVerifiedFacebookScheduleProof(item))
    .map((item) => creatorTipNumberFromItem(item)));
  const confirmedThrough = Number(queue?.creatorTipPageProgress?.confirmedThroughTipNumber || 0);
  let next = Math.max(0, confirmedThrough) + 1;
  while (confirmed.has(next)) next += 1;
  return next;
}

export function creatorTipSequenceGate(queue = {}, item = {}) {
  const tipNumber = creatorTipNumberFromItem(item);
  if (item?.target !== 'matthew-page' || item?.format === 'story' || !isCreatorTipItem(item)) {
    return { allowed: true, expectedTipNumber: null, tipNumber: tipNumber || null };
  }
  if (isRecurringPageDailySeriesItem(item)) {
    return { allowed: true, expectedTipNumber: null, tipNumber, recurringPageDailySeries: true };
  }
  if (hasVerifiedFacebookScheduleProof(item)) {
    return { allowed: true, expectedTipNumber: tipNumber, tipNumber, alreadyConfirmed: true };
  }
  const reuseGate = creatorTipReuseGate(queue, item, new Date());
  if (!reuseGate.allowed) return { ...reuseGate, expectedTipNumber: nextUnconfirmedCreatorTipNumber(queue) };
  const expectedTipNumber = nextUnconfirmedCreatorTipNumber(queue);
  const priorEditionConfirmed = tipNumber < expectedTipNumber
    && (Array.isArray(queue?.items) ? queue.items : []).some((candidate) => (
      candidate !== item
      && candidate?.target === 'matthew-page'
      && candidate?.format !== 'story'
      && creatorTipNumberFromItem(candidate) === tipNumber
      && hasVerifiedFacebookScheduleProof(candidate)
    ));
  const allowed = tipNumber === expectedTipNumber || priorEditionConfirmed;
  return {
    allowed,
    expectedTipNumber,
    tipNumber,
    ...(priorEditionConfirmed ? { laterEdition: true } : {}),
    reason: allowed
      ? ''
      : `Creator Tip #${tipNumber} is waiting for Creator Tip #${expectedTipNumber} to receive Facebook scheduling proof first.`,
  };
}

export function hasVerifiedFacebookScheduleProof(item = {}) {
  if (item?.status === 'published') return true;
  if (item?.target !== 'matthew-page') return item?.facebookHandoff?.facebookConfirmed === true;
  const graphId = String(item?.facebookHandoff?.graphId || '').trim();
  const sourceUrl = String(item?.facebookHandoff?.sourceUrl || '').trim();
  const observedInScheduledContent = item?.facebookHandoff?.state === 'scheduled-content-observed'
    && Boolean(item?.facebookHandoff?.scheduledContentObservedAt);
  const exactPostUrl = /^https:\/\/www\.facebook\.com\/(?:\d{8,}|[^/]+\/posts\/[^/?#]+|photo\/\?fbid=\d+)/i.test(sourceUrl)
    && !sourceUrl.includes('/professional_dashboard/');
  return item?.facebookHandoff?.facebookConfirmed === true && Boolean(graphId || exactPostUrl || observedInScheduledContent);
}

function creatorTipRecoverySchedule(now, index) {
  const parts = formatterParts(now);
  const localDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1 + Math.floor(index / CREATOR_TIP_SHARES_PER_DAY)));
  const [hour, minute] = CREATOR_TIP_DAILY_SLOTS[index % CREATOR_TIP_SHARES_PER_DAY];
  return zonedLocalTimeToIso({
    year: localDay.getUTCFullYear(),
    month: localDay.getUTCMonth() + 1,
    day: localDay.getUTCDate(),
    hour,
    minute,
  });
}

function creatorTipScheduleAfter(anchor, index) {
  const anchorDate = anchor instanceof Date ? anchor : new Date(anchor);
  if (!Number.isFinite(anchorDate.valueOf()) || !Number.isInteger(index) || index < 0) return null;
  const parts = formatterParts(anchorDate);
  let remaining = index;
  for (let dayOffset = 0; dayOffset < 3660; dayOffset += 1) {
    const localDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset));
    for (const [hour, minute] of CREATOR_TIP_DAILY_SLOTS) {
      const candidate = zonedLocalTimeToIso({
        year: localDay.getUTCFullYear(),
        month: localDay.getUTCMonth() + 1,
        day: localDay.getUTCDate(),
        hour,
        minute,
      });
      if (Date.parse(candidate) <= anchorDate.valueOf()) continue;
      if (remaining === 0) return candidate;
      remaining -= 1;
    }
  }
  return null;
}

export function creatorTipContinuationSchedule(queue = {}, tipNumber) {
  const numericTip = Number(tipNumber || 0);
  if (!Number.isInteger(numericTip) || numericTip < 1) return null;
  const expectedTipNumber = nextUnconfirmedCreatorTipNumber(queue);
  if (numericTip < expectedTipNumber) return null;
  const previousTipNumber = expectedTipNumber - 1;
  const previousSchedules = (Array.isArray(queue?.items) ? queue.items : [])
    .filter((item) => item?.target === 'matthew-page' && item?.format !== 'story')
    .filter((item) => creatorTipNumberFromItem(item) === previousTipNumber)
    .filter((item) => hasVerifiedFacebookScheduleProof(item))
    .map((item) => item?.scheduledFor)
    .filter((value) => Number.isFinite(Date.parse(value || 0)))
    .sort((left, right) => Date.parse(left) - Date.parse(right));
  if (!previousSchedules.length) return creatorTipLaunchSchedule(numericTip);
  return creatorTipScheduleAfter(previousSchedules[0], numericTip - expectedTipNumber);
}

function creatorTipSort(left, right) {
  const tipDifference = creatorTipNumberFromItem(left) - creatorTipNumberFromItem(right);
  if (tipDifference) return tipDifference;
  const cycleDifference = creatorTipCycle(left) - creatorTipCycle(right);
  if (cycleDifference) return cycleDifference;
  return String(left?.id || '').localeCompare(String(right?.id || ''));
}

export function reflowApprovedCreatorTipSchedule(queue = {}, now = new Date()) {
  const items = Array.isArray(queue?.items) ? queue.items : [];
  const expectedTipNumber = nextUnconfirmedCreatorTipNumber(queue);
  const sortedBacklog = items
    .filter((item) => item?.target === 'matthew-page')
    .filter((item) => item?.format !== 'story' && isCreatorTipItem(item))
    .filter((item) => creatorTipNumberFromItem(item) >= expectedTipNumber)
    .filter((item) => creatorTipReuseGate(queue, item, now).allowed)
    .filter((item) => Boolean(item?.mediaApproval?.hiddenAt))
    .filter((item) => !hasVerifiedFacebookScheduleProof(item))
    .filter((item) => !['rejected', 'removed'].includes(item?.status))
    .sort(creatorTipSort);
  if (!sortedBacklog.length) return false;

  const pageBacklog = [];
  let nextTipNumber = expectedTipNumber;
  let changed = false;
  for (const item of sortedBacklog) {
    const tipNumber = creatorTipNumberFromItem(item);
    if (tipNumber < nextTipNumber) continue;
    if (tipNumber === nextTipNumber) {
      pageBacklog.push(item);
      nextTipNumber += 1;
      continue;
    }
    const blockedReason = `Waiting for Creator Tip #${nextTipNumber} to be approved and receive Facebook scheduling proof.`;
    if (item.schedulingBlockedReason !== blockedReason) {
      item.schedulingBlockedReason = blockedReason;
      changed = true;
    }
  }
  if (!pageBacklog.length) return changed;

  const nowDate = now instanceof Date ? now : new Date(now);
  const hasMissedSlot = pageBacklog.some((item) => {
    const intendedTime = Date.parse(item?.intendedScheduledFor || creatorTipLaunchSchedule(creatorTipNumberFromItem(item)) || 0);
    return Number.isFinite(intendedTime) && intendedTime <= nowDate.valueOf();
  });
  if (!hasMissedSlot) return false;

  const reflowedAt = Number.isFinite(nowDate.valueOf()) ? nowDate.toISOString() : new Date().toISOString();
  const occupied = new Set(items
    .filter((item) => item?.target === 'matthew-page' && item?.format !== 'story')
    .filter((item) => hasVerifiedFacebookScheduleProof(item))
    .map((item) => item?.scheduledFor)
    .filter((value) => Date.parse(value || 0) > nowDate.valueOf()));
  let slotIndex = 0;
  pageBacklog.forEach((item) => {
    let scheduledFor = creatorTipRecoverySchedule(nowDate, slotIndex);
    while (occupied.has(scheduledFor)) {
      slotIndex += 1;
      scheduledFor = creatorTipRecoverySchedule(nowDate, slotIndex);
    }
    const sequenceIndex = slotIndex;
    occupied.add(scheduledFor);
    slotIndex += 1;
    const existingRecovery = item.scheduleRecovery || {};
    if (item.scheduledFor !== scheduledFor) {
      item.scheduledFor = scheduledFor;
      changed = true;
    }
    if (item.status !== 'approved' && item.status !== 'scheduled') {
      item.status = 'approved';
      changed = true;
    }
    if (item.dispatchError) {
      item.dispatchError = '';
      changed = true;
    }
    if (item.schedulingBlockedReason) {
      delete item.schedulingBlockedReason;
      changed = true;
    }
    if (existingRecovery.scheduledFor !== scheduledFor || existingRecovery.sequenceIndex !== sequenceIndex) {
      item.scheduleRecovery = {
        reason: 'approved-backlog-reflow',
        originalIntendedScheduledFor: item.intendedScheduledFor || null,
        scheduledFor,
        sequenceIndex,
        reflowedAt,
      };
      changed = true;
    }
  });
  return changed;
}

export function normalizeCreatorTipScheduling(queue = {}, now = new Date()) {
  const items = Array.isArray(queue?.items) ? queue.items : [];
  const creatorTips = items.filter((item) => isCreatorTipItem(item)
    && item?.format !== 'story'
    && !isRecurringPageDailySeriesItem(item));
  if (!creatorTips.length) return false;
  const nowDate = now instanceof Date ? now : new Date(now);
  const approvedAt = Number.isFinite(nowDate.valueOf()) ? nowDate.toISOString() : new Date().toISOString();
  const expectedTipNumber = nextUnconfirmedCreatorTipNumber(queue);
  let changed = false;

  for (const item of creatorTips) {
    const tipNumber = creatorTipNumberFromItem(item);
    const facebookConfirmed = hasVerifiedFacebookScheduleProof(item);
    const reuseGate = creatorTipReuseGate(queue, item, nowDate);
    if (!facebookConfirmed && !reuseGate.allowed) {
      if (item.scheduledFor) {
        item.scheduledFor = null;
        changed = true;
      }
      if (item.schedulingBlockedReason !== reuseGate.reason) {
        item.schedulingBlockedReason = reuseGate.reason;
        changed = true;
      }
      continue;
    }
    const currentSequenceCandidate = tipNumber >= expectedTipNumber;
    const continuationSchedule = !facebookConfirmed && currentSequenceCandidate
      ? creatorTipContinuationSchedule(queue, tipNumber)
      : null;
    const preservedEditionSchedule = !continuationSchedule && creatorTipCycle(item) > 1
      ? item.intendedScheduledFor || item.scheduledFor
      : null;
    const intendedScheduledFor = continuationSchedule || preservedEditionSchedule || creatorTipLaunchSchedule(tipNumber);
    if (item.intendedScheduledFor !== intendedScheduledFor) {
      item.intendedScheduledFor = intendedScheduledFor;
      changed = true;
    }

    const approved = Boolean(item?.mediaApproval?.hiddenAt);
    if (approved) {
      if (!facebookConfirmed && !item.scheduleRecovery && item.scheduledFor !== intendedScheduledFor) {
        item.scheduledFor = intendedScheduledFor;
        changed = true;
      }
      if (item.status === 'draft') {
        item.status = 'approved';
        item.approvedAt ||= approvedAt;
        changed = true;
      }
      const intendedTime = Date.parse(intendedScheduledFor || 0);
      const missed = Number.isFinite(intendedTime) && intendedTime <= nowDate.valueOf() && !facebookConfirmed && !item.scheduleRecovery;
      const blockedReason = missed
        ? `The original sequence slot (${intendedScheduledFor}) has passed. Approval did not move this tip; choose a recovery slot.`
        : '';
      const sequenceBlockActive = /^Waiting for Creator Tip #\d+/i.test(String(item.schedulingBlockedReason || ''));
      if (blockedReason && !sequenceBlockActive && item.schedulingBlockedReason !== blockedReason) {
        item.schedulingBlockedReason = blockedReason;
        changed = true;
      } else if (!blockedReason && item.schedulingBlockedReason && !sequenceBlockActive) {
        delete item.schedulingBlockedReason;
        changed = true;
      }
      continue;
    }

    if (!facebookConfirmed && item.scheduledFor) {
      item.scheduledFor = null;
      changed = true;
    }
    if (!facebookConfirmed && (item.status === 'approved' || item.status === 'scheduled')) {
      item.status = 'draft';
      changed = true;
    }
    if (item.schedulingBlockedReason) {
      delete item.schedulingBlockedReason;
      changed = true;
    }
  }

  return reflowApprovedCreatorTipSchedule(queue, nowDate) || changed;
}
