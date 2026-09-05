import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft } from './drafter.mjs';

test('dashes, exclamation marks, spelling, and markdown are repaired', () => {
  const v = validateDraft('We optimise sites — fast! **Really**\n\n- point', { maxChars: 500 });
  assert.equal(v.rejected, '');
  assert.equal(v.text, 'We optimize sites, fast. Really\n\npoint');
  assert.ok(v.warnings.some((w) => /repairs/.test(w)));
});

test('foreign links and no-link channels are rejected', () => {
  assert.match(validateDraft('See https://example.com/x for more.').rejected, /not frontpagelabs/);
  assert.match(validateDraft('See frontpagelabs.com/work.', { allowLink: false }).rejected, /not allowed/);
  assert.equal(validateDraft('See frontpagelabs.com/work.', { allowLink: true }).rejected, '');
});

test('length cap and banned phrases reject', () => {
  assert.match(validateDraft('x'.repeat(300), { maxChars: 200 }).rejected, /too long/);
  assert.match(validateDraft('Hope this finds you well.').rejected, /banned/);
  assert.match(validateDraft('We can leverage your site.').rejected, /banned/);
});

test('rule of three is a warning, not a rejection', () => {
  const v = validateDraft('The site is slow, dated, and hard to read on a phone.');
  assert.equal(v.rejected, '');
  assert.ok(v.warnings.some((w) => /rule-of-three/.test(w)));
});
