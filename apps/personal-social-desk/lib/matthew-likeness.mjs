export const MATTHEW_REFERENCE_PACK_DIR = 'apps/personal-social-desk/generated-media/references/matthew-likeness';

export const MATTHEW_CANONICAL_REFERENCE_ASSETS = Object.freeze([
  Object.freeze({
    filename: 'canonical-sunset-flannel.png',
    label: 'Sunset flannel street portrait',
    notes: 'Primary face and build reference. Broad jaw, ginger-to-auburn beard, black rectangular glasses, stocky frame, untattooed look.',
  }),
  Object.freeze({
    filename: 'canonical-mountain-hoodie.png',
    label: 'Mountain hoodie portrait',
    notes: 'Good secondary outdoor likeness reference for face width, beard density, glasses shape, and broader build.',
  }),
  Object.freeze({
    filename: 'canonical-burgundy-tee.png',
    label: 'Burgundy tee street portrait',
    notes: 'Useful attitude and stance reference. Keep the face and beard, but do not infer a tattoo from compression or shadow artifacts.',
  }),
]);

export const MATTHEW_REJECT_REFERENCE_ASSETS = Object.freeze([
  Object.freeze({
    filename: 'reject-portal-server-story.jpg',
    label: 'Portal server Story reject',
    reason: 'Wrong facial structure and overall ethnicity drift. Keep only as an anti-example.',
  }),
  Object.freeze({
    filename: 'reject-seated-server-story.jpg',
    label: 'Seated server Story reject',
    reason: 'Wrong face shape, beard treatment, and overall likeness drift. Keep only as an anti-example.',
  }),
]);

export function matthewReferencePackInstruction() {
  return `When a generation tool supports image references, use the project's canonical Matthew reference pack in ${MATTHEW_REFERENCE_PACK_DIR} as the source of truth, and never treat the reject examples in that folder as approved likeness references.`;
}

export function matthewLikenessAnchor() {
  return [
    'Matthew likeness anchor: light-skinned adult man, stocky broad-shouldered build, short brown hair with a clean fade, full ginger-to-auburn beard, black rectangular glasses, no tattoos, confident expression, creator-business presence.',
    'Match the canonical reference pack: broader nose and jaw, slightly fuller cheeks, medium-short brown hair with natural texture on top, a fuller beard at the chin and mustache, and a compact powerful torso.',
    'Keep his face consistent across generations: same beard color, same glasses shape, same broader nose and jawline, same stocky build, and clean untattooed arms. Do not drift into a different ethnicity, a narrow long face, black hair, black beard, a skinny frame, a baby-faced look, heavy tattoos, or a clean-shaven face.',
    'Matthew is the main character inside the chosen style family. Reinterpret his real likeness to fit that art direction instead of replacing him with a generic model or unrelated character.',
  ].join(' ');
}

