import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextTouchAfter, stepAt, isFirstStep, stepLabel } from './sequences.mjs';
import { addDays, daysBetween, isoWeek } from './localdate.mjs';

test('email cadence is day 0, +4, +12', () => {
  assert.equal(nextTouchAfter('Email', 1, '2026-09-04'), '2026-09-08');
  assert.equal(nextTouchAfter('Email', 2, '2026-09-08'), '2026-09-20');
  assert.equal(nextTouchAfter('Email', 3, '2026-09-20'), null, 'after the breakup the sequence is finished');
});

test('linkedin gates the message step behind an accepted connection', () => {
  assert.equal(stepAt('LinkedIn', 0).key, 'connect');
  assert.match(stepAt('LinkedIn', 1).gate, /accepted/);
  assert.equal(stepAt('LinkedIn', 2), null);
});

test('first-step detection drives the caps', () => {
  assert.equal(isFirstStep('Email', 'first'), true);
  assert.equal(isFirstStep('Email', 'follow-up'), false);
  assert.equal(isFirstStep('Instagram', 'dm'), true);
  assert.equal(isFirstStep('Call', 'call-2'), false);
  assert.equal(isFirstStep('Nope', 'x'), false);
});

test('labels resolve', () => {
  assert.equal(stepLabel('Email', 'breakup'), 'Breakup');
  assert.equal(stepLabel('Email', 'unknown'), 'unknown');
});

test('date helpers cross month ends and weeks', () => {
  assert.equal(addDays('2026-08-30', 4), '2026-09-03');
  assert.equal(daysBetween('2026-09-01', '2026-09-04'), 3);
  assert.equal(isoWeek('2026-09-04').label, '2026-W36');
  assert.equal(isoWeek('2026-09-04').monday, '2026-08-31');
});
