const $ = (selector) => document.querySelector(selector);
let queue = [];
let imageReviewFeed = { dailySets: [], items: [] };
let imageStyleLibrary = { families: [], dateOverrides: {} };
let pendingMedia = [];
let audience = { summary: {}, coverage: {}, people: [] };
let audienceReports = { reports: {} };
let peopleProfileKind = 'all';
let peopleRenderLimit = 100;
let scanProgressData = {};
let locationSelection = { country: '', area: '', city: '' };
let comments = { items: [], mode: 'review' };
let aiNightlyLane = { requests: [], drafts: [], slots: [] };
let firstCommentLedger = { comments: [] };
let publishingPipeline = { updatedAt: null, rows: [], analytics: { totals: {}, targets: [], hours: [], days: [], heatmap: [], bestWindows: [] } };
let mediaLibraryView = 'drafts';
let archiveRemixLibrary = { summary: {}, policy: {}, candidates: [] };
let archiveRemixFilter = 'recommended';
let archiveRemixRenderLimit = 24;
let mediaDraftPage = 1;
let mediaRenderQueued = false;
let queueIndexCache = { ref: null, length: 0, byId: new Map(), feedByDebateSource: new Map(), storiesByParentId: new Map(), storiesBySource: new Map(), storiesByTargetSeries: new Map() };
const MEDIA_DRAFTS_PER_PAGE = 12;
const MEDIA_RENDER_VERSION = 'full-bleed-v1';

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab,.view').forEach((node) => node.classList.remove('active'));
  tab.classList.add('active');
  $(`#${tab.dataset.view}`)?.classList.add('active');
  const peopleSubnav = $('.people-subnav');
  if (peopleSubnav) peopleSubnav.hidden = tab.dataset.view !== 'people';
  if (tab.dataset.view === 'media-library') scheduleRenderMediaDrafts();
}));

async function json(url, options) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) throw new Error((await response.json()).error || 'Request failed');
  return response.json();
}

async function copyText(value) {
  const text = String(value || '');
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  }
}

async function copyFromButton(button, value) {
  const copied = await copyText(value);
  const original = button.textContent;
  button.textContent = copied ? 'Copied' : 'Copy blocked — use Preview';
  button.classList.toggle('copied', copied);
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
  }, 1400);
}

