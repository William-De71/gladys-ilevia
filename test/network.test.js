import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  fold,
  slug,
  displayName,
  lineOf,
  stopOf,
  learnFromPassages,
  findLine,
  findStop,
  searchStops,
  createNetwork,
  MODES,
} from '../src/network.js';
import { createIleviaClient } from '../src/ilevia-api.js';
import { createStore } from '../src/store.js';
import { LINES, STOPS, PASSAGES, fakeIlevia, storePath, NOW } from './helpers/fixtures.js';

const lines = LINES.map(lineOf);
const stops = () => learnFromPassages(STOPS.map(stopOf), PASSAGES);

test('names: folded for comparisons, in title case when written in capitals', () => {
  assert.equal(fold("V. D'ASCQ Pont-de-Bois"), 'v d ascq pont de bois');
  assert.equal(slug('Gare Lille Flandres'), 'gare-lille-flandres');
  assert.equal(displayName('GARE LILLE FLANDRES'), 'Gare Lille Flandres');
  assert.equal(displayName("V. D'ASCQ PONT DE BOIS"), "V. d'Ascq Pont de Bois");
  assert.equal(displayName('ÉCOLE DES DOUANES'), 'École des Douanes');
  assert.equal(displayName('LILLE CHU-CENTRE O. LAMBRET'), 'Lille Chu-Centre O. Lambret');
  // A name already written in lower case stays as it is.
  assert.equal(displayName("Villeneuve-d'Ascq"), "Villeneuve-d'Ascq");
});

test('lines: code, public name, mode and colour', () => {
  assert.deepEqual(
    lines.find((line) => line.id === 'ME1'),
    {
      id: 'ME1',
      name: 'M1',
      mode: MODES.METRO,
      color: '#FDC41F',
    },
  );
  assert.deepEqual(
    lines.filter((line) => line.mode !== MODES.BUS).map((line) => [line.id, line.name, line.mode]),
    [
      ['71', 'TRAM', 'tram'],
      ['ME1', 'M1', 'metro'],
      ['ME2', 'M2', 'metro'],
    ],
  );
});

test('a line is typed the way users read it', () => {
  const id = (typed) => findLine(lines, typed)?.id ?? null;
  assert.equal(id('L1'), 'L1');
  assert.equal(id('l1'), 'L1');
  assert.equal(id('ligne 50'), '50');
  assert.equal(id('M1'), 'ME1');
  assert.equal(id('métro 2'), 'ME2');
  assert.equal(id('metro1'), 'ME1');
  assert.equal(id('ME2'), 'ME2');
  assert.equal(id('tram'), '71');
  assert.equal(id('Tramway'), '71');
  assert.equal(id('71'), '71');
  assert.equal(id('Z9'), null);
  assert.equal(id(''), null);
});

test('stops: one per side of the street, and what the passages teach', () => {
  const list = stops();
  const pdb = list.find((stop) => stop.id === 'PDB001');
  assert.equal(pdb.name, 'Pont de Bois');
  assert.equal(pdb.commune, "Villeneuve-d'Ascq");
  assert.deepEqual(pdb.aliases, ['v d ascq pont de bois']);
  // The buses replacing the tram use codes the stops layer lacks.
  const relay = list.find((stop) => stop.id === 'LQS098');
  assert.deepEqual([relay.name, relay.mode, relay.lines], ['Le Quesne', 'bus', ['RTW']]);
  assert.equal(list.find((stop) => stop.id === 'LQS001').mode, 'tram');
  assert.deepEqual(list.find((stop) => stop.id === 'REP003').lines, ['14', '18', 'C1', 'L1']);
});

test('a stop is typed by name (every side), by another name, or by code (one side)', () => {
  const list = stops();
  const flandres = findStop(list, 'gare lille flandres');
  assert.equal(flandres.kind, 'place');
  assert.equal(flandres.name, 'Gare Lille Flandres');
  assert.ok(flandres.ids.includes('LIG115') && flandres.ids.includes('LIG011'));
  assert.equal(flandres.tramOnly, false);
  // Another name of the passages: the stop and every side of its name.
  const other = findStop(list, "V.D'ASCQ PONT DE BOIS");
  assert.equal(other.name, 'Pont de Bois');
  assert.ok(other.ids.includes('PDB004') && other.ids.includes('PDB009'));
  // One code: one side.
  assert.deepEqual(findStop(list, 'lig117'), {
    kind: 'stop',
    id: 'LIG117',
    name: 'Gare Lille Flandres',
    ids: ['LIG117'],
    tramOnly: false,
  });
  assert.equal(findStop(list, 'LQS001').tramOnly, true);
  // Some words of a unique name.
  assert.equal(findStop(list, 'flandres').name, 'Gare Lille Flandres');
  // Accents do not matter; words of several names resolve to none.
  assert.deepEqual(findStop(list, 'république'), findStop(list, 'REPUBLIQUE'));
  assert.equal(findStop(list, 'quesne'), null);
  assert.equal(findStop(list, 'Nulle part'), null);
});

test('"Find a stop": exact names first, every side of a name found under another', () => {
  const found = searchStops(stops(), 'republique');
  assert.deepEqual(
    found.map((entry) => entry.name),
    ['Republique', 'Republique Beaux-Arts', 'Annappes Republique', 'Ronchin Republique'],
  );
  const pdb = searchStops(stops(), "v d'ascq pont");
  assert.equal(pdb.length, 1);
  assert.equal(pdb[0].stops.length, 10);
  assert.deepEqual(searchStops(stops(), ' '), []);
});

test('the network is read once, kept in /data, the lines daily, the stops weekly', async () => {
  const fetch = fakeIlevia();
  let clock = NOW;
  const store = createStore({ path: storePath() });
  const network = createNetwork({
    api: createIleviaClient({ fetch }),
    store,
    now: () => clock,
    isNewDay: () => false,
  });
  assert.equal((await network.resolveLine('m1')).id, 'ME1');
  assert.equal((await network.resolveStop('Pont de Bois')).ids.length, 10);
  const first = fetch.calls.length;
  assert.equal(first, 3, 'lines, stops, every passage');
  await network.lines();
  await network.stops();
  assert.equal(fetch.calls.length, first);
  assert.equal(network.peekLine('ME2').name, 'M2');
  clock += 8 * 24 * 3600 * 1000;
  fetch.state.fail = 503;
  // A failed reading keeps what is known.
  assert.equal((await network.resolveStop('LIG117')).id, 'LIG117');
  assert.equal(store.data.network.stops.length, 59);
});
