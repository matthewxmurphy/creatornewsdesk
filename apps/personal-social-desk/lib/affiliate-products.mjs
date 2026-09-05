const DEFAULT_DISCLOSURE = 'Affiliate disclosure: I may earn a commission from qualifying purchases.';

const AFFILIATE_PRODUCT_CATEGORIES = Object.freeze({
  microphone: ['microphone', 'mic', 'wireless mic', 'audio', 'audio setup', 'sound quality'],
  'green-screen': ['green screen', 'greenscreen', 'chroma key', 'virtual background', 'background removal'],
  camera: ['camera', 'action camera', '360 camera', 'creator camera', 'video gear', 'filming'],
  lighting: ['ring light', 'key light', 'creator lighting', 'video lighting', 'studio lighting', 'lighting'],
  accessory: ['camera accessory', 'creator gear', 'content creation gear', 'filming accessory'],
  other: [],
});

function cleanText(value = '', maximum = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function normalizeKeywords(value) {
  const entries = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(entries
    .map((entry) => cleanText(entry, 80).toLocaleLowerCase())
    .filter((entry) => entry.length >= 2))].slice(0, 30);
}

function normalizeMatchPhrases(value) {
  const entries = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(entries
    .map((entry) => cleanText(entry, 140).toLocaleLowerCase())
    .filter((entry) => entry.length >= 3))].slice(0, 40);
}

function normalizeCategory(value = '') {
  const category = cleanText(value, 40).toLocaleLowerCase().replace(/[_\s]+/g, '-');
  return Object.hasOwn(AFFILIATE_PRODUCT_CATEGORIES, category) ? category : 'other';
}

function normalizeApprovalStatus(value = 'approved') {
  return value === 'pending' || value === 'rejected' ? value : 'approved';
}

function categoryKeywords(category = 'other') {
  return AFFILIATE_PRODUCT_CATEGORIES[normalizeCategory(category)] || [];
}

export function safeAffiliateUrl(value = '') {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function normalizeAffiliateStore(value = {}) {
  const products = (Array.isArray(value.products) ? value.products : [])
    .map((product) => {
      const url = safeAffiliateUrl(product?.url);
      const label = cleanText(product?.label, 140);
      if (!url || !label) return null;
      return {
        id: cleanText(product?.id, 100),
        label,
        url,
        category: normalizeCategory(product?.category),
        keywords: normalizeKeywords([
          ...normalizeKeywords(product?.keywords),
          ...categoryKeywords(product?.category),
        ]),
        matchPhrases: normalizeMatchPhrases(product?.matchPhrases),
        strictMatching: product?.strictMatching === true,
        active: product?.active !== false,
        approvalStatus: normalizeApprovalStatus(product?.approvalStatus),
        source: cleanText(product?.source, 80),
        createdAt: product?.createdAt || null,
        updatedAt: product?.updatedAt || null,
      };
    })
    .filter(Boolean);
  return {
    updatedAt: value.updatedAt || null,
    disclosure: cleanText(value.disclosure, 500) || DEFAULT_DISCLOSURE,
    products,
  };
}

export function normalizeAffiliateProduct(value = {}) {
  const label = cleanText(value.label, 140);
  const url = safeAffiliateUrl(value.url);
  const category = normalizeCategory(value.category);
  const keywords = normalizeKeywords([
    ...normalizeKeywords(value.keywords),
    ...categoryKeywords(category),
  ]);
  if (!label) throw new Error('Add a product name.');
  if (!url) throw new Error('Use a complete HTTPS product or affiliate link.');
  if (!keywords.length) throw new Error('Add at least one matching keyword, such as microphone or green screen.');
  return {
    id: cleanText(value.id, 100),
    label,
    url,
    category,
    keywords,
    matchPhrases: normalizeMatchPhrases(value.matchPhrases),
    strictMatching: value.strictMatching === true,
    active: value.active !== false,
    approvalStatus: normalizeApprovalStatus(value.approvalStatus),
    source: cleanText(value.source, 80),
  };
}

function phraseScore(text, phrase) {
  if (!phrase || !text.includes(phrase)) return 0;
  return Math.max(2, phrase.split(/\s+/).length * 2);
}

export function affiliateProductMatch(productValue = {}, post = {}) {
  const product = normalizeAffiliateStore({ products: [productValue] }).products[0];
  if (!product) return null;
  const text = cleanText([
    post.title,
    post.body,
    post.imagePrompt,
    post.storyImagePrompt,
  ].filter(Boolean).join(' '), 50_000).toLocaleLowerCase();
  if (!text) return null;
  const matchedPhrases = product.matchPhrases.filter((phrase) => phraseScore(text, phrase) > 0);
  if (product.strictMatching && !matchedPhrases.length) return null;
  const matchedKeywords = product.keywords.filter((keyword) => phraseScore(text, keyword) > 0);
  const score = matchedPhrases.reduce((total, phrase) => total + 20 + phraseScore(text, phrase), 0)
    + matchedKeywords.reduce((total, keyword) => total + phraseScore(text, keyword), 0);
  return score > 0 ? { ...product, matchedPhrases, matchedKeywords, score } : null;
}

export function affiliateProductSuggestions(storeValue, post = {}) {
  const store = normalizeAffiliateStore(storeValue);
  return store.products
    .filter((product) => product.active && product.approvalStatus === 'approved')
    .map((product) => affiliateProductMatch(product, post))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
}

function withoutDisclosure(body = '', disclosure = '') {
  if (!disclosure) return String(body || '').trim();
  const escaped = disclosure.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(body || '').replace(new RegExp(`(?:\\n\\s*)?${escaped}`, 'gi'), '').trim();
}

export function appendAffiliateProducts(body = '', productValues = [], disclosureValue = DEFAULT_DISCLOSURE) {
  const products = [...new Map((Array.isArray(productValues) ? productValues : [productValues])
    .map((product) => normalizeAffiliateProduct(product))
    .map((product) => [product.url, product])).values()];
  if (!products.length) throw new Error('Choose at least one approved product link.');
  const disclosure = cleanText(disclosureValue, 500) || DEFAULT_DISCLOSURE;
  const current = withoutDisclosure(body, disclosure);
  const blocks = [current];
  for (const product of products) {
    if (!current.includes(product.url)) blocks.push(`Product link: ${product.label}\n${product.url}`);
  }
  if (disclosure) blocks.push(disclosure);
  return blocks.filter(Boolean).join('\n\n');
}

export function appendAffiliateProduct(body = '', productValue = {}, disclosureValue = DEFAULT_DISCLOSURE) {
  return appendAffiliateProducts(body, [productValue], disclosureValue);
}

export { AFFILIATE_PRODUCT_CATEGORIES, DEFAULT_DISCLOSURE };

