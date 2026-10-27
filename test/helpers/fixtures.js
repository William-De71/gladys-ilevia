// A fake GeoServer of the MEL for the tests, served through the `fetch` option
// of the integration. Its answers are real ones, read on 2026-10-27 at 17:02
// (Paris) and reduced: the passages of the next half hour at Gare Lille
// Flandres, République Beaux-Arts, Pont de Bois (under three other names),
// Ronchin République and Le Quesne (the buses replacing the tram), every
// traffic message of the day, thirty-three lines (the two metro lines and the
// tram among them) and the stops of ten names. Open data of Ilévia, Licence
// Ouverte Etalab 2.0. Tests never touch the network.

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 2026-10-27 17:02 in Paris: the time of the readings.
const NOW = Date.parse('2026-10-27T16:02:00Z');
const TZ = 'Europe/Paris';

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
const records = (name) => fixture(name).features.map((feature) => feature.properties);
const PASSAGES = records('passages.json');
const DISRUPTIONS = records('disruptions.json');
const LINES = records('lines.json');
const STOPS = records('stops.json');

const silent = { info() {}, warn() {}, error() {}, debug() {} };

/**
 * @description A temporary path for the file kept in /data.
 * @returns {string} The path (its directory exists, the file does not).
 */
const storePath = () => join(mkdtempSync(join(tmpdir(), 'ilevia-')), 'ilevia.json');

const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * @description An instant as the layers write it: the Paris wall-clock time
 * with a "Z".
 * @param {number} instant - The instant (ms).
 * @returns {string} "2026-10-27T17:08:00Z" for 16:08 UTC.
 */
function wall(instant) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`;
}

/**
 * @description A record of the passages layer.
 * @param {object} fields - What differs from an L5 towards Haubourdin at Gare
 * Lille Flandres (LIG112), leaving at 17:08 (Paris), written at 17:01.
 * @returns {object} The record, as the layer writes it.
 */
function passage(fields = {}) {
  return {
    objectid: 1,
    identifiant_station: 'ILEVIA:StopPoint:BP:LIG112:LOC',
    nom_station: 'GARE LILLE FLANDRES',
    code_ligne: 'L5',
    sens_ligne: 'HAUBOURDIN LE PARC',
    heure_estimee_depart: '2026-10-27T17:08:00Z',
    date_modification: '2026-10-27T17:01:00.000Z',
    code_insee: '59350',
    commune: 'Lille',
    rue: null,
    code_arret_physique: 'LIG112',
    ...fields,
  };
}

/**
 * @description A record of the perturbations layer.
 * @param {object} fields - What differs from an incident on metro line 1,
 * published at 17:00 (Paris), ending a day later.
 * @returns {object} The record, as the layer writes it.
 */
function disruption(fields = {}) {
  return {
    objectid: 9,
    identifiant_perturbation: 'ILEVIA:Item::11111111-2222-3333-4444-555555555555:LOC',
    type_perturbation: 'Perturbation',
    heure_fin_prevue: '2026-10-28T17:00:00.000Z',
    cible: 'ILEVIA:LineRef::ME1:LOC',
    identifiant_message: 'ILEVIA:InfoMessage::66666666-7777-8888-9999-000000000000:LOC',
    message:
      'En raison d’un incident technique, la ligne 1 du métro est interrompue entre les stations <b>Gare Lille Flandres</b> et <b>4 Cantons</b>.<br/>Des bus relais sont mis en place.',
    date_modification: '2026-10-27T17:00:00.000Z',
    ...fields,
  };
}

/**
 * @description The values of a condition `field IN ('a','b')` of a CQL filter.
 * @param {string|null} filter - The filter.
 * @param {string} field - The field.
 * @returns {string[]|null} The values, null when the field is not filtered.
 */
function among(filter, field) {
  const match = new RegExp(`${field} IN \\((.*)\\)`).exec(filter ?? '');
  return match
    ? [...match[1].matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"))
    : null;
}

/**
 * @description The fake server.
 * @param {object} [options] - `{ now }`: `() => number`, the clock of the answers.
 * @returns {Function} A fetch function, with `.calls` and `.state`.
 */
function fakeIlevia({ now = () => NOW } = {}) {
  const state = {
    passages: clone(PASSAGES),
    disruptions: clone(DISRUPTIONS),
    lines: clone(LINES),
    stops: clone(STOPS),
    // 'network', or an HTTP status, for every request.
    fail: null,
  };
  const calls = [];

  /**
   * @description An answer of the server.
   * @param {unknown} body - The JSON body.
   * @param {number} [status] - The HTTP status.
   * @returns {Response} The answer.
   */
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', 'x-concurrent-limit-user': '10' },
    });

  /**
   * @description A FeatureCollection, as the server writes it.
   * @param {object[]} list - The records.
   * @returns {Response} The answer.
   */
  const collection = (list) =>
    json({
      type: 'FeatureCollection',
      features: list.map((properties, index) => ({
        type: 'Feature',
        id: `layer.${index}`,
        geometry: null,
        properties,
      })),
      totalFeatures: list.length,
      numberMatched: list.length,
      numberReturned: list.length,
      timeStamp: new Date(now()).toISOString(),
      crs: null,
    });

  /**
   * @description The fetch function.
   * @param {string} url - The URL.
   * @returns {Promise<Response>} The answer.
   */
  async function fetchFn(url) {
    const parsed = new URL(url);
    const layer = decodeURIComponent(
      /\/collections\/([^/]+)\/items$/.exec(parsed.pathname)?.[1] ?? '',
    );
    const filter = parsed.searchParams.get('filter');
    calls.push({ layer, filter, params: Object.fromEntries(parsed.searchParams) });
    if (state.fail === 'network') {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    }
    if (typeof state.fail === 'number') {
      return json({ type: 'ServiceUnavailable', title: 'Service unavailable' }, state.fail);
    }
    switch (layer) {
      case 'dsp_ilevia:prochains_passages': {
        const ids = among(filter, 'code_arret_physique');
        return collection(
          ids ? state.passages.filter((r) => ids.includes(r.code_arret_physique)) : state.passages,
        );
      }
      case 'dsp_ilevia:perturbations':
        return collection(state.disruptions);
      case 'dsp_ilevia:couleurs_lignes':
        return collection(state.lines);
      case 'dsp_ilevia:physical_stop':
        return collection(state.stops);
      default:
        return json({ type: 'NotFound', title: `Unknown collection ${layer}` }, 404);
    }
  }
  fetchFn.calls = calls;
  fetchFn.state = state;
  return fetchFn;
}

/**
 * @description A minimal Gladys client for the pure builders.
 */
const fakeGladys = {
  externalIds: (type, id) => ({
    device: `ext:ilevia:${type}:${id}`,
    feature: (key) => `ext:ilevia:${type}:${id}:${key}`,
  }),
};

export {
  NOW,
  TZ,
  PASSAGES,
  DISRUPTIONS,
  LINES,
  STOPS,
  silent,
  storePath,
  wall,
  passage,
  disruption,
  among,
  fakeIlevia,
  fakeGladys,
};
