import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildToday } from './queue.mjs';
import { normalize, shape } from './prospects.mjs';

const today = '2026-09-04';
const caps = { total: 15, email: 7, linkedin: 4, instagram: 3, call: 1 };

function mk(i, over = {}) {
  const base = normalize({ company: 'Co ' + i, email: `p${i}@x.com`, linkedin: 'https://linkedin.com/in/p' + i, instagram: 'p' + i, phone: '312555' + String(1000 + i) });
  return shape({ ...base, id: 'p' + i, created: `2026-09-0${(i % 3) + 1}T00:00:00Z`, ...over }, { touches: [], today });
}

test('caps slice new leads 7/4/3/1 and follow-ups ride on top', () => {
  const prospects = [];
  for (let i = 0; i < 12; i++) prospects.push(mk(i, { channel: 'Email' }));
  for (let i = 12; i < 20; i++) prospects.push(mk(i, { channel: 'LinkedIn' }));
  for (let i = 20; i < 25; i++) prospects.push(mk(i, { channel: 'Instagram' }));
  for (let i = 25; i < 28; i++) prospects.push(mk(i, { channel: 'Call' }));
  prospects.push(mk(99, { channel: 'Email', stepSent: 1, nextTouch: '2026-09-02' }));
  prospects.push(mk(98, { channel: 'Email', stepSent: 2, nextTouch: '2026-09-01' }));

  const t = buildToday({ prospects, touches: [], caps, today });
  const fresh = (ch) => t.queue[ch].filter((p) => !p.isFollowUp).length;
  assert.equal(fresh('email'), 7);
  assert.equal(fresh('linkedin'), 4);
  assert.equal(fresh('instagram'), 3);
  assert.equal(fresh('call'), 1);
  assert.equal(t.plannedNew, 15);
  assert.equal(t.followUpsDue, 2);
  assert.equal(t.queue.email[0].id, 'p98', 'oldest due follow-up first');
  assert.equal(t.queue.email[1].id, 'p99');
  assert.equal(t.overflow.email, 5);
  assert.equal(t.overflowList.linkedin.length, 4);
});

test('today\'s sends reduce the remaining allowance and the total is shared', () => {
  const prospects = [];
  for (let i = 0; i < 10; i++) prospects.push(mk(i, { channel: 'Email' }));
  for (let i = 10; i < 20; i++) prospects.push(mk(i, { channel: 'LinkedIn' }));
  const touches = [
    { kind: 'Sent', channel: 'Email', step: 'first', at: today + 'T15:00:00Z' },
    { kind: 'Sent', channel: 'Email', step: 'first', at: today + 'T15:01:00Z' },
    { kind: 'Sent', channel: 'Email', step: 'follow-up', at: today + 'T15:02:00Z' },
    { kind: 'Sent', channel: 'Email', step: 'first', at: '2026-09-03T15:00:00Z' },
  ];
  const t = buildToday({ prospects, touches, caps: { total: 6, email: 7, linkedin: 4, instagram: 3, call: 1 }, today });
  assert.equal(t.sentToday.new.email, 2);
  assert.equal(t.sentToday.followUps, 1);
  assert.equal(t.queue.email.length, 4, 'total 6 minus 2 sent = 4 left, all email allowed under 7');
  assert.equal(t.queue.linkedin.length, 0, 'the shared total is used up');
});

test('unreachable, closed, snoozed, and replied prospects stay out', () => {
  const prospects = [
    mk(1, { channel: 'Email', stage: 'Lost' }),
    mk(2, { channel: 'Email', seqStatus: 'Replied' }),
    mk(3, { channel: 'Email', nextTouch: '2026-09-10' }),
    mk(4, { channel: 'Instagram', instagramUrl: '' }),
    mk(5, { channel: 'Email' }),
  ];
  const t = buildToday({ prospects, touches: [], caps, today });
  assert.deepEqual(t.queue.email.map((p) => p.id), ['p5']);
  assert.equal(t.queue.instagram.length, 0);
});
