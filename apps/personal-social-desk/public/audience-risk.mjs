export const TRUSTED_REVIEW_DOMAINS = Object.freeze(['tinyurl.com']);

export const REVIEW_SHORTENER_DOMAINS = Object.freeze([
  'bit.ly',
  'buff.ly',
  'cutt.ly',
  'is.gd',
  'lnkd.in',
  'ow.ly',
  'qrco.de',
  'rb.gy',
  'rebrand.ly',
  's.id',
  'short.io',
  'shorter.me',
  'shorturl.at',
  't.ly',
  'tiny.cc',
  'trib.al',
  'v.gd',
  'wa.link',
  'l.wl.co',
]);

const SIGNAL_LABELS = Object.freeze({
  'shortened-url': 'Shortened public URL',
  'punycode-domain': 'Encoded public-link domain',
  'ip-address-link': 'Public link uses an IP address',
  'review-url-wording': 'Public link contains claim, wallet, login, or verification wording',
  'profile-name-solicitation': 'Profile name asks people to follow, message, inbox, or text it',
  'profile-bio-solicitation': 'Profile bio asks people to follow, message, inbox, or text it',
  'profile-name-money-claim': 'Profile name contains a payment or dollar-amount claim',
  'profile-bio-money-claim': 'Profile bio contains a payment or dollar-amount claim',
  'profile-name-scam-language': 'Profile name contains prize, profit, fee, or payment wording',
  'profile-bio-scam-language': 'Profile bio contains prize, profit, fee, or payment wording',
  'profile-name-romance-scam-language': 'Profile name matches romance-scam wording',
  'profile-bio-romance-scam-language': 'Profile bio matches romance-scam wording',
});

const SOLICITATION_PATTERN = /\b(?:(?:follow|message|inbox|text|dm|whats?app|telegram)\s+(?:me|us|now|direct(?:ly)?)|send\s+me\s+(?:a\s+)?message)\b/i;
const NUMERIC_MONEY_PATTERN = /(?:[$€£]\s*\d[\d,.]*(?:\s*[kmb])?|\b(?:usd|dollars?|euros?|pounds?)\s*\d[\d,.]*(?:\s*[kmb])?|\b\d[\d,.]*(?:\s*[kmb])?\s*(?:usd|dollars?|euros?|pounds?)\b)/i;
const WORD_MONEY_PATTERN = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|hundred|thousand|million|billion)(?:[\s-]+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|hundred|thousand|million|billion))*\s+(?:usd|dollars?|euros?|pounds?)\b/i;
const SCAM_LANGUAGE_PATTERN = /\b(?:pay\s+me|claim\s+(?:your\s+)?(?:prize|reward|winnings)|guaranteed\s+(?:profit|return)|investment\s+opportunit(?:y|ies)|cash\s*app\s+flip|send\s+(?:a\s+)?(?:fee|deposit))\b/i;
const ROMANCE_SCAM_PATTERN = /\b(?:hello\s+darling|i(?:'|’)m\s+still\s+single|i\s+want\s+a\s+relationship|let(?:'|’)s\s+start\s+(?:a\s+)?private\s+chat|private\s+chat\s+here)\b/i;

const KEEP_BLOCKED_SIGNAL_CODES = new Set([
  'profile-name-solicitation',
  'profile-bio-solicitation',
  'profile-name-money-claim',
  'profile-bio-money-claim',
  'profile-name-scam-language',
  'profile-bio-scam-language',
  'profile-name-romance-scam-language',
  'profile-bio-romance-scam-language',
]);

