import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatTime,
  localClock,
  serviceDay,
  newDaySince,
  parseFeedTime,
  feedClockOf,
  CLOCKS,
} from '../src/time.js';

const TZ = 'Europe/Paris';

test('times of day in the timezone of the instance', () => {
  assert.equal(formatTime(Date.parse('2026-10-17T20:19:00Z'), TZ), '22:19');
  assert.equal(formatTime(Date.parse('2026-10-17T20:19:00Z'), 'UTC'), '20:19');
  assert.equal(formatTime(null, TZ), '');
  assert.deepEqual(localClock(Date.parse('2026-10-25T01:30:00Z'), TZ), {
    date: '2026-10-25',
    minutes: 150,
  });
});

test('the service day changes at 04:00, local time', () => {
  assert.equal(serviceDay(Date.parse('2026-10-17T22:30:00Z'), TZ), '2026-10-17');
  assert.equal(serviceDay(Date.parse('2026-10-18T02:10:00Z'), TZ), '2026-10-18');
  const evening = Date.parse('2026-10-17T20:00:00Z');
  assert.equal(newDaySince(evening, Date.parse('2026-10-18T01:00:00Z'), TZ), false);
  assert.equal(newDaySince(evening, Date.parse('2026-10-18T02:05:00Z'), TZ), true);
  assert.equal(newDaySince(0, evening, TZ), true);
});

test('the "Z" times of the open data are Paris wall-clock times, both sides of a change of hour', () => {
  const iso = (value, clock) => new Date(parseFeedTime(value, clock)).toISOString();
  // Winter (UTC+1), summer (UTC+2), fractions of seconds.
  assert.equal(iso('2026-10-27T17:08:00Z'), '2026-10-27T16:08:00.000Z');
  assert.equal(iso('2026-07-01T12:00:00Z'), '2026-07-01T10:00:00.000Z');
  assert.equal(iso('2026-10-27T16:50:00.427Z'), '2026-10-27T15:50:00.427Z');
  // The hour repeated on 25 October: the first one. The hour skipped on 29
  // March: the offset of before.
  assert.equal(iso('2026-10-25T02:30:00Z'), '2026-10-25T00:30:00.000Z');
  assert.equal(iso('2026-03-29T02:30:00Z'), '2026-03-29T01:30:00.000Z');
  // Written in true UTC, or with an offset.
  assert.equal(iso('2026-10-27T16:08:00Z', CLOCKS.UTC), '2026-10-27T16:08:00.000Z');
  assert.equal(iso('2026-10-27T18:08:00+02:00', CLOCKS.UTC), '2026-10-27T16:08:00.000Z');
  assert.equal(parseFeedTime('soon'), null);
  assert.equal(parseFeedTime(null), null);
});

test('the clock of an answer: its freshest modification against its true UTC time', () => {
  const answeredAt = Date.parse('2026-10-27T16:02:08Z');
  const records = (...values) => values.map((date_modification) => ({ date_modification }));
  // 16:59 "Z" when it is 16:02 UTC: Paris time.
  assert.equal(
    feedClockOf(records('2026-10-27T16:47:14.000Z', '2026-10-27T16:59:42.451Z'), answeredAt),
    CLOCKS.WALL,
  );
  assert.equal(feedClockOf(records('2026-10-27T15:59:42Z'), answeredAt), CLOCKS.UTC);
  // Old messages only, or nothing: cannot tell.
  assert.equal(feedClockOf(records('2026-10-26T05:00:00Z'), answeredAt), null);
  assert.equal(feedClockOf([], answeredAt), null);
  assert.equal(feedClockOf(records('2026-10-27T16:59:42Z'), NaN), null);
});
