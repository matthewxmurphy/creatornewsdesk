function clean(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/[\u034f\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const preparedReplyTargets = new Map();

function visible(element) {
  if (!element) return false;
  const box = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return box.width > 2 && box.height > 2 && style.visibility !== 'hidden' && style.display !== 'none';
}

function canonicalFacebookUrl(value = '') {
  try {
    const url = new URL(String(value || ''), location.href);
    if (!['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname)) return '';
    url.protocol = 'https:';
    url.hostname = 'www.facebook.com';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (!['id', 'story_fbid', 'fbid', 'comment_id', 'reply_comment_id'].includes(key)) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function facebookId(value = '') {
  try {
    const url = new URL(canonicalFacebookUrl(value));
    return String(url.searchParams.get('id') || url.pathname.match(/^\/(\d+)\/?$/)?.[1] || '').replace(/\D/g, '');
  } catch {
    return '';
  }
}

async function digestKey(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function waitFor(find, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = find();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

function exactProfileAnchor(scope) {
  const blocked = /^\/(?:groups|reel|watch|photo|photos|posts|videos|permalink\.php|story\.php|share|events|friends|notifications|messages|marketplace)(?:\/|$)/i;
  return [...scope.querySelectorAll('a[href]')].find((anchor) => {
    const url = canonicalFacebookUrl(anchor.href);
    if (!url || !clean(anchor.textContent)) return false;
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parsed.pathname === '/profile.php' ? Boolean(parsed.searchParams.get('id')) : parts.length === 1 && !blocked.test(parsed.pathname);
  }) || null;
}

function birthdayCards() {
  const main = document.querySelector('[role="main"]') || document;
  const cards = new Set();
  for (const anchor of main.querySelectorAll('a[href]')) {
    const profile = exactProfileAnchor(anchor.parentElement || anchor);
    if (profile !== anchor) continue;
    let node = anchor.parentElement;
    while (node && node !== main) {
      const text = clean(node.innerText);
      if (text.length >= 8 && text.length <= 1200 && (/happy birthday|birthday (?:is )?today|has (?:a )?birthday today/i.test(text) || SocialDeskBirthdayFacts.parseBirthdayFacts(text).monthDay)) {
        cards.add(node);
        break;
      }
      node = node.parentElement;
    }
  }
  return [...cards];
}

function captureBirthdays() {
  const foundAt = new Date().toISOString();
  const sourceUrl = canonicalFacebookUrl(location.href);
  const people = [];
  const seen = new Set();
  for (const card of birthdayCards()) {
    const anchor = exactProfileAnchor(card);
    if (!anchor) continue;
    const actorUrl = canonicalFacebookUrl(anchor.href);
    const actorId = facebookId(actorUrl);
    const actorName = clean(anchor.textContent || anchor.getAttribute('aria-label')).replace(/\s+verified account$/i, '').slice(0, 160);
    const birthdayText = clean(card.innerText).slice(0, 300);
    const facts = SocialDeskBirthdayFacts.parseBirthdayFacts(birthdayText, { now: new Date(), assumeReferenceDate: /happy birthday|birthday (?:is )?today|has (?:a )?birthday today/i.test(birthdayText) });
    const identity = actorId || actorUrl;
    if (!identity || !actorName || seen.has(identity)) continue;
    seen.add(identity);
    people.push({
      actorId,
      actorUrl,
      actorName,
      monthDay: facts.monthDay,
      birthYear: facts.birthYear,
      age: facts.age,
      birthdayText,
      sourceUrl,
      foundAt,
    });
  }
  return { people, sourceUrl, capturedAt: foundAt };
}

let birthdayWishBusy = false;
let birthdayWishTimer = null;
let birthdayPageReadyAt = 0;
let lastBirthdayWishCompletionFingerprint = '';
const birthdayWishLimits = { minimumGapMs: 60_000, hourly: 12, daily: 40 };

function isBirthdayCenter() {
  return /^\/friends\/birthdays\/?$/i.test(location.pathname);
}

function visibleBirthdayControl(element) {
  return Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
}

function birthdayActorIdentity(link) {
  const actorUrl = canonicalFacebookUrl(link?.href || '');
  const actorId = facebookId(actorUrl);
  const actorName = clean(link?.textContent || '').replace(/\s+verified account$/i, '').slice(0, 160);
  const letters = (actorName.match(/\p{L}/gu) || []).length;
  if (!actorUrl || letters < 2) return null;
  return { actorId, actorUrl, actorName };
}

function collectBirthdayWishRows() {
  if (!isBirthdayCenter() || !globalThis.SocialDeskBirthdayWishes) return [];
  const rows = [];
  const datePattern = new RegExp(`(?:${SocialDeskBirthdayFacts.MONTHS.join('|')})\\s*\\d{1,2}`, 'i');
  for (const editor of document.querySelectorAll('[role="textbox"][contenteditable="true"]')) {
    if (!visibleBirthdayControl(editor)) continue;
    let container = null;
    let button = null;
    let birthdayLink = null;
    for (let current = editor, depth = 0; current && depth < 12; current = current.parentElement, depth += 1) {
      const buttons = [...current.querySelectorAll('[role="button"], button')]
        .filter((candidate) => visibleBirthdayControl(candidate)
          && clean(candidate.getAttribute('aria-label') || candidate.textContent) === 'Post birthday message');
      const links = [...current.querySelectorAll('a[href][aria-label]')]
        .filter((candidate) => datePattern.test(clean(candidate.getAttribute('aria-label'))));
      if (buttons.length !== 1 || !links.length) continue;
      container = current;
      button = buttons[0];
      birthdayLink = links[0];
      break;
    }
    const actor = birthdayActorIdentity(birthdayLink);
    const birthdayLabel = clean(birthdayLink?.getAttribute('aria-label'));
    const facts = SocialDeskBirthdayFacts.parseBirthdayFacts(birthdayLabel, { now: new Date() });
    const birthdayDateKey = SocialDeskBirthdayWishes.birthdayDateKey(facts.monthDay, new Date());
    const message = clean(editor.innerText || editor.textContent);
    const wishKey = SocialDeskBirthdayWishes.wishKey({ ...actor, monthDay: facts.monthDay, birthdayDateKey });
    if (!container || !button || !actor || !facts.monthDay || !birthdayDateKey || !wishKey || !message) continue;
    if (Number.isInteger(facts.age) && facts.age < 18) continue;
    rows.push({
      editor,
      button,
      container,
      wishKey,
      birthdayDateKey,
      message: message.slice(0, 500),
      monthDay: facts.monthDay,
      birthYear: facts.birthYear,
      age: facts.age,
      ...actor,
    });
  }
  return [...new Map(rows.map((row) => [row.wishKey, row])).values()].slice(0, 100);
}

function birthdayPageIsReady() {
  if (!isBirthdayCenter()) {
    birthdayPageReadyAt = 0;
    return false;
  }
  const root = document.querySelector('main, [role="main"]') || document;
  const ready = /\b(?:Today'?s|Recent|Upcoming) birthdays\b/i.test(clean(root.innerText || root.textContent));
  if (ready && !birthdayPageReadyAt) birthdayPageReadyAt = Date.now();
  return ready;
}

async function saveBirthdayWishHistory(history, entry) {
  const next = [...history.filter((item) => item.wishKey !== entry.wishKey), entry]
    .sort((left, right) => new Date(left.actionAt || left.attemptedAt || 0) - new Date(right.actionAt || right.attemptedAt || 0))
    .slice(-5000);
  await chrome.storage.local.set({ birthdayWishHistory: next });
  return next;
}

async function requestBirthdayWorker(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (result?.ok !== true) throw new Error(result?.error || 'The birthday worker did not acknowledge the action.');
  return result;
}

async function reportBirthdayWishCompletion(state, rows, history, extra = {}) {
  if (!birthdayPageIsReady() || Date.now() - birthdayPageReadyAt < 5_000) return false;
  const sent = history.filter((entry) => entry.status === 'sent').length;
  const fingerprint = JSON.stringify([state, rows.length, sent, extra.reason || '']);
  if (fingerprint === lastBirthdayWishCompletionFingerprint) return true;
  lastBirthdayWishCompletionFingerprint = fingerprint;
  await requestBirthdayWorker({
    type: 'SOCIAL_DESK_BIRTHDAY_WISHES_COMPLETE',
    result: { state, visibleComposers: rows.length, sent, ...extra },
  });
  return true;
}

async function maybeSendBirthdayWish() {
  if (!isBirthdayCenter() || birthdayWishBusy || !globalThis.SocialDeskBirthdayWishes) return { retryAfterMs: 0 };
  const ready = birthdayPageIsReady();
  const rows = collectBirthdayWishRows();
  const stored = await chrome.storage.local.get(['birthdayWishesEnabled', 'birthdayWishHistory']);
  let history = Array.isArray(stored.birthdayWishHistory) ? stored.birthdayWishHistory : [];
  if (stored.birthdayWishesEnabled !== true) {
    const reported = ready ? await reportBirthdayWishCompletion('paused', rows, history) : false;
    return { retryAfterMs: reported ? 0 : 3_000 };
  }
  const available = rows.filter((row) => !SocialDeskBirthdayWishes.hasAttempt(history, row.wishKey));
  if (!available.length) {
    const reported = ready ? await reportBirthdayWishCompletion('complete', rows, history) : false;
    return { retryAfterMs: reported ? 0 : 3_000 };
  }
  const rate = SocialDeskBirthdayWishes.rateLimit(history, new Date(), birthdayWishLimits);
  if (!rate.allowed) {
    if (rate.reason === 'daily-limit') await reportBirthdayWishCompletion('limited', rows, history, { reason: rate.reason });
    return { retryAfterMs: rate.retryAfterMs };
  }

  birthdayWishBusy = true;
  const row = available[0];
  const actionAt = new Date().toISOString();
  let entry = {
    wishKey: row.wishKey,
    actorId: row.actorId || '',
    actorUrl: row.actorUrl,
    actorName: row.actorName,
    birthdayDateKey: row.birthdayDateKey,
    monthDay: row.monthDay,
    message: row.message,
    sourceUrl: canonicalFacebookUrl(location.href),
    attemptedAt: actionAt,
    actionAt,
    status: 'pending-audit',
  };
  try {
    history = await saveBirthdayWishHistory(history, entry);
    try {
      const audit = await requestBirthdayWorker({ type: 'SOCIAL_DESK_BIRTHDAY_WISH_AUDIT', wish: { ...entry, status: 'attempted' } });
      if (audit.duplicate === true) {
        entry = {
          ...entry,
          status: audit.wish?.status || 'attempted',
          confirmedAt: audit.wish?.confirmedAt || null,
          error: '',
        };
        await saveBirthdayWishHistory(history, entry);
        await chrome.runtime.sendMessage({
          type: 'SOCIAL_DESK_BIRTHDAY_WISH_PROGRESS',
          progress: {
            state: 'duplicate-suppressed',
            actorName: row.actorName,
            status: entry.status,
            error: '',
            updatedAt: new Date().toISOString(),
          },
        }).catch(() => {});
        return { retryAfterMs: birthdayWishLimits.minimumGapMs };
      }
    } catch (error) {
      entry = { ...entry, status: 'audit-failed', error: String(error?.message || error) };
      await saveBirthdayWishHistory(history, entry);
      await chrome.runtime.sendMessage({
        type: 'SOCIAL_DESK_BIRTHDAY_WISH_PROGRESS',
        progress: { state: 'audit-error', error: entry.error, actorName: row.actorName, updatedAt: new Date().toISOString() },
      }).catch(() => {});
      return { retryAfterMs: 60_000 };
    }
    entry = { ...entry, status: 'attempted' };
    history = await saveBirthdayWishHistory(history, entry);
    row.button.click();
    const confirmation = await waitFor(() => {
      const rowText = clean(row.container?.innerText || row.container?.textContent);
      return !document.contains(row.button)
        || !visibleBirthdayControl(row.button)
        || (/\byou wished\b/i.test(rowText) && rowText.toLowerCase().includes(row.actorName.toLowerCase()));
    }, 15_000);
    entry = confirmation
      ? { ...entry, status: 'sent', confirmedAt: new Date().toISOString(), error: '' }
      : { ...entry, status: 'attempted', error: 'Facebook did not expose a visible sent confirmation; this wish will not be repeated automatically.' };
    history = await saveBirthdayWishHistory(history, entry);
    await requestBirthdayWorker({ type: 'SOCIAL_DESK_BIRTHDAY_WISH_AUDIT', wish: entry }).catch(() => {});
    await chrome.runtime.sendMessage({
      type: 'SOCIAL_DESK_BIRTHDAY_WISH_PROGRESS',
      progress: {
        state: entry.status === 'sent' ? 'sent' : 'submitted',
        actorName: row.actorName,
        status: entry.status,
        error: entry.error || '',
        updatedAt: new Date().toISOString(),
      },
    }).catch(() => {});
    return { retryAfterMs: birthdayWishLimits.minimumGapMs };
  } finally {
    birthdayWishBusy = false;
  }
}

function scheduleBirthdayWishWorker(delayMs = 5_000) {
  if (!isBirthdayCenter()) return;
  clearTimeout(birthdayWishTimer);
  birthdayWishTimer = setTimeout(async () => {
    birthdayWishTimer = null;
    try {
      const result = await maybeSendBirthdayWish();
      if (Number(result?.retryAfterMs || 0) > 0) scheduleBirthdayWishWorker(result.retryAfterMs);
    } catch {
      scheduleBirthdayWishWorker(60_000);
    }
  }, delayMs);
}

function postPermalink(scope = document) {
  const anchors = [...scope.querySelectorAll('a[href]')];
  const isPostPermalink = (href) => /\/(?:posts|reel|videos)\/|permalink\.php|story_fbid=/i.test(href);
  const anchor = anchors.find((candidate) => isPostPermalink(candidate.href) && /[?&](?:comment_id|reply_comment_id)=/i.test(candidate.href))
    || anchors.find((candidate) => isPostPermalink(candidate.href));
  return canonicalFacebookUrl(anchor?.href || location.href);
}

function owningPostContainer(container) {
  let node = container?.parentElement || null;
  let interactionScope = null;
  while (node && node !== document.body) {
    const text = clean(node.innerText);
    if (!interactionScope && /\bLike\b[\s\S]*\bComment\b[\s\S]*\bShare\b/i.test(text)) interactionScope = node;
    if ([...node.querySelectorAll('a[href]')].some((anchor) => /\/(?:posts|reel|videos)\/|permalink\.php|story_fbid=/i.test(anchor.href))) return node;
    node = node.parentElement;
  }
  return interactionScope || container;
}

function renderedPostContext(post) {
  const directPost = /\/(?:posts|reel|videos)\/|permalink\.php|story_fbid=/i.test(location.href);
  const description = directPost
    ? clean(document.querySelector('meta[property="og:description"], meta[name="description"]')?.content)
    : '';
  return clean([description, clean(post?.innerText)].filter(Boolean).join(' ')).slice(0, 1600);
}

function isOwnedPostUrl(postUrl, pageUrl = '') {
  try {
    const path = new URL(postUrl).pathname.toLowerCase();
    const configuredOwner = new URL(pageUrl || 'https://www.facebook.com/matthewxmurphybuiltnotbegged').pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    const owners = new Set([configuredOwner, 'xmatthewxmurphyx', 'matthewxmurphybuiltnotbegged'].filter(Boolean));
    return [...owners].some((owner) => new RegExp(`^/${owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(?:posts|reel|videos)/`, 'i').test(path));
  } catch {
    return false;
  }
}

function commentContainers() {
  const main = document;
  const candidates = new Set([
    ...main.querySelectorAll('[aria-label^="Comment by" i]'),
    ...main.querySelectorAll('[role="article"] [role="article"]'),
  ]);
  for (const reply of [...main.querySelectorAll('[role="button"], span')].filter((node) => /^reply$/i.test(clean(node.textContent)))) {
    const article = reply.closest('[role="article"]');
    if (article) candidates.add(article);
  }
  return [...candidates].filter((node) => visible(node) && /\bReply\b/i.test(clean(node.innerText)));
}

function commentTextFrom(container, actorName) {
  const lines = String(container.innerText || '').split(/\n+/).map(clean).filter(Boolean);
  const ignored = /^(?:like|reply|share|edited|author|top fan|follow|message|see translation|hide|report|\d+[hmdwy])$/i;
  return lines.filter((line) => line !== actorName && !ignored.test(line) && !/^\d+\s*(?:repl|like|reaction)/i.test(line)).join(' ').slice(0, 600);
}

async function captureOwnedComments(pageUrl = '') {
  const comments = [];
  const seen = new Set();
  for (const container of commentContainers()) {
    const actor = exactProfileAnchor(container);
    if (!actor) continue;
    const actorName = clean(actor.textContent || actor.getAttribute('aria-label')).replace(/\s+verified account$/i, '').slice(0, 160);
    if (!actorName || /matthew murphy|built not begged/i.test(actorName)) continue;
    const actorUrl = canonicalFacebookUrl(actor.href);
    const actorId = facebookId(actorUrl);
    const commentText = commentTextFrom(container, actorName);
    const post = owningPostContainer(container);
    const postUrl = postPermalink(post);
    if (!commentText || !postUrl || !isOwnedPostUrl(postUrl, pageUrl) || (!actorId && !actorUrl)) continue;
    const commentKey = `owned:${await digestKey(`${postUrl}|${actorId || actorUrl}|${commentText}`)}`;
    if (seen.has(commentKey)) continue;
    seen.add(commentKey);
    comments.push({
      kind: 'owned-post-reply',
      commentKey,
      actorId,
      actorUrl,
      actorName,
      commentText,
      postContext: renderedPostContext(post),
      postUrl,
      sourceUrl: canonicalFacebookUrl(location.href),
      answeredByMatthew: false,
      capturedAt: new Date().toISOString(),
    });
  }
  return { comments, capturedAt: new Date().toISOString() };
}

function setEditableText(editable, value) {
  editable.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, value);
  editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
}

function escapedRegex(value = '') {
  return clean(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactCommentTarget(task) {
  const commentText = clean(task.commentText).slice(0, 200);
  return commentContainers().find((container) => {
    const text = clean(container.innerText);
    return commentText && text.includes(commentText) && (!task.actorName || text.includes(clean(task.actorName)));
  }) || null;
}

function smallestCommonAncestor(left, right) {
  const leftAncestors = new Set();
  for (let node = left; node; node = node.parentElement) leftAncestors.add(node);
  let common = right;
  while (common && !leftAncestors.has(common)) common = common.parentElement;
  return common;
}

function exactParentReplyAria(article, task) {
  const actor = escapedRegex(task.actorName);
  return Boolean(actor && new RegExp(`^reply by matthew murphy to ${actor}(?:'s|’s) comment\\b`, 'i').test(clean(article?.getAttribute('aria-label'))));
}

function exactMatthewReplyArticle(scope, task) {
  return [...(scope || document).querySelectorAll('[role="article"]')]
    .filter(visible)
    .find((article) => {
      const aria = clean(article.getAttribute('aria-label'));
      const authoredByMatthew = /^comment by matthew murphy\b/i.test(aria) || exactParentReplyAria(article, task);
      return authoredByMatthew && clean(article.innerText).includes(clean(task.replyText));
    }) || null;
}

async function prepareApprovedReply(task) {
  const taskKey = clean(task?.id || task?.commentKey);
  preparedReplyTargets.delete(taskKey);
  const target = await waitFor(() => exactCommentTarget(task), 60_000);
  if (!target) return { verified: false, error: 'Exact approved comment was not found in the rendered post.' };
  const expectedReply = clean(task.replyText);
  const reply = [...target.querySelectorAll('[role="button"], span')].find((node) => /^reply$/i.test(clean(node.textContent)) && visible(node));
  if (!reply) return { verified: false, error: 'Facebook did not expose Reply for the exact comment.' };
  reply.click();
  const editorAriaLabel = `Reply to ${clean(task.actorName)}`;
  const editor = await waitFor(() => [...document.querySelectorAll('[contenteditable="true"][role="textbox"]')]
    .filter(visible)
    .find((candidate) => clean(candidate.getAttribute('aria-label')).toLocaleLowerCase() === editorAriaLabel.toLocaleLowerCase()), 20_000);
  if (!editor) return { verified: false, parentTargetVerified: false, error: `Facebook did not open the exact "${editorAriaLabel}" editor.` };

  const threadScope = smallestCommonAncestor(target, editor);
  const parentTargetVerified = Boolean(
    taskKey
    && threadScope
    && threadScope !== document.body
    && threadScope !== document.documentElement
    && threadScope.contains(target)
    && threadScope.contains(editor)
    && clean(threadScope.innerText).includes(clean(task.commentText).slice(0, 200))
  );
  if (!parentTargetVerified) {
    return { verified: false, parentTargetVerified: false, error: 'The exact reply editor was not attached to the approved parent comment.' };
  }

  const existingReplyArticle = expectedReply ? exactMatthewReplyArticle(threadScope, task) : null;
  if (existingReplyArticle && exactParentReplyAria(existingReplyArticle, task)) {
    return {
      prepared: false,
      alreadySent: true,
      verified: true,
      parentVerified: true,
      parentTargetVerified: true,
      parentCommentKey: task.commentKey,
      editorAriaLabel,
      postUrl: canonicalFacebookUrl(location.href),
    };
  }
  editor.focus();
  preparedReplyTargets.set(taskKey, { target, editor, threadScope, editorAriaLabel, parentCommentKey: task.commentKey });
  return {
    prepared: true,
    parentTargetVerified: true,
    parentCommentKey: task.commentKey,
    editorAriaLabel,
    postUrl: canonicalFacebookUrl(location.href),
  };
}

function validatePreparedReply(task) {
  const taskKey = clean(task?.id || task?.commentKey);
  const prepared = preparedReplyTargets.get(taskKey);
  const parentTargetVerified = Boolean(
    prepared
    && prepared.parentCommentKey === task.commentKey
    && prepared.target?.isConnected
    && prepared.editor?.isConnected
    && visible(prepared.editor)
    && prepared.threadScope?.isConnected
    && prepared.threadScope.contains(prepared.target)
    && prepared.threadScope.contains(prepared.editor)
    && clean(prepared.editor.getAttribute('aria-label')).toLocaleLowerCase() === prepared.editorAriaLabel.toLocaleLowerCase()
    && (document.activeElement === prepared.editor || prepared.editor.contains(document.activeElement))
  );
  return {
    prepared: parentTargetVerified,
    parentTargetVerified,
    parentCommentKey: parentTargetVerified ? task.commentKey : '',
    editorAriaLabel: prepared?.editorAriaLabel || '',
    error: parentTargetVerified ? '' : 'The exact nested reply editor lost focus or parent association before submission.',
  };
}

async function verifyApprovedReply(task) {
  const taskKey = clean(task?.id || task?.commentKey);
  const prepared = preparedReplyTargets.get(taskKey);
  const replyArticle = await waitFor(() => {
    const preparedMatch = prepared?.threadScope?.isConnected
      ? exactMatthewReplyArticle(prepared.threadScope, task)
      : null;
    return preparedMatch || exactMatthewReplyArticle(document, task);
  }, 25_000);
  const currentTarget = prepared?.target?.isConnected ? prepared.target : exactCommentTarget(task);
  const currentScope = currentTarget && replyArticle ? smallestCommonAncestor(currentTarget, replyArticle) : null;
  const parentVerified = Boolean(
    replyArticle
    && prepared?.parentCommentKey === task.commentKey
    && exactParentReplyAria(replyArticle, task)
    && currentTarget
    && currentScope
    && currentScope !== document.body
    && currentScope !== document.documentElement
    && currentScope.contains(currentTarget)
    && currentScope.contains(replyArticle)
  );
  preparedReplyTargets.delete(taskKey);
  return {
    verified: parentVerified,
    parentVerified,
    parentCommentKey: parentVerified ? task.commentKey : '',
    editorAriaLabel: prepared?.editorAriaLabel || '',
    error: parentVerified ? '' : 'Facebook did not render the exact Matthew reply inside the approved parent comment thread.',
    postUrl: canonicalFacebookUrl(location.href),
    actionAt: new Date().toISOString(),
  };
}

function buttonByText(pattern, scope = document) {
  return [...scope.querySelectorAll('[role="button"], button, [role="menuitem"]')]
    .find((node) => {
      if (!visible(node)) return false;
      const searchableValues = [node.innerText, node.textContent, node.getAttribute('aria-label')]
        .map((value) => clean(value || ''))
        .filter(Boolean);
      return searchableValues.some((value) => pattern.test(value));
    }) || null;
}

async function directGroupPost(task) {
  const composer = await waitFor(() => buttonByText(/^(?:write something|create (?:a )?post)/i));
  if (!composer) return { verified: false, error: 'The approved group composer was not found.' };
  composer.click();
  const dialog = await waitFor(() => [...document.querySelectorAll('[role="dialog"]')].filter(visible).at(-1));
  const editor = await waitFor(() => [...(dialog || document).querySelectorAll('[contenteditable="true"][role="textbox"], [contenteditable="true"]')].filter(visible).at(-1));
  if (!editor) return { verified: false, error: 'The approved group post editor did not open.' };
  setEditableText(editor, task.body);
  const postButton = await waitFor(() => buttonByText(/^post$/i, dialog || document));
  if (!postButton || postButton.getAttribute('aria-disabled') === 'true') return { verified: false, error: 'Facebook did not enable the group Post button.' };
  postButton.click();
  const prefix = clean(task.body).slice(0, 80);
  const permalink = await waitFor(() => {
    for (const anchor of document.querySelectorAll(`a[href*="/groups/${task.groupId}/posts/"]`)) {
      const article = anchor.closest('[role="article"]');
      if (article && clean(article.innerText).includes(prefix)) return canonicalFacebookUrl(anchor.href);
    }
    return '';
  }, 45_000);
  return permalink ? { verified: true, groupPostUrl: permalink } : { verified: false, error: 'Facebook accepted the composer action but no exact rendered group permalink was found.' };
}

async function shareToGroup(task) {
  // Facebook's photo viewer renders the post actions beside, rather than
  // inside, the main landmark. Search the full document so approved Page
  // photo posts can use the same proof-backed group-share path as feed posts.
  const share = await waitFor(() => buttonByText(/^share$/i, document));
  if (!share) return { verified: false, error: 'The source Page post did not expose Share.' };
  share.click();
  const toGroup = await waitFor(() => buttonByText(/share to (?:a )?group/i));
  if (!toGroup) return { verified: false, error: 'Facebook did not expose Share to a group.' };
  toGroup.click();
  const dialog = await waitFor(() => [...document.querySelectorAll('[role="dialog"]')].filter(visible).at(-1));
  const search = await waitFor(() => [...(dialog || document).querySelectorAll('input')].find((input) => visible(input) && /group/i.test(input.placeholder || input.getAttribute('aria-label') || '')));
  if (!search) return { verified: false, error: 'The group selector did not open.' };
  search.focus();
  search.value = task.groupName;
  search.dispatchEvent(new InputEvent('input', { bubbles: true, data: task.groupName, inputType: 'insertText' }));
  const group = await waitFor(() => buttonByText(new RegExp(clean(task.groupName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), dialog || document));
  if (!group) return { verified: false, error: 'The exact approved group was not available in Facebook sharing.' };
  group.click();
  const finalDialog = await waitFor(() => [...document.querySelectorAll('[role="dialog"]')].filter(visible).at(-1));
  const editor = [...(finalDialog || document).querySelectorAll('[contenteditable="true"][role="textbox"]')].filter(visible).at(-1);
  if (editor && task.body) setEditableText(editor, task.body);
  const postButton = await waitFor(() => buttonByText(/^post$/i, finalDialog || document));
  if (!postButton || postButton.getAttribute('aria-disabled') === 'true') return { verified: false, error: 'Facebook did not enable the approved group share.' };
  postButton.click();
  await new Promise((resolve) => setTimeout(resolve, 5000));
  return { submitted: true, verified: false };
}

async function verifyGroupPost(task) {
  const body = String(task.body || '');
  const title = clean(task.title || '');
  const titleTail = title.split(/\s+[—–-]\s+/).at(-1) || title;
  const boldPhrases = [...body.matchAll(/\*\*([^*]{8,180})\*\*/g)].map((match) => clean(match[1]));
  const contentSignatures = [...new Set([titleTail, ...boldPhrases, title])]
    .filter((value) => value.length >= 12);
  let sourcePhotoId = '';
  try {
    sourcePhotoId = new URL(task.sourcePostUrl || '').searchParams.get('fbid') || '';
  } catch {
    sourcePhotoId = '';
  }

  const permalink = await waitFor(() => {
    const sourceSeeds = sourcePhotoId
      ? [...document.querySelectorAll(`a[href*="fbid=${sourcePhotoId}"]`)]
      : [...document.querySelectorAll('div, article')]
        .filter((node) => contentSignatures.some((signature) => clean(node.innerText).includes(signature)))
        .slice(0, 40);

    for (const seed of sourceSeeds) {
      let scope = seed;
      for (let depth = 0; scope && depth < 12; depth += 1, scope = scope.parentElement) {
        const scopeText = clean(scope.innerText || '');
        if (!contentSignatures.some((signature) => scopeText.includes(signature))) continue;

        const direct = [...scope.querySelectorAll(`a[href*="/groups/${task.groupId}/posts/"]`)]
          .map((anchor) => canonicalFacebookUrl(anchor.href))
          .find(Boolean);
        if (direct) return direct;

        // Facebook sometimes exposes the exact group-post ID only through the
        // admin's Post Insights link. It belongs to the same rendered post
        // container, so it is suitable proof for a canonical group permalink.
        const insights = [...scope.querySelectorAll(`a[href*="/groups/${task.groupId}/post_insights/"]`)]
          .map((anchor) => anchor.href.match(/\/post_insights\/(\d+)/)?.[1] || '')
          .find(Boolean);
        if (insights) return `https://www.facebook.com/groups/${task.groupId}/posts/${insights}/`;
      }
    }
    return '';
  }, 45_000);
  return permalink ? { verified: true, groupPostUrl: permalink } : { verified: false, error: 'The approved group share did not produce an exact rendered permalink.' };
}

async function publishApprovedGroupPost(task) {
  if (!task?.id || task.status !== 'approved') return { verified: false, error: 'Only an approved ledger item can be published.' };
  if (task.method === 'share') return shareToGroup(task);
  return directGroupPost(task);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = message?.type === 'CPH_PAGE_READY' ? () => ({
    ready: ['interactive', 'complete'].includes(document.readyState),
    bodyTextLength: clean(document.body?.innerText).length,
    url: canonicalFacebookUrl(location.href),
  })
    : message?.type === 'CPH_CAPTURE_BIRTHDAYS' ? () => captureBirthdays()
      : message?.type === 'CPH_CAPTURE_OWNED_COMMENTS' ? () => captureOwnedComments(message.pageUrl)
      : message?.type === 'CPH_PREPARE_APPROVED_REPLY' ? () => prepareApprovedReply(message.task)
        : message?.type === 'CPH_VALIDATE_PREPARED_REPLY' ? () => validatePreparedReply(message.task)
        : message?.type === 'CPH_VERIFY_APPROVED_REPLY' ? () => verifyApprovedReply(message.task)
        : message?.type === 'CPH_PUBLISH_APPROVED_GROUP_POST' ? () => publishApprovedGroupPost(message.task)
          : message?.type === 'CPH_VERIFY_GROUP_POST' ? () => verifyGroupPost(message.task)
          : null;
  if (!handler) return false;
  Promise.resolve().then(handler).then(sendResponse).catch((error) => sendResponse({ error: String(error?.message || error) }));
  return true;
});

scheduleBirthdayWishWorker();
