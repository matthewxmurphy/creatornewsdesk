const SOCIAL_DESK_CANDIDATES = [
  'http://127.0.0.1:4180',
  'http://127.0.0.1:4178',
];
let socialDeskRoot = SOCIAL_DESK_CANDIDATES[0];
const CLIENT = 'engagement-watcher';
const CYCLE_ALARM = 'cph-engagement-cycle';
const LEGACY_HOURLY_ALARM = 'cph-engagement-hourly';
const DAILY_BIRTHDAY_ALARM = 'cph-birthday-daily';
const BIRTHDAY_URL = 'https://www.facebook.com/friends/birthdays';
const BIRTHDAY_CLOSE_ALARM_PREFIX = 'cph-birthday-close-';
const STATE_KEY = 'cphEngagementWatcher';
const NETWORK_TIMEOUT_MS = 20_000;
const TAB_MESSAGE_TIMEOUT_MS = 75_000;
let runPromise = null;
let birthdayRunPromise = null;

function activeCycleKeepAlive() {
  const pulse = () => chrome.runtime.getPlatformInfo().catch(() => {});
  pulse();
  const timer = setInterval(pulse, 15_000);
  return () => clearInterval(timer);
}

function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

function headers(extra = {}) {
  return { 'Content-Type': 'application/json', 'X-Social-Desk-Client': CLIENT, ...extra };
}

