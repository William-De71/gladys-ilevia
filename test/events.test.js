// Scene triggers fire once per transition, with flat payloads within the
// limits of the core; scene actions return their declared outputs only.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  detectReminders,
  detectLineChanges,
  reminderData,
  lineEvent,
  nextDeparturesOutputs,
  lineTrafficOutputs,
  pick,
  tolerance,
  TRIGGERS,
  REMINDER_MINUTES,
  NEXT_DEPARTURES_OUTPUTS,
  LINE_TRAFFIC_OUTPUTS,
} from '../src/events.js';
import { parsePassages } from '../src/departures.js';
import { parseTraffic, lineTraffic } from '../src/traffic.js';
import { LANGUAGES } from '../src/i18n.js';
import { NOW, TZ, DISRUPTIONS, PASSAGES, passage, disruption } from './helpers/fixtures.js';

const manifest = JSON.parse(
  readFileSync(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const FOLLOWED = {
  name: 'Gare Lille Flandres (L5 → Haubourdin)',
  deviceId: 'ext:ilevia:stop:n-gare-lille-flandres_l5_haubourdin',
  stop: { name: 'Gare Lille Flandres' },
};
const M1 = { id: 'ME1', name: 'M1', mode: 'metro', deviceId: 'ext:ilevia:line:me1' };
const TRAM = { id: '71', name: 'TRAM', mode: 'tram', deviceId: 'ext:ilevia:line:71' };
const MINUTE = 60 * 1000;

/**
 * @description Assert that event data is flat and within the limits of the core.
 * @param {object} data - The data.
 * @param {string} key - The trigger key.
 */
function assertPayload(data, key) {
  const trigger = manifest.scene_triggers.find((entry) => entry.key === key);
  assert.ok(trigger, key);
  assert.ok(Object.keys(data).length <= 30);
  for (const [name, value] of Object.entries(data)) {
    assert.ok(
      value === null || ['string', 'number', 'boolean'].includes(typeof value),
      `${key}.${name}`,
    );
    if (typeof value === 'string') {
      assert.ok(value.length <= 1000, `${key}.${name}`);
    }
  }
  // Every variable is in the data, and every field filters a key of it.
  for (const variable of trigger.variables) {
    assert.ok(variable.key in data, `${key}: variable ${variable.key}`);
  }
  for (const field of trigger.fields) {
    assert.ok(field.key in data, `${key}: field ${field.key}`);
  }
}

test('reminders: once per passage and mark, never on the first reading', () => {
  // 17:06:40 in Paris: 4 min 40 s after 17:02.
  const passages = parsePassages([passage({ heure_estimee_depart: '2026-10-27T17:06:40Z' })]);
  // First reading of the stop: a baseline.
  const first = detectReminders({ passages, fired: undefined, now: NOW });
  assert.deepEqual(first.due, []);
  assert.equal(first.fired.length, 1);
  // 4 min 40 s before: the 5-minute mark, once.
  const memory = detectReminders({ passages, fired: [], now: NOW });
  assert.deepEqual(
    memory.due.map((entry) => entry.mark),
    [5],
  );
  const again = detectReminders({ passages, fired: memory.fired, now: NOW + 10000 });
  assert.deepEqual(again.due, []);
  // The same bus announced a minute later is the same passage: no new 5.
  const later = parsePassages([passage({ heure_estimee_depart: '2026-10-27T17:07:30Z' })]);
  assert.deepEqual(detectReminders({ passages: later, fired: memory.fired, now: NOW }).due, []);
  // Old reminders are forgotten.
  const forgotten = detectReminders({ passages: [], fired: memory.fired, now: NOW + 20 * MINUTE });
  assert.deepEqual(forgotten.fired, []);
  assert.deepEqual(REMINDER_MINUTES.map(tolerance), [1, 1, 1.5, 3, 3, 3]);
});

test('departure soon: a flat payload, its summary in every language', () => {
  const passages = parsePassages(PASSAGES, { ids: ['LIG112'] });
  for (const language of LANGUAGES) {
    const data = reminderData(FOLLOWED, passages[0], 5, { language, timeZone: TZ });
    assertPayload(data, TRIGGERS.DEPARTURE_SOON);
    assert.equal(data.minutes, '5');
    assert.equal(data.time, '17:08');
  }
  assert.equal(
    reminderData(FOLLOWED, passages[0], 5, { language: 'fr', timeZone: TZ }).summary,
    'L5 vers Haubourdin le Parc passe à Gare Lille Flandres dans 5 min (17:08).',
  );
});

test('line changes: disrupted, a new message, back to a message without incident', () => {
  const incident = parseTraffic([disruption()]);
  // First reading of the line: a baseline, even disrupted.
  const first = detectLineChanges({ lines: [M1, TRAM], traffic: incident, seen: {}, now: NOW });
  assert.deepEqual(first.changes, []);
  assert.equal(first.seen.ME1.state, 'disrupted');
  // From normal to disrupted: the incident and its message.
  const normal = detectLineChanges({
    lines: [M1],
    traffic: parseTraffic([]),
    seen: {},
    now: NOW - MINUTE,
  });
  const disrupted = detectLineChanges({
    lines: [M1],
    traffic: incident,
    seen: normal.seen,
    now: NOW,
  });
  assert.deepEqual(
    disrupted.changes.map((change) => [change.key, change.message?.type]),
    [
      [TRIGGERS.LINE_DISRUPTED, 'disrupted'],
      [TRIGGERS.TRAFFIC_MESSAGE, 'disrupted'],
    ],
  );
  // The same reading again: nothing.
  const same = detectLineChanges({
    lines: [M1],
    traffic: incident,
    seen: disrupted.seen,
    now: NOW,
  });
  assert.deepEqual(same.changes, []);
  // Ninety minutes later the incident is no longer under way.
  const over = detectLineChanges({
    lines: [M1],
    traffic: incident,
    seen: same.seen,
    now: NOW + 90 * MINUTE,
  });
  assert.deepEqual(
    over.changes.map((change) => [change.key, change.traffic.state]),
    [[TRIGGERS.LINE_RESTORED, 'info']],
  );
});

test('line events: flat payloads, summaries in every language', () => {
  const traffic = lineTraffic(parseTraffic([disruption()]), 'ME1', NOW);
  const [message] = traffic.messages;
  for (const language of LANGUAGES) {
    const disrupted = lineEvent(
      { key: TRIGGERS.LINE_DISRUPTED, line: M1, traffic, message },
      { language, timeZone: TZ },
    );
    assertPayload(disrupted.data, TRIGGERS.LINE_DISRUPTED);
    const fresh = lineEvent(
      { key: TRIGGERS.TRAFFIC_MESSAGE, line: M1, traffic, message },
      { language, timeZone: TZ },
    );
    assertPayload(fresh.data, TRIGGERS.TRAFFIC_MESSAGE);
    const restored = lineEvent(
      {
        key: TRIGGERS.LINE_RESTORED,
        line: TRAM,
        traffic: lineTraffic(parseTraffic(DISRUPTIONS), '71', NOW),
      },
      { language, timeZone: TZ },
    );
    assertPayload(restored.data, TRIGGERS.LINE_RESTORED);
  }
  const fresh = lineEvent(
    { key: TRIGGERS.TRAFFIC_MESSAGE, line: M1, traffic, message },
    { language: 'en', timeZone: TZ },
  );
  assert.deepEqual(
    [fresh.data.line, fresh.data.line_name, fresh.data.kind, fresh.data.published],
    ['ext:ilevia:line:me1', 'M1', 'disrupted', '17:00'],
  );
  assert.match(fresh.data.summary, /^Ilévia, Metro 1, incident: En raison d’un incident technique/);
  assert.match(fresh.data.message, /Des bus relais sont mis en place\.$/);
});

test('scene action outputs: declared keys only, flat values', () => {
  const declared = (key) =>
    manifest.scene_actions.find((action) => action.key === key).outputs.map((output) => output.key);
  assert.deepEqual(NEXT_DEPARTURES_OUTPUTS, declared('get_next_departures'));
  assert.deepEqual(LINE_TRAFFIC_OUTPUTS, declared('get_line_traffic'));
  const passages = parsePassages(PASSAGES, { ids: ['LIG112'] });
  const next = pick(
    nextDeparturesOutputs({ followed: FOLLOWED, passages, now: NOW, language: 'en', timeZone: TZ }),
    NEXT_DEPARTURES_OUTPUTS,
  );
  assert.deepEqual(
    [next.found, next.line, next.minutes, next.following_minutes],
    [true, 'L5', 6, 14],
  );
  const none = nextDeparturesOutputs({
    followed: FOLLOWED,
    passages: [],
    now: NOW,
    language: 'en',
    timeZone: TZ,
  });
  assert.deepEqual([none.found, none.minutes, none.time], [false, -1, '']);
  assert.equal(none.summary, 'No passage announced at Gare Lille Flandres in the next half hour.');
  const traffic = lineTrafficOutputs({
    line: TRAM,
    traffic: lineTraffic(parseTraffic(DISRUPTIONS), '71', NOW),
    language: 'fr',
  });
  assert.deepEqual(
    [traffic.state, traffic.disrupted, traffic.message_count, traffic.state_label],
    ['info', false, 3, 'Info trafic'],
  );
  for (const value of [...Object.values(next), ...Object.values(traffic)]) {
    assert.ok(['string', 'number', 'boolean'].includes(typeof value));
  }
});
