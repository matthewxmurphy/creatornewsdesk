import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFacebookCaption,
  buildContentDemand,
  categoryForItem,
  extractExternalUrl,
  missingRunwaySlots,
  rankCategoryPerformance,
  removeArtificialRecycleLabel,
  selectUniqueCandidates,
} from '../facebook-runway-lib.mjs';

test('builds a clean first-publication caption without recycle language', () => {
  const caption = buildFacebookCaption({
    title: 'The real story behind Burdick Ridge.',
    excerpt: '<p>A ridge on Livingston Island.</p>',
    permalink: 'https://example.com/burdick-ridge/',
  }, '#facts');
  assert.equal(caption, [
    'The real story behind Burdick Ridge.',
    '',
    'A ridge on Livingston Island.',
    '',
    'Read it here: https://example.com/burdick-ridge/',
    '',
    '#facts',
  ].join('\n'));
  assert.doesNotMatch(caption, /worth another look|recycl/i);
});

test('preserves an explicit editorial social caption', () => {
  assert.equal(buildFacebookCaption({ social_caption: 'A hand-written caption.' }, '#facts'), 'A hand-written caption.');
});

test('removes only the artificial recycle label from an existing caption', () => {
  const message = 'Worth another look from The Factology Daily:\n\nThe real story.\n\nRead it here: https://example.com/story/';
  assert.equal(removeArtificialRecycleLabel(message), 'The real story.\n\nRead it here: https://example.com/story/');
  assert.equal(removeArtificialRecycleLabel('A normal caption.'), 'A normal caption.');
});

test('extracts the article URL and category from a social caption', () => {
  const message = 'Read it here: https://example.com/science/a-fact/\n#facts';
  assert.equal(extractExternalUrl(message), 'https://example.com/science/a-fact/');
  assert.equal(categoryForItem({ message }), 'Science');
});

test('builds Meta maximum 29 day runway at twelve slots per day', () => {
  const result = missingRunwaySlots({
    now: new Date('2026-09-01T00:00:00Z'),
    days: 29,
    postsPerDay: 12,
    leadMinutes: 30,
    existingEpochs: [1788228000],
  });
  assert.equal(result.targetCount, 348);
  assert.equal(result.slotSeconds, 7200);
  assert.equal(result.slots.length, 347);
});

test('ranks category performance using weighted engagement', () => {
  const rows = rankCategoryPerformance([
    { category: 'Science', reactions: 2, comments: 1, shares: 1 },
    { category: 'History', reactions: 1, comments: 0, shares: 0 },
  ], ['Science', 'History'], true);
  assert.equal(rows[0].category, 'Science');
  assert.equal(rows[0].score, 7);
});

test('does not invent performance scores when metrics are unavailable', () => {
  const rows = rankCategoryPerformance([{ category: 'Science' }], ['Science'], false);
  assert.equal(rows[0].score, 0);
});

test('zero-valued Graph summaries stay numeric', () => {
  const rows = rankCategoryPerformance([{
    category: 'Science',
    reactions: { summary: { total_count: 0 } },
    comments: { summary: { total_count: 0 } },
    shares: { count: 0 },
  }], ['Science'], true);
  assert.equal(rows[0].reactions, 0);
  assert.equal(rows[0].comments, 0);
  assert.equal(rows[0].score, 0);
});

test('selects only image-backed candidates not already scheduled', () => {
  const selected = selectUniqueCandidates({
    candidates: [
      { permalink: 'https://example.com/science/a/', featured_media: 1, category: 'Science' },
      { permalink: 'https://example.com/history/b/', featured_media: 2, category: 'History' },
      { permalink: 'https://example.com/history/c/', featured_media: 0, category: 'History' },
    ],
    scheduledMessages: ['Read: https://example.com/science/a/'],
    limit: 10,
  });
  assert.deepEqual(selected.map((item) => item.permalink), ['https://example.com/history/b/']);
});

test('content demand reports the runway gap and unique supply', () => {
  const result = buildContentDemand({
    missingSlots: 339,
    candidates: [{ permalink: 'a', category: 'Science' }, { permalink: 'b', category: 'History' }],
    performance: [{ category: 'Science', score: 4 }, { category: 'History', score: 1 }],
  });
  assert.equal(result.missing_slots, 339);
  assert.equal(result.ready_unique_items, 2);
  assert.equal(result.priority_categories[0].category, 'Science');
});
