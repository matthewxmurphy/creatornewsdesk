const STATUS_PATH = '/professional_dashboard/status';

function clean(value, limit = 240) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function safeStatusUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.hostname !== 'www.facebook.com' || !url.pathname.startsWith(STATUS_PATH)) return '';
    url.protocol = 'https:';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
}

function keyFor(value) {
  return clean(value, 160).toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeWeekLabel(value) {
  const label = clean(value, 120);
  const match = label.match(/(?:Week of\s+)?([A-Za-z]{3,9}\s+\d{1,2})\s*[-–]\s*([A-Za-z]{3,9}\s+\d{1,2})/i);
  return match ? `Week of ${match[1]} - ${match[2]}` : label;
}

const ACHIEVEMENT_GUIDANCE = {
  'level-3': 'Complete Facebook\'s current Level 3 requirements. Progress is verified only from the live Status page.',
  '1k-views': 'Reach 1,000 Facebook-verified views. Prioritize approved original Reels and monitor the live counter.',
  wordsmith: 'Publish an approved original Reel with readable on-screen text.',
  remixer: 'Publish an approved original remix that adds Matthew\'s commentary or reaction.',
};

function achievementDescription(label, description, complete = false) {
  if (complete) return 'Earned on Facebook.';
  const value = clean(description, 500);
  const polluted = /next achievements|earned achievements|completion is optional/i.test(value);
  return (!value || polluted ? ACHIEVEMENT_GUIDANCE[keyFor(label)] : value)
    || 'Open Facebook Status to review the current achievement requirement.';
}

function normalizeTask(task = {}) {
  const label = clean(task.label, 180);
  if (!label) return null;
  const target = integer(task.target);
  const complete = task.complete === true || /\bcompleted\b/i.test(String(task.sourceText || ''));
  const current = complete && target ? target : Math.min(integer(task.current), target || Number.MAX_SAFE_INTEGER);
  return {
    key: clean(task.key, 100) || keyFor(label),
    label,
    current,
    target,
    complete: complete || Boolean(target && current >= target),
    sourceText: clean(task.sourceText, 360),
  };
}

function normalizeAchievement(achievement = {}) {
  const label = clean(achievement.label, 120);
  if (!label) return null;
  const target = integer(achievement.target);
  const current = Math.min(integer(achievement.current), target || Number.MAX_SAFE_INTEGER);
  const complete = achievement.complete === true || Boolean(target && current >= target);
  return {
    key: clean(achievement.key, 100) || keyFor(label),
    label,
    description: achievementDescription(label, achievement.description, complete),
    current,
    target,
    complete,
  };
}

export function normalizeProfessionalAchievements(achievements = []) {
  return (Array.isArray(achievements) ? achievements : []).map(normalizeAchievement).filter(Boolean);
}

function mergeRows(previous = [], incoming = [], normalizer) {
  const rows = new Map((Array.isArray(previous) ? previous : []).map((row) => [row.key || keyFor(row.label), row]));
  for (const raw of Array.isArray(incoming) ? incoming : []) {
    const row = normalizer(raw);
    if (!row) continue;
    const old = rows.get(row.key) || {};
    rows.set(row.key, {
      ...old,
      ...row,
      description: row.description || old.description || undefined,
      sourceText: row.sourceText || old.sourceText || undefined,
    });
  }
  return [...rows.values()];
}

export function mergeProfessionalGoalsCapture(ledger = {}, capture = {}, capturedAt = new Date().toISOString()) {
  const sourceUrl = safeStatusUrl(capture.sourceUrl);
  if (!sourceUrl) return { ledger, accepted: false };
  const tasks = capture.replaceTasks === true
    ? (Array.isArray(capture.tasks) ? capture.tasks : []).map(normalizeTask).filter(Boolean)
    : mergeRows(ledger.tasks, capture.tasks, normalizeTask);
  const achievements = capture.replaceAchievements === true
    ? normalizeProfessionalAchievements(capture.achievements)
    : mergeRows(ledger.achievements, capture.achievements, normalizeAchievement);
  const next = {
    updatedAt: capturedAt,
    lastCapturedAt: capturedAt,
    sourceUrl,
    weekLabel: normalizeWeekLabel(capture.weekLabel) || normalizeWeekLabel(ledger.weekLabel) || '',
    daysLeft: integer(capture.daysLeft, ledger.daysLeft || 0),
    focus: clean(capture.focus, 160) || ledger.focus || '',
    completionPercent: Math.min(100, integer(capture.completionPercent, ledger.completionPercent || 0)),
    tasks,
    achievements,
  };
  return { ledger: next, accepted: true, taskCount: tasks.length, achievementCount: achievements.length };
}

function remainingTask(tasks, pattern) {
  return tasks.find((task) => pattern.test(task.label) && !task.complete);
}

function remainingCount(task) {
  return Math.max(0, Number(task?.target || 0) - Number(task?.current || 0));
}

export function professionalGoalsSummary(ledger = {}, { reelWorker = {}, reelJobs = [] } = {}) {
  const tasks = Array.isArray(ledger.tasks) ? ledger.tasks : [];
  const achievements = normalizeProfessionalAchievements(ledger.achievements);
  const comments = remainingTask(tasks, /reply to .*comments/i);
  const reels = remainingTask(tasks, /public reels/i);
  const photos = remainingTask(tasks, /(?:posts?.*photos|photo posts?)/i);
  const stories = remainingTask(tasks, /stories/i);
  const wordsmith = achievements.find((item) => /wordsmith/i.test(item.label) && !item.complete);
  const remixer = achievements.find((item) => /remixer/i.test(item.label) && !item.complete);
  const humanActions = [];
  const systemActions = [];
  const sourceUrl = ledger.sourceUrl || 'https://www.facebook.com/professional_dashboard/status/';

  if (comments) humanActions.push({
    key: 'reply-comments',
    priority: 'high',
    title: `Reply to ${remainingCount(comments)} more comment${remainingCount(comments) === 1 ? '' : 's'}`,
    detail: 'Open the live comments, review the context, and send authentic replies.',
    url: sourceUrl,
  });
  if (wordsmith) humanActions.push({
    key: 'approve-text-reel',
    priority: 'high',
    title: 'Approve a reel with readable on-screen text',
    detail: 'Open Media > Reels, review the rendered video, readable text, timing, and owned audio, then approve it or send it back to QC.',
    destination: 'reels',
  });
  if (remixer) humanActions.push({
    key: 'review-remix',
    priority: 'normal',
    title: 'Choose and approve an original reel remix',
    detail: 'Open Media > Reels, review the original edit and audio, then approve it or send it back to QC.',
    destination: 'reels',
  });

  if (reels) systemActions.push({
    key: 'render-reels',
    state: (reelWorker.configured && !String(reelWorker.state || '').includes('required')) || Number(reelWorker.availableOwnedAudio || 0) > 0 ? 'ready' : 'blocked',
    title: `Render ${remainingCount(reels)} more reel${remainingCount(reels) === 1 ? '' : 's'} for review`,
    detail: Number(reelWorker.availableOwnedAudio || 0) > 0 && !reelWorker.configured
      ? `${Number(reelWorker.availableOwnedAudio).toLocaleString()} owned audio track${Number(reelWorker.availableOwnedAudio) === 1 ? '' : 's'} ready. Assign one in Media > Reels and Ryzen will render the approval-gated preview.`
      : reelWorker.reason || (reelWorker.configured ? 'Ryzen should build approval-gated previews from complete Daily Series media.' : 'A working voice provider is required on Ryzen before queued reel jobs can render.'),
  });
  if (photos) systemActions.push({ key: 'publish-photo-posts', state: 'tracking', title: `${remainingCount(photos)} photo posts remain`, detail: 'Publishing should draw only from approved, sequence-safe posts and confirm each Facebook result.' });
  if (stories) systemActions.push({ key: 'publish-stories', state: 'tracking', title: `${remainingCount(stories)} Stories remain`, detail: 'Use approved Story media and confirm delivery without adding unintended captions.' });

  const activeReelJobs = (Array.isArray(reelJobs) ? reelJobs : []).filter((job) => !['cancelled', 'failed', 'published'].includes(job.status));
  if ((!reelWorker.configured || String(reelWorker.state || '').includes('required')) && activeReelJobs.length && !systemActions.some((action) => action.key === 'render-reels')) {
    systemActions.push({ key: 'configure-reel-worker', state: 'blocked', title: `${activeReelJobs.length} reel jobs are waiting`, detail: reelWorker.reason || 'Configure a working voice provider on Ryzen before the worker consumes the queue.' });
  }

  return {
    updatedAt: ledger.updatedAt || null,
    sourceUrl,
    weekLabel: normalizeWeekLabel(ledger.weekLabel),
    daysLeft: integer(ledger.daysLeft),
    focus: ledger.focus || '',
    completionPercent: integer(ledger.completionPercent),
    taskCount: tasks.length,
    completedTasks: tasks.filter((task) => task.complete).length,
    humanActionCount: humanActions.length,
    humanActions,
    systemActions,
    nextAchievements: achievements.filter((item) => !item.complete),
  };
}

