// -----------------------------------------------------------------------------
// HTTP client of the open data of Ilévia, the bus, metro and tram network of
// the Métropole Européenne de Lille (MEL). The MEL publishes them on its
// GeoServer (https://data.lillemetropole.fr), through the OGC API Features:
// no key, Licence Ouverte Etalab 2.0.
//
// Layers used (catalogue: https://data.lillemetropole.fr/catalogue/):
//   dsp_ilevia:prochains_passages   the next passages at every stop, the next
//                                   half hour, refreshed every minute: one
//                                   record per vehicle and stop (bus, and the
//                                   tram when Ilévia publishes it; no metro);
//   dsp_ilevia:perturbations        the traffic messages of the lines, kept a
//                                   day after their publication;
//   dsp_ilevia:physical_stop        the stops, one record per side of the
//                                   street (bus) or platform (tram), read
//                                   weekly;
//   dsp_ilevia:couleurs_lignes      the lines (bus, metro, tram) and their
//                                   public names, read daily.
//
// A query selects records with a CQL filter (`filter-lang=cql-text`); an
// answer is a GeoJSON FeatureCollection whose `properties` are the records,
// with a true UTC `timeStamp`. A long answer continues on a `next` link. The
// server allows 10 requests at a time per address (`x-concurrent-limit-user`);
// errors are JSON `{ type, title }`.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';

const BASE_URL =
  process.env.ILEVIA_API_URL ||
  'https://data.lillemetropole.fr/geoserver/ogc/features/v1/collections';
const TIMEOUT_MS = 20000;
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const USER_AGENT = `gladys-ilevia/${version} (+https://github.com/William-De71/gladys-ilevia)`;

const LAYERS = {
  PASSAGES: 'dsp_ilevia:prochains_passages',
  DISRUPTIONS: 'dsp_ilevia:perturbations',
  STOPS: 'dsp_ilevia:physical_stop',
  LINES: 'dsp_ilevia:couleurs_lignes',
};
// Records per page: every layer fits in one (4 800 passages seen at rush hour).
const PAGE_LIMIT = 10000;
// A runaway `next` chain stops here.
const MAX_PAGES = 5;

class IleviaError extends Error {
  /**
   * @param {string} kind - `busy`, `unreachable` or `invalid`.
   * @param {string} message - The detail.
   * @param {object} [extra] - `{ status }`.
   */
  constructor(kind, message, { status = null } = {}) {
    super(message);
    this.name = 'IleviaError';
    this.kind = kind;
    this.status = status;
  }
}

/**
 * @description A string literal of the CQL filters.
 * @param {unknown} value - The value.
 * @returns {string} `'…'`, quotes doubled.
 * @example
 * quote("D'ARC"); // -> "'D''ARC'"
 */
const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

/**
 * @description The CQL condition "field among these values".
 * @param {string} field - The field.
 * @param {string[]} values - The values.
 * @returns {string} `code_arret_physique IN ('LIG115','LIG117')`.
 */
const among = (field, values) => `${field} IN (${values.map(quote).join(',')})`;

/**
 * @description A client of the open data of Ilévia.
 * @param {object} [options] - Options.
 * @param {Function} [options.fetch] - The fetch function (tests).
 * @param {Function} [options.now] - `() => number` in ms.
 * @param {string} [options.baseUrl] - The collections root (tests, end-to-end runs).
 * @returns {object} The methods, and `requests` for the diagnostic.
 */
function createIleviaClient({
  fetch: fetchFn = globalThis.fetch,
  now = () => Date.now(),
  baseUrl = BASE_URL,
} = {}) {
  // Requests made, per layer, for the diagnostic.
  const requests = { total: 0, byLayer: {}, failed: 0, last: null };

  /**
   * @description Call the server.
   * @param {string} layer - The layer, for the counters.
   * @param {string} url - The URL.
   * @returns {Promise<object>} The JSON answer.
   */
  async function call(layer, url) {
    requests.total += 1;
    requests.byLayer[layer] = (requests.byLayer[layer] ?? 0) + 1;
    requests.last = now();
    let response;
    try {
      response = await fetchFn(url, {
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      requests.failed += 1;
      throw new IleviaError('unreachable', err.cause?.code ?? err.message);
    }
    if (!response.ok) {
      requests.failed += 1;
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (typeof body?.title === 'string') {
          detail = `${detail}: ${body.title.split('\n')[0].slice(0, 160)}`;
        }
      } catch {
        // No JSON body: the status says enough.
      }
      let kind = 'unreachable';
      if (response.status === 429 || response.status === 503) {
        kind = 'busy';
      } else if (response.status >= 400 && response.status < 500) {
        kind = 'invalid';
      }
      throw new IleviaError(kind, detail, { status: response.status });
    }
    try {
      return await response.json();
    } catch (err) {
      requests.failed += 1;
      throw new IleviaError('invalid', `${layer}: ${err.message}`);
    }
  }

  /**
   * @description The records of a layer, every page.
   * @param {string} layer - LAYERS.
   * @param {object} [options] - `{ filter }`: a CQL filter.
   * @returns {Promise<{ records: object[], answeredAt: number }>} The
   * records, and the true UTC time of the answer (ms).
   */
  async function items(layer, { filter } = {}) {
    const query = new URLSearchParams({ f: 'application/json', limit: String(PAGE_LIMIT) });
    if (filter) {
      query.set('filter', filter);
      query.set('filter-lang', 'cql-text');
    }
    let url = `${baseUrl}/${encodeURIComponent(layer)}/items?${query}`;
    const records = [];
    let answeredAt = NaN;
    for (let page = 0; url && page < MAX_PAGES; page += 1) {
      const body = await call(layer, url);
      if (!Array.isArray(body?.features)) {
        throw new IleviaError('invalid', `${layer}: no features`);
      }
      for (const feature of body.features) {
        if (feature?.properties && typeof feature.properties === 'object') {
          records.push(feature.properties);
        }
      }
      if (!Number.isFinite(answeredAt)) {
        answeredAt = Date.parse(body.timeStamp);
      }
      const next = (Array.isArray(body.links) ? body.links : []).find(
        (link) => link?.rel === 'next' && typeof link.href === 'string',
      );
      url = next && body.features.length > 0 ? next.href : null;
    }
    return { records, answeredAt: Number.isFinite(answeredAt) ? answeredAt : now() };
  }

  return {
    requests,
    /**
     * @description The next passages at some stops.
     * @param {string[]} ids - The stop codes ("LIG115").
     * @returns {Promise<{ records: object[], answeredAt: number }>} The passages.
     */
    passages: (ids) => items(LAYERS.PASSAGES, { filter: among('code_arret_physique', ids) }),
    /**
     * @description The next passages at every stop (2.5 MB): read weekly
     * with the stops, for the stop names the passages write differently.
     * @returns {Promise<{ records: object[], answeredAt: number }>} The passages.
     */
    allPassages: () => items(LAYERS.PASSAGES),
    /**
     * @description The traffic messages of every line.
     * @returns {Promise<{ records: object[], answeredAt: number }>} The messages.
     */
    disruptions: () => items(LAYERS.DISRUPTIONS),
    /**
     * @description The stops (sides of the street, tram platforms).
     * @returns {Promise<{ records: object[], answeredAt: number }>} The stops.
     */
    stops: () => items(LAYERS.STOPS),
    /**
     * @description The lines and their public names.
     * @returns {Promise<{ records: object[], answeredAt: number }>} The lines.
     */
    lines: () => items(LAYERS.LINES),
  };
}

export { BASE_URL, USER_AGENT, LAYERS, PAGE_LIMIT, IleviaError, quote, among, createIleviaClient };