async function socialDesk(path, options = {}) {
  const candidates = [socialDeskRoot, ...SOCIAL_DESK_CANDIDATES.filter((root) => root !== socialDeskRoot)];
  let lastError = null;
  for (const root of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
    try {
      const response = await fetch(`${root}${path}`, { ...options, headers: headers(options.headers), signal: controller.signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = new Error(body.error || `Social Desk returned ${response.status}`);
        continue;
      }
      socialDeskRoot = root;
      return body;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('Social Desk is unavailable.');
}

async function state() {
  return (await chrome.storage.local.get(STATE_KEY))[STATE_KEY] || {};
}

async function saveState(patch) {
  const next = { ...(await state()), ...patch };
  await chrome.storage.local.set({ [STATE_KEY]: next });
  return next;
}

async function waitForTab(tabId, timeoutMs = 90_000) {
  const startedAt = Date.now();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) throw new Error('Facebook tab closed before the engagement task loaded.');
    if (tab.status === 'complete') {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return tab;
    }
    if (Date.now() - startedAt >= 5_000) {
      const probe = await withTimeout(chrome.tabs.sendMessage(tabId, { type: 'CPH_PAGE_READY' }), 5_000, 'Facebook readiness probe').catch(() => null);
      if (probe?.ready === true && Number(probe.bodyTextLength || 0) >= 200) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return tab;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Facebook did not finish loading the engagement task.');
}

async function taskTab(url, { active = false } = {}) {
  const snapshot = await state();
  let tab = snapshot.taskTabId ? await chrome.tabs.get(snapshot.taskTabId).catch(() => null) : null;
  tab = tab
    ? await chrome.tabs.update(tab.id, { url, active })
    : await chrome.tabs.create({ url, active });
  await saveState({ taskTabId: tab.id });
  return waitForTab(tab.id);
}

async function tabMessage(tabId, message) {
  try {
    return await withTimeout(chrome.tabs.sendMessage(tabId, message), TAB_MESSAGE_TIMEOUT_MS, message?.type || 'Facebook page worker');
  } catch (error) {
    throw new Error(`Facebook page worker did not answer: ${String(error?.message || error)}`);
  }
}

function birthdayCloseAlarmName(tabId) {
  return `${BIRTHDAY_CLOSE_ALARM_PREFIX}${tabId}`;
}

async function closeBirthdayTab(tabId = 0) {
  const snapshot = await state();
  const storedTabId = Number(snapshot.birthdayTabId || 0);
  const targetTabId = Number(tabId || storedTabId || 0);
  if (!targetTabId || (storedTabId && targetTabId !== storedTabId)) return;
  await chrome.tabs.remove(targetTabId).catch(() => {});
  await chrome.alarms.clear(birthdayCloseAlarmName(targetTabId)).catch(() => {});
  await saveState({
    birthdayTabId: 0,
    birthdayWorkerState: 'closed',
    birthdayTabClosedAt: new Date().toISOString(),
  });
}

async function birthdayTab(url = BIRTHDAY_URL) {
  const snapshot = await state();
  let tab = snapshot.birthdayTabId ? await chrome.tabs.get(snapshot.birthdayTabId).catch(() => null) : null;
  if (tab && !String(tab.url || '').startsWith(BIRTHDAY_URL)) {
    await chrome.tabs.remove(tab.id).catch(() => {});
    tab = null;
  }
  tab = tab || await chrome.tabs.create({ url, active: false });
  await chrome.alarms.create(birthdayCloseAlarmName(tab.id), { delayInMinutes: 45 });
  await saveState({
    birthdayTabId: tab.id,
    birthdayWorkerState: 'scanning-and-wishing',
    birthdayTabOpenedAt: snapshot.birthdayTabId ? snapshot.birthdayTabOpenedAt : new Date().toISOString(),
  });
  return waitForTab(tab.id);
}

async function captureBirthdays(feed, force = false) {
  if (!force && feed.birthdayCapture?.due !== true) return { skipped: true };
  const tab = await birthdayTab(feed.birthdayCapture?.url || BIRTHDAY_URL);
  const result = await tabMessage(tab.id, { type: 'CPH_CAPTURE_BIRTHDAYS' });
  if (!Array.isArray(result?.people)) throw new Error(result?.error || 'Birthday capture returned no structured people list.');
  const saved = await socialDesk('/api/birthday-capture', {
    method: 'POST',
    body: JSON.stringify({ people: result.people, extensionVersion: chrome.runtime.getManifest().version }),
  });
  await saveState({ lastBirthdayCaptureAt: new Date().toISOString(), birthdayCaptured: saved.captured || 0 });
  return saved;
}

async function recordBirthdayWish(wish = {}) {
  const saved = await socialDesk('/api/birthday-wish-capture', {
    method: 'POST',
    body: JSON.stringify({ wish, extensionVersion: chrome.runtime.getManifest().version }),
  });
  await saveState({
    birthdayWishesSent: Number(saved.summary?.sent || 0),
    birthdayWishesSentToday: Number(saved.summary?.sentToday || 0),
    lastBirthdayWishAt: saved.wish?.confirmedAt || saved.wish?.actionAt || new Date().toISOString(),
    lastBirthdayWishName: saved.wish?.actorName || wish.actorName || '',
    lastBirthdayWishState: saved.wish?.status || wish.status || '',
    lastBirthdayWishError: '',
  });
  return saved;
}

function runBirthdayCycle({ force = false, feed = null } = {}) {
  if (birthdayRunPromise) return birthdayRunPromise;
  birthdayRunPromise = (async () => {
    const currentFeed = feed || await socialDesk('/api/extension/hourly-feed');
    return captureBirthdays(currentFeed, force);
  })().finally(() => { birthdayRunPromise = null; });
  return birthdayRunPromise;
}

async function captureOwnedComments(feed) {
  let captured = 0;
  let drafted = 0;
  const errors = [];
  const coverage = [];
  for (const url of (feed.page?.scanUrls || []).slice(0, 8)) {
    const tab = await taskTab(url);
    const result = await tabMessage(tab.id, { type: 'CPH_CAPTURE_OWNED_COMMENTS', pageUrl: feed.page.url });
    coverage.push({ url, ...(result?.coverage || {}) });
    for (const candidate of (result?.comments || []).slice(0, 500)) {
      captured += 1;
      try {
        const response = await socialDesk('/api/comment-reply-draft', { method: 'POST', body: JSON.stringify(candidate) });
        if (!response.duplicate) drafted += 1;
      } catch (error) {
        errors.push(String(error?.message || error).slice(0, 300));
      }
    }
  }
  return { captured, drafted, coverage, errors: errors.slice(0, 10) };
}

async function submitPreparedReply(tabId, replyText) {
  const target = { tabId };
  await withTimeout(chrome.debugger.attach(target, '1.3'), 15_000, 'Facebook debugger attach');
  try {
    // Trusted input is ignored when Facebook's task tab remains backgrounded.
    await withTimeout(chrome.debugger.sendCommand(target, 'Page.bringToFront'), 15_000, 'Facebook tab focus');
    // Facebook's Lexical composer ignores synthetic DOM input even when the
    // words appear temporarily. CDP input updates the real editor state.
    await withTimeout(chrome.debugger.sendCommand(target, 'Input.insertText', { text: replyText }), 15_000, 'Facebook reply input');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await withTimeout(chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'Enter',
      code: 'Enter',
      text: '\r',
      unmodifiedText: '\r',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
    }), 15_000, 'Facebook reply submit');
    await withTimeout(chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
    }), 15_000, 'Facebook reply key release');
  } finally {
    await chrome.debugger.detach(target).catch(() => {});
  }
}

async function captureReplyOutcome(task, status, lastError = '', outcome = {}) {
  return socialDesk('/api/comment-reply-capture', {
    method: 'POST',
    body: JSON.stringify({
      ...task,
      status,
      lastError,
      actionAt: new Date().toISOString(),
      provider: task.provider,
      model: task.model,
      parentVerified: outcome.parentVerified === true,
      parentCommentKey: outcome.parentCommentKey || '',
      editorAriaLabel: outcome.editorAriaLabel || '',
    }),
  });
}

