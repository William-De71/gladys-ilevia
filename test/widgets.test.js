// The widget contents pass the validator of the SDK (what the core would
// drop or truncate), in every language.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import {
  buildDeparturesWidget,
  buildTrafficWidget,
  messageContent,
  readCount,
  routeValue,
  shortDate,
  publishedText,
  BOARD_COUNT,
} from '../src/widgets.js';
import { parsePassages } from '../src/departures.js';
import { parseTraffic, lineTraffic } from '../src/traffic.js';
import { LANGUAGES } from '../src/i18n.js';
import { NOW, TZ, PASSAGES, DISRUPTIONS, passage, disruption } from './helpers/fixtures.js';

const FLANDRES = ['LIG003', 'LIG006', 'LIG091', 'LIG112', 'LIG114', 'LIG115', 'LIG117'];
const ALL = parsePassages(PASSAGES, { ids: FLANDRES, stopName: 'Gare Lille Flandres' });
const LINES = {
  M1: { id: 'ME1', name: 'M1', mode: 'metro' },
  M2: { id: 'ME2', name: 'M2', mode: 'metro' },
  TRAM: { id: '71', name: 'TRAM', mode: 'tram' },
  L50: { id: '50', name: '50', mode: 'bus' },
};

/**
 * @description Assert that the core would keep the content whole.
 * @param {object} content - The content.
 * @param {string} label - For the message.
 */
function assertValid(content, label) {
  assert.deepEqual(validateWidgetContent(content), [], label);
}

test('departures widget: one compact row per route, soonest first, in every language', () => {
  for (const language of LANGUAGES) {
    const content = buildDeparturesWidget({
      title: 'Gare Lille Flandres',
      passages: ALL,
      readAt: NOW,
      count: 6,
      language,
      now: NOW,
      timeZone: TZ,
    });
    assertValid(content, language);
    const [heading, caption, status] = content.components;
    assert.equal(heading.text, 'Gare Lille Flandres');
    assert.match(caption.text, /^Ilévia · .*17:02/);
    assert.equal(status.items.length, 6);
  }
  const fr = buildDeparturesWidget({
    title: 'Gare Lille Flandres',
    passages: ALL,
    readAt: NOW,
    count: 3,
    language: 'fr',
    now: NOW,
    timeZone: TZ,
  });
  assert.deepEqual(
    fr.components[2].items.map((item) => [item.label, item.value]),
    // The bus of 17:00 is gone at 17:02.
    [
      ['50 → Marcq College', '2 · 17 min'],
      ['86 → Comines Gare', '2 · 27 min'],
      ['L5 → Haubourdin le Parc', '6 · 14 min'],
    ],
  );
});

test('departures widget: times beyond an hour, nothing announced, a silent tram', () => {
  const options = { language: 'en', now: NOW, timeZone: TZ };
  const late = parsePassages([
    passage(),
    passage({ heure_estimee_depart: '2026-10-27T18:40:00Z' }),
  ]);
  assert.equal(routeValue(late, options), '6 min · 18:40');
  const empty = buildDeparturesWidget({
    title: 'Gare Lille Flandres',
    passages: [],
    readAt: NOW,
    count: 6,
    language: 'de',
    now: NOW,
    timeZone: TZ,
  });
  assertValid(empty, 'empty');
  assert.equal(
    empty.components[1].text,
    'Keine Abfahrt angekündigt. Ilévia · aktualisiert um 17:02.',
  );
  assert.equal(empty.ttl_seconds, 300);
  const tram = buildDeparturesWidget({
    title: 'Le Quesne',
    passages: [],
    readAt: NOW,
    tramOnly: true,
    count: 6,
    language: 'fr',
    now: NOW,
    timeZone: TZ,
  });
  assert.match(tram.components[1].text, /^Aucun passage en temps réel publié pour le tram\./);
});

