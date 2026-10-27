import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  htmlToText,
  titleOf,
  linkOf,
  shortId,
  messageOf,
  parseTraffic,
  lineTraffic,
  seriousMessages,
  DISRUPTION_HOLD_MS,
} from '../src/traffic.js';
import { DISRUPTIONS, NOW, disruption } from './helpers/fixtures.js';

const MINUTE = 60 * 1000;

test('the text of a message: breaks kept, tags dropped, entities decoded', () => {
  assert.equal(
    htmlToText('<b>Ce lundi 26/10</b> : <br/>► Jean Moulin &amp; Mongy&nbsp;!&#39;'),
    "Ce lundi 26/10 :\n► Jean Moulin & Mongy !'",
  );
  // Ilévia also separates paragraphs with zero-width spaces.
  assert.equal(
    htmlToText('indisponibles :\u200bDu 2 au 16 novembre'),
    'indisponibles :\nDu 2 au 16 novembre',
  );
  assert.equal(titleOf('La ligne 1 est ralentie. Reprise vers 17h.'), 'La ligne 1 est ralentie.');
  assert.equal(titleOf('x'.repeat(200)).length, 140);
  assert.equal(
    linkOf(
      'le plan <a href="https://media.ilevia.fr/prod-cms/busmap/PRT-07.pdf" target="_blank">[ici]</a>',
    ),
    'https://media.ilevia.fr/prod-cms/busmap/PRT-07.pdf',
  );
  assert.equal(linkOf('<a href="http://example.com">x</a>'), '');
  assert.equal(
    shortId('ILEVIA:Item::de7a353a-3951-408d-bc62-dd8440ce0c1c:LOC'),
    'de7a353a-3951-408d-bc62-dd8440ce0c1c',
  );
});

test('a record: its line, its type, its Paris times', () => {
  const message = messageOf(disruption());
  assert.deepEqual(
    [message.id, message.lineId, message.type],
    ['11111111-2222-3333-4444-555555555555', 'ME1', 'disrupted'],
  );
  assert.equal(message.published, Date.parse('2026-10-27T16:00:00Z'));
  assert.equal(message.end, Date.parse('2026-10-28T16:00:00Z'));
  assert.equal(messageOf(disruption({ type_perturbation: 'Information' })).type, 'info');
  // The messages of the day: every one about a line.
  assert.equal(parseTraffic(DISRUPTIONS).messages.length, 16);
});

test('a line: normal, info while a message counts, disrupted by a fresh incident', () => {
  const traffic = parseTraffic(DISRUPTIONS);
  // 17:02 on 27/10: the incidents of the 26th are over (a day after).
  assert.deepEqual(lineTraffic(traffic, 'ME1', NOW), { state: 'normal', messages: [] });
  const tram = lineTraffic(traffic, '71', NOW);
  assert.equal(tram.state, 'info');
  assert.equal(tram.messages.length, 3);
  // The latest first.
  assert.match(tram.messages[0].title, /^Du 2 au 30 novembre/);
  assert.equal(lineTraffic(null, 'ME1', NOW).state, 'unknown');
});

test('an incident counts DISRUPTION_HOLD_MS, unless a newer message supersedes it', () => {
  const traffic = parseTraffic([disruption()]);
  const now = lineTraffic(traffic, 'ME1', NOW);
  assert.equal(now.state, 'disrupted');
  assert.equal(seriousMessages(now).length, 1);
  // Its message stays (a day), but the incident is no longer under way.
  const later = lineTraffic(
    traffic,
    'ME1',
    Date.parse('2026-10-27T16:00:00Z') + DISRUPTION_HOLD_MS + MINUTE,
  );
  assert.deepEqual([later.state, later.messages.length], ['info', 1]);
  const superseded = parseTraffic([
    disruption(),
    disruption({
      identifiant_perturbation: 'ILEVIA:Item::22222222-2222-3333-4444-555555555555:LOC',
      type_perturbation: 'Information',
      message: 'La ligne 1 du métro est ralentie.',
      date_modification: '2026-10-27T17:01:00.000Z',
    }),
  ]);
  assert.equal(lineTraffic(superseded, 'ME1', NOW).state, 'info');
  // A message published ahead of the clock of the instance still counts.
  const ahead = parseTraffic([disruption({ date_modification: '2026-10-27T17:05:00.000Z' })]);
  assert.equal(lineTraffic(ahead, 'ME1', NOW).state, 'disrupted');
  // An explicit end before the default day.
  const ended = parseTraffic([disruption({ heure_fin_prevue: '2026-10-27T17:01:00.000Z' })]);
  assert.equal(lineTraffic(ended, 'ME1', NOW).state, 'normal');
});
