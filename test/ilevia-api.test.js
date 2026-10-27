import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createIleviaClient, quote, among, LAYERS, USER_AGENT } from '../src/ilevia-api.js';
import { fakeIlevia, NOW } from './helpers/fixtures.js';

test('CQL literals: quotes doubled', () => {
  assert.equal(quote("CHARIOT D'OR"), "'CHARIOT D''OR'");
  assert.equal(
    among('code_arret_physique', ['LIG115', 'LIG117']),
    "code_arret_physique IN ('LIG115','LIG117')",
  );
});

test('a query: the layer, the CQL filter, JSON; the records and the true time of the answer', async () => {
  const urls = [];
  const fetch = fakeIlevia();
  const api = createIleviaClient({
    fetch: (url, init) => {
      urls.push([url, init.headers]);
      return fetch(url);
    },
  });
  const { records, answeredAt } = await api.passages(['LIG115', 'LIG115', 'LIG117']);
  assert.equal(records.length, 11);
  assert.equal(answeredAt, NOW);
  const [url, headers] = urls[0];
  const parsed = new URL(url);
  assert.equal(
    parsed.pathname,
    '/geoserver/ogc/features/v1/collections/dsp_ilevia%3Aprochains_passages/items',
  );
  assert.equal(parsed.searchParams.get('f'), 'application/json');
  assert.equal(parsed.searchParams.get('filter-lang'), 'cql-text');
  assert.equal(
    parsed.searchParams.get('filter'),
    "code_arret_physique IN ('LIG115','LIG115','LIG117')",
  );
  assert.equal(headers['user-agent'], USER_AGENT);
  assert.equal(api.requests.byLayer[LAYERS.PASSAGES], 1);
});

test('a long answer continues on its `next` link', async () => {
  const pages = [
    { features: [{ properties: { a: 1 } }], links: [{ rel: 'next', href: 'https://x/2' }] },
    { features: [{ properties: { a: 2 } }], links: [] },
  ];
  const seen = [];
  const api = createIleviaClient({
    fetch: async (url) => {
      seen.push(url);
      return new Response(JSON.stringify(pages[seen.length - 1]));
    },
    now: () => 42,
  });
  const { records, answeredAt } = await api.stops();
  assert.deepEqual(records, [{ a: 1 }, { a: 2 }]);
  assert.equal(seen[1], 'https://x/2');
  // No timeStamp in the answer: the clock of the instance.
  assert.equal(answeredAt, 42);
});

test('errors: the server unreachable, busy, refusing, or answering nonsense', async () => {
  const fetch = fakeIlevia();
  const api = createIleviaClient({ fetch });
  fetch.state.fail = 'network';
  await assert.rejects(api.lines(), { kind: 'unreachable', message: 'ECONNREFUSED' });
  fetch.state.fail = 503;
  await assert.rejects(api.lines(), { kind: 'busy', message: 'HTTP 503: Service unavailable' });
  fetch.state.fail = 500;
  await assert.rejects(api.lines(), { kind: 'unreachable', status: 500 });
  fetch.state.fail = 400;
  await assert.rejects(api.lines(), { kind: 'invalid' });
  const odd = createIleviaClient({ fetch: async () => new Response('{"type":"Feature"}') });
  await assert.rejects(odd.disruptions(), { kind: 'invalid' });
  assert.equal(api.requests.failed, 4);
});