function compact(value, limit = 180) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function normalizeRiskDomain(value) {
  const raw = compact(value, 1200).toLowerCase();
  if (!raw) return '';
  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return String(parsed.hostname || '').toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  } catch {
    return raw.replace(/^www\./, '').replace(/[/:?#].*$/, '').replace(/\.$/, '');
  }
}

function domainMatches(domain, candidates) {
  const normalized = normalizeRiskDomain(domain);
  return candidates.some((candidate) => normalized === candidate || normalized.endsWith(`.${candidate}`));
}

export function isTrustedReviewDomain(domain) {
  return domainMatches(domain, TRUSTED_REVIEW_DOMAINS);
}

export function isReviewShortenerDomain(domain) {
  return !isTrustedReviewDomain(domain) && domainMatches(domain, REVIEW_SHORTENER_DOMAINS);
}

export function riskSignalLabel(signal) {
  return SIGNAL_LABELS[signal?.code] || compact(signal?.label || signal?.code, 180) || 'Profile warning signal';
}

export function audienceRiskSignals(person) {
  if (Array.isArray(person?.riskSignals) && person.riskSignals.length) {
    return person.riskSignals
      .map((signal) => ({
        code: compact(signal?.code || signal?.signal || 'profile-warning', 80).toLowerCase(),
        kind: signal?.kind === 'presentation' ? 'presentation' : 'link',
        label: compact(signal?.label, 180) || SIGNAL_LABELS[compact(signal?.code || signal?.signal || '', 80).toLowerCase()] || 'Profile warning signal',
        domain: normalizeRiskDomain(signal?.domain || signal?.url),
        url: compact(signal?.url, 1200),
        excerpt: compact(signal?.excerpt, 180),
        source: compact(signal?.source, 80) || 'profile-review',
      }))
      .filter((signal, index, list) => signal.code && !isTrustedReviewDomain(signal.domain) && list.findIndex((entry) => `${entry.code}|${entry.domain}|${entry.url}` === `${signal.code}|${signal.domain}|${signal.url}`) === index);
  }
  const observation = person?.profileObservation || {};
  const signals = [];
  const seen = new Set();
  const add = (raw = {}) => {
    const domain = normalizeRiskDomain(raw.domain || raw.url);
    if (domain && isTrustedReviewDomain(domain)) return;
    const code = compact(raw.code || raw.signal || 'profile-warning', 80).toLowerCase();
    const url = compact(raw.url, 1200);
    const excerpt = compact(raw.excerpt, 180);
    const key = `${code}|${domain}|${url}`;
    if (!code || seen.has(key)) return;
    seen.add(key);
    const signal = {
      code,
      kind: raw.kind === 'link' || domain || url ? 'link' : 'presentation',
      label: compact(raw.label, 180) || SIGNAL_LABELS[code] || 'Profile warning signal',
      domain,
      url,
      excerpt,
      source: compact(raw.source, 80) || 'profile-review',
    };
    signals.push(signal);
  };

  for (const item of Array.isArray(observation.linkReviewSignals) ? observation.linkReviewSignals : []) {
    const domain = normalizeRiskDomain(item?.domain || item?.url);
    if (isTrustedReviewDomain(domain)) continue;
    const codes = Array.isArray(item?.signals) && item.signals.length ? item.signals : ['profile-warning'];
    codes.forEach((code) => add({ code, kind: 'link', domain, url: item?.url, source: 'ryzen-link-review' }));
  }

  for (const link of Array.isArray(observation.publicLinks) ? observation.publicLinks : []) {
    const domain = normalizeRiskDomain(link?.domain || link?.url);
    if (isReviewShortenerDomain(domain)) add({ code: 'shortened-url', kind: 'link', domain, url: link?.url, source: 'known-shortener-catalog' });
    for (const code of Array.isArray(link?.riskSignals) ? link.riskSignals : []) add({ code, kind: 'link', domain, url: link?.url, source: 'ryzen-public-link' });
  }

  for (const item of Array.isArray(observation.presentationReviewSignals) ? observation.presentationReviewSignals : []) {
    const code = compact(typeof item === 'string' ? item : item?.code, 80).toLowerCase();
    const excerpt = compact(typeof item === 'string' ? '' : item?.excerpt, 700);
    if (code.endsWith('-solicitation') && excerpt && !SOLICITATION_PATTERN.test(excerpt)) continue;
    if (typeof item === 'string') add({ code: item, kind: 'presentation', source: 'ryzen-presentation-review' });
    else add({ ...item, kind: 'presentation', source: item?.source || 'ryzen-presentation-review' });
  }

  const nameText = compact([person?.name, person?.originalExportName].filter(Boolean).join(' '), 320);
  const bioText = compact([observation.description, observation.publicFacts?.bio, person?.archiveSubtitle].filter(Boolean).join(' '), 700);
  const inspectPresentation = (text, location) => {
    if (!text) return;
    if (SOLICITATION_PATTERN.test(text)) add({ code: `profile-${location}-solicitation`, kind: 'presentation', excerpt: text, source: 'social-desk-text-review' });
    if (NUMERIC_MONEY_PATTERN.test(text) || WORD_MONEY_PATTERN.test(text)) add({ code: `profile-${location}-money-claim`, kind: 'presentation', excerpt: text, source: 'social-desk-text-review' });
    if (SCAM_LANGUAGE_PATTERN.test(text)) add({ code: `profile-${location}-scam-language`, kind: 'presentation', excerpt: text, source: 'social-desk-text-review' });
    if (ROMANCE_SCAM_PATTERN.test(text)) add({ code: `profile-${location}-romance-scam-language`, kind: 'presentation', excerpt: text, source: 'social-desk-text-review' });
  };
  inspectPresentation(nameText, 'name');
  inspectPresentation(bioText, 'bio');

  return signals;
}

export function audienceRiskDisposition(person) {
  return ['ignored', 'removal-review'].includes(person?.riskDisposition) ? person.riskDisposition : 'pending';
}

export function hasActionableAudienceRisk(person) {
  if (person?.decision === 'removed' || person?.decision === 'blocked-minor' || person?.profileState === 'minor-blocked') return false;
  const disposition = audienceRiskDisposition(person);
  return disposition === 'removal-review' || (disposition !== 'ignored' && audienceRiskSignals(person).length > 0);
}

export function shouldKeepAudienceBlocked(person) {
  const publicFacts = person?.profileObservation?.publicFacts || {};
  const age = Number(person?.age ?? publicFacts.age ?? person?.facebookBirthday?.age);
  if (person?.decision === 'blocked-minor' || person?.profileState === 'minor-blocked' || (Number.isFinite(age) && age > 0 && age < 18)) return true;
  if (person?.facebookBlockRetained === true) return true;
  const disposition = audienceRiskDisposition(person);
  if (disposition === 'ignored') return false;
  if (disposition === 'removal-review') return true;
  return audienceRiskSignals(person).some((signal) => KEEP_BLOCKED_SIGNAL_CODES.has(signal.code));
}

export function summarizeAudienceRisk(people = []) {
  const domainCounts = new Map();
  const reasonCounts = new Map();
  const increment = (map, key, disposition) => {
    const row = map.get(key) || { count: 0, active: 0, ignored: 0 };
    row.count += 1;
    if (disposition === 'ignored') row.ignored += 1;
    else row.active += 1;
    map.set(key, row);
  };
  let detected = 0;
  let active = 0;
  let ignored = 0;
  let redFlagged = 0;
  let exactProfiles = 0;
  let friends = 0;
  for (const person of Array.isArray(people) ? people : []) {
    const signals = audienceRiskSignals(person);
    const disposition = audienceRiskDisposition(person);
    if (signals.length) detected += 1;
    if (disposition === 'ignored') ignored += 1;
    for (const signal of signals) {
      if (signal.domain) increment(domainCounts, signal.domain, disposition);
      increment(reasonCounts, riskSignalLabel(signal), disposition);
    }
    if (!hasActionableAudienceRisk(person)) continue;
    active += 1;
    if (disposition === 'removal-review') redFlagged += 1;
    if (person?.id || person?.url) exactProfiles += 1;
    if (person?.friend) friends += 1;
  }
  const rows = (map, key) => [...map.entries()].map(([label, counts]) => ({ [key]: label, ...counts })).sort((left, right) => right.count - left.count || left[key].localeCompare(right[key]));
  return {
    detected,
    active,
    ignored,
    redFlagged,
    exactProfiles,
    friends,
    domains: rows(domainCounts, 'domain'),
    reasons: rows(reasonCounts, 'label'),
    trustedDomains: [...TRUSTED_REVIEW_DOMAINS],
  };
}