async function postApprovedReplies(feed) {
  const results = [];
  for (const task of (feed.replyTasks || []).slice(0, 10)) {
    try {
      const tab = await taskTab(task.postUrl, { active: true });
      const prepared = await tabMessage(tab.id, { type: 'CPH_PREPARE_APPROVED_REPLY', task });
      let outcome = prepared?.alreadySent === true
        ? prepared
        : null;
      if (!outcome) {
        if (prepared?.prepared !== true || prepared?.parentTargetVerified !== true || prepared?.parentCommentKey !== task.commentKey) {
          throw new Error(prepared?.error || 'The exact approved Facebook parent comment was not prepared.');
        }
        const validated = await tabMessage(tab.id, { type: 'CPH_VALIDATE_PREPARED_REPLY', task });
        if (validated?.prepared !== true || validated?.parentTargetVerified !== true || validated?.parentCommentKey !== task.commentKey) {
          throw new Error(validated?.error || 'The exact nested Facebook reply editor was not verified before submission.');
        }
        await submitPreparedReply(tab.id, task.replyText);
        outcome = await tabMessage(tab.id, { type: 'CPH_VERIFY_APPROVED_REPLY', task });
      }
      const parentVerified = outcome?.verified === true && outcome?.parentVerified === true && outcome?.parentCommentKey === task.commentKey;
      const status = parentVerified ? 'sent' : 'attempted';
      const lastError = status === 'attempted' ? (outcome?.error || 'Facebook did not render the reply inside the approved parent comment thread.') : '';
      const proof = await captureReplyOutcome(task, status, lastError, outcome);
      results.push({ commentKey: task.commentKey, status, verified: parentVerified, parentVerified, alreadySent: outcome?.alreadySent === true, proof });
    } catch (error) {
      const lastError = String(error?.message || error).slice(0, 500);
      const proof = await captureReplyOutcome(task, 'attempted', lastError, {}).catch(() => null);
      results.push({ commentKey: task.commentKey, status: 'attempted', verified: false, error: lastError, proof });
    }
  }
  return results;
}