test('departures widget: several stops in one list, a row per stop then its routes', () => {
  const content = buildDeparturesWidget({
    boards: [
      {
        title: 'Gare Lille Flandres (L5)',
        label: 'Gare Lille Flandres',
        passages: ALL,
        readAt: NOW,
      },
      { title: 'Le Quesne', label: 'Le Quesne', passages: [], readAt: NOW - 60000, tramOnly: true },
    ],
    count: 6,
    language: 'fr',
    now: NOW,
    timeZone: TZ,
  });
  assertValid(content, 'several');
  const [heading, caption, status] = content.components;
  assert.equal(heading.text, 'Gare Lille Flandres · Le Quesne');
  assert.equal(caption.text, 'Ilévia');
  assert.equal(status.items[0].icon, 'map-pin');
  assert.equal(status.items[0].value, 'lu à 17:02');
  assert.equal(status.items.at(-1).value, 'Pas de temps réel (tram)');
  assert.ok(status.items.length <= 10);
});

test('traffic widget: states, messages with their text and time, in every language', () => {
  const traffic = parseTraffic([...DISRUPTIONS, disruption()]);
  const lines = [LINES.M1, LINES.M2, LINES.TRAM, LINES.L50].map((line) => ({
    line,
    traffic: lineTraffic(traffic, line.id, NOW),
  }));
  for (const language of LANGUAGES) {
    const content = buildTrafficWidget({ lines, readAt: NOW, language, now: NOW, timeZone: TZ });
    assertValid(content, language);
  }
  const fr = buildTrafficWidget({ lines, readAt: NOW, language: 'fr', now: NOW, timeZone: TZ });
  const [heading, status, cards, caption] = fr.components;
  assert.equal(heading.text, 'Trafic Ilévia');
  assert.deepEqual(
    status.items.map((item) => [item.label, item.value, item.color]),
    [
      ['Métro 1', 'Trafic perturbé', 'danger'],
      ['Métro 2', 'Trafic normal', 'success'],
      ['Tramway', 'Info trafic', 'info'],
      ['Ligne 50', 'Trafic normal', 'success'],
    ],
  );
  // The incident first, then the latest messages.
  assert.deepEqual(
    cards.items.map((item) => [item.badge.text, item.subtitle]),
    [
      ['M1', 'Trafic perturbé · publié 17:00'],
      ['TRAM', 'Info trafic · publié 04:00'],
      ['TRAM', 'Info trafic · publié 03:12'],
      ['TRAM', 'Info trafic · publié 26/10 21:31'],
    ],
  );
  assert.match(cards.items[0].description, /\nDes bus relais sont mis en place\.$/);
  assert.equal(caption.text, 'Ilévia · mis à jour à 17:02');
  // A link of the message, on https.
  const linked = parseTraffic([
    disruption({ message: 'Plan <a href="https://media.ilevia.fr/plan.pdf">[ici]</a>' }),
  ]);
  const card = buildTrafficWidget({
    lines: [{ line: LINES.M1, traffic: lineTraffic(linked, 'ME1', NOW) }],
    readAt: NOW,
    language: 'en',
    now: NOW,
    timeZone: TZ,
  }).components[2].items[0];
  assert.deepEqual(card.links, [
    { url: 'https://media.ilevia.fr/plan.pdf', label: 'Open the document' },
  ]);
  // Nothing to say.
  const calm = buildTrafficWidget({
    lines: [{ line: LINES.L50, traffic: lineTraffic(traffic, '50', NOW) }],
    readAt: NOW,
    language: 'es',
    now: NOW,
    timeZone: TZ,
  });
  assertValid(calm, 'calm');
  assert.equal(
    calm.components[2].text,
    'Ningún aviso de tráfico para estas líneas. Ilévia · actualizado a las 17:02.',
  );
});

test('messages and settings', () => {
  assertValid(messageContent('Hello'), 'message');
  assert.equal(readCount(undefined, BOARD_COUNT), BOARD_COUNT.default);
  assert.equal(readCount('99', BOARD_COUNT), BOARD_COUNT.max);
  assert.equal(readCount(0, BOARD_COUNT), BOARD_COUNT.min);
  assert.equal(shortDate(Date.parse('2026-12-31T22:59:00Z'), TZ), '31/12');
  assert.equal(shortDate(null, TZ), '');
  assert.equal(publishedText(Date.parse('2026-10-27T15:48:00Z'), NOW, TZ), '16:48');
  assert.equal(publishedText(Date.parse('2026-10-26T20:31:00Z'), NOW, TZ), '26/10 21:31');
  assert.equal(publishedText(null, NOW, TZ), '');
});
