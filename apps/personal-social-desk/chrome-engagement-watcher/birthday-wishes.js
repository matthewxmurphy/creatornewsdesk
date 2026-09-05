(function birthdayWishesModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SocialDeskBirthdayWishes = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function birthdayDateKey(monthDay, now = new Date()) {
    const match = String(monthDay || '').match(new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{1,2})\\b`, 'i'));
    if (!match) return '';
    const monthIndex = MONTHS.findIndex((month) => month.toLowerCase() === match[1].toLowerCase());
    const day = Number(match[2]);
    if (monthIndex < 0 || !Number.isInteger(day) || day < 1 || day > 31) return '';
    const candidates = [-1, 0, 1].map((offset) => new Date(now.getFullYear() + offset, monthIndex, day, 12, 0, 0, 0))
      .filter((candidate) => candidate.getMonth() === monthIndex && candidate.getDate() === day)
      .sort((left, right) => Math.abs(left.valueOf() - now.valueOf()) - Math.abs(right.valueOf() - now.valueOf()));
    return candidates.length ? localDateKey(candidates[0]) : '';
  }

  function exactIdentityKey(person = {}) {
    const actorId = String(person.actorId || '').replace(/\D/g, '');
    if (actorId) return `facebook-id:${actorId}`;
    try {
      const url = new URL(String(person.actorUrl || ''));
      if (!['www.facebook.com', 'facebook.com'].includes(url.hostname)) return '';
      url.protocol = 'https:';
      url.hostname = 'www.facebook.com';
      url.hash = '';
      if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
      return `facebook-url:${url.toString()}`;
    } catch {
      return '';
    }
  }

  function wishKey(person = {}, now = new Date()) {
    const identityKey = exactIdentityKey(person);
    const dateKey = String(person.birthdayDateKey || birthdayDateKey(person.monthDay, now));
    return identityKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? `${identityKey}|${dateKey}` : '';
  }

  function attemptedStatus(status) {
    return ['pending-audit', 'attempted', 'sent'].includes(String(status || ''));
  }

  function hasAttempt(history = [], key = '') {
    return Boolean(key && history.some((entry) => entry.wishKey === key && attemptedStatus(entry.status)));
  }

  function rateLimit(history = [], now = new Date(), limits = {}) {
    const minimumGapMs = Number(limits.minimumGapMs || 60_000);
    const hourlyLimit = Number(limits.hourly || 12);
    const dailyLimit = Number(limits.daily || 40);
    const attempts = history.filter((entry) => attemptedStatus(entry.status))
      .map((entry) => ({ ...entry, time: Date.parse(entry.actionAt || entry.attemptedAt || '') }))
      .filter((entry) => Number.isFinite(entry.time))
      .sort((left, right) => right.time - left.time);
    const nowMs = now.valueOf();
    const last = attempts[0]?.time || 0;
    if (last && nowMs - last < minimumGapMs) {
      return { allowed: false, reason: 'minimum-gap', retryAfterMs: Math.max(1_000, minimumGapMs - (nowMs - last)) };
    }
    const hourly = attempts.filter((entry) => nowMs - entry.time < 60 * 60_000).length;
    if (hourly >= hourlyLimit) {
      const oldest = attempts.filter((entry) => nowMs - entry.time < 60 * 60_000).at(-1);
      return { allowed: false, reason: 'hourly-limit', retryAfterMs: Math.max(1_000, 60 * 60_000 - (nowMs - oldest.time)) };
    }
    const today = localDateKey(now);
    const daily = attempts.filter((entry) => localDateKey(new Date(entry.time)) === today).length;
    if (daily >= dailyLimit) return { allowed: false, reason: 'daily-limit', retryAfterMs: 24 * 60 * 60_000 };
    return { allowed: true, reason: '', retryAfterMs: 0 };
  }

  return {
    MONTHS,
    attemptedStatus,
    birthdayDateKey,
    exactIdentityKey,
    hasAttempt,
    localDateKey,
    rateLimit,
    wishKey,
  };
}));
