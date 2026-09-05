export const PERSONAL_ARCHIVE_TARGET = 'matthew-profile';
export const PERSONAL_ARCHIVE_ZONE = 'America/Chicago';

function dayKey(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PERSONAL_ARCHIVE_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function evening(day) {
  const guess = Date.parse(`${day}T18:30:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: PERSONAL_ARCHIVE_ZONE, timeZoneName: 'longOffset' }).formatToParts(new Date(guess));
  const offset = parts.find((part) => part.type === 'timeZoneName').value.replace('GMT', '') || '+00:00';
  return new Date(`${day}T18:30:00${offset}`).toISOString();
}

export function buildPersonalArchivePlan({ library = {}, plan = {}, occupied = [], now = new Date() } = {}) {
  const items = [...(plan.items || [])];
  const used = new Set(items.map((item) => item.candidateId));
  const active = items.filter((item) => item.state === 'needs-review');
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 2);
  const candidates = (library.candidates || []).filter((candidate) =>
    candidate.kind === 'post' && candidate.review?.state === 'shortlist'
    && candidate.review?.ownership === 'authored-text'
    && Date.parse(candidate.originalAt) < cutoff.getTime()
    && (candidate.destinations || []).some((lane) => (lane.id || lane) === 'matthew-personal')
    && candidate.remix?.state === 'generated' && candidate.remix?.title
    && String(candidate.remix?.caption || '').trim().length >= 40
    && candidate.remix?.provider !== 'editorial-template'
    && !(candidate.flags || []).some((flag) => /rights|privacy|bystander/i.test(flag))
    && !used.has(candidate.id)
  ).sort((a, b) => {
    const score = (entry) => entry.engagement?.evidenceState === 'facebook-verified' ? Number(entry.engagement.total || 0) : -1;
    return score(b) - score(a) || Number(b.fitScore || 0) - Number(a.fitScore || 0) || a.id.localeCompare(b.id);
  });
  const occupiedDays = new Set([...active.map((item) => item.proposedFor), ...occupied
    .filter((item) => item.target === PERSONAL_ARCHIVE_TARGET && item.status !== 'rejected')
    .map((item) => item.scheduledFor)].filter((value) => Number.isFinite(Date.parse(value))).map(dayKey));
  const created = [];
  const firstDay = new Date(`${dayKey(now)}T12:00:00Z`);
  for (let index = 1; index <= 14 && active.length + created.length < 7 && candidates.length; index += 1) {
    const date = new Date(firstDay);
    date.setUTCDate(date.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    if (occupiedDays.has(day)) continue;
    const candidate = candidates.shift();
    used.add(candidate.id);
    const item = {
      id: `personal-archive-${candidate.id}`, candidateId: candidate.id,
      target: PERSONAL_ARCHIVE_TARGET, targetLabel: 'Matthew Murphy personal profile',
      state: 'needs-review', proposedFor: evening(day), timeZone: PERSONAL_ARCHIVE_ZONE,
      title: candidate.remix.title, caption: candidate.remix.caption,
      originalAt: candidate.originalAt, originalCaption: candidate.originalCaption,
      editPlan: candidate.remix.editPlan || [], rightsChecklist: candidate.remix.rightsChecklist || [],
      createdAt: now.toISOString(), facebookConfirmed: false,
    };
    created.push(item);
    occupiedDays.add(day);
    // A malformed library must not create the same source twice in one pass.
    for (let n = candidates.length - 1; n >= 0; n -= 1) if (used.has(candidates[n].id)) candidates.splice(n, 1);
  }
  return { schema: 'cph-personal-archive-plan/v1', ...plan,
    target: PERSONAL_ARCHIVE_TARGET, timeZone: PERSONAL_ARCHIVE_ZONE,
    policy: { approvalRequired: true, autoPublish: false, autoSchedule: false, deleteOriginal: false },
    updatedAt: created.length ? now.toISOString() : plan.updatedAt || null,
    items: [...items, ...created], created: created.length,
  };
}
