export const DEFAULT_AI_NIGHTLY_TIME_ZONE = 'America/Los_Angeles';
export const DEFAULT_AI_NIGHTLY_SLOTS = Object.freeze(['21:00', '23:00', '01:00', '03:00']);
export const MAX_AI_NIGHTLY_SLOTS = 5;

const LOCAL_SOURCE_KINDS = new Set(['local-draft', 'local-candidate']);
const FACEBOOK_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
]);

function requiredText(value, label) {
  const text = String(value || '').trim();
  if (!text) throw new TypeError(`${label} is required.`);
  return text;
}

function explicitApproval(value = {}) {
  if (value === true) return { approved: true, approvedAt: null, approvedBy: '' };
  if (!value || typeof value !== 'object') return { approved: false, approvedAt: null, approvedBy: '' };
  return {
    approved: value.approved === true,
    approvedAt: value.approvedAt || null,
    approvedBy: String(value.approvedBy || '').trim(),
  };
}

function normalizeTimeZone(value) {
  const timeZone = String(value || DEFAULT_AI_NIGHTLY_TIME_ZONE).trim();
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
  } catch {
    throw new TypeError(`Invalid IANA time zone: ${timeZone}`);
  }
  return timeZone;
}

function normalizeSlot(value) {
  const raw = typeof value === 'object' && value !== null
    ? `${value.hour ?? ''}:${value.minute ?? 0}`
    : String(value || '').trim();
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(raw);
  if (!match) throw new TypeError(`Invalid nightly slot: ${raw || '(empty)'}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new TypeError(`Invalid nightly slot: ${raw}`);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function nightOrder(slot) {
  const [hour, minute] = slot.split(':').map(Number);
  return ((hour < 12 ? hour + 24 : hour) * 60) + minute;
}

function dateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) throw new TypeError('nightDate must use YYYY-MM-DD.');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== match[0]) throw new TypeError('nightDate must be a real calendar date.');
  return match[0];
}

function addUtcDays(value, days) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function timeZoneOffsetMs(date, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - date.getTime();
}

function zonedDateTime(date, slot, timeZone) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = slot.split(':').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const first = new Date(guess.getTime() - timeZoneOffsetMs(guess, timeZone));
  return new Date(guess.getTime() - timeZoneOffsetMs(first, timeZone));
}

function canonicalFacebookUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'https:' || !FACEBOOK_HOSTS.has(parsed.hostname.toLowerCase())) return '';
  parsed.hostname = 'www.facebook.com';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function facebookPostId(value) {
  const text = String(value || '').trim();
  return /^[A-Za-z0-9_.:-]{3,200}$/.test(text) ? text : '';
}

function rejectionReason(candidate) {
  if (candidate.thirdPartyTarget) return 'third-party-target';
  if (!candidate.local) return 'not-local';
  if (!candidate.ownedDestination) return 'destination-not-owned';
  if (!candidate.postApproval.approved) return 'post-approval-required';
  if (candidate.alreadyAssigned) return 'already-assigned';
  return '';
}

export function normalizeAiNightlyLane(value = {}) {
  const timeZone = normalizeTimeZone(value.timeZone);
  const suppliedSlots = value.slots == null ? DEFAULT_AI_NIGHTLY_SLOTS : value.slots;
  if (!Array.isArray(suppliedSlots) || suppliedSlots.length === 0) {
    throw new TypeError('At least one nightly slot is required.');
  }
  if (suppliedSlots.length > MAX_AI_NIGHTLY_SLOTS) {
    throw new RangeError(`A nightly lane supports at most ${MAX_AI_NIGHTLY_SLOTS} slots.`);
  }
  const slots = [...new Set(suppliedSlots.map(normalizeSlot))].sort((left, right) => nightOrder(left) - nightOrder(right));
  if (slots.length !== suppliedSlots.length) throw new TypeError('Nightly slots must be unique.');
  return Object.freeze({
    timeZone,
    slots: Object.freeze(slots),
    postApprovalRequired: true,
    firstCommentApprovalRequired: true,
    thirdPartyEngagementAllowed: false,
  });
}

export function normalizeAiNightlyCandidate(value = {}) {
  const id = requiredText(value.id || value.draftId || value.candidateId, 'Candidate id');
  const sourceKind = String(value.sourceKind || value.kind || '').trim().toLowerCase();
  const ownership = String(value.destination?.ownership || value.destinationOwnership || '').trim().toLowerCase();
  const thirdPartyTarget = value.thirdPartyTarget === true
    || value.thirdPartyPost === true
    || ownership === 'third-party';
  return {
    id,
    title: String(value.title || '').trim(),
    body: String(value.body || '').trim(),
    sourceKind,
    local: value.localDraft === true || value.localCandidate === true || LOCAL_SOURCE_KINDS.has(sourceKind),
    ownedDestination: value.ownedDestination === true || ownership === 'owned',
    thirdPartyTarget,
    postApproval: explicitApproval(value.postApproval ?? value.approval),
    firstComment: {
      text: String(value.firstComment?.text || '').trim(),
      approval: explicitApproval(value.firstComment?.approval),
    },
    priority: Number.isFinite(Number(value.priority)) ? Number(value.priority) : 0,
    createdAt: value.createdAt || null,
    alreadyAssigned: Boolean(value.alreadyAssigned || value.scheduledFor || value.slot),
    facebookProof: normalizeFacebookPostProof(value.facebookProof || value.facebookHandoff || {}),
  };
}

export function normalizeFacebookPostProof(value = {}) {
  return {
    verified: value.verified === true || value.facebookVerified === true,
    postId: facebookPostId(value.postId || value.facebookPostId || value.graphId),
    postUrl: canonicalFacebookUrl(value.postUrl || value.facebookUrl || value.url),
    verifiedAt: value.verifiedAt || value.confirmedAt || null,
  };
}

export function assignAiNightlySlots({ nightDate, candidates = [], lane = {}, occupied = [] } = {}) {
  const normalizedLane = normalizeAiNightlyLane(lane);
  const normalizedDate = dateKey(nightDate);
  if (!Array.isArray(candidates)) throw new TypeError('candidates must be an array.');
  if (!Array.isArray(occupied)) throw new TypeError('occupied must be an array.');

  const occupiedSlots = new Set(occupied.map((value) => normalizeSlot(value?.slot || value)));
  const availableSlots = normalizedLane.slots.filter((slot) => !occupiedSlots.has(slot));
  const normalizedCandidates = candidates.map(normalizeAiNightlyCandidate);
  const eligible = normalizedCandidates.filter((candidate) => !rejectionReason(candidate)).sort((left, right) => (
    right.priority - left.priority
    || (Date.parse(left.createdAt || '') || 0) - (Date.parse(right.createdAt || '') || 0)
    || left.id.localeCompare(right.id)
  ));

  const assignments = eligible.slice(0, availableSlots.length).map((candidate, index) => {
    const slot = availableSlots[index];
    const [hour] = slot.split(':').map(Number);
    const scheduledDate = hour < 12 ? addUtcDays(normalizedDate, 1) : normalizedDate;
    return {
      candidateId: candidate.id,
      slot,
      scheduledFor: zonedDateTime(scheduledDate, slot, normalizedLane.timeZone).toISOString(),
      timeZone: normalizedLane.timeZone,
      postApproval: candidate.postApproval,
      firstCommentApproval: candidate.firstComment.approval,
      dispatchReady: false,
      dispatchBlockedReason: 'verified-facebook-post-proof-required',
    };
  });

  const assignedIds = new Set(assignments.map((assignment) => assignment.candidateId));
  return {
    lane: normalizedLane,
    nightDate: normalizedDate,
    assignments,
    rejected: normalizedCandidates.filter((candidate) => rejectionReason(candidate)).map((candidate) => ({
      candidateId: candidate.id,
      reason: rejectionReason(candidate),
    })),
    unassigned: eligible.filter((candidate) => !assignedIds.has(candidate.id)).map((candidate) => ({
      candidateId: candidate.id,
      reason: 'no-open-slot',
    })),
  };
}

export function assertAiPostDispatchAllowed(value = {}) {
  const candidate = normalizeAiNightlyCandidate(value.candidate || value);
  const reason = rejectionReason({ ...candidate, alreadyAssigned: false });
  if (reason) throw new Error(`AI post dispatch rejected: ${reason}.`);
  const proof = normalizeFacebookPostProof(value.facebookProof || candidate.facebookProof);
  if (!proof.verified || (!proof.postId && !proof.postUrl)) {
    throw new Error('AI post dispatch rejected: verified Facebook post id or URL required.');
  }
  return { candidate, facebookProof: proof, allowed: true };
}

export function assertAiFirstCommentPostingAllowed(value = {}) {
  const dispatch = assertAiPostDispatchAllowed(value);
  const firstComment = value.firstComment || dispatch.candidate.firstComment;
  const text = String(firstComment?.text || '').trim();
  const approval = explicitApproval(firstComment?.approval);
  if (!text) throw new Error('AI first comment rejected: comment text is required.');
  if (!approval.approved) throw new Error('AI first comment rejected: explicit first-comment approval required.');
  return {
    ...dispatch,
    firstComment: { text, approval },
  };
}

