import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  directionTerms,
  passageOf,
  parsePassages,
  minutesLeft,
  upcomingPassages,
  routeOf,
} from '../src/departures.js';
import { CLOCKS } from '../src/time.js';
import { PASSAGES, NOW, passage } from './helpers/fixtures.js';

const FLANDRES = ['LIG003', 'LIG006', 'LIG091', 'LIG112', 'LIG114', 'LIG115', 'LIG117'];
const lineName = (code) => ({ ME1: 'M1', 71: 'TRAM' })[code] ?? code;

test('a record: line, destination in title case, the Paris time of its "Z"', () => {
  assert.deepEqual(passageOf(passage(), { lineName }), {
    stopId: 'LIG112',
    lineId: 'L5',
    line: 'L5',
    destination: 'Haubourdin le Parc',
    at: Date.parse('2026-10-27T16:08:00Z'),
  });
  assert.equal(passageOf(passage(), { clock: CLOCKS.UTC }).at, Date.parse('2026-10-27T17:08:00Z'));
});

test('the passages of a stop: its codes, soonest first, never towards the stop itself', () => {
  const all = parsePassages(PASSAGES, { ids: FLANDRES, stopName: 'Gare Lille Flandres' });
  assert.equal(all.length, 24);
  assert.ok(all.every((p, i) => i === 0 || all[i - 1].at <= p.at));
  assert.ok(all.every((p) => FLANDRES.includes(p.stopId)));
  // "V. D'ASCQ PONT DE BOIS" ends the trips of line 32 there: not boarded.
  const pdb = parsePassages(PASSAGES, { ids: ['PDB005'], stopName: 'Pont de Bois' });
  assert.ok(pdb.every((p) => p.destination !== "V. d'Ascq Pont de Bois"));
  const arriving = parsePassages([passage({ sens_ligne: 'GARE LILLE FLANDRES' }), passage()], {
    ids: ['LIG112'],
    stopName: 'Gare Lille Flandres',
  });
  assert.equal(arriving.length, 1);
});

test('a line and a direction narrow the passages', () => {
  const l5 = parsePassages(PASSAGES, { ids: FLANDRES, lineId: 'L5' });
  assert.deepEqual(
    l5.map((p) => p.destination),
    [
      'Haubourdin le Parc',
      'La Madeleine Montgolfier',
      'Haubourdin le Parc',
      'Marcq Ferme aux Oies',
    ],
  );
  const towards = parsePassages(PASSAGES, {
    ids: FLANDRES,
    direction: 'Comines | Halluin',
  });
  assert.deepEqual(
    [...new Set(towards.map((p) => p.destination))],
    ['Comines Gare', 'Comines Mairie', 'Halluin Gounod'],
  );
  assert.deepEqual(directionTerms(' Comines | | Hôtel de Ville '), ['comines', 'hotel de ville']);
});

test('waits and routes', () => {
  const [first] = parsePassages([passage()], { ids: ['LIG112'] });
  assert.equal(minutesLeft(first, NOW), 6);
  assert.equal(minutesLeft(first, NOW + 10 * 60000), 0);
  assert.equal(upcomingPassages([first], NOW + 6 * 60000 + 20000).length, 1);
  assert.equal(upcomingPassages([first], NOW + 7 * 60000).length, 0);
  assert.equal(routeOf(first), 'L5|haubourdin le parc');
  assert.deepEqual(parsePassages(null), []);
  assert.deepEqual(parsePassages([passage({ heure_estimee_depart: 'soon' })]), []);
});
