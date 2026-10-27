import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeConfig,
  readLanguage,
  readInterval,
  parseLines,
  parseAddedStops,
  DEFAULT_INTERVAL,
  MAX_ADDED_STOPS,
} from '../src/config.js';

test('stops, lines, interval and language from the raw config', () => {
  const config = normalizeConfig({
    stop_1: ' Gare Lille Flandres ',
    stop_1_line: 'L5',
    stop_1_direction: 'Haubourdin',
    stop_2: '',
    stop_3: 'LIG115',
    lines: 'M1, tram ; l1, m1',
    interval: '30',
    language: 'de',
  });
  assert.deepEqual(config, {
    stops: [
      { slot: 1, stop: 'Gare Lille Flandres', line: 'L5', direction: 'Haubourdin' },
      { slot: 3, stop: 'LIG115', line: '', direction: '' },
    ],
    addedStops: [],
    lines: ['M1', 'tram', 'l1'],
    interval: 30,
    language: 'de',
  });
  assert.deepEqual(normalizeConfig(null), {
    stops: [],
    addedStops: [],
    lines: [],
    interval: DEFAULT_INTERVAL,
    language: 'auto',
  });
});

test('bounds: six lines, the intervals offered, the stored language', () => {
  assert.equal(parseLines('1,2,3,4,5,6,7,8').length, 6);
  assert.deepEqual(parseLines(undefined), []);
  assert.equal(readInterval(45), DEFAULT_INTERVAL);
  assert.equal(readInterval(300), 300);
  assert.equal(readLanguage({ last_language: 'es' }, 'fr'), 'es');
  assert.equal(readLanguage({ last_language: 'español' }, 'fr'), 'fr');
  assert.equal(readLanguage(undefined, 'en'), 'en');
});

test('the stops added with the buttons follow the three of the form', () => {
  const added = [
    { stop: 'LIG117', line: '86', direction: '' },
    { stop: ' Pont de Bois ', line: '', direction: 'Fort de Mons' },
    { stop: '', line: 'L1' },
    'Pont de Bois',
  ];
  const config = normalizeConfig({ stop_2: 'Rihour', added_stops: added });
  assert.deepEqual(config.stops, [
    { slot: 2, stop: 'Rihour', line: '', direction: '' },
    { slot: null, added: 1, stop: 'LIG117', line: '86', direction: '' },
    { slot: null, added: 2, stop: 'Pont de Bois', line: '', direction: 'Fort de Mons' },
  ]);
  assert.equal(config.addedStops.length, 2);
  // Stored as JSON text by an older core: read the same.
  assert.deepEqual(parseAddedStops(JSON.stringify(added)), config.addedStops);
  assert.deepEqual(parseAddedStops('not json'), []);
  assert.deepEqual(parseAddedStops(undefined), []);
  const many = Array.from({ length: 30 }, (_, n) => ({ stop: `S${n}` }));
  assert.equal(parseAddedStops(many).length, MAX_ADDED_STOPS);
});
