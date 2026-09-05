import {
  CREATOR_TIP_TIME_ZONE,
  creatorTipLaunchSchedule,
  creatorTipNumberFromItem,
} from './creator-tip-schedule.mjs';

const ROTATION_START_DATE = '2026-08-01';
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const ORIGINALITY_GUARDRAILS = [
  'Create wholly original characters and visual language.',
  'Do not copy or imitate existing characters, costumes, logos, publisher looks, or layouts.',
  'Do not include copyrighted franchise names or references.',
  'Matthew must be the only recognizable branded person.',
].join(' ');

function promptFor(format, dimensions, direction) {
  return `Create original ${dimensions} Creator Tip ${format} art using this private visual direction: ${direction}. Make the medium, palette, linework, lighting, and composition clearly different from adjacent Daily Series. The visual-direction label is private metadata and must never appear in the public artwork. ${ORIGINALITY_GUARDRAILS}`;
}

export function creatorTipArtFamilyFromDirection({ key, label, direction }) {
  const safeKey = String(key || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const safeLabel = String(label || '').trim();
  const safeDirection = String(direction || '').trim();
  if (!safeKey || !safeLabel || !safeDirection) return null;
  return Object.freeze({
    key: safeKey,
    label: safeLabel,
    feed: promptFor('feed', '1200x630', safeDirection),
    story: promptFor('Story', '1080x1920', safeDirection),
  });
}

export const CREATOR_TIP_ART_FAMILIES = Object.freeze([
  {
    key: 'retro-suburban-cartoon',
    label: 'Retro Suburban Cartoon',
    direction: 'hand-drawn prime-time suburban satire with warm flat colors, elastic expressions, thick uneven outlines, and a completely original cast and setting',
  },
  {
    key: 'bright-hero-comic',
    label: 'Bright Hero Comic',
    direction: 'original optimistic high-energy superhero pulp',
  },
  {
    key: 'noir-vigilante-comic',
    label: 'Noir Vigilante Comic',
    direction: 'original shadowy urban vigilante pulp',
  },
  {
    key: 'cat-sarcasm-strip',
    label: 'Cat Sarcasm Strip',
    direction: 'original cynical domestic pet-strip humor without copied characters',
  },
  {
    key: 'office-family-strip',
    label: 'Office Family Strip',
    direction: 'original polished domestic newspaper-strip comedy',
  },
  {
    key: 'childlike-panel-strip',
    label: 'Childlike Panel Strip',
    direction: 'original rounded single-panel family-cartoon innocence',
  },
  {
    key: 'suburban-sitcom-satire',
    label: 'Suburban Sitcom Satire',
    direction: 'hand-drawn prime-time suburban satire with warm flat colors, elastic expressions, thick uneven outlines, and a completely original cast and setting',
  },
  {
    key: 'cut-paper-town-comedy',
    label: 'Cut-Paper Town Comedy',
    direction: 'tactile cut-paper small-town comedy with layered construction-paper shapes, simple geometric figures, snowy depth, and wholly original characters',
  },
  {
    key: 'block-built-adventure',
    label: 'Block-Built Adventure',
    direction: 'cinematic interlocking-brick toy-world adventure with practical miniature lighting and an original non-branded figure design',
  },
  {
    key: 'clay-studio-comedy',
    label: 'Clay Studio Comedy',
    direction: 'handmade clay stop-motion studio comedy with visible fingerprints, miniature sets, soft practical lighting, and expressive original puppets',
  },
  {
    key: 'retro-arcade-comic',
    label: 'Retro Arcade Comic',
    direction: 'high-contrast 16-bit arcade storytelling with pixel clusters, limited neon palette, dramatic side-scrolling staging, and crisp readable headline zones',
  },
  {
    key: 'risograph-zine',
    label: 'Risograph Creator Zine',
    direction: 'independent risograph zine with two-color ink misregistration, halftone grain, torn-paper panels, and bold editorial typography',
  },
  {
    key: 'kinetic-manga-panels',
    label: 'Kinetic Manga Panels',
    direction: 'original black-and-white kinetic manga page with speed lines, screentone texture, extreme perspective, and one restrained spot color',
  },
  {
    key: 'neon-future-noir',
    label: 'Neon Future Noir',
    direction: 'rainy neon future-noir graphic novel with cyan and amber rim light, reflective streets, angular panel cuts, and cinematic depth',
  },
  {
    key: 'storybook-collage',
    label: 'Storybook Collage',
    direction: 'layered editorial storybook collage with painted paper, fabric texture, ink annotations, playful scale shifts, and generous negative space',
  },
  {
    key: 'street-mural-poster',
    label: 'Street Mural Poster',
    direction: 'large-scale street mural poster with spray texture, wheat-paste tears, stencil shadows, energetic arrows, and bold urban color blocking',
  },
].map((family) => Object.freeze({
  key: family.key,
  label: family.label,
  feed: promptFor('feed', '1200x630', family.direction),
  story: promptFor('Story', '1080x1920', family.direction),
})));

const publishDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CREATOR_TIP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function localPublishDate(scheduledFor) {
  const parts = Object.fromEntries(
    publishDateFormatter.formatToParts(new Date(scheduledFor))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dayDifference(date, anchorDate) {
  return (Date.parse(`${date}T00:00:00.000Z`) - Date.parse(`${anchorDate}T00:00:00.000Z`))
    / MILLISECONDS_PER_DAY;
}

export function creatorTipArtStyle(itemOrTipNumber, { families = CREATOR_TIP_ART_FAMILIES, dateOverrides = {} } = {}) {
  const tipNumber = itemOrTipNumber && typeof itemOrTipNumber === 'object'
    ? creatorTipNumberFromItem(itemOrTipNumber)
    : Number(itemOrTipNumber);
  const editionSchedule = itemOrTipNumber && typeof itemOrTipNumber === 'object'
    ? itemOrTipNumber.scheduledFor || itemOrTipNumber.intendedScheduledFor
    : null;
  const scheduledFor = editionSchedule || creatorTipLaunchSchedule(tipNumber);
  if (!scheduledFor) return null;

  const publishDate = localPublishDate(scheduledFor);
  const availableFamilies = [...CREATOR_TIP_ART_FAMILIES];
  for (const family of Array.isArray(families) ? families : []) {
    if (!family?.key || availableFamilies.some((entry) => entry.key === family.key)) continue;
    availableFamilies.push(family);
  }
  const persistedStyleKey = itemOrTipNumber && typeof itemOrTipNumber === 'object'
    ? String(itemOrTipNumber?.mediaVariant?.styleKey || itemOrTipNumber?.artworkDay?.key || '')
    : '';
  const overrideStyleKey = String(dateOverrides?.[publishDate] || '');
  const selectedStyleKey = overrideStyleKey || persistedStyleKey;
  const persistedFamily = availableFamilies.find((family) => family.key === selectedStyleKey);
  if (persistedFamily) {
    const persistedPublishDate = String(
      itemOrTipNumber?.scheduledFor
        ? publishDate
        : itemOrTipNumber?.mediaVariant?.publishDate || itemOrTipNumber?.artworkDay?.publishDate || publishDate,
    );
    return {
      key: persistedFamily.key,
      label: persistedFamily.label,
      feed: persistedFamily.feed,
      story: persistedFamily.story,
      scheduledFor,
      publishDate: persistedPublishDate,
      rotationIndex: availableFamilies.indexOf(persistedFamily),
      persisted: true,
      overridden: Boolean(overrideStyleKey),
    };
  }
  const elapsedDays = dayDifference(publishDate, ROTATION_START_DATE);
  const rotationIndex = ((elapsedDays % CREATOR_TIP_ART_FAMILIES.length)
    + CREATOR_TIP_ART_FAMILIES.length) % CREATOR_TIP_ART_FAMILIES.length;
  const family = CREATOR_TIP_ART_FAMILIES[rotationIndex];

  return {
    key: family.key,
    label: family.label,
    feed: family.feed,
    story: family.story,
    scheduledFor,
    publishDate,
    rotationIndex,
  };
}