async function publishApprovedGroupTask(feed) {
  const task = feed.groupTask;
  if (!task) return { skipped: true };
  const startUrl = task.method === 'share' && task.sourcePostUrl ? task.sourcePostUrl : task.groupUrl;
  let tab = await taskTab(startUrl);
  let outcome = await tabMessage(tab.id, { type: 'CPH_PUBLISH_APPROVED_GROUP_POST', task });
  if (outcome?.submitted === true && outcome?.verified !== true) {
    tab = await chrome.tabs.update(tab.id, { url: task.groupUrl, active: false });
    await waitForTab(tab.id);
    outcome = await tabMessage(tab.id, { type: 'CPH_VERIFY_GROUP_POST', task });
  }
  if (!outcome?.verified || !outcome.groupPostUrl) throw new Error(outcome?.error || 'The group post was not confirmed by an exact rendered permalink.');
  return socialDesk(`/api/page-group-distribution/${encodeURIComponent(task.id)}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ groupPostUrl: outcome.groupPostUrl, confirmedAt: new Date().toISOString() }),
  });
}

async function runHourly({ forceBirthdays = false } = {}) {
  if (runPromise) return runPromise;
  const stopKeepAlive = activeCycleKeepAlive();
  runPromise = (async () => {
    const startedAt = new Date().toISOString();
    let stage = 'load-feed';
    try {
      await saveState({ activeRunStartedAt: startedAt, lastStage: stage });
      let feed = await socialDesk('/api/extension/hourly-feed');
      // Planning has no Facebook side effects and must not block existing jobs.
      const archivePlan = await socialDesk('/api/archive-remix/personal-plan', {
        method: 'POST', body: JSON.stringify({ target: 'matthew-profile' }),
      }).then((plan) => ({ planned: plan.items.length, created: plan.created }))
        .catch((error) => ({ error: error.message }));
      stage = 'birthdays';
      const birthdays = await runBirthdayCycle({ force: forceBirthdays, feed });
      stage = 'comments';
      const comments = await captureOwnedComments(feed);
      stage = 'reload-feed';
      feed = await socialDesk('/api/extension/hourly-feed');
      stage = 'replies';
      const replies = await postApprovedReplies(feed);
      stage = 'groups';
      const group = await publishApprovedGroupTask(feed);
      return saveState({
        lastRunAt: new Date().toISOString(),
        lastRunStartedAt: startedAt,
        lastRunOk: true,
        activeRunStartedAt: '',
        lastError: '',
        lastStage: 'complete',
        lastSummary: { archivePlan, birthdays, comments, replies: replies.length, group: group?.skipped ? 'none-due' : 'confirmed' },
      });
    } catch (error) {
      await saveState({
        lastRunAt: new Date().toISOString(),
        lastRunStartedAt: startedAt,
        lastRunOk: false,
        activeRunStartedAt: '',
        lastStage: stage,
        lastError: `${stage}: ${String(error?.message || error)}`.slice(0, 1000),
      });
      throw error;
    }
  })().finally(() => {
    stopKeepAlive();
    runPromise = null;
  });
  return runPromise;
}

async function installAlarms() {
  await chrome.alarms.clear(LEGACY_HOURLY_ALARM);
  const cycle = await chrome.alarms.get(CYCLE_ALARM);
  if (Number(cycle?.periodInMinutes || 0) !== 5) {
    await chrome.alarms.create(CYCLE_ALARM, { delayInMinutes: 1, periodInMinutes: 5 });
  }
  const birthday = await chrome.alarms.get(DAILY_BIRTHDAY_ALARM);
  if (Number(birthday?.periodInMinutes || 0) !== 24 * 60) {
    await chrome.alarms.create(DAILY_BIRTHDAY_ALARM, { delayInMinutes: 24 * 60, periodInMinutes: 24 * 60 });
  }
}

async function initializeBirthdayWorker() {
  const settings = await chrome.storage.local.get(['birthdayWishesEnabled', 'birthdayWishHistory']);
  const patch = {};
  if (settings.birthdayWishesEnabled === undefined) patch.birthdayWishesEnabled = true;
  if (!Array.isArray(settings.birthdayWishHistory)) patch.birthdayWishHistory = [];
  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'cph-plan-personal-archive') {
    if (sender.id !== chrome.runtime.id || !String(sender.url || '').startsWith(chrome.runtime.getURL(''))) return false;
    socialDesk('/api/archive-remix/personal-plan', { method: 'POST', body: JSON.stringify({ target: 'matthew-profile' }) })
      .then((plan) => sendResponse({ ok: true, planned: plan.items.length, created: plan.created, url: `${socialDeskRoot}/?view=media-library&panel=archives` }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === 'SOCIAL_DESK_BIRTHDAY_WISH_AUDIT') {
    recordBirthdayWish(message.wish).then((saved) => sendResponse({ ok: true, ...saved })).catch(async (error) => {
      await saveState({ lastBirthdayWishError: String(error?.message || error), lastBirthdayWishAttemptAt: new Date().toISOString() }).catch(() => {});
      sendResponse({ ok: false, error: String(error?.message || error) });
    });
    return true;
  }
  if (message?.type === 'SOCIAL_DESK_BIRTHDAY_WISH_PROGRESS') {
    const progress = message.progress || {};
    saveState({
      birthdayWorkerState: progress.state || 'wishing',
      lastBirthdayWishName: progress.actorName || '',
      lastBirthdayWishState: progress.status || progress.state || '',
      lastBirthdayWishError: progress.error || '',
      lastBirthdayWishAttemptAt: progress.updatedAt || new Date().toISOString(),
    }).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }
  if (message?.type === 'SOCIAL_DESK_BIRTHDAY_WISHES_COMPLETE') {
    const result = message.result || {};
    saveState({
      birthdayWorkerState: result.state || 'complete',
      birthdayVisibleComposers: Number(result.visibleComposers || 0),
      birthdayWishesSent: Number(result.sent || 0),
      birthdayWorkerCompletedAt: new Date().toISOString(),
    }).then(async () => {
      sendResponse({ ok: true });
      const snapshot = await state();
      if (sender.tab?.id && Number(sender.tab.id) === Number(snapshot.birthdayTabId || 0)) await closeBirthdayTab(sender.tab.id);
    }).catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(() => installAlarms().then(initializeBirthdayWorker).then(async () => {
  runBirthdayCycle({ force: true }).catch(() => {});
  await runHourly();
}).catch(() => {}));
chrome.runtime.onStartup.addListener(() => installAlarms().then(initializeBirthdayWorker).then(async () => {
  runBirthdayCycle({ force: true }).catch(() => {});
  await runHourly();
}).catch(() => {}));
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CYCLE_ALARM) runHourly().catch(() => {});
  if (alarm.name === DAILY_BIRTHDAY_ALARM) runBirthdayCycle({ force: true }).catch(() => {});
  if (alarm.name.startsWith(BIRTHDAY_CLOSE_ALARM_PREFIX)) closeBirthdayTab(Number(alarm.name.slice(BIRTHDAY_CLOSE_ALARM_PREFIX.length))).catch(() => {});
});
chrome.action.onClicked.addListener(() => runBirthdayCycle({ force: true }).catch(() => {}));

installAlarms().then(initializeBirthdayWorker).catch(() => {});