function escape(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function personInitials(name = '') {
  return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function personPublicFacts(person = {}) {
  return person.factSummary || person.profileObservation?.publicFacts || person.publicFacts || {};
}

function personProfileKind(person = {}) {
  const facts = personPublicFacts(person);
  const category = String(facts.category || '').trim().toLowerCase();
  if (category === 'digital creator') return 'digital-creator';
  if (facts.entityType !== 'page' && facts.type === 'personal') return 'regular-profile';
  return 'other-profile';
}

function personHasBirthday(person = {}) {
  const facts = personPublicFacts(person);
  return Boolean(facts.age || facts.birthday || facts.birthDate || facts.dateOfBirth || person.birthday || person.age);
}

function publicFactAge(person = {}) {
  const facts = personPublicFacts(person);
  const direct = Number(facts.age || person.age || 0);
  if (direct >= 13 && direct <= 120) return direct;
  const parsed = Date.parse(facts.birthDate || person.facebookBirthday || person.birthday || '');
  if (!Number.isFinite(parsed)) return null;
  const born = new Date(parsed);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age -= 1;
  return age >= 13 && age <= 120 ? age : null;
}

function factValue(person, key, fallback = 'Unknown') {
  const value = String(personPublicFacts(person)?.[key] || '').trim();
  return value || fallback;
}

function audienceDistribution(people, valueForPerson) {
  const counts = new Map();
  people.forEach((person) => {
    const value = String(valueForPerson(person) || 'Unknown').trim() || 'Unknown';
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function ageGroup(person) {
  const age = publicFactAge(person);
  if (age == null) return personHasBirthday(person) ? 'DOB captured · age unavailable' : 'Age / DOB not found';
  if (age < 18) return 'Under 18';
  if (age <= 24) return '18–24';
  if (age <= 34) return '25–34';
  if (age <= 44) return '35–44';
  if (age <= 54) return '45–54';
  if (age <= 64) return '55–64';
  return '65+';
}

function distributionCard(title, subtitle, rows, dimension) {
  const maximum = Math.max(1, ...rows.map((row) => row.count));
  return `<article class="audience-intelligence-card"><header><h3>${escape(title)}</h3><span>${escape(subtitle)}</span></header><div class="audience-distribution">${rows.slice(0, 10).map((row) => `<button type="button" data-audience-segment="${escape(dimension)}" data-audience-segment-value="${escape(row.label)}"><span><b>${escape(row.label)}</b><em>${Number(row.count).toLocaleString()}</em></span><i style="--segment-width:${Math.max(2, (row.count / maximum) * 100)}%"></i></button>`).join('')}</div></article>`;
}

const US_LOCATION_AREAS = new Set('Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|District of Columbia'.split('|'));
const CANADA_LOCATION_AREAS = new Set('Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Nova Scotia|Ontario|Prince Edward Island|Quebec|Saskatchewan'.split('|'));
const PHILIPPINES_LOCATION_AREAS = new Set('Abra|Agusan del Norte|Agusan del Sur|Aklan|Albay|Antique|Apayao|Aurora|Basilan|Bataan|Batanes|Batangas|Benguet|Biliran|Bohol|Bukidnon|Bulacan|Cagayan|Camarines Norte|Camarines Sur|Camiguin|Capiz|Catanduanes|Cavite|Cebu|Cotabato|Davao|Davao del Norte|Davao del Sur|Davao de Oro|Eastern Samar|Guimaras|Ifugao|Ilocos Norte|Ilocos Sur|Iloilo|Isabela|Kalinga|La Union|Laguna|Lanao del Norte|Lanao del Sur|Leyte|Maguindanao|Marinduque|Masbate|Misamis Occidental|Misamis Oriental|Mountain Province|Negros Occidental|Negros Oriental|Northern Samar|Nueva Ecija|Nueva Vizcaya|Occidental Mindoro|Oriental Mindoro|Palawan|Pampanga|Pangasinan|Quezon|Quirino|Rizal|Romblon|Samar|Sarangani|Siquijor|Sorsogon|South Cotabato|Southern Leyte|Sultan Kudarat|Sulu|Surigao del Norte|Surigao del Sur|Tarlac|Tawi-Tawi|Zambales|Zamboanga del Norte|Zamboanga del Sur|Zamboanga Sibugay'.split('|'));
const SOUTH_AFRICA_LOCATION_AREAS = new Set('Eastern Cape|Free State|Gauteng|KwaZulu-Natal|Limpopo|Mpumalanga|North West|Northern Cape|Western Cape'.split('|'));
const KNOWN_LOCATION_COUNTRIES = new Set('Philippines|Nigeria|South Africa|Kenya|Indonesia|Bangladesh|Saudi Arabia|United Kingdom|United Arab Emirates|India|Hong Kong|Ghana|Pakistan|Jamaica|Malaysia|Singapore|Australia|New Zealand|Mexico|Brazil|Uganda|Tanzania|Zimbabwe|Zambia|Namibia|Botswana|Ireland|Germany|France|Spain|Italy|Netherlands|Belgium|Norway|Sweden|Denmark|Finland|Japan|South Korea|Thailand|Vietnam'.split('|'));

function locationParts(person) {
  const facts = personPublicFacts(person);
  const parts = String(facts.location || '').split(',').map((part) => part.trim()).filter(Boolean);
  const tail = parts.at(-1) || '';
  let country = String(facts.country || '').trim();
  if (!country && US_LOCATION_AREAS.has(tail)) country = 'United States';
  if (!country && CANADA_LOCATION_AREAS.has(tail)) country = 'Canada';
  if (!country && PHILIPPINES_LOCATION_AREAS.has(tail)) country = 'Philippines';
  if (!country && SOUTH_AFRICA_LOCATION_AREAS.has(tail)) country = 'South Africa';
  if (!country && KNOWN_LOCATION_COUNTRIES.has(tail)) country = tail;
  if (!country) country = parts.length ? 'Country not explicit' : 'Country not found';
  const tailIsCountry = tail === country;
  return { country, area: tailIsCountry ? (parts.length > 2 ? parts.at(-2) : '') : parts.length > 1 ? tail : '', city: parts[0] || '' };
}

function peopleForSegment(dimension, value) {
  const people = audience.people || [];
  if (dimension === 'country') return people.filter((person) => locationParts(person).country === value);
  if (dimension === 'employment') return people.filter((person) => factValue(person, 'employment', 'Not stated') === value);
  if (dimension === 'age') return people.filter((person) => ageGroup(person) === value);
  if (dimension === 'gender') return people.filter((person) => factValue(person, 'gender', 'Not stated') === value);
  if (dimension === 'relationship') return people.filter((person) => factValue(person, 'relationshipStatus', 'Not stated') === value);
  if (dimension === 'type') return people.filter((person) => factValue(person, 'type') === value);
  if (dimension === 'verification') return people.filter((person) => (personPublicFacts(person).verified ? 'Verified badge seen' : personPublicFacts(person).verificationObserved ? 'Badge not seen' : 'Not checked') === value);
  if (dimension === 'mutual') return people.filter((person) => {
    const count = Number(personPublicFacts(person).mutualFriends || person.mutualFriends || 0);
    const label = count >= 20 ? '20+' : count >= 5 ? '5–19' : count >= 1 ? '1–4' : 'None captured';
    return label === value;
  });
  if (dimension === 'links') return people.filter((person) => factValue(person, 'linkState', 'Not checked') === value);
  return people;
}

function renderAudienceDrilldown(title, people, detail = '') {
  $('#audience-drilldown').hidden = false;
  $('#audience-drilldown-title').textContent = title;
  $('#audience-drilldown-summary').textContent = detail || `${Number(people.length).toLocaleString()} matching people from captured public profile data.`;
  $('#audience-drilldown-people-count').textContent = `${Number(people.length).toLocaleString()} people`;
  $('#audience-drilldown-breakdown').innerHTML = [['With profile image', people.filter((person) => person.avatar || person.image).length], ['Linked profiles', people.filter((person) => person.url || person.id).length], ['Engaged', people.filter((person) => Number(person.score || 0) > 0).length], ['Friends', people.filter((person) => person.friend).length]].map(([label, count]) => `<div><strong>${Number(count).toLocaleString()}</strong><span>${label}</span></div>`).join('');
  $('#audience-drilldown-people').innerHTML = people.slice(0, 100).map((person) => `<article><div class="audience-avatar">${avatarMarkup(person)}</div><div><strong>${escape(person.name)}</strong><span>${escape([personPublicFacts(person).category, personPublicFacts(person).location, personPublicFacts(person).work].filter(Boolean).join(' · ') || 'Public details not captured')}</span></div></article>`).join('') || '<p>No matching people.</p>';
  $('#audience-drilldown').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderLocationBrowser() {
  const people = audience.people || [];
  const known = people.filter((person) => locationParts(person).country !== 'Country not found');
  const countries = audienceDistribution(known, (person) => locationParts(person).country);
  if (!locationSelection.country || !countries.some((row) => row.label === locationSelection.country)) locationSelection = { country: '', area: '', city: '' };
  const countryPeople = locationSelection.country ? known.filter((person) => locationParts(person).country === locationSelection.country) : [];
  const areas = audienceDistribution(countryPeople.filter((person) => locationParts(person).area), (person) => locationParts(person).area);
  const areaPeople = locationSelection.area ? countryPeople.filter((person) => locationParts(person).area === locationSelection.area) : [];
  const cities = audienceDistribution(locationSelection.area ? areaPeople : countryPeople.filter((person) => locationParts(person).city), (person) => locationParts(person).city);
  const resolvedCountries = known.filter((person) => locationParts(person).country !== 'Country not explicit').length;
  $('#audience-country-coverage').textContent = `${known.length.toLocaleString()} public locations · ${resolvedCountries.toLocaleString()} resolved to a country`;
  const column = (heading, rows, level, selected) => `<section><header><strong>${heading}</strong><span>${rows.length.toLocaleString()}</span></header>${rows.slice(0, 80).map((row) => `<button type="button" class="${row.label === selected ? 'active' : ''}" data-location-level="${level}" data-location-value="${escape(row.label)}"><span>${escape(row.label)}</span><b>${row.count.toLocaleString()}</b></button>`).join('') || '<p>No captured entries at this level.</p>'}</section>`;
  $('#audience-country-browser').innerHTML = `${column('Countries', countries, 'country', locationSelection.country)}${column('States / areas', areas, 'area', locationSelection.area)}${column('Cities', cities, 'city', locationSelection.city)}`;
}

function renderAudienceIntelligence() {
  const people = audience.people || [];
  const known = (key) => people.filter((person) => String(personPublicFacts(person)?.[key] || '').trim()).length;
  const countryKnown = people.filter((person) => !['Country not found', 'Country not explicit'].includes(locationParts(person).country)).length;
  const ageKnown = people.filter((person) => publicFactAge(person) != null || personHasBirthday(person)).length;
  const stats = [['Captured followers', people.length, 'all'], ['Public country', countryKnown, 'country'], ['Public location', known('location'), 'location'], ['Age / DOB found', ageKnown, 'age'], ['Employment found', known('employment'), 'employment'], ['Work found', known('work'), 'work'], ['Gender stated', known('gender'), 'gender'], ['Relationship stated', known('relationshipStatus'), 'relationship']];
  $('#people-detail-stats').innerHTML = stats.map(([label, count, key]) => `<button type="button" data-intelligence-kpi="${key}"><strong>${Number(count).toLocaleString()}</strong><span>${escape(label)}</span></button>`).join('');
  const cards = [
    distributionCard('Top countries', 'Known and location-derived countries', audienceDistribution(people, (person) => locationParts(person).country), 'country'),
    distributionCard('Employment', 'Work and owner signals', audienceDistribution(people, (person) => factValue(person, 'employment', 'Not stated')), 'employment'),
    distributionCard('Age groups', 'Public ages and birthdays found', audienceDistribution(people, ageGroup), 'age'),
    distributionCard('Gender', 'Only stated public data', audienceDistribution(people, (person) => factValue(person, 'gender', 'Not stated')), 'gender'),
    distributionCard('Relationship status', 'Only stated public data', audienceDistribution(people, (person) => factValue(person, 'relationshipStatus', 'Not stated')), 'relationship'),
    distributionCard('Profile types', 'Creators, businesses, and people', audienceDistribution(people, (person) => factValue(person, 'type')), 'type'),
    distributionCard('Verified accounts', 'Badge seen in captured Facebook rows', audienceDistribution(people, (person) => personPublicFacts(person).verified ? 'Verified badge seen' : personPublicFacts(person).verificationObserved ? 'Badge not seen' : 'Not checked'), 'verification'),
    distributionCard('Mutual friends', 'Visible connection strength', audienceDistribution(people, (person) => { const count = Number(personPublicFacts(person).mutualFriends || person.mutualFriends || 0); return count >= 20 ? '20+' : count >= 5 ? '5–19' : count >= 1 ? '1–4' : 'None captured'; }), 'mutual'),
    distributionCard('Public link signals', 'Creator, review, and external-link indicators', audienceDistribution(people, (person) => factValue(person, 'linkState', 'Not checked')), 'links'),
  ];
  $('#audience-intelligence-grid').innerHTML = cards.join('');
  renderLocationBrowser();
}

function avatarMarkup(person = {}, className = '') {
  const fallback = personInitials(person.name);
  const capturedImage = person.avatar || person.image || '';
  const image = person.key && (person.url || person.id)
    ? `/api/audience-avatar/${encodeURIComponent(person.key)}`
    : capturedImage;
  return image
    ? `<img class="${escape(className)}" src="${escape(image)}" alt="${escape(person.name || '')}" loading="lazy" data-avatar-fallback="${escape(fallback)}">`
    : `<span class="avatar-fallback ${escape(className)}">${escape(fallback)}</span>`;
}

document.addEventListener('error', (event) => {
  const image = event.target instanceof HTMLImageElement ? event.target : null;
  if (!image?.dataset.avatarFallback) return;
  const fallback = document.createElement('span');
  fallback.className = `avatar-fallback ${image.className || ''}`;
  fallback.textContent = image.dataset.avatarFallback;
  image.replaceWith(fallback);
}, true);

function renderScanProgress(data = {}) {
  scanProgressData = data || {};
  const processed = Number(data.processed || 0);
  const remaining = Number(data.remaining || 0);
  const captured = Number(data.rosterTotal || audience.summary?.followers || audience.summary?.total || 0);
  const expectedAudience = data.rosterIsComplete === false ? Math.max(24000, captured) : captured;
  const percentage = expectedAudience
    ? Math.max(0, Math.min(100, (processed / expectedAudience) * 100))
    : Math.max(0, Math.min(100, Number(data.percentage || 0)));
  const audienceGap = Math.max(0, expectedAudience - processed);
  $('#scan-progress-processed').textContent = processed.toLocaleString();
  $('#scan-progress-remaining').textContent = audienceGap.toLocaleString();
  $('#scan-progress-percentage').textContent = `${Math.round(percentage)}%`;
  $('#scan-progress-ring')?.style.setProperty('--scan-percent', `${percentage * 3.6}deg`);
  const history = Array.isArray(data.history) ? data.history.slice(-24) : [];
  const values = history.map((entry) => Number(entry.processed || 0));
  const maximum = Math.max(1, ...values);
  const points = values.map((value, index) => `${values.length === 1 ? 0 : (index / (values.length - 1)) * 260},${43 - (value / maximum) * 40}`).join(' ');
  $('#scan-progress-history')?.querySelector('polyline')?.setAttribute('points', points || '0,43 260,43');
  const scannable = Number(data.scannable || 0);
  const notLinked = Number(data.unlinked || Math.max(0, captured - scannable));
  if ($('#scan-progress-coverage')) $('#scan-progress-coverage').textContent = captured
    ? `Linked pass ${Math.round(Number(data.percentage || 0))}% complete · ${captured.toLocaleString()} captured · ${notLinked.toLocaleString()} captured followers need an exact link${data.rosterIsComplete === false ? ` · ≈${Math.max(0, expectedAudience - captured).toLocaleString()} more are outside this captured roster` : ''}`
    : 'Loading full follower coverage…';
}

async function loadScanProgress() {
  const button = $('#scan-progress-refresh');
  if (button) button.disabled = true;
  try { renderScanProgress(await json('/api/scan-progress')); }
  finally { if (button) button.disabled = false; }
}

function socialTargetLabel(item) {
  if (item.target === 'creditrepairchoices-page') return 'Credit Repair Choices';
  if (item.target === 'matthew-profile') return 'Matthew Murphy Personal Profile';
  return 'Matthew Murphy : Built Not Begged';
}

function mediaSourceUrl(media, { thumb = false } = {}) {
  const source = media?.localUrl
    || media?.url
    || media?.ryzenUrl
    || (media?.path
      ? `/api/media?path=${encodeURIComponent(media.path)}&type=${encodeURIComponent(media.type || media.mime || '')}`
      : '');
  if (!source) return '';
  const cacheValue = media?.cacheBuster || media?.updatedAt || media?.attachedAt || media?.createdAt || '';
  const cachePart = cacheValue ? `&v=${encodeURIComponent(cacheValue)}` : '';
  const renderPart = `&render=${encodeURIComponent(MEDIA_RENDER_VERSION)}`;
  if (!source.startsWith('/api/media?')) return source;
  if (!thumb) return `${source}${cachePart}${renderPart}`;
  return `${source}&thumb=1${cachePart}${renderPart}`;
}

function draftReference(item) {
  const compactId = String(item.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
  return `D-${compactId || 'UNKNOWN'}`;
}

function draftReferenceMarkup(item) {
  const reference = draftReference(item);
  return `<div class="draft-reference"><span title="Full draft ID: ${escape(item.id)}">Draft ID ${escape(reference)}</span><button type="button" data-copy-draft-id="${escape(reference)}" title="Copy Draft ID" aria-label="Copy Draft ID ${escape(reference)}"><i class="fa-regular fa-copy"></i></button></div>`;
}

function imageReviewFeedEntry(item) {
  if (!item?.id) return null;
  return (imageReviewFeed.items || []).find((entry) => [entry.draftId, entry.storyDraftId, ...(entry.linkedDraftIds || [])]
    .some((id) => String(id) === String(item.id))) || null;
}

function ctaRebuildMarkup(item) {
  if (!['audience-insight:posting-gap', 'audience-insight:missing-pinned-post'].includes(item.source)) return '';
  const source = item.ctaRebuild?.refreshState === 'latest-local-fallback' ? ' · latest local data used' : '';
  const waiting = (item.tagTargets || []).length < 12 ? ` · ${12 - (item.tagTargets || []).length} slots waiting for corrected rescans` : '';
  const rebuilt = item.ctaRebuild?.rebuiltAt ? `Last rebuilt ${new Date(item.ctaRebuild.rebuiltAt).toLocaleString()}${source}${waiting}` : `Pulls current Ryzen scans before rebuilding${waiting}`;
  return `<div class="cta-rebuild"><button type="button" data-rebuild-cta="true" title="Pull fresh Ryzen follower scans and replace the CTA targets"><i class="fa-solid fa-arrows-rotate"></i><span>Pull fresh data &amp; rebuild</span></button><small>${escape(rebuilt)}</small></div>`;
}

const fullBleedEdgeRule = 'FULL-BLEED EDGE RULE: Extend the illustrated background sharply to all four canvas edges, like print artwork continuing through a bleed area. Do not add a blurred, mirrored, stretched, duplicated, vignetted, faded, or soft-focus border. Any stated pixel margin is a safety edge only for text, signatures, faces, logos, and important objects; it must not appear as visible padding, a frame, or a border.';

function withFullBleedEdgeRule(prompt) {
  const value = String(prompt || '');
  return /FULL-BLEED EDGE RULE/i.test(value) ? value : `${value}\n\n${fullBleedEdgeRule}`;
}

function imagePrompt(item) {
  const guarded = imageReviewFeedEntry(item)?.feedPrompt;
  if (guarded) return withFullBleedEdgeRule(guarded);
  if (item.feedPrompt) return withFullBleedEdgeRule(item.feedPrompt);
  if (item.imagePrompt) return withFullBleedEdgeRule(item.imagePrompt);
  return withFullBleedEdgeRule(`Create an original landscape social image for "${item.title || 'this topic'}". Use one strong central subject, bold readable type, layered editorial detail, and a polished magazine-style composition. Source text: ${item.body || '[add post text]'}. Do not imitate another creator, invent facts, or make a crowded infographic. Keep all text and important subjects at least 30 pixels inside every edge.\n\nSIGNATURE REQUIRED: Add the exact text "Matthew Murphy" as a natural handwritten signature near the bottom-right. It must be clearly legible, inside the safe margin, and subordinate to the headline. Do not omit or misspell the signature.`);
}

function storyPrompt(item) {
  const guarded = imageReviewFeedEntry(item)?.storyPrompt;
  if (guarded) return withFullBleedEdgeRule(guarded);
  if (item.storyPrompt) return withFullBleedEdgeRule(item.storyPrompt);
  if (item.storyImagePrompt) return withFullBleedEdgeRule(item.storyImagePrompt);
  return withFullBleedEdgeRule(`Create an original 1080x1920 vertical Facebook Story image for "${item.title || 'this topic'}". Use this source text: ${item.body || '[add post text]'}. Lead with a short, specific hook and one strong central subject. Keep supporting copy to one or two short lines and end with a natural question that invites an opinion. Use bold readable typography, strong contrast, and polished editorial detail without making a crowded infographic. Keep all text, faces, logos, and important objects at least 30 pixels inside every edge and leave extra clean space near the bottom for Facebook UI. If the premise is hypothetical, label it as a scenario. Do not use Fact or Fiction unless the item is specifically designated that way. Do not copy another creator's wording, identity, family story, or visual composition.\n\nSIGNATURE REQUIRED: Add the exact text "Matthew Murphy" as a natural handwritten signature near the bottom-right. It must be clearly legible, inside the safe margin above Facebook UI, and subordinate to the main message. Do not omit or misspell the signature.`);
}

function videoPrompts(item) {
  const subject = item.title || 'this topic';
  const source = item.body || '[add post text]';
  return [
    `GROK VIDEO 1 - 15 SECONDS\nCreate a vertical 9:16 social video about "${subject}" using this source: ${source}. Start with immediate motion and one clear visual tension point in the first second. Build a coherent 15-second scene with realistic movement, strong lighting, and room for captions. Do not invent a claim or show fake quotes. End on active motion that can continue seamlessly.`,
    `GROK VIDEO 2 - EXTEND 10 SECONDS\nContinue the previous video for 10 seconds with the same subject, environment, lighting, color grade, and camera language. Do not restart or repeat the opening. Develop the next consequence or reveal and end on a natural transition.`,
    `GROK VIDEO 3 - EXTEND 6 TO 10 SECONDS\nExtend the same video for another 6-10 seconds. Resolve the visual sequence, finish with a strong final image, and leave clean lower-screen space for a question. No unsupported facts and no abrupt reset.`,
  ];
}

function promptStrip(item) {
  const prompts = [['Feed image', imagePrompt(item)], ['Story image', storyPrompt(item)], ['Grok video', videoPrompts(item).join('\n\n')]];
  return `<div class="prompt-strip">${prompts.map(([label, prompt], index) => `<details ${index === (item.format === 'story' ? 1 : 0) ? 'open' : ''}><summary>${label}</summary><pre>${escape(prompt)}</pre><button data-copy-prompt="${encodeURIComponent(prompt)}">Copy ${label} prompt</button></details>`).join('')}</div>`;
}

function mediaMarkup(item) {
  return item.media?.length ? item.media.map((media) => `<span>${escape(media.filename)}</span>`).join('') : '<span>No media attached yet</span>';
}

function mediaPreview(item) {
  if (!item.media?.length) return '';
  return item.media.map((media) => {
    const source = media.localUrl || media.url || media.ryzenUrl || '';
    if (!source) return `<div class="fb-placeholder">${escape(media.filename || 'Media attached')}</div>`;
    return /video/i.test(media.mime || media.type || media.filename || '')
      ? `<video src="${escape(source)}" controls preload="metadata"></video>`
      : `<img src="${escape(source)}" alt="${escape(media.filename || item.title || 'Post media')}">`;
  }).join('');
}

async function detectMediaRole(file) {
  if (!file.type.startsWith('image/')) return 'video';
  return new Promise((resolve) => {
    const image = new Image();
    const source = URL.createObjectURL(file);
    image.onload = () => {
      const role = image.height > image.width ? 'story' : 'feed';
      URL.revokeObjectURL(source);
      resolve(role);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      resolve('feed');
    };
    image.src = source;
  });
}

function mediaWorkspace(item, media) {
  const landscape = imagePrompt(item);
  const story = storyPrompt(item);
  const preview = media
    ? `<div class="fb-media media-count-${item.media.length}">${media}</div>`
    : `<div class="fb-placeholder missing-media"><i class="fa-regular fa-image fa-2x"></i><span>Paste or drop an image here</span><small>Landscape becomes the feed image; portrait becomes the Story image.</small></div>`;
  return `<div class="media-workspace" data-item-drop="${item.id}" data-paste-target="${item.id}" tabindex="0"><div class="media-toolbar"><button data-copy-prompt="${encodeURIComponent(landscape)}" title="Copy landscape prompt" aria-label="Copy landscape prompt"><i class="fa-regular fa-copy"></i><span>Landscape</span></button><button data-copy-prompt="${encodeURIComponent(story)}" title="Copy Story prompt" aria-label="Copy Story prompt"><i class="fa-solid fa-mobile-screen-button"></i><span>Story</span></button><button data-paste-image="true" title="Paste image from clipboard" aria-label="Paste image from clipboard"><i class="fa-regular fa-paste"></i></button><label title="Choose image or video" aria-label="Choose image or video"><i class="fa-solid fa-arrow-up-from-bracket"></i><input type="file" accept="image/*,video/*" multiple data-item-files="${item.id}"></label></div>${preview}</div>`;
}

function postCardMarkup(item) {
  const page = item.target === 'creditrepairchoices-page'
    ? 'Credit Repair Choices'
    : item.target === 'matthew-profile'
      ? 'Matthew Murphy Personal Profile'
      : 'Matthew Murphy : Built Not Begged';
  const media = mediaPreview(item);
  const status = item.status || 'draft';
  const tagTargets = (item.tagTargets || []).map((target) => `<a href="${escape(target.url)}" target="_blank" rel="noopener" title="${escape(target.reason || 'Intended Facebook tag')}">@${escape(target.name)}${target.lastPostAt ? `<small>Last post ${escape(target.lastPostAt)}</small>` : ''}</a>`).join('');
  return `<article class="feed-post" data-id="${item.id}"><div class="fb-post-head"><img class="fb-avatar" src="/icon-192.png" alt=""><div class="fb-author"><strong>${escape(page)}</strong><span>${item.scheduledFor ? new Date(item.scheduledFor).toLocaleString() : 'Not scheduled'} <i class="fa-solid fa-earth-americas" aria-label="Public"></i></span></div><span class="post-status status-${escape(status)}">${escape(status)}</span></div>${draftReferenceMarkup(item)}<div class="post-title">${escape(item.title)}</div>${tagTargets ? `<div class="post-tag-targets"><strong>Tag targets</strong>${tagTargets}</div>` : ''}${ctaRebuildMarkup(item)}<p class="fb-copy">${escape(item.body)}</p>${mediaWorkspace(item, media)}<div class="post-facts"><span>${escape(item.format || 'feed')}</span><span>${(item.tagTargets || []).length} tag target${(item.tagTargets || []).length === 1 ? '' : 's'} · ${item.media?.length || 0} media</span></div><div class="approval-actions"><button class="decision reject" data-status="rejected" aria-label="Reject ${escape(item.title)}"><i class="fa-solid fa-thumbs-down"></i><span>Reject</span></button><button class="decision approve" data-dispatch="true" aria-label="Approve ${escape(item.title)}"><i class="fa-solid fa-thumbs-up"></i><span>Approve</span></button></div><details class="post-tools"><summary><i class="fa-solid fa-wand-magic-sparkles"></i> Video prompts and attached files</summary><div class="post-workbench">${promptStrip(item)}<div class="focus-media">${mediaMarkup(item)}</div></div></details></article>`;
}

function storyCard(item) {
  const parent = parentPostFor(item);
  const waiting = parent && !['dispatched', 'published'].includes(parent.status);
  return `<article class="story-card queue-item" data-id="${item.id}"><div><span class="badge">STORY</span>${draftReferenceMarkup(item)}<h3>${escape(item.title)}</h3><p>${escape(item.body)}</p>${waiting ? `<p class="story-parent-state"><i class="fa-solid fa-clock"></i> Waiting for parent D-${escape(parent.id.slice(0, 8).toUpperCase())}</p>` : ''}${promptStrip(item)}<label class="focus-upload compact-upload" data-item-drop="${item.id}"><strong>Paste or upload vertical media</strong><input type="file" accept="image/*,video/*" multiple data-item-files="${item.id}"></label><div class="focus-media">${mediaMarkup(item)}</div></div><div class="actions"><button class="icon-action approve" data-dispatch="true" title="${waiting ? 'Waiting for parent feed post' : 'Approve'}"${waiting ? ' disabled' : ''}><i class="fa-solid fa-check"></i></button><button class="icon-action reject" data-status="rejected" title="Reject"><i class="fa-solid fa-xmark"></i></button></div></article>`;
}

function parentPostFor(item) {
  if (item.format !== 'story') return item;
  const sourceKey = String(item.source || '').startsWith('daily-story:') ? String(item.source).split(':')[1] : '';
  return queue.find((entry) => entry.id === item.parentId || (sourceKey && entry.source === `daily-debate:${sourceKey}`)) || null;
}

function storyCompanionFor(item) {
  if (item.format === 'story') return item;
  const sourceKey = String(item.source || '').startsWith('daily-debate:') ? String(item.source).split(':')[1] : '';
  return queue.find((entry) => entry.format === 'story' && (entry.parentId === item.id || (sourceKey && entry.source === `daily-story:${sourceKey}`))) || null;
}

function mediaRoleName(media = {}) {
  const explicit = String(media.role || '').toLowerCase();
  if (['feed', 'story', 'video'].includes(explicit)) return explicit;
  const filename = String(media.filename || '').toLowerCase();
  if (filename.includes('-story')) return 'story';
  if (filename.includes('-feed')) return 'feed';
  if (/video|\.mp4$|\.mov$|\.webm$/i.test(filename) || /video/i.test(String(media.mime || media.type || ''))) return 'video';
  return 'feed';
}

function auditImageState(item = {}) {
  const companion = storyCompanionFor(item);
  const reviews = [
    item.imageReview?.feed,
    item.imageReview?.story,
    companion?.imageReview?.story,
    item.imageReview?.state === 'needs-review' ? item.imageReview : null,
    companion?.imageReview?.state === 'needs-review' ? companion.imageReview : null,
  ].filter((review) => ['needs-review', 'redo'].includes(review?.state));
  const reasons = [...new Set(reviews.map((review) => String(review.note || '').trim()).filter(Boolean))];
  return {
    flagged: reviews.length > 0,
    reasons,
    shortLabel: reasons[0] || 'Needs review',
  };
}

function setQueueFilter(filter) {
  const select = $('#status-filter');
  if (!select) return;
  select.value = [...select.options].some((option) => option.value === filter) ? filter : 'all';
  renderQueue();
}

function renderQueue() {
  const filter = $('#status-filter').value;
  const items = queue.filter((item) => item.format !== 'story' && (filter === 'all' || item.status === filter));
  const drafts = items.filter((item) => item.status === 'draft');
  const stories = queue.filter((item) => item.format === 'story' && item.status === 'draft');
  const ready = queue.filter((item) => ['approved', 'dispatched'].includes(item.status)).length;
  const scheduled = queue.filter((item) => item.scheduledFor && item.status !== 'rejected').length;
  $('#queue-summary').innerHTML = [['Needs work', drafts.length], ['Stories', stories.length], ['Ready', ready], ['Scheduled', scheduled]].map(([label, value]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join('');
  $('#work-now').innerHTML = items.length ? items.map(postCardMarkup).join('') : '<div class="empty-state"><strong>You are caught up.</strong><span>No queued posts match this filter.</span></div>';
  $('#story-list').innerHTML = stories.length ? stories.map(storyCard).join('') : '<div class="empty-state"><strong>Stories are caught up.</strong><span>New companions are generated with daily posts.</span></div>';
}

async function loadQueue() {
  const [queueData, reviewData, styleData] = await Promise.all([
    json('/api/queue'),
    json('/api/image-review-feed?mode=flagged'),
    json('/api/creator-tip-art-styles'),
  ]);
  queue = queueData.items;
  imageReviewFeed = reviewData || { dailySets: [], items: [] };
  imageStyleLibrary = styleData || { families: [], dateOverrides: {} };
  queueIndexCache.ref = null;
  renderQueue();
  renderImagePromptWorkbench();
  renderStyleLibrary();
  renderDailyCovers();
  if (document.querySelector('#media-library')?.classList.contains('active')) scheduleRenderMediaDrafts();
}

function ensureQueueIndexes() {
  if (queueIndexCache.ref === queue && queueIndexCache.length === queue.length) return queueIndexCache;
  const byId = new Map();
  const feedByDebateSource = new Map();
  const storiesByParentId = new Map();
  const storiesBySource = new Map();
  const storiesByTargetSeries = new Map();
  (queue || []).forEach((entry) => {
    byId.set(entry.id, entry);
    if (entry.format === 'story') {
      if (entry.parentId && !storiesByParentId.has(entry.parentId)) storiesByParentId.set(entry.parentId, entry);
      const storySourceKey = String(entry.source || '').startsWith('daily-story:') ? String(entry.source).split(':')[1] : '';
      if (storySourceKey && !storiesBySource.has(storySourceKey)) storiesBySource.set(storySourceKey, entry);
      const storySeriesKey = `${entry.target || ''}::${draftSeriesKey(entry)}`;
      if (!storiesByTargetSeries.has(storySeriesKey)) storiesByTargetSeries.set(storySeriesKey, entry);
    } else {
      const feedSourceKey = String(entry.source || '').startsWith('daily-debate:') ? String(entry.source).split(':')[1] : '';
      if (feedSourceKey && !feedByDebateSource.has(feedSourceKey)) feedByDebateSource.set(feedSourceKey, entry);
    }
  });
  queueIndexCache = { ref: queue, length: queue.length, byId, feedByDebateSource, storiesByParentId, storiesBySource, storiesByTargetSeries };
  return queueIndexCache;
}

function scheduleRenderMediaDrafts() {
  if (mediaRenderQueued) return;
  mediaRenderQueued = true;
  const list = $('#media-draft-list');
  if (list && !list.innerHTML.trim()) {
    list.innerHTML = '<div class="empty-state"><strong>Loading media review…</strong><span>Building your draft pairs.</span></div>';
  }
  window.setTimeout(() => {
    mediaRenderQueued = false;
    renderMediaDrafts();
  }, 0);
}

function mediaReviewPayload(item, role, note) {
  const imageReview = item?.imageReview && typeof item.imageReview === 'object' ? { ...item.imageReview } : {};
  imageReview[role] = {
    state: 'redo',
    note,
    preserveMedia: true,
    reason: 'qc-note',
    updatedAt: new Date().toISOString(),
  };
  return { imageReview, mediaApproval: null, scheduledFor: null, status: 'draft' };
}

async function saveMediaRoleQc(itemId, role, note) {
  const item = queue.find((entry) => String(entry.id) === String(itemId));
  if (!item) throw new Error('That media draft is no longer in the queue.');
  const saved = await json(`/api/drafts/${encodeURIComponent(item.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(mediaReviewPayload(item, role, note)),
  });
  Object.assign(item, saved);
  return saved;
}

function chooseMediaQcReasons(label) {
  const dialog = $('#media-qc-dialog');
  const form = $('#media-qc-form');
  const save = $('#media-qc-save');
  const details = $('#media-qc-details');
  const error = $('#media-qc-error');
  if (!dialog || !form || !save || !details || !error || typeof dialog.showModal !== 'function') {
    return Promise.resolve(window.prompt(`What needs to change in the ${label}? The current image will be preserved as the QC reference.`, '') || null);
  }
  $('#media-qc-title').textContent = `What needs to change in the ${label}?`;
  form.querySelectorAll('input[type="checkbox"]').forEach((input) => { input.checked = false; });
  details.value = '';
  error.textContent = '';
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      save.removeEventListener('click', handleSave);
      dialog.removeEventListener('close', handleClose);
      if (dialog.open) dialog.close();
      resolve(value);
    };
    const handleSave = () => {
      const reasons = [...form.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
      const custom = details.value.trim();
      if (custom) reasons.push(custom);
      if (!reasons.length) {
        error.textContent = 'Choose at least one QC reason or add a specific correction.';
        return;
      }
      finish(reasons.join('; '));
    };
    const handleClose = () => finish(null);
    save.addEventListener('click', handleSave);
    dialog.addEventListener('close', handleClose);
    dialog.showModal();
  });
}

async function queueAction(event) {
  const action = event.target.closest('button');
  if (!action) return;
  if (action.dataset.copyPrompt) { await copyFromButton(action, decodeURIComponent(action.dataset.copyPrompt)); return; }
  if (action.dataset.assignStyleDate) {
    const card = action.closest('.daily-cover-card');
    const styleKey = card?.querySelector('.daily-style-select select')?.value || '';
    const status = $('#style-library-status');
    action.disabled = true;
    try {
      const result = await json('/api/creator-tip-art-styles', { method: 'POST', body: JSON.stringify({ action: 'assign', publishDate: action.dataset.assignStyleDate, styleKey }) });
      if (status) status.textContent = `${result.assignment?.family?.label || 'Style'} assigned to ${action.dataset.assignStyleDate}. Existing images were preserved; new and QC-redo prompts now use this direction.`;
      await loadQueue();
    } catch (error) {
      action.disabled = false;
      if (status) status.textContent = error.message;
    }
    return;
  }
  if (action.dataset.copyDraftId) { await copyFromButton(action, action.dataset.copyDraftId); return; }
  if (action.dataset.openMedia) { openDraftMedia(action.dataset.openMedia); return; }
  if (action.dataset.openMediaReview !== undefined) { openView('queue'); setQueueFilter('image-review'); return; }
  const mediaPairCard = action.closest('.media-draft-card');
  if (mediaPairCard && (action.dataset.mediaPairApprove !== undefined || action.dataset.mediaPairRedo !== undefined || action.dataset.mediaPairQc !== undefined || action.dataset.mediaRoleQc)) {
    const ids = String(mediaPairCard.dataset.mediaPairIds || mediaPairCard.dataset.id || '').split(',').filter(Boolean);
    const status = $('#media-review-status');
    action.disabled = true;
    try {
      if (action.dataset.mediaPairApprove !== undefined) {
        if (status) status.textContent = 'Saving approval for the Landscape and Story pair…';
        await json('/api/media-pairs/approve', { method: 'POST', body: JSON.stringify({ ids }) });
        if (status) status.textContent = 'Pair approved. Both images are now cleared together.';
      } else if (action.dataset.mediaPairRedo !== undefined) {
        if (!window.confirm('Remove both current images and send the full pair back for redo?')) { action.disabled = false; return; }
        if (status) status.textContent = 'Removing both images and returning the pair for redo…';
        await json('/api/media-pairs/redo', { method: 'POST', body: JSON.stringify({ ids }) });
        if (status) status.textContent = 'Both images were removed and the pair is back in the redo queue.';
      } else {
        const role = action.dataset.mediaRoleQc;
        const label = role === 'story' ? 'Story' : role === 'feed' ? 'Landscape' : 'pair';
        const note = await chooseMediaQcReasons(label);
        if (!String(note || '').trim()) { action.disabled = false; return; }
        if (status) status.textContent = `Saving ${label} QC note while preserving the current image…`;
        if (role) {
          await saveMediaRoleQc(action.dataset.mediaRoleTarget, role, String(note).trim());
        } else {
          await json('/api/media-pairs/qc', {
            method: 'POST',
            body: JSON.stringify({ ids, note: String(note).trim() }),
          });
        }
        if (status) status.textContent = `${label} QC saved. The existing image stays visible as the generation reference.`;
      }
      await loadQueue();
    } catch (error) {
      action.disabled = false;
      if (status) status.textContent = error.message;
      window.alert(error.message);
    }
    return;
  }
  const card = event.target.closest('[data-id]');
  if (!card) return;
  if (action.dataset.rebuildCta) {
    action.disabled = true;
    action.querySelector('span').textContent = 'Pulling scans…';
    try { await json(`/api/drafts/${card.dataset.id}/rebuild-cta`, { method: 'POST', body: '{}' }); await loadQueue(); }
    catch (error) { action.disabled = false; action.querySelector('span').textContent = 'Rebuild failed'; action.title = error.message; }
    return;
  }
  if (action.dataset.pasteImage) {
    const original = action.innerHTML;
    action.disabled = true;
    action.title = 'Optimizing and uploading clipboard image';
    action.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try { await pasteImageForItem(card.dataset.id); }
    finally { action.disabled = false; action.title = 'Paste image from clipboard'; action.innerHTML = original; }
    return;
  }
  if (action.dataset.openTools) { card.querySelector('.post-tools').open = true; card.querySelector('.post-tools').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  if (action.dataset.dispatch) {
    action.disabled = true;
    try { await json(`/api/drafts/${card.dataset.id}/dispatch`, { method: 'POST', body: '{}' }); await loadQueue(); }
    catch (error) { action.disabled = false; window.alert(error.message); }
    return;
  }
  if (action.dataset.status) { await json(`/api/drafts/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: action.dataset.status }) }); await loadQueue(); }
}
[$('#story-list'), $('#work-now'), $('#media-library')].forEach((node) => node.addEventListener('click', queueAction));
$('#status-filter').addEventListener('change', renderQueue);

$('#style-library-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const status = $('#style-library-status');
  const payload = Object.fromEntries(new FormData(form));
  button.disabled = true;
  if (status) status.textContent = 'Saving the new cartoon style…';
  try {
    const result = await json('/api/creator-tip-art-styles', { method: 'POST', body: JSON.stringify({ action: 'add', ...payload }) });
    form.reset();
    if (status) status.textContent = `${result.families?.find((family) => family.key === result.added)?.label || 'New style'} added${result.assignment ? ` and assigned to ${payload.publishDate}` : ''}.`;
    await loadQueue();
  } catch (error) {
    if (status) status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

async function uploadForItem(itemId, files) {
  const item = queue.find((entry) => entry.id === itemId);
  for (const sourceFile of [...files].filter((entry) => /^(image|video)\//.test(entry.type))) {
    const file = await optimizeMediaForUpload(sourceFile);
    const role = await detectMediaRole(file);
    const target = role === 'story' ? storyCompanionFor(item) || item : parentPostFor(item) || item;
    const response = await fetch('/api/uploads', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': file.name, 'X-Item-Id': target.id, 'X-Media-Role': role }, body: file });
    if (!response.ok) throw new Error('Media upload to Ryzen failed');
    const uploaded = await response.json();
    const media = [...(target.media || [])].filter((entry) => mediaRoleName(entry) !== role);
    media.push(uploaded);
    const saved = await json(`/api/drafts/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        media,
        completedMediaRole: role,
        completedMediaFilename: uploaded.filename,
      }),
    });
    target.media = saved.media || media;
    target.imageReview = saved.imageReview || null;
  }
  await loadQueue();
}

async function optimizeMediaForUpload(file) {
  if (!file.type.startsWith('image/') || ['image/webp', 'image/gif', 'image/svg+xml'].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 2048;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', .9));
    if (!blob || blob.size >= file.size) return file;
    const basename = file.name.replace(/\.[^.]+$/, '') || `clipboard-${Date.now()}`;
    return new File([blob], `${basename}.webp`, { type: 'image/webp', lastModified: file.lastModified || Date.now() });
  } catch {
    return file;
  }
}

async function pasteImageForItem(itemId) {
  let browserError = null;
  try {
    const clipboard = await navigator.clipboard.read();
    const files = [];
    for (const item of clipboard) {
      const type = item.types.find((candidate) => candidate.startsWith('image/'));
      if (!type) continue;
      const blob = await item.getType(type);
      files.push(new File([blob], `clipboard-${Date.now()}.${type.split('/')[1] || 'png'}`, { type }));
    }
    if (!files.length) throw new Error('No image was found on the clipboard.');
    await uploadForItem(itemId, files);
    return;
  } catch (error) {
    browserError = error;
  }
  try {
    await json('/api/clipboard-image', { method: 'POST', body: JSON.stringify({ itemId }) });
    await loadQueue();
  } catch (error) {
    window.alert(`${error.message || 'Local clipboard image import failed.'}${browserError?.message ? ` Browser clipboard also reported: ${browserError.message}` : ''}`);
  }
}

document.addEventListener('change', (event) => { if (event.target.dataset.itemFiles) uploadForItem(event.target.dataset.itemFiles, event.target.files); });
document.addEventListener('dragover', (event) => { if (event.target.closest('[data-item-drop]')) event.preventDefault(); });
document.addEventListener('drop', (event) => { const drop = event.target.closest('[data-item-drop]'); if (drop) { event.preventDefault(); uploadForItem(drop.dataset.itemDrop, event.dataTransfer.files); } });
document.addEventListener('paste', (event) => {
  if (!$('#queue').classList.contains('active') && !$('#stories').classList.contains('active') && !$('#media-library').classList.contains('active')) return;
  const files = [...event.clipboardData.items].filter((item) => item.kind === 'file').map((item) => item.getAsFile()).filter(Boolean);
  const card = $('#queue').classList.contains('active')
    ? document.activeElement.closest?.('[data-id]') || $('#work-now [data-id]')
    : $('#stories').classList.contains('active')
      ? $('#stories [data-id]')
      : document.activeElement.closest?.('[data-id]') || $('#media-draft-list [data-id]');
  if (files.length && card) { event.preventDefault(); uploadForItem(card.dataset.id, files); }
});

$('#compose-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (values.scheduledFor) values.scheduledFor = new Date(values.scheduledFor).toISOString();
  const item = await json('/api/drafts', { method: 'POST', body: JSON.stringify(values) });
  if (pendingMedia.length) await uploadForItem(item.id, pendingMedia);
  pendingMedia = []; renderPendingMedia(); event.currentTarget.reset(); await loadQueue(); document.querySelector('[data-view="queue"]').click();
});

function addMedia(files) { pendingMedia.push(...[...files].filter((file) => /^(image|video)\//.test(file.type))); renderPendingMedia(); }
function renderPendingMedia() { $('#media-list').innerHTML = pendingMedia.map((file, index) => `<div><span>${escape(file.name)}</span><small>${Math.round(file.size / 1024)} KB</small><button type="button" data-remove-media="${index}">Remove</button></div>`).join(''); }
$('#media-files').addEventListener('change', (event) => addMedia(event.target.files));
$('#media-drop').addEventListener('dragover', (event) => event.preventDefault());
$('#media-drop').addEventListener('drop', (event) => { event.preventDefault(); addMedia(event.dataTransfer.files); });
$('#media-list').addEventListener('click', (event) => { if (event.target.dataset.removeMedia !== undefined) { pendingMedia.splice(Number(event.target.dataset.removeMedia), 1); renderPendingMedia(); } });
$('#graphic-prompt').addEventListener('click', () => { const out = $('#prompt-output'); out.hidden = false; out.textContent = imagePrompt(Object.fromEntries(new FormData($('#compose-form')))); });
$('#video-prompt').addEventListener('click', () => { const out = $('#prompt-output'); out.hidden = false; out.textContent = videoPrompts(Object.fromEntries(new FormData($('#compose-form')))).join('\n\n'); });

$('#export-files').addEventListener('change', async (event) => {
  const posts = [];
  const followers = [];
  const engagements = [];
  const coverage = { hasFollowerRoster: false, hasIncomingEngagement: false, windowDays: 0, files: [] };
  let oldest = Date.now(); let newest = 0;
  const visit = (value, filename, path = '') => {
    if (Array.isArray(value)) { value.forEach((entry, index) => visit(entry, filename, `${path}/${index}`)); return; }
    if (!value || typeof value !== 'object') return;
    const lowerFile = filename.toLowerCase();
    const name = value.name || value.actor || value.author || value?.data?.[0]?.comment?.author || value?.data?.[0]?.reaction?.actor;
    const timestamp = value.timestamp || value.created_timestamp || value.update_timestamp || value?.data?.[0]?.comment?.timestamp;
    const url = value.uri || value.url || value.href || '';
    const id = value.id || value.profile_id || '';
    if (timestamp) { const time = new Date(Number(timestamp) > 1e12 ? Number(timestamp) : Number(timestamp) * 1000).valueOf(); if (time > 0) { oldest = Math.min(oldest, time); newest = Math.max(newest, time); } }
    if (/followers|friends/.test(lowerFile) && name) { followers.push({ name, timestamp, url, id }); coverage.hasFollowerRoster = true; }
    const inferredType = /comment/.test(`${lowerFile} ${path}`) ? 'comment' : /share/.test(`${lowerFile} ${path}`) ? 'share' : /mention/.test(`${lowerFile} ${path}`) ? 'mention' : /reaction|like/.test(`${lowerFile} ${path}`) ? 'reaction' : '';
    if (inferredType && name) { engagements.push({ name, timestamp, url, id, type: inferredType, post: value.title || value.comment || value.text || '' }); coverage.hasIncomingEngagement = true; }
    Object.entries(value).forEach(([key, entry]) => visit(entry, filename, `${path}/${key}`));
  };
  for (const file of event.target.files) {
    try {
      const parsed = JSON.parse(await file.text());
      coverage.files.push(file.name);
      posts.push(...(Array.isArray(parsed) ? parsed : parsed.posts || parsed.activity || []));
      visit(parsed, file.name);
    } catch {}
  }
  if (newest > 0 && oldest < Date.now()) coverage.windowDays = Math.round((newest - oldest) / 86400000);
  $('#import-status').textContent = `Analyzing ${posts.length} post records...`;
  const analytics = await json('/api/import-analysis', { method: 'POST', body: JSON.stringify({ posts }) }); renderInsights(analytics); $('#import-status').textContent = `Imported ${analytics.posts} post records.`;
  audience = await json('/api/import-audience', { method: 'POST', body: JSON.stringify({ followers, engagements, coverage }) });
  renderAudience();
  $('#import-status').textContent = `Imported ${analytics.posts} posts, ${followers.length} follower records, and ${engagements.length} engagement records.`;
});

function renderPublishingInsights() {
  const analytics = publishingPipeline.analytics || { totals: {}, targets: [], hours: [], days: [], bestWindows: [], heatmap: [] };
  const pageHistory = publishingPipeline.facebookPageHistory || {};
  const tipProgress = publishingPipeline.creatorTipPageProgress || {};
  const metaTruth = Number.isFinite(Number(pageHistory.publishedPosts)) ? [
    ['Page posts (Meta)', pageHistory.publishedPosts],
    ['Official recap posts', pageHistory.officialCreatorTipRecapPosts || 0],
    ['Extra recap posts', pageHistory.extraCreatorTipRecapPosts || 0],
    ['Numbered tip high-water', tipProgress.confirmedThroughTipNumber || 0],
  ] : [];
  $('#publishing-insight-summary').innerHTML = [
    ...metaTruth,
    ['Tracked posts', analytics.totals?.trackedPosts || 0],
    ['Performance captured', analytics.totals?.performancePosts || 0],
    ['Ready', analytics.totals?.ready || 0],
    ['Failed', analytics.totals?.failed || 0],
  ].map(([label, value]) => `<div><strong>${Number(value).toLocaleString()}</strong><span>${escape(label)}</span></div>`).join('');
  $('#publishing-insight-updated').textContent = pageHistory.observedAt
    ? `Meta Page truth refreshed ${new Date(pageHistory.observedAt).toLocaleString()}. Each recap carousel counts as one Page post.`
    : publishingPipeline.updatedAt
      ? `Publishing metrics refreshed ${new Date(publishingPipeline.updatedAt).toLocaleString()}`
    : 'Publishing metrics will appear here after the first calendar refresh.';
  $('#publishing-insight-best-times').innerHTML = (analytics.bestWindows || []).length
    ? analytics.bestWindows.map((entry) => `<article><strong>${escape(entry.label)}</strong><span>Average score ${Number(entry.averageScore || 0).toLocaleString()} · ${Number(entry.performancePosts || 0).toLocaleString()} post${Number(entry.performancePosts || 0) === 1 ? '' : 's'}</span></article>`).join('')
    : '<article><strong>No best-time winner yet</strong><span>Once visible post metrics arrive, the best windows will rank here.</span></article>';
  $('#publishing-insight-pages').innerHTML = (analytics.targets || []).length
    ? analytics.targets.map((entry) => `<article><strong>${escape(entry.label)}</strong><span>${Number(entry.performancePosts || 0).toLocaleString()} post${Number(entry.performancePosts || 0) === 1 ? '' : 's'} with performance · average score ${Number(entry.averageScore || 0).toLocaleString()}${Number.isFinite(entry.averageDelta) ? ` · average follower delta ${entry.averageDelta >= 0 ? '+' : ''}${Number(entry.averageDelta).toLocaleString()}` : ''}</span></article>`).join('')
    : '<article><strong>Waiting for page-by-page proof</strong><span>Each destination will show here after follower or post-performance evidence is captured.</span></article>';
  $('#publishing-insight-hours').innerHTML = (analytics.hours || []).map((entry) => `<article><strong>${String(entry.hour).padStart(2, '0')}:00</strong><span>${Number(entry.performancePosts || 0).toLocaleString()} post${Number(entry.performancePosts || 0) === 1 ? '' : 's'} · avg ${Number(entry.averageScore || 0).toLocaleString()}</span></article>`).join('');
  $('#publishing-insight-days').innerHTML = (analytics.days || []).map((entry) => `<article><strong>${escape(entry.label)}</strong><span>${Number(entry.performancePosts || 0).toLocaleString()} post${Number(entry.performancePosts || 0) === 1 ? '' : 's'} · avg ${Number(entry.averageScore || 0).toLocaleString()}</span></article>`).join('');
  $('#publishing-insight-heatmap').innerHTML = (analytics.heatmap || []).map((entry) => {
    const score = Number(entry.averageScore || 0);
    const intensity = Math.max(0, Math.min(100, score));
    return `<div class="publishing-heat-cell" style="--publishing-intensity:${intensity};" title="${escape(`${entry.label} ${String(entry.hour).padStart(2, '0')}:00 · ${entry.performancePosts || 0} posts · avg ${score}`)}"><strong>${escape(entry.label)}</strong><span>${String(entry.hour).padStart(2, '0')}:00</span><b>${Number(entry.performancePosts || 0).toLocaleString()}</b></div>`;
  }).join('');
}

function renderInsights(data) {
  $('#insight-results').innerHTML = `<div><h3>Posting hours in this export</h3><p class="view-note">${escape(data.scoring || '')}</p><div class="metric-list">${data.bestHours.map((x) => `<div class="metric"><span>${String(x.hour).padStart(2, '0')}:00</span><strong>${x.average} ${escape(data.metricLabel || 'weighted actions')}</strong></div>`).join('') || '<p>Import export files to calculate this.</p>'}</div></div><div><h3>Formats in the export</h3><div class="metric-list">${data.formats.map((x) => `<div class="metric"><span>${escape(x.format)}</span><strong>${x.posts}</strong></div>`).join('') || '<p>No formats analyzed yet.</p>'}</div></div>`;
  renderPublishingInsights();
}

function localNightDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function setAiNightlyStatus(message = '', state = '') {
  const node = $('#ai-nightly-status');
  if (!node) return;
  node.textContent = message;
  if (state) node.dataset.state = state;
  else delete node.dataset.state;
}

function renderAiNightlyLane() {
  const form = $('#ai-nightly-form');
  const date = $('#ai-nightly-date');
  const requests = $('#ai-nightly-requests');
  if (!form || !requests) return;
  if (date && !date.value) date.value = localNightDate();
  if (!form.matches(':focus-within')) {
    const inputs = [...form.querySelectorAll('input[name="slot"]')];
    const slots = aiNightlyLane.slots || [];
    inputs.forEach((input, index) => { input.value = slots[index] || ''; });
  }
  setAiNightlyStatus(`${Number(aiNightlyLane.researchCandidates || 0).toLocaleString()} AI research post${Number(aiNightlyLane.researchCandidates || 0) === 1 ? '' : 's'} available · ${Number((aiNightlyLane.drafts || []).length).toLocaleString()} returned night draft${Number((aiNightlyLane.drafts || []).length) === 1 ? '' : 's'} · every post and first comment needs approval.`, 'success');
  requests.innerHTML = (aiNightlyLane.requests || []).length
    ? aiNightlyLane.requests.slice(0, 5).map((request) => `<article><div><strong>${escape(request.nightDate || 'Night batch')}</strong><span>${escape((request.slots || []).join(' · '))} · ${Number(request.sourceCount || 0).toLocaleString()} research candidates</span></div><b>${escape(request.status || 'requested')}</b></article>`).join('')
    : '<article><div><strong>No night batch requested yet</strong><span>Save the times, then request tonight. Ryzen must return drafts to Social Desk for your approval.</span></div></article>';
}

async function loadAiNightlyLane() {
  aiNightlyLane = await json('/api/ai-nightly-lane');
  renderAiNightlyLane();
  return aiNightlyLane;
}

async function loadFirstComments() {
  firstCommentLedger = await json('/api/first-comments');
  renderPublishedCommentFollowup();
  return firstCommentLedger;
}

function firstCommentForDraft(draftId) {
  return (firstCommentLedger.comments || []).find((entry) => entry.draftId === draftId) || null;
}

function firstCommentStatusLabel(comment) {
  return {
    'approved-awaiting-post': 'Approved · waiting for the post to go live',
    'spooled-awaiting-facebook-proof': 'Sent to Ryzen · waiting for Facebook proof',
    'facebook-confirmed': 'Facebook confirmed the first comment',
    failed: `Needs attention${comment?.lastError ? ` · ${comment.lastError}` : ''}`,
  }[comment?.status] || 'Not approved yet';
}

function renderPublishedCommentFollowup() {
  const summary = $('#published-comment-summary');
  const list = $('#published-comment-list');
  if (!summary || !list) return;
  const rows = (publishingPipeline.rows || [])
    .filter((row) => ['scheduled', 'performance'].includes(row.stage))
    .filter((row) => row.confirmedAt || row.graphId || row.facebookUrl)
    .sort((left, right) => Date.parse(right.publishedAt || right.scheduledFor || 0) - Date.parse(left.publishedAt || left.scheduledFor || 0));
  const withLinks = rows.filter((row) => row.facebookUrl).length;
  const comments = rows.reduce((total, row) => total + Number(row.metrics?.comments || 0), 0);
  const approvedFirstComments = rows.filter((row) => firstCommentForDraft(row.draftId)?.approvedAt).length;
  summary.innerHTML = [
    ['Facebook-confirmed posts', rows.length],
    ['Comment links ready', withLinks],
    ['First comments approved', approvedFirstComments],
    ['Comments captured', comments],
  ].map(([label, value]) => `<div><strong>${typeof value === 'number' ? value.toLocaleString() : escape(value)}</strong><span>${escape(label)}</span></div>`).join('');
  list.innerHTML = rows.length
    ? rows.slice(0, 50).map((row) => {
      const firstComment = firstCommentForDraft(row.draftId);
      const canAutoRelease = row.target === 'matthew-page';
      return `<article class="published-comment-card" data-id="${escape(row.draftId)}">
      <header><div><span>${escape(row.targetLabel || 'Facebook')}</span><strong>${escape(row.title || 'Published post')}</strong></div><time>${escape(new Date(row.publishedAt || row.scheduledFor).toLocaleString())}</time></header>
      <p>${Number(row.metrics?.comments || 0).toLocaleString()} comments · ${Number(row.metrics?.reactions || 0).toLocaleString()} reactions · ${Number(row.metrics?.shares || 0).toLocaleString()} shares</p>
      <label><span>First comment draft</span><textarea rows="3" data-published-comment-draft placeholder="Add useful context, a source, or a specific question.">${escape(firstComment?.text || '')}</textarea></label>
      <p class="published-comment-state" data-state="${escape(firstComment?.status || 'draft')}">${escape(firstCommentStatusLabel(firstComment))}</p>
      <div>${canAutoRelease && (!firstComment || ['failed', 'cancelled'].includes(firstComment.status)) ? '<button type="button" data-approve-published-comment>Approve first comment</button>' : ''}<button type="button" data-copy-published-comment>Copy comment</button>${row.facebookUrl ? `<a href="${escape(row.facebookUrl)}" target="_blank" rel="noopener">Open Facebook post</a>` : '<span>Waiting for the verified Facebook post link.</span>'}</div>
    </article>`;
    }).join('')
    : '<div class="empty-state"><strong>No Facebook-confirmed posts are ready for follow-up yet.</strong><span>Scheduled posts appear here as soon as Facebook returns exact proof, so a first comment can be approved before airtime.</span></div>';
}

async function loadPublishingPipeline(refresh = false) {
  publishingPipeline = await json(refresh ? '/api/publishing-pipeline/refresh' : '/api/publishing-pipeline', {
    method: refresh ? 'POST' : 'GET',
    body: refresh ? '{}' : undefined,
  });
  if (typeof renderPublishingReady === 'function') renderPublishingReady();
  renderPublishingInsights();
  renderPublishedCommentFollowup();
}

function renderEngagementAssistResults(data) {
  const results = $('#engagement-assist-results');
  if (!results) return;
  if (!data) {
    results.innerHTML = '';
    return;
  }
  results.innerHTML = `<div class="engagement-assist-copy"><strong>${escape(data.policyNote || 'Manual confirmation required.')}</strong><span>Open the post, pick a reaction yourself, and only use a suggested comment if it truly fits the page voice.</span></div>
    <div class="engagement-assist-grid">
      <article><h4>Suggested reactions</h4><div class="engagement-assist-list">${(data.reactionSuggestions || []).map((entry) => `<span>${escape(entry)}</span>`).join('')}</div></article>
      <article><h4>Suggested comments</h4><div class="engagement-assist-list is-comments">${(data.commentSuggestions || []).map((entry) => `<span>${escape(entry)}</span>`).join('')}</div></article>
    </div>
    <div class="engagement-assist-actions">${data.url ? `<a href="${escape(data.url)}" target="_blank" rel="noopener">Open post for manual confirmation</a>` : '<span>Add a Facebook post URL to open it directly.</span>'}</div>`;
}

function inactivityMetrics(person, now = Date.now()) {
  const timestamp = Date.parse(String(person?.profileObservation?.lastPostAt || person?.profileObservation?.latestVisiblePost?.postedAt || ''));
  if (!Number.isFinite(timestamp)) return { days: null, label: '' };
  const days = Math.max(0, Math.floor((now - timestamp) / 86400000));
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return { days, label: months ? `${years}y ${months}mo inactive` : `${years}y inactive` };
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remainder = days % 30;
    return { days, label: remainder >= 7 ? `${months}mo ${Math.floor(remainder / 7)}w inactive` : `${months}mo inactive` };
  }
  if (days >= 7) return { days, label: `${Math.floor(days / 7)}w inactive` };
  return { days, label: `${days}d inactive` };
}

function renderPeopleFilterOptions() {
  const people = audience.people || [];
  const values = (getter) => [...new Set(people.map(getter).map((value) => String(value || '').trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const countries = values((person) => {
    const country = locationParts(person).country;
    return country === 'Country not found' ? '' : country;
  });
  const locations = values((person) => personPublicFacts(person).location);
  const work = values((person) => personPublicFacts(person).work || personPublicFacts(person).company);
  const countrySelect = $('#people-country-filter');
  if (countrySelect) {
    const selected = countrySelect.value || 'all';
    countrySelect.innerHTML = `<option value="all">All countries</option>${countries.map((value) => `<option value="${escape(value)}">${escape(value)}</option>`).join('')}`;
    countrySelect.value = countries.includes(selected) ? selected : 'all';
  }
  if ($('#people-location-options')) $('#people-location-options').innerHTML = locations.slice(0, 3000).map((value) => `<option value="${escape(value)}"></option>`).join('');
  if ($('#people-work-options')) $('#people-work-options').innerHTML = work.slice(0, 3000).map((value) => `<option value="${escape(value)}"></option>`).join('');
}

function renderPeopleActiveFilters() {
  const definitions = [
    ['#people-type-filter', 'Type'], ['#people-country-filter', 'Country'], ['#people-location-filter', 'Location'],
    ['#people-employment-filter', 'Employment'], ['#people-work-filter', 'Work'], ['#people-age-min', 'Min age'],
    ['#people-age-max', 'Max age'], ['#people-dob-filter', 'DOB'], ['#people-gender-filter', 'Gender'],
    ['#people-relationship-filter', 'Relationship'], ['#people-verification-filter', 'Verification'],
    ['#people-mutual-min', 'Mutual friends'], ['#people-links-filter', 'Links'],
  ];
  const active = definitions.flatMap(([selector, label]) => {
    const field = $(selector);
    if (!field) return [];
    const value = String(field.value || '').trim();
    if (!value || value === 'all') return [];
    const display = field.tagName === 'SELECT' ? field.selectedOptions[0]?.textContent || value : value;
    return [{ selector, label, display }];
  });
  const count = $('#people-filter-count');
  if (count) {
    count.hidden = active.length === 0;
    count.textContent = String(active.length);
  }
  if ($('#people-active-filters')) $('#people-active-filters').innerHTML = active.map((entry) => `<button type="button" data-clear-people-filter="${escape(entry.selector)}">${escape(entry.label)}: ${escape(entry.display)} · remove</button>`).join('');
}

function renderAudience() {
  const filter = $('#audience-filter')?.value || 'all';
  const search = ($('#audience-search')?.value || '').trim().toLowerCase();
  const showFriends = $('#people-friend-toggle')?.checked !== false;
  const typeFilter = $('#people-type-filter')?.value || 'all';
  const countryFilter = $('#people-country-filter')?.value || 'all';
  const locationFilter = ($('#people-location-filter')?.value || '').trim().toLowerCase();
  const employmentFilter = $('#people-employment-filter')?.value || 'all';
  const workFilter = ($('#people-work-filter')?.value || '').trim().toLowerCase();
  const ageMin = Number($('#people-age-min')?.value || 0);
  const ageMax = Number($('#people-age-max')?.value || 0);
  const dobFilter = $('#people-dob-filter')?.value || 'all';
  const genderFilter = $('#people-gender-filter')?.value || 'all';
  const relationshipFilter = $('#people-relationship-filter')?.value || 'all';
  const verificationFilter = $('#people-verification-filter')?.value || 'all';
  const mutualMin = Number($('#people-mutual-min')?.value || 0);
  const linksFilter = $('#people-links-filter')?.value || 'all';
  const matchesFilter = (person) => {
    if (filter === 'all') return true;
    if (filter === 'friends') return Boolean(person.friend);
    if (filter === 'birthdays') return personHasBirthday(person);
    if (filter === 'engaged') return Number(person.score || 0) > 0 || person.tier === 'engaged';
    if (filter === 'top-engager') return Number(person.score || 0) > 0;
    if (filter === 'linked') return Boolean(person.id || person.url);
    if (filter === 'candidate') return person.decision === 'candidate' || ['closer-review', 'memorial-review'].includes(person.profileState);
    if (filter === 'monitoring') return !person.decision || person.decision === 'monitoring';
    return person.tier === filter;
  };
  const people = (audience.people || []).filter((person) => {
    const facts = personPublicFacts(person);
    const type = String(facts.type || 'unknown').toLowerCase();
    const category = String(facts.category || '').toLowerCase();
    const employment = String(facts.employment || 'unknown').toLowerCase();
    const work = String(facts.work || facts.company || '').toLowerCase();
    const location = String(facts.location || '').toLowerCase();
    const country = locationParts(person).country;
    const age = publicFactAge(person);
    const hasDob = age != null || personHasBirthday(person);
    const gender = String(facts.gender || '').toLowerCase();
    const relationship = String(facts.relationshipStatus || '').toLowerCase();
    const mutualFriends = Number(facts.mutualFriends || person.mutualFriends || 0);
    const linkState = String(facts.linkState || '').toLowerCase();
    const typeMatches = typeFilter === 'all'
      || (['digital-creator', 'regular-profile'].includes(typeFilter) && personProfileKind(person) === typeFilter)
      || (typeFilter === 'creator' && (type.includes('creator') || category.includes('creator')))
      || (typeFilter === 'business' && (type.includes('business') || facts.entityType === 'page'))
      || (typeFilter === 'personal' && type === 'personal')
      || (typeFilter === 'unknown' && (!facts.type || type === 'unknown'));
    const employmentMatches = employmentFilter === 'all'
      || (employmentFilter === 'unknown' && (!facts.employment || employment === 'unknown'))
      || employment.includes(employmentFilter.replace('-', ' '));
    const genderMatches = genderFilter === 'all'
      || (genderFilter === 'known' && Boolean(gender))
      || (genderFilter === 'unknown' && !gender)
      || gender === genderFilter;
    const relationshipMatches = relationshipFilter === 'all'
      || (relationshipFilter === 'known' && Boolean(relationship))
      || (relationshipFilter === 'unknown' && !relationship)
      || relationship.includes(relationshipFilter);
    const verificationMatches = verificationFilter === 'all'
      || (verificationFilter === 'verified' && facts.verified)
      || (verificationFilter === 'not-seen' && facts.verificationObserved && !facts.verified)
      || (verificationFilter === 'unknown' && !facts.verificationObserved);
    const linksMatches = linksFilter === 'all'
      || (linksFilter === 'unknown' && !linkState)
      || (linksFilter === 'none' && ['none', 'no external links found'].includes(linkState))
      || linkState.includes(linksFilter.replace('-', ' '));
    const haystack = `${person.name || ''} ${person.id || ''} ${facts.category || ''} ${facts.work || ''} ${facts.company || ''} ${facts.location || ''} ${facts.bio || ''}`.toLowerCase();
    return matchesFilter(person)
      && (showFriends || !person.friend)
      && (peopleProfileKind === 'all' || personProfileKind(person) === peopleProfileKind)
      && typeMatches
      && (countryFilter === 'all' || country === countryFilter)
      && (!locationFilter || location.includes(locationFilter))
      && employmentMatches
      && (!workFilter || work.includes(workFilter))
      && (!ageMin || (age != null && age >= ageMin))
      && (!ageMax || (age != null && age <= ageMax))
      && (dobFilter === 'all' || (dobFilter === 'known' ? hasDob : !hasDob))
      && genderMatches
      && relationshipMatches
      && verificationMatches
      && (!mutualMin || mutualFriends >= mutualMin)
      && linksMatches
      && (!search || haystack.includes(search));
  }).sort((left, right) => filter === 'top-engager'
    ? Number(right.score || 0) - Number(left.score || 0) || Number(right.eventCount || 0) - Number(left.eventCount || 0)
    : String(left.name || '').localeCompare(String(right.name || '')));
  renderPeopleActiveFilters();
  const summary = audience.summary || {};
  const details = [
    ['Followers', summary.followers || summary.total || 0],
    ['Engaged', summary.engaged || 0],
    ['Top engagers', summary.topEngagers || 0],
    ['Friends', summary.friends || 0],
    ['Following', summary.following || 0],
    ['Monitoring', summary.monitoring || 0],
    ['Legit commenters', summary.legitCommenters || 0],
    ['Observed days', audience.coverage?.windowDays || 0],
  ];
  const detailMarkup = details.map(([label, value]) => `<button type="button" data-stat-filter="${label.toLowerCase().replace(/\s+/g, '-')}"><strong>${Number(value || 0).toLocaleString()}</strong><span>${escape(label)}</span></button>`).join('');
  if ($('#people-detail-stats-compact')) $('#people-detail-stats-compact').innerHTML = detailMarkup;
  if ($('#audience-summary')) $('#audience-summary').innerHTML = [['People', summary.total || 0], ['Monitoring', summary.monitoring || 0], ['15-day mark', summary.firstMark || 0], ['30-day review', summary.review || 0], ['Engaged', summary.engaged || 0]].map(([label, value]) => `<div><strong>${Number(value || 0).toLocaleString()}</strong><span>${label}</span></div>`).join('');
  const complete = audience.coverage?.hasFollowerRoster && audience.coverage?.hasIncomingEngagement;
  if ($('#coverage-warning')) $('#coverage-warning').textContent = complete ? `Monitoring is active across ${audience.coverage.windowDays || 0} observed days. First marks occur at 15 days and review marks at 30 days.` : `Baseline saved, but this export has only ${summary.followers || 0} follower records and no incoming per-person engagement. It does not prove inactivity or represent the full roster.`;
  $('#followers-count').textContent = `${Number(summary.followers || summary.total || 0).toLocaleString()} followers`;
  $('#people-shown-count').textContent = Number(people.length || 0).toLocaleString();
  $('#people-coverage').textContent = complete ? `Engagement monitoring covers ${audience.coverage.windowDays || 0} observed days. ${Number(summary.friends || 0).toLocaleString()} captured friends follow you · ${Number(summary.following || 0).toLocaleString()} profiles are in your following list.` : 'This is a partial captured roster. People without activity remain under monitoring, not labeled inactive.';
  const allPeople = audience.people || [];
  renderAudienceIntelligence();
  renderScanProgress(scanProgressData);
  $('#profile-kind-all-count').textContent = Number(allPeople.length).toLocaleString();
  $('#profile-kind-creator-count').textContent = Number(allPeople.filter((person) => personProfileKind(person) === 'digital-creator').length).toLocaleString();
  $('#profile-kind-regular-count').textContent = Number(allPeople.filter((person) => personProfileKind(person) === 'regular-profile').length).toLocaleString();
  const topEngagers = [...allPeople].filter((person) => Number(person.score || 0) > 0).sort((left, right) => Number(right.score || 0) - Number(left.score || 0) || Number(right.eventCount || 0) - Number(left.eventCount || 0)).slice(0, 6);
  $('#top-engagers-strip-list').innerHTML = topEngagers.map((person) => `<article class="top-engager-card"><div class="top-engager-avatar">${avatarMarkup(person)}</div><div><strong>${escape(person.name)}</strong><span>${person.lastEngagedAt ? `Last engaged ${new Date(person.lastEngagedAt).toLocaleDateString()}` : 'Engagement captured'}</span><b>Score ${Number(person.score || 0)}/100 · ${Number(person.eventCount || 0)} exact engagements</b><a href="${escape(person.url || (person.id ? `https://www.facebook.com/profile.php?id=${encodeURIComponent(person.id)}` : '#'))}" target="_blank" rel="noopener">Open profile</a></div></article>`).join('');
  const renderedPeople = people.slice(0, peopleRenderLimit);
  $('#people-render-note').textContent = `Showing ${Number(renderedPeople.length).toLocaleString()} of ${Number(people.length).toLocaleString()} matches`;
  $('#people-load-more').hidden = renderedPeople.length >= people.length;
  $('#audience-list').innerHTML = renderedPeople.map((person) => {
    const activity = person.keepLocked ? 'Kept permanently' : person.profileState === 'memorial-review' ? 'Possible memorialized account - review carefully' : person.profileState === 'closer-review' ? 'Profile still incomplete after 6 attempts' : person.profileState === 'retrying' ? `Profile retry ${person.profileRetryCount || 1} of 6` : person.lastEngagedAt ? `Last engaged ${new Date(person.lastEngagedAt).toLocaleDateString()}` : person.friend ? 'Facebook friend and follower' : 'Follower under monitoring';
    const signals = person.eventCount > 0 ? `<span class="active-signal"><i class="fa-solid fa-thumbs-up"></i> ${person.eventCount} engagement${person.eventCount === 1 ? '' : 's'}</span>` : '<span>No recorded engagement yet</span>';
    const profileUrl = person.url || (person.id ? `https://www.facebook.com/profile.php?id=${encodeURIComponent(person.id)}` : `https://www.facebook.com/search/people/?q=${encodeURIComponent(person.name)}`);
    const profileLabel = person.url || person.id ? 'View profile' : 'Find on Facebook';
    const facts = personPublicFacts(person);
    const age = publicFactAge(person);
    const dob = String(facts.birthDate || facts.birthday || facts.dateOfBirth || '').trim();
    const context = [facts.category, facts.location || facts.country, facts.employment, facts.work || facts.company, age != null ? `Age ${age}` : dob ? `DOB ${dob}` : '', facts.gender, facts.relationshipStatus].filter(Boolean).join(' · ');
    return `<article class="audience-person" data-person-key="${encodeURIComponent(person.key)}"><div class="audience-avatar">${avatarMarkup(person)}</div><div class="audience-main"><a class="audience-name" href="${escape(profileUrl)}" target="_blank" rel="noopener">${escape(person.name)}${person.keepLocked ? ' <i class="fa-solid fa-lock" title="Keep locked"></i>' : ''}</a><p>${escape(activity)}</p>${context ? `<small>${escape(context)}</small>` : ''}<div class="audience-evidence">${signals}${person.comments ? `<span>${person.comments} comments</span>` : ''}${person.shares ? `<span>${person.shares} shares</span>` : ''}${person.reactions ? `<span>${person.reactions} reactions</span>` : ''}</div><div class="profile-hover" aria-live="polite"></div></div><details class="person-menu"><summary title="Manage follower" aria-label="Manage ${escape(person.name)}"><i class="fa-solid fa-ellipsis"></i></summary><div class="person-menu-panel"><a href="${escape(profileUrl)}" target="_blank" rel="noopener"><i class="fa-solid fa-user"></i> ${profileLabel}</a><button data-audience-decision="keep" data-keep-locked="true"><i class="fa-solid fa-lock"></i> Keep permanently</button><button data-profile-state="memorialized"><i class="fa-solid fa-ribbon"></i> Memorialized / passed</button><button class="review-person" data-audience-decision="candidate"><i class="fa-solid fa-user-minus"></i> Add to review</button></div></details></article>`;
  }).join('') || '<div class="empty-state"><strong>No followers found</strong><span>Try another name or filter.</span></div>';
}

function renderAudienceReports(data) {
  audienceReports = data || { reports: {} };
  const labels = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' };
  const reportMarkup = Object.entries(data.reports || {}).map(([key, report]) => `<article><header><strong>${labels[key]}</strong><span>${Number(report.roster || 0).toLocaleString()} roster</span></header><b>${report.rosterChange >= 0 ? '+' : ''}${Number(report.rosterChange || 0).toLocaleString()} change</b><p>New ${Number(report.newFollowers || 0).toLocaleString()} · possible unfollows ${Number(report.possibleUnfollows || 0).toLocaleString()} · engaged ${Number(report.engaged || 0).toLocaleString()}</p><small>${report.comparisonSafe ? `${report.snapshots} verified snapshot${report.snapshots === 1 ? '' : 's'}` : 'Partial comparison coverage'}</small></article>`).join('');
  if ($('#people-report-grid')) $('#people-report-grid').innerHTML = reportMarkup;
  if ($('#people-stats-updated')) $('#people-stats-updated').textContent = data.generatedAt ? `Updated ${new Date(data.generatedAt).toLocaleString()}` : 'Live Ryzen data';
  if ($('#audience-reports')) $('#audience-reports').innerHTML = Object.entries(data.reports || {}).map(([key, report]) => `<article class="queue-item"><div><h3>${labels[key]}</h3><p>${report.snapshots} snapshot${report.snapshots === 1 ? '' : 's'} · roster ${Number(report.roster).toLocaleString()} · change ${report.rosterChange >= 0 ? '+' : ''}${report.rosterChange}</p><div class="meta"><span>New ${report.newFollowers}</span><span>Possible unfollows ${report.possibleUnfollows}</span><span>15-day marks ${report.firstMarks}</span><span>30-day reviews ${report.reviewMarks}</span></div>${report.comparisonSafe ? '' : '<small>Partial roster; unfollow comparison is withheld.</small>'}</div></article>`).join('');
}

function renderMediaIndex(data) {
  const archives = data.archives || [];
  const videos = archives.reduce((sum, row) => sum + Number(row.videos || 0), 0);
  const images = archives.reduce((sum, row) => sum + Number(row.images || 0), 0);
  const duplicates = archives.reduce((sum, row) => sum + Math.max(0, (row.files || []).length - 1), 0);
  const suppliedFiles = Number(data.files || archives.reduce((sum, row) => sum + Math.max(1, (row.files || []).length), 0));
  $('#media-summary').innerHTML = [['Official ZIP files', suppliedFiles], ['Payload groups', archives.length], ['Repeated payloads', duplicates], ['All videos', videos], ['All images', images]].map(([label, value]) => `<div><strong>${value.toLocaleString()}</strong><span>${label}</span></div>`).join('');
  $('#media-archives').innerHTML = archives.map((row, index) => `<article class="queue-item"><div><h3>Payload group ${index + 1}</h3><p>${Number(row.size || 0).toLocaleString()} bytes · ${Number(row.videos || 0).toLocaleString()} videos · ${Number(row.images || 0).toLocaleString()} images</p><div class="meta"><span class="badge">${(row.files || []).length > 1 ? `${row.files.length} official files share this payload` : 'one official file'}</span><span>${escape((row.files || []).join(' · '))}</span></div></div></article>`).join('') || '<p class="muted">No Facebook media archives have been indexed.</p>';
}

function archiveMediaUrl(path, type) {
  return path ? `/api/media?path=${encodeURIComponent(path)}&type=${encodeURIComponent(type || 'application/octet-stream')}` : '';
}

function renderPersonalArchivePlan(plan = {}) {
  const items = plan.items || [];
  $('#personal-archive-plan-status').textContent = items.length
    ? `${items.length} planned drafts · Matthew Murphy personal profile · Needs review`
    : 'No posts planned yet. Generate and shortlist a new angle from an older text post to make it eligible.';
  $('#personal-archive-plan-list').innerHTML = items.map((item) => `<article class="archive-remix-result"><p class="eyebrow">PROPOSED · ${escape(new Date(item.proposedFor).toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' }))} CENTRAL · NEEDS REVIEW</p><h4>${escape(item.title)}</h4><p>${escape(item.caption).replace(/\n/g, '<br>')}</p><details><summary>Original post and review notes</summary><p>${escape(item.originalAt?.slice(0, 10))} · ${escape(item.originalCaption)}</p><ul>${[...(item.editPlan || []), ...(item.rightsChecklist || [])].map((line) => `<li>${escape(line)}</li>`).join('')}</ul></details></article>`).join('');
}

$('#personal-archive-plan-build')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  $('#personal-archive-plan-status').textContent = 'Planning older posts…';
  try {
    const plan = await json('/api/archive-remix/personal-plan', { method: 'POST', body: JSON.stringify({ target: 'matthew-profile' }) });
    renderPersonalArchivePlan(plan);
  } catch (error) {
    $('#personal-archive-plan-status').textContent = error.message;
  } finally { button.disabled = false; }
});

function archiveRemixMatches(candidate) {
  const state = candidate.review?.state || 'review';
  const destinationIds = (candidate.destinations || []).map((lane) => typeof lane === 'string' ? lane : lane.id);
  if (archiveRemixFilter === 'recommended' && (!candidate.recommendedForReview || state === 'skip')) return false;
  if (archiveRemixFilter === 'shortlist' && state !== 'shortlist') return false;
  if (archiveRemixFilter === 'fan-page' && !destinationIds.includes('matthew-page')) return false;
  if (archiveRemixFilter === 'personal-profile' && !destinationIds.includes('matthew-personal')) return false;
  if (archiveRemixFilter === 'reels' && candidate.kind !== 'reel') return false;
  if (archiveRemixFilter === 'posts' && candidate.kind !== 'post') return false;
  if (archiveRemixFilter === 'engagement' && candidate.engagement?.evidenceState !== 'facebook-verified') return false;
  if (archiveRemixFilter === 'rights' && !(candidate.flags || []).some((flag) => /rights|privacy|bystander/i.test(flag))) return false;
  if (archiveRemixFilter === 'skip' && state !== 'skip') return false;
  const search = String($('#archive-remix-search')?.value || '').trim().toLowerCase();
  if (!search) return true;
  return `${candidate.originalCaption || ''} ${(candidate.flags || []).join(' ')} ${candidate.remix?.title || ''} ${candidate.remix?.caption || ''}`.toLowerCase().includes(search);
}

function archiveRemixCard(candidate) {
  const media = candidate.media || {};
  const videoUrl = candidate.kind === 'reel' ? archiveMediaUrl(media.path, media.type || 'video/mp4') : '';
  const posterUrl = candidate.kind === 'reel' ? archiveMediaUrl(media.thumbnailPath, 'image/jpeg') : '';
  const state = candidate.review?.state || 'review';
  const flags = (candidate.flags || []).map((flag) => `<span>${escape(flag.replaceAll('-', ' '))}</span>`).join('');
  const destinations = (candidate.destinations || []).map((lane) => typeof lane === 'string' ? lane : lane.label).filter(Boolean);
  const engagement = candidate.engagement || {};
  const engagementProof = engagement.evidenceState === 'facebook-verified'
    ? `<p class="archive-remix-destinations"><strong>Verified old-account engagement:</strong> ${Number(engagement.total || 0).toLocaleString()} total · ${Number(engagement.comments || 0).toLocaleString()} comments${engagement.observedAt ? ` · checked ${escape(new Date(engagement.observedAt).toLocaleDateString())}` : ''}</p>`
    : '';
  const brief = (candidate.remix?.brief || []).slice(0, 5).map((line) => `<li>${escape(line)}</li>`).join('');
  const generated = candidate.remix?.state === 'generated'
    ? `<section class="archive-remix-result"><p class="eyebrow">NEW ANGLE · NEEDS REVIEW</p><h4>${escape(candidate.remix.title)}</h4><strong>${escape(candidate.remix.hook)}</strong><p>${escape(candidate.remix.caption).replace(/\n/g, '<br>')}</p><details><summary>Production and rights checklist</summary><ul>${(candidate.remix.editPlan || []).map((line) => `<li>${escape(line)}</li>`).join('')}${(candidate.remix.rightsChecklist || []).map((line) => `<li>${escape(line)}</li>`).join('')}</ul></details></section>`
    : '';
  const preview = candidate.kind === 'reel'
    ? `<video controls preload="none" ${posterUrl ? `poster="${escape(posterUrl)}"` : ''}><source src="${escape(videoUrl)}" type="${escape(media.type || 'video/mp4')}"></video>`
    : '<div class="archive-text-preview">Text post</div>';
  return `<article class="archive-remix-card" data-archive-remix-id="${escape(candidate.id)}">
    <div class="archive-remix-preview">${preview}</div>
    <div class="archive-remix-copy">
      <header><div><p class="eyebrow">${candidate.kind === 'reel' ? 'ARCHIVED REEL' : 'ARCHIVED POST'} · ${escape(String(candidate.originalAt || '').slice(0, 10))}</p><h3>${candidate.remix?.title ? escape(candidate.remix.title) : `Fit score ${Number(candidate.fitScore || 0)}/100`}</h3></div><strong class="archive-remix-state">${escape(state === 'shortlist' ? 'Shortlisted' : state === 'skip' ? 'Skipped' : 'Needs review')}</strong></header>
      <p class="archive-original-copy">${escape(candidate.originalCaption || 'No original caption was included.').replace(/\n/g, '<br>')}</p>
      ${engagementProof}
      ${destinations.length ? `<p class="archive-remix-destinations"><strong>Review lane:</strong> ${destinations.map(escape).join(' · ')}</p>` : ''}
      ${flags ? `<div class="archive-remix-flags">${flags}</div>` : ''}
      <details class="archive-remix-brief"><summary>What a real remix needs</summary><ul>${brief}</ul></details>
      ${generated}
      <footer><button type="button" data-archive-remix-state="shortlist">Shortlist</button><button type="button" data-archive-remix-generate>Generate new angle</button><button type="button" data-archive-remix-state="skip">Skip</button>${state !== 'review' ? '<button type="button" data-archive-remix-state="review">Reset review</button>' : ''}</footer>
    </div>
  </article>`;
}

function renderArchiveRemix(data = archiveRemixLibrary) {
  archiveRemixLibrary = data || { summary: {}, policy: {}, candidates: [] };
  const summary = archiveRemixLibrary.summary || {};
  $('#archive-remix-summary').innerHTML = [
    ['Reels recovered', summary.reelMediaFound || summary.reelsLoaded || 0],
    ['Reusable text ideas', summary.reusableTextPosts || 0],
    ['Fan-page candidates', summary.fanPageCandidates || 0],
    ['Personal-profile candidates', summary.personalProfileCandidates || 0],
    ['Review shortlist', summary.shortlisted || 0],
    ['New angles built', summary.remixesGenerated || 0],
    ['Verified winners', (archiveRemixLibrary.candidates || []).filter((entry) => entry.engagement?.evidenceState === 'facebook-verified').length],
  ].map(([label, value]) => `<div><strong>${Number(value || 0).toLocaleString()}</strong><span>${label}</span></div>`).join('');
  document.querySelectorAll('[data-archive-remix-filter]').forEach((button) => button.classList.toggle('active', button.dataset.archiveRemixFilter === archiveRemixFilter));
  const matches = (archiveRemixLibrary.candidates || []).filter(archiveRemixMatches).sort((left, right) => {
    const engagementDelta = Number(right.engagement?.total || 0) - Number(left.engagement?.total || 0);
    return engagementDelta || Number(right.fitScore || 0) - Number(left.fitScore || 0);
  });
  const visible = matches.slice(0, archiveRemixRenderLimit);
  $('#archive-remix-count').textContent = `Showing ${visible.length.toLocaleString()} of ${matches.length.toLocaleString()} matches`;
  $('#archive-remix-list').innerHTML = visible.map(archiveRemixCard).join('') || '<div class="empty-state"><strong>No archive items match this review.</strong><span>Try another filter or search term.</span></div>';
  $('#archive-remix-more').hidden = visible.length >= matches.length;
}

function imagePromptJobs() {
  const jobs = [];
  for (const { item, companion } of mediaDraftPairs()) {
    const storyItem = companion || item;
    const feedMedia = draftMediaSource(item, 'feed');
    const storyMedia = draftMediaSource(storyItem, 'story');
    const feedReview = draftImageReviewForRole(item, 'feed');
    const storyReview = draftImageReviewForRole(storyItem, 'story');
    const common = {
      itemId: item.id,
      title: item.title,
      scheduledFor: item.scheduledFor || null,
      style: item.artworkDay?.label || imageReviewFeedEntry(item)?.artStyleLabel || '',
    };
    if (feedReview && ['needs-review', 'redo'].includes(feedReview.state)) jobs.push({ ...common, kind: 'qc', role: 'Landscape', note: feedReview.note || 'QC redo requested', prompt: imagePrompt(item) });
    else if (!feedMedia) jobs.push({ ...common, kind: 'landscape', role: 'Landscape', note: 'Landscape image missing', prompt: imagePrompt(item) });
    if (storyReview && ['needs-review', 'redo'].includes(storyReview.state)) jobs.push({ ...common, kind: 'qc', role: 'Story', note: storyReview.note || 'QC redo requested', prompt: storyPrompt(storyItem) });
    else if (!storyMedia) jobs.push({ ...common, kind: item.target === 'matthew-page' ? 'hourly-story' : 'story', role: 'Story', note: item.target === 'matthew-page' ? 'Hourly Page Story image missing' : 'Story image missing', prompt: storyPrompt(storyItem) });
  }
  const priority = { qc: 0, 'hourly-story': 1, landscape: 2, story: 3 };
  return jobs.sort((left, right) => (priority[left.kind] ?? 9) - (priority[right.kind] ?? 9)
    || (Date.parse(left.scheduledFor || 0) || 0) - (Date.parse(right.scheduledFor || 0) || 0));
}

function promptCopyButton(job, label) {
  if (!job) return `<button type="button" disabled>${escape(label)} · none waiting</button>`;
  return `<button type="button" data-copy-prompt="${encodeURIComponent(job.prompt)}">${escape(label)}</button>`;
}

function renderImagePromptWorkbench() {
  const summary = $('#image-prompt-summary');
  const next = $('#image-prompt-next');
  const list = $('#image-prompt-job-list');
  if (!summary || !next || !list) return;
  const jobs = imagePromptJobs();
  const qcJobs = jobs.filter((job) => job.kind === 'qc');
  const hourlyJobs = jobs.filter((job) => job.kind === 'hourly-story');
  const landscapeJobs = jobs.filter((job) => job.kind === 'landscape');
  const otherStoryJobs = jobs.filter((job) => job.kind === 'story');
  summary.innerHTML = [
    ['QC redo roles', qcJobs.length],
    ['Hourly Story images', hourlyJobs.length],
    ['Missing Landscapes', landscapeJobs.length],
    ['Other missing Stories', otherStoryJobs.length],
  ].map(([label, value]) => `<div><strong>${Number(value).toLocaleString()}</strong><span>${escape(label)}</span></div>`).join('');
  next.innerHTML = [
    promptCopyButton(qcJobs[0], 'Copy next QC redo prompt'),
    promptCopyButton(hourlyJobs[0], 'Copy next hourly Story prompt'),
    promptCopyButton(landscapeJobs[0], 'Copy next missing Landscape prompt'),
  ].join('');
  list.innerHTML = jobs.slice(0, 16).map((job) => `<article class="image-prompt-job">
    <div><strong>${escape(job.title)}</strong><span>${escape(job.role)} · ${escape(job.note)}${job.style ? ` · ${escape(job.style)}` : ''}${job.scheduledFor ? ` · ${new Date(job.scheduledFor).toLocaleString()}` : ''}</span></div>
    <div class="image-prompt-job-actions"><button type="button" data-copy-prompt="${encodeURIComponent(job.prompt)}">Copy ${escape(job.role)} prompt</button><button type="button" data-open-media="${escape(job.itemId)}">Open image card</button></div>
    <details><summary>Preview full prompt</summary><pre>${escape(job.prompt)}</pre></details>
  </article>`).join('') || '<div class="empty-state"><strong>No image prompts waiting.</strong><span>Every active role currently has media and no QC redo request.</span></div>';
}

function styleOptions(selectedKey) {
  return (imageStyleLibrary.families || []).map((family) => `<option value="${escape(family.key)}" ${family.key === selectedKey ? 'selected' : ''}>${escape(family.label)}${family.custom ? ' · Custom' : ''}</option>`).join('');
}

function renderStyleLibrary() {
  const list = $('#style-library-list');
  const dateSelect = $('#style-library-date');
  if (!list || !dateSelect) return;
  const families = imageStyleLibrary.families || [];
  list.innerHTML = families.map((family) => `<article><strong>${escape(family.label)}</strong><span>${family.custom ? 'Custom style' : 'Built-in style'}</span><p>${escape(family.direction || '')}</p></article>`).join('');
  const previousDate = dateSelect.value;
  const dates = [...new Set((imageReviewFeed.dailySets || []).map((set) => set.publishDate).filter(Boolean))].sort();
  dateSelect.innerHTML = `<option value="">Add to library only</option>${dates.map((date) => `<option value="${escape(date)}">${escape(date)}</option>`).join('')}`;
  if (dates.includes(previousDate)) dateSelect.value = previousDate;
}

function renderDailyCovers() {
  const target = $('#daily-cover-list');
  if (!target) return;
  const dailySets = [...(imageReviewFeed.dailySets || [])]
    .filter((set) => set.publishDate && set.coverReference?.media)
    .sort((left, right) => String(right.publishDate).localeCompare(String(left.publishDate)))
    .slice(0, 7);
  target.innerHTML = dailySets.map((set) => {
    const reference = set.coverReference || null;
    const media = reference?.media || null;
    const source = media ? mediaSourceUrl(media, { thumb: true }) : '';
    const tipRange = set.firstTip && set.lastTip ? `Tips ${set.firstTip}-${set.lastTip}` : 'Daily issue';
    const state = set.coverReady ? 'Active cover' : 'Saved cover';
    return `<article class="daily-cover-card${set.coverReady ? ' is-active' : reference ? ' has-reference' : ''}">
      <div class="daily-cover-art">${source
        ? `<img src="${escape(source)}" alt="${escape(`${set.publishDate} ${set.theme} Daily Series cover`)}" loading="lazy">`
        : `<div class="daily-cover-missing"><strong>No cover image</strong><span>${escape(state)}</span></div>`}</div>
      <div class="daily-cover-caption">
        <span>${escape(set.publishDate)}</span>
        <strong>${escape(set.theme || 'Creator Comic')}</strong>
        <small>${escape(tipRange)} · ${escape(state)}</small>
      </div>
    </article>`;
  }).join('') || '<div class="empty-state"><strong>No saved daily covers found.</strong><span>New covers will appear here as each daily issue is completed.</span></div>';
}

function mediaDraftPairs() {
  return queue
    .filter((item) => item.format !== 'story' && !['published', 'removed', 'rejected'].includes(item.status))
    .map((item) => ({ item, companion: storyCompanionFor(item), audit: auditImageState(item) }))
    .sort((left, right) => {
      const priority = ({ item, companion, audit }) => {
        const approved = Boolean(item.mediaApproval?.hiddenAt);
        const hasFeed = Boolean(draftMediaSource(item, 'feed'));
        const hasStory = Boolean(draftMediaSource(companion || item, 'story'));
        if (!approved && hasFeed && hasStory && !audit.flagged) return 0;
        if (audit.flagged) return 1;
        if (!approved) return 2;
        return 3;
      };
      const priorityDifference = priority(left) - priority(right);
      if (priorityDifference) return priorityDifference;
      const targetDifference = Number(right.item.target === 'matthew-page') - Number(left.item.target === 'matthew-page');
      if (targetDifference) return targetDifference;
      const leftTime = Date.parse(left.item.scheduledFor || left.item.createdAt || 0) || 0;
      const rightTime = Date.parse(right.item.scheduledFor || right.item.createdAt || 0) || 0;
      return rightTime - leftTime;
    });
}

function draftMediaSource(item, role) {
  const list = Array.isArray(item?.media) ? item.media : [];
  return list.find((media) => {
    const mediaRole = mediaRoleName(media);
    return role === 'story'
      ? mediaRole === 'story' || mediaRole === 'video'
      : mediaRole === 'feed' || mediaRole === 'video';
  }) || null;
}

function draftImageReviewForRole(item, role) {
  if (!item?.imageReview) return null;
  if (item.imageReview[role]) return item.imageReview[role];
  return item.imageReview.role === role || !item.imageReview.role ? item.imageReview : null;
}

function mediaRoleStatusMarkup(item, media, review, label) {
  const needsQc = review && ['needs-review', 'redo'].includes(review.state);
  const approved = Boolean(item?.mediaApproval?.hiddenAt);
  let state = `${label} ready`;
  let detail = 'Attached on Ryzen and waiting for pair approval.';
  let className = 'is-ready';
  if (!item || !media) {
    state = `${label} waiting`;
    detail = item ? 'No file is attached to this role yet.' : `This pair does not have a ${label} companion yet.`;
    className = 'is-missing';
  } else if (needsQc) {
    state = `${label} QC requested`;
    detail = 'The current image stays attached as the reference for the next pass.';
    className = 'is-qc';
  } else if (approved) {
    state = `${label} approved`;
    detail = 'Saved with the approved media pair.';
    className = 'is-approved';
  }
  const postCopy = label === 'Landscape' && String(item?.body || '').trim()
    ? `<section class="media-post-copy"><strong>Post text</strong><p>${escape(item.body)}</p></section>`
    : '';
  return `<footer class="media-role-status ${className}${postCopy ? ' has-post-copy' : ''}">${postCopy}<div class="media-role-state"><span aria-hidden="true"></span><div><strong>${escape(state)}</strong><small>${escape(detail)}</small></div></div></footer>`;
}

function mediaDraftTiming(item, approved) {
  if (!item?.scheduledFor) return { label: 'No local time yet', overdue: false };
  const plannedAt = Date.parse(item.scheduledFor);
  const localTime = new Date(item.scheduledFor).toLocaleString();
  if (item.facebookHandoff?.facebookConfirmed || ['scheduled', 'published'].includes(item.status)) {
    return { label: `Facebook confirmed ${localTime}`, overdue: false };
  }
  if (Number.isFinite(plannedAt) && plannedAt < Date.now()) {
    return {
      label: `Overdue since ${localTime} · ${approved ? 'approved, waiting to send' : 'waiting for approval'}`,
      overdue: true,
    };
  }
  return { label: `Planned ${localTime}`, overdue: false };
}

function mediaPreviewTile(item, role, label, emptyText) {
  const media = draftMediaSource(item, role);
  const review = draftImageReviewForRole(item, role);
  const targetId = item?.id || '';
  const fullSrc = media ? mediaSourceUrl(media) : '';
  const thumbSrc = media ? mediaSourceUrl(media, { thumb: true }) : '';
  const kind = /video/i.test(String(media?.mime || media?.type || media?.filename || '')) ? 'video' : 'image';
  const frameClass = `media-pair-frame ${role === 'story' ? 'is-story' : 'is-landscape'}`;
  const actions = item ? `<div class="media-pair-actions"><button type="button" class="copy-role-prompt" data-copy-prompt="${encodeURIComponent(role === 'story' ? storyPrompt(item) : imagePrompt(item))}">Copy ${role === 'story' ? 'Story' : 'Landscape'} prompt</button><button type="button" data-paste-image="true" title="Paste ${escape(label)} image">Paste</button><label>Upload<input type="file" accept="image/*,video/*" multiple data-item-files="${escape(targetId)}"></label><button type="button" class="media-role-qc" data-media-role-qc="${escape(role)}" data-media-role-target="${escape(targetId)}">QC ${escape(label)}</button></div>` : '';
  const reviewMarkup = review && ['needs-review', 'redo'].includes(review.state) ? `<p class="media-qc-note"><strong>${escape(label)} QC:</strong> ${escape(review.note || 'Needs another image pass.')}</p>` : '';
  const statusMarkup = mediaRoleStatusMarkup(item, media, review, label);
  if (!item) return `<article class="media-pair-card"><header><strong>${label}</strong></header><div class="${frameClass}"><div class="fb-placeholder missing-media"><span>${escape(emptyText)}</span></div></div>${statusMarkup}</article>`;
  if (!media) return `<article class="media-pair-card" data-id="${escape(targetId)}"><header><strong>${label}</strong></header>${actions}${reviewMarkup}<div class="${frameClass}" data-item-drop="${escape(targetId)}"><div class="fb-placeholder missing-media"><span>${escape(emptyText)}</span><small>Paste or upload here.</small></div></div>${statusMarkup}</article>`;
  return `<article class="media-pair-card" data-id="${escape(targetId)}"><header><strong>${label}</strong><span>${escape(media.filename || '')}</span></header>${actions}${reviewMarkup}<div class="${frameClass}" data-item-drop="${escape(targetId)}">${kind === 'video' ? `<video src="${escape(fullSrc)}" controls preload="metadata"></video>` : `<img src="${escape(thumbSrc || fullSrc)}" data-full-src="${escape(fullSrc)}" alt="${escape(media.filename || item.title || label)}" decoding="async">`}</div>${statusMarkup}</article>`;
}

function mediaDraftCard({ item, companion, audit }) {
  const linkedIds = [item.id, companion?.id].filter(Boolean);
  const hasFeed = Boolean(draftMediaSource(item, 'feed'));
  const hasStory = Boolean(draftMediaSource(companion || item, 'story'));
  const approved = Boolean(item.mediaApproval?.hiddenAt);
  const timing = mediaDraftTiming(item, approved);
  const state = approved ? 'Approved' : audit.flagged ? 'QC requested' : hasFeed && hasStory ? 'Ready for approval' : 'Incomplete pair';
  return `<article class="media-draft-card${audit.flagged ? ' is-flagged' : ''}${approved ? ' is-approved' : ''}" data-id="${escape(item.id)}" data-media-pair-ids="${escape(linkedIds.join(','))}">
    <header class="media-draft-head">
      <div>
        <p class="eyebrow">MEDIA READY</p>
        <strong>${escape(item.title)}</strong>
        <span>${escape(socialTargetLabel(item))} · ${escape(draftReference(item))}${companion ? ` · ${escape(draftReference(companion))}` : ''}</span>
      </div>
      <div class="media-draft-meta">
        <strong>${escape(state)}</strong>
        <span class="${timing.overdue ? 'is-overdue' : ''}">${escape(timing.label)}</span>
        ${audit.flagged ? `<button type="button" class="text-action" data-open-view="queue" data-open-media-review="true"><i class="fa-solid fa-flag"></i><span>${escape(audit.shortLabel || 'Needs review')}</span></button>` : ''}
      </div>
    </header>
    <div class="media-draft-grid">
      ${mediaPreviewTile(item, 'feed', 'Landscape', 'Landscape image still missing')}
      ${mediaPreviewTile(companion || item, 'story', 'Story', 'Story image still missing')}
    </div>
    <footer class="media-review-actions">
      <button type="button" class="media-review-reject" data-media-pair-redo ${linkedIds.length ? '' : 'disabled'}>Redo both images</button>
      <button type="button" class="media-review-qc" data-media-pair-qc>QC pair</button>
      <button type="button" class="media-review-approve" data-media-pair-approve ${hasFeed && hasStory && !audit.flagged ? '' : 'disabled'}>${approved ? 'Approved' : 'Approve pair'}</button>
    </footer>
  </article>`;
}

function renderMediaDraftPagination(total, page) {
  const pages = Math.max(1, Math.ceil(total / MEDIA_DRAFTS_PER_PAGE));
  const from = total ? ((page - 1) * MEDIA_DRAFTS_PER_PAGE) + 1 : 0;
  const to = Math.min(total, page * MEDIA_DRAFTS_PER_PAGE);
  return `<div class="media-pagination-inner"><span>${from.toLocaleString()}-${to.toLocaleString()} of ${total.toLocaleString()} draft pairs</span><div class="media-pagination-actions"><button type="button" ${page <= 1 ? 'disabled' : ''} data-media-page="${page - 1}"><i class="fa-solid fa-arrow-left"></i><span>Back</span></button><strong>Page ${page} / ${pages}</strong><button type="button" ${page >= pages ? 'disabled' : ''} data-media-page="${page + 1}"><span>Next</span><i class="fa-solid fa-arrow-right"></i></button></div></div>`;
}

function renderMediaDrafts() {
  const pairs = mediaDraftPairs();
  const pages = Math.max(1, Math.ceil(pairs.length / MEDIA_DRAFTS_PER_PAGE));
  mediaDraftPage = Math.min(Math.max(1, mediaDraftPage), pages);
  const start = (mediaDraftPage - 1) * MEDIA_DRAFTS_PER_PAGE;
  const visible = pairs.slice(start, start + MEDIA_DRAFTS_PER_PAGE);
  const feedReady = pairs.filter(({ item }) => Boolean(draftMediaSource(item, 'feed'))).length;
  const storyReady = pairs.filter(({ item, companion }) => Boolean(draftMediaSource(companion || item, 'story'))).length;
  const flagged = pairs.filter(({ audit }) => audit.flagged).length;
  $('#media-draft-summary').innerHTML = [['Draft pairs', pairs.length], ['Landscape ready', feedReady], ['Story ready', storyReady], ['Needs review', flagged]].map(([label, value]) => `<div><strong>${Number(value || 0).toLocaleString()}</strong><span>${label}</span></div>`).join('');
  const pagination = renderMediaDraftPagination(pairs.length, mediaDraftPage);
  $('#media-draft-pagination-top').innerHTML = pagination;
  $('#media-draft-pagination-bottom').innerHTML = pagination;
  $('#media-draft-list').innerHTML = visible.length ? visible.map(mediaDraftCard).join('') : '<div class="empty-state"><strong>No draft media yet.</strong><span>As artwork lands, the paired desk will show it here.</span></div>';
}

function setMediaView(view) {
  mediaLibraryView = view === 'archives' ? 'archives' : 'drafts';
  document.querySelectorAll('.media-subtab').forEach((subtab) => {
    if (subtab.dataset.mediaFilter) subtab.classList.toggle('active', subtab.dataset.mediaFilter === mediaLibraryView);
    else if (subtab.dataset.mediaShortcut) subtab.classList.remove('active');
  });
  $('#media-drafts-panel').hidden = mediaLibraryView !== 'drafts';
  $('#media-archives-panel').hidden = mediaLibraryView !== 'archives';
}

document.querySelectorAll('.media-subtab').forEach((subtab) => subtab.addEventListener('click', () => {
  setMediaView(subtab.dataset.mediaFilter || 'drafts');
  if ((subtab.dataset.mediaFilter || 'drafts') === 'drafts') scheduleRenderMediaDrafts();
}));

document.querySelectorAll('[data-archive-remix-filter]').forEach((button) => button.addEventListener('click', () => {
  archiveRemixFilter = button.dataset.archiveRemixFilter || 'recommended';
  archiveRemixRenderLimit = 24;
  renderArchiveRemix();
}));

$('#archive-remix-search')?.addEventListener('input', () => {
  archiveRemixRenderLimit = 24;
  renderArchiveRemix();
});

$('#archive-remix-more')?.addEventListener('click', () => {
  archiveRemixRenderLimit += 24;
  renderArchiveRemix();
});

$('#archive-remix-list')?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-archive-remix-state],[data-archive-remix-generate]');
  if (!button) return;
  const card = button.closest('[data-archive-remix-id]');
  const candidate = (archiveRemixLibrary.candidates || []).find((entry) => entry.id === card?.dataset.archiveRemixId);
  if (!candidate) return;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = button.dataset.archiveRemixGenerate !== undefined ? 'Building new angle…' : 'Saving…';
  try {
    const updated = button.dataset.archiveRemixGenerate !== undefined
      ? await json(`/api/archive-remix/${encodeURIComponent(candidate.id)}/generate`, { method: 'POST', body: '{}' })
      : await json(`/api/archive-remix/${encodeURIComponent(candidate.id)}`, { method: 'PATCH', body: JSON.stringify({ state: button.dataset.archiveRemixState }) });
    Object.assign(candidate, updated);
    archiveRemixLibrary.summary.shortlisted = (archiveRemixLibrary.candidates || []).filter((entry) => entry.review?.state === 'shortlist').length;
    archiveRemixLibrary.summary.skipped = (archiveRemixLibrary.candidates || []).filter((entry) => entry.review?.state === 'skip').length;
    archiveRemixLibrary.summary.remixesGenerated = (archiveRemixLibrary.candidates || []).filter((entry) => entry.remix?.state === 'generated').length;
    renderArchiveRemix();
  } catch (error) {
    button.disabled = false;
    button.textContent = originalLabel;
    window.alert(error.message);
  }
});

function openDraftMedia(itemId) {
  const pairs = mediaDraftPairs();
  const index = Math.max(0, pairs.findIndex(({ item }) => item.id === itemId));
  mediaDraftPage = Math.floor(index / MEDIA_DRAFTS_PER_PAGE) + 1;
  openView('media-library');
  setMediaView('drafts');
  renderMediaDrafts();
  requestAnimationFrame(() => {
    const card = document.querySelector(`#media-draft-list .media-draft-card[data-id="${CSS.escape(itemId)}"]`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card?.classList.add('image-review-jump');
    window.setTimeout(() => card?.classList.remove('image-review-jump'), 1800);
  });
}

function openView(name) {
  document.querySelector(`[data-view="${name}"]`)?.click();
}

function showPeoplePanel(panel = 'followers') {
  const stats = panel === 'stats';
  $('#people-stats-panel').hidden = !stats;
  $('#followers-panel').hidden = stats;
  document.querySelectorAll('.people-subtab').forEach((item) => item.classList.toggle('active', stats ? item.dataset.peoplePanel === 'stats' : item.dataset.audienceFilter === ($('#audience-filter')?.value || 'all')));
  if (stats) renderAudienceIntelligence();
}

function setAudienceFilter(filter = 'all') {
  peopleRenderLimit = 100;
  $('#audience-filter').value = filter;
  showPeoplePanel('followers');
  renderAudience();
}

function renderComments() {
  const items = comments.items || [];
  $('#comment-summary').innerHTML = [['Needs review', items.filter(x => x.status === 'pending').length], ['Replies ready', items.filter(x => x.suggestedReply).length], ['High risk', items.filter(x => x.risk === 'high').length], ['Handled', items.filter(x => x.status === 'handled').length]].map(([label,value]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join('');
  $('#comment-list').innerHTML = items.filter(x => x.status === 'pending').map(item => `<article class="comment-card" data-comment-id="${item.id}"><div><div class="comment-person"><div class="fb-avatar"></div><div><strong>${escape(item.author || 'Facebook user')}</strong><small>${escape(item.postTitle || 'Facebook post')}</small></div></div><p>${escape(item.text)}</p>${item.suggestedReply ? `<div class="suggested-reply"><strong>Suggested reply</strong><p>${escape(item.suggestedReply)}</p></div>` : ''}</div><div class="actions"><button class="icon-action reject" data-comment-action="dismiss" title="Dismiss"><i class="fa-solid fa-xmark"></i></button><button class="icon-action approve" data-comment-action="approve" title="Approve reaction and reply"><i class="fa-solid fa-check"></i></button></div></article>`).join('') || '<div class="empty-state"><strong>Community inbox is caught up.</strong><span>New Page comments will appear here when Meta delivery is connected.</span></div>';
}

$('#audience-filter').addEventListener('change', renderAudience);
$('#audience-search').addEventListener('input', () => { peopleRenderLimit = 100; renderAudience(); });
['#people-type-filter', '#people-country-filter', '#people-employment-filter', '#people-dob-filter', '#people-gender-filter', '#people-relationship-filter', '#people-verification-filter', '#people-links-filter'].forEach((selector) => $(selector)?.addEventListener('change', () => { peopleRenderLimit = 100; renderAudience(); }));
['#people-location-filter', '#people-work-filter', '#people-age-min', '#people-age-max', '#people-mutual-min'].forEach((selector) => $(selector)?.addEventListener('input', () => { peopleRenderLimit = 100; renderAudience(); }));
$('#people-filter-toggle')?.addEventListener('click', (event) => {
  const panel = $('#people-filter-panel');
  const expanded = panel.hidden;
  panel.hidden = !expanded;
  event.currentTarget.setAttribute('aria-expanded', String(expanded));
});
$('#people-active-filters')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-clear-people-filter]');
  if (!button) return;
  const field = $(button.dataset.clearPeopleFilter);
  if (!field) return;
  field.value = field.tagName === 'SELECT' ? 'all' : '';
  renderAudience();
});
document.querySelectorAll('[data-audience-filter]').forEach((button) => button.addEventListener('click', () => {
  setAudienceFilter(button.dataset.audienceFilter);
}));
document.querySelector('[data-people-panel="stats"]')?.addEventListener('click', () => showPeoplePanel('stats'));
$('#people-friend-toggle')?.addEventListener('change', renderAudience);
document.querySelectorAll('[data-profile-kind]').forEach((button) => button.addEventListener('click', () => {
  peopleProfileKind = button.dataset.profileKind || 'all';
  peopleRenderLimit = 100;
  document.querySelectorAll('[data-profile-kind]').forEach((item) => item.classList.toggle('active', item === button));
  renderAudience();
}));
$('#top-engagers-open')?.addEventListener('click', () => setAudienceFilter('top-engager'));
$('#people-load-more')?.addEventListener('click', () => { peopleRenderLimit += 100; renderAudience(); });
$('#audience-intelligence-grid')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-audience-segment]');
  if (!button) return;
  const people = peopleForSegment(button.dataset.audienceSegment, button.dataset.audienceSegmentValue);
  renderAudienceDrilldown(`${button.dataset.audienceSegmentValue} · ${button.closest('article')?.querySelector('h3')?.textContent || 'Audience'}`, people);
});
$('#audience-country-browser')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-location-level]');
  if (!button) return;
  const level = button.dataset.locationLevel;
  const value = button.dataset.locationValue;
  if (level === 'country') locationSelection = { country: value, area: '', city: '' };
  if (level === 'area') locationSelection = { ...locationSelection, area: value, city: '' };
  if (level === 'city') locationSelection = { ...locationSelection, city: value };
  renderLocationBrowser();
  const matches = (audience.people || []).filter((person) => {
    const parts = locationParts(person);
    return (!locationSelection.country || parts.country === locationSelection.country)
      && (!locationSelection.area || parts.area === locationSelection.area)
      && (!locationSelection.city || parts.city === locationSelection.city);
  });
  renderAudienceDrilldown([locationSelection.city, locationSelection.area, locationSelection.country].filter(Boolean).join(', '), matches, 'Matching people from the captured public location hierarchy.');
});
$('#people-detail-stats')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-intelligence-kpi]');
  if (!button) return;
  const key = button.dataset.intelligenceKpi;
  const people = key === 'all' ? audience.people || [] : (audience.people || []).filter((person) => {
    const facts = personPublicFacts(person);
    if (key === 'age') return publicFactAge(person) != null || personHasBirthday(person);
    if (key === 'country') return !['Country not found', 'Country not explicit'].includes(locationParts(person).country);
    return Boolean(String(facts[key] || '').trim());
  });
  renderAudienceDrilldown(button.querySelector('span')?.textContent || 'Audience detail', people);
});
$('#audience-drilldown-clear')?.addEventListener('click', () => {
  locationSelection = { country: '', area: '', city: '' };
  $('#audience-drilldown').hidden = true;
  renderLocationBrowser();
});
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-stat-filter]');
  if (!button) return;
  const mapping = { followers: 'all', engaged: 'engaged', 'top-engagers': 'top-engager', friends: 'friends', following: 'linked', monitoring: 'monitoring', 'legit-commenters': 'engaged' };
  if (mapping[button.dataset.statFilter]) setAudienceFilter(mapping[button.dataset.statFilter]);
  else showPeoplePanel('stats');
});
document.querySelectorAll('[data-open-view]').forEach(button => button.addEventListener('click', () => openView(button.dataset.openView)));
$('#audience-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-audience-decision],[data-profile-state]');
  if (!button) return;
  const card = button.closest('[data-person-key]');
  const key = decodeURIComponent(card.dataset.personKey);
  const update = {};
  if (button.dataset.audienceDecision) update.decision = button.dataset.audienceDecision;
  if (button.dataset.keepLocked) update.keepLocked = true;
  if (button.dataset.profileState) update.profileState = button.dataset.profileState;
  await json(`/api/audience/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify(update) });
  const person = audience.people.find((entry) => entry.key === key);
  if (person) Object.assign(person, update, update.profileState === 'memorialized' ? { decision: 'keep', keepLocked: true } : {});
  renderAudience();
});

async function showProfileHover(card) {
  const popover = card.querySelector('.profile-hover');
  if (!popover || popover.dataset.loaded) return;
  popover.dataset.loaded = 'loading';
  popover.innerHTML = '<span>Loading profile evidence...</span>';
  try {
    const person = await json(`/api/audience/${card.dataset.personKey}`);
    const observation = person.profileObservation || {};
    const lastPost = observation.lastPostAt ? new Date(observation.lastPostAt).toLocaleDateString() : 'Not available yet';
    const photo = person.avatar || observation.image || '';
    const publicLinks = Array.isArray(observation.publicLinks) ? observation.publicLinks : [];
    const bio = observation.publicFacts?.bio || observation.description || '';
    const linkMarkup = publicLinks.slice(0, 5).map((link) => `<a href="${escape(link.url)}" target="_blank" rel="noopener">${escape(link.domain || link.label || link.url)}</a>`).join('');
    const previewImage = observation.coverPhoto || photo;
    const previewClass = observation.coverPhoto ? 'hover-cover' : 'hover-cover hover-cover-fallback';
    popover.innerHTML = `${previewImage ? `<img class="${previewClass}" src="${escape(previewImage)}" alt="">` : '<div class="hover-cover missing-cover">No profile image captured</div>'}<div class="hover-profile">${photo ? `<img src="${escape(photo)}" alt="">` : '<i class="fa-solid fa-user"></i>'}<div><strong>${escape(person.name)}</strong>${person.archiveSubtitle ? `<span>${escape(person.archiveSubtitle)}</span>` : ''}${bio ? `<span>${escape(bio)}</span>` : ''}<span>Last visible post: ${escape(lastPost)}</span><span>${observation.coverPhotoAvailable ? 'Cover photo found' : 'Profile photo preview'} · Retry ${person.profileRetryCount || 0}/6</span>${linkMarkup ? `<div class="hover-links">${linkMarkup}</div>` : ''}</div></div>`;
    popover.dataset.loaded = 'true';
  } catch {
    popover.innerHTML = '<span>Profile evidence is waiting for Ryzen review.</span>';
    popover.dataset.loaded = 'error';
  }
}

$('#audience-list').addEventListener('mouseover', (event) => { const card = event.target.closest('.audience-person'); if (card) showProfileHover(card); });
$('#audience-list').addEventListener('focusin', (event) => { const card = event.target.closest('.audience-person'); if (card) showProfileHover(card); });

json('/api/analytics').then(renderInsights);
json('/api/audience').then((data) => { audience = data; renderPeopleFilterOptions(); renderAudience(); renderScanProgress(scanProgressData); });
json('/api/audience-reports').then(renderAudienceReports);
json('/api/media-index').then(renderMediaIndex);
json('/api/archive-remix').then(renderArchiveRemix).catch(() => renderArchiveRemix());
json('/api/archive-remix/personal-plan').then(renderPersonalArchivePlan).catch((error) => { $('#personal-archive-plan-status').textContent = error.message; });
json('/api/comments').then((data) => { comments = data; $('#comment-mode').value = data.mode || 'review'; renderComments(); });
$('#comment-mode').addEventListener('change', async (event) => { comments = await json('/api/comments/settings', { method: 'PATCH', body: JSON.stringify({ mode: event.target.value }) }); renderComments(); });
$('#comment-list').addEventListener('click', async (event) => { const button = event.target.closest('[data-comment-action]'); if (!button) return; const card = button.closest('[data-comment-id]'); comments = await json(`/api/comments/${card.dataset.commentId}`, { method: 'PATCH', body: JSON.stringify({ action: button.dataset.commentAction }) }); renderComments(); });
loadQueue();
loadPublishingPipeline().catch((error) => {
  const status = $('#publishing-insight-updated');
  if (status) status.textContent = `Publishing proof could not load: ${error.message}`;
});
$('#scan-progress-refresh')?.addEventListener('click', loadScanProgress);
loadScanProgress();
window.setInterval(loadScanProgress, 300000);
const initialParams = new URLSearchParams(window.location.search);
if (initialParams.get('view')) openView(initialParams.get('view'));
if (initialParams.get('panel') === 'stats') showPeoplePanel('stats');
if (initialParams.get('panel') === 'archives') setMediaView('archives');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=47').then((registration) => registration.update());
