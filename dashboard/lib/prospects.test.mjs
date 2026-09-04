import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, dedupeIndex, findDuplicate, firstNameOf, pickChannel, shape, toCsv } from './prospects.mjs';

test('normalize cleans input and picks a channel from what exists', () => {
  const p = normalize({ company: '  Verona Residences ', contact: 'Dr. Kyle Brandt', email: 'KBrandt@VeronaLiving.com', website: 'veronaliving.com/', instagram: '@verona.living', value: '$22,000' });
  assert.equal(p.name, 'Verona Residences');
  assert.equal(p.email, 'kbrandt@veronaliving.com');
  assert.equal(p.website, 'https://veronaliving.com');
  assert.equal(p.instagramUrl, 'https://www.instagram.com/verona.living/');
  assert.equal(p.value, 22000);
  assert.equal(p.channel, 'Email');
  assert.equal(firstNameOf(p.contact), 'Kyle');
  assert.equal(pickChannel({ linkedinUrl: 'x' }), 'LinkedIn');
  assert.equal(pickChannel({}), 'Email');
});

test('duplicates collide on domain, phone, and case-insensitive email', () => {
  const idx = dedupeIndex([
    { id: 'a', name: 'Arbor', email: 'lena@arborpp.com', website: 'https://www.arborpp.com', phone: '(630) 555-0134', city: '' },
  ]);
  assert.equal(findDuplicate(normalize({ company: 'Arbor Property Partners', website: 'arborpp.com' }), idx).existing.id, 'a');
  assert.equal(findDuplicate(normalize({ company: 'X', phone: '630-555-0134' }), idx).existing.id, 'a');
  assert.equal(findDuplicate(normalize({ company: 'X', email: 'LENA@arborpp.com' }), idx).existing.id, 'a');
  assert.equal(findDuplicate(normalize({ company: 'Brand new', email: 'new@example.com' }), idx), null);
});

test('shape derives due, step, and overdue days', () => {
  const p = { ...normalize({ company: 'A', email: 'a@a.com' }), id: 'x', nextTouch: '2026-09-01', stepSent: 1 };
  const s = shape(p, { touches: [{ kind: 'Sent' }, { kind: 'Note' }], today: '2026-09-04' });
  assert.equal(s.due, true);
  assert.equal(s.stepKey, 'follow-up');
  assert.equal(s.isFollowUp, true);
  assert.equal(s.overdueDays, 3);
  assert.equal(s.touches, 1);
  const done = shape({ ...p, seqStatus: 'Finished' }, { touches: [], today: '2026-09-04' });
  assert.equal(done.due, false);
});

test('csv escapes commas and quotes', () => {
  const csv = toCsv([normalize({ company: 'Copper, Oak "Interiors"', email: 'm@co.co' })]);
  assert.match(csv, /"Copper, Oak ""Interiors"""/);
  assert.match(csv, /^Company,Contact,Email/);
});
