// The traps of the Gladys core that the fake Gladys does not catch
// (community feedback, thread 11005): a device is only polled with
// should_poll AND poll_frequency, every feature needs min / max / read_only /
// has_feedback, a wrong category / type pair shows no icon nor label, and a
// single invalid field rejects the whole discovery batch.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';

import {
  stopKey,
  followedName,
  idsOf,
  parseExternalId,
  buildStopDevice,
  buildStopStates,
  buildLineDevice,
  buildLineStates,
  lineStatusText,
  DEVICE_TYPES,
} from '../src/device.js';
import { parsePassages } from '../src/departures.js';
import { parseTraffic, lineTraffic } from '../src/traffic.js';
import { LANGUAGES } from '../src/i18n.js';
import { fakeGladys, NOW, TZ, PASSAGES, DISRUPTIONS, disruption } from './helpers/fixtures.js';

const FLANDRES_L5 = {
  stop: {
    kind: 'place',
    id: null,
    name: 'Gare Lille Flandres',
    ids: ['LIG091', 'LIG112'],
    tramOnly: false,
  },
  line: { id: 'L5', name: 'L5', mode: 'bus' },
  direction: 'Haubourdin',
};
FLANDRES_L5.key = stopKey(FLANDRES_L5.stop, FLANDRES_L5.line, FLANDRES_L5.direction);
FLANDRES_L5.name = followedName(FLANDRES_L5);
const SIDE = {
  stop: {
    kind: 'stop',
    id: 'LIG117',
    name: 'Gare Lille Flandres',
    ids: ['LIG117'],
    tramOnly: false,
  },
  line: null,
  direction: '',
};
SIDE.key = stopKey(SIDE.stop, null, '');
SIDE.name = followedName(SIDE);
const TRAM_STOP = {
  stop: { kind: 'stop', id: 'LQS001', name: 'Le Quesne', ids: ['LQS001'], tramOnly: true },
  line: null,
  direction: '',
};
TRAM_STOP.key = stopKey(TRAM_STOP.stop, null, '');
TRAM_STOP.name = followedName(TRAM_STOP);
const L50 = { id: '50', name: '50', mode: 'bus' };
const M1 = { id: 'ME1', name: 'M1', mode: 'metro' };
const TRAM = { id: '71', name: 'TRAM', mode: 'tram' };

const devices = (language) => [
  buildStopDevice(fakeGladys, FLANDRES_L5, language),
  buildStopDevice(fakeGladys, SIDE, language),
  buildLineDevice(fakeGladys, L50, language),
  buildLineDevice(fakeGladys, M1, language),
  buildLineDevice(fakeGladys, TRAM, language),
];

// Pairs with an icon and a label in the Gladys front (front/src/utils/consts.js).
const PAIRS = [
  [DEVICE_FEATURE_CATEGORIES.TEXT, DEVICE_FEATURE_TYPES.TEXT.TEXT, undefined],
  [
    DEVICE_FEATURE_CATEGORIES.DURATION,
    DEVICE_FEATURE_TYPES.DURATION.INTEGER,
    DEVICE_FEATURE_UNITS.MINUTES,
  ],
  [DEVICE_FEATURE_CATEGORIES.COUNTER_SENSOR, DEVICE_FEATURE_TYPES.SENSOR.INTEGER, undefined],
];

test('devices are never polled by Gladys: the integration has its own timer', () => {
  for (const device of devices('en')) {
    assert.equal(device.should_poll, false, device.external_id);
    assert.equal(device.poll_frequency, undefined);
  }
});

test('every feature carries min, max, read_only and has_feedback, in every language', () => {
  for (const language of LANGUAGES) {
    for (const device of devices(language)) {
      for (const feature of device.features) {
        for (const key of ['min', 'max']) {
          assert.equal(typeof feature[key], 'number', `${feature.external_id}.${key}`);
        }
        assert.ok(feature.min <= feature.max, feature.external_id);
        assert.equal(feature.read_only, true, feature.external_id);
        assert.equal(feature.has_feedback, false, feature.external_id);
        assert.ok(feature.name.length > 0 && feature.name.length <= 255);
      }
      const names = new Set(device.features.map((feature) => feature.name));
      assert.equal(names.size, device.features.length, 'every feature has its own name');
    }
  }
});

test('category / type / unit pairs known to the Gladys front, from the SDK constants', () => {
  for (const feature of devices('en').flatMap((device) => device.features)) {
    assert.ok(
      PAIRS.some(
        ([category, type, unit]) =>
          feature.category === category && feature.type === type && feature.unit === unit,
      ),
      `${feature.external_id}: ${feature.category}/${feature.type}/${feature.unit}`,
    );
  }
});

test('ids from the stop as typed, the line code and the direction; read back', () => {
  const [flandres, side, l50, m1, tram] = devices('fr');
  assert.equal(flandres.external_id, 'ext:ilevia:stop:n-gare-lille-flandres_l5_haubourdin');
  assert.equal(flandres.name, 'Ilévia Gare Lille Flandres (L5 → Haubourdin)');
  assert.equal(side.external_id, 'ext:ilevia:stop:i-lig117');
  assert.equal(side.name, 'Ilévia Gare Lille Flandres [LIG117]');
  assert.equal(l50.external_id, 'ext:ilevia:line:50');
  assert.equal(l50.name, 'Ilévia ligne 50');
  assert.deepEqual([m1.external_id, m1.name], ['ext:ilevia:line:me1', 'Ilévia métro 1']);
  assert.deepEqual([tram.external_id, tram.name], ['ext:ilevia:line:71', 'Ilévia tramway']);
  assert.deepEqual(parseExternalId('ext:ilevia:stop:i-lig117:wait'), {
    type: 'stop',
    key: 'i-lig117',
  });
  assert.deepEqual(parseExternalId('ext:ilevia:line:me1'), { type: 'line', key: 'me1' });
  assert.equal(parseExternalId('something'), null);
  // Other accents or case: the same device.
  assert.equal(
    stopKey({ kind: 'place', name: 'GARE LILLE-FLANDRES' }, null, ''),
    'n-gare-lille-flandres',
  );
  assert.deepEqual(
    flandres.params.map((param) => [param.name, param.value]),
    [
      ['ILEVIA_STOP', 'Gare Lille Flandres'],
      ['ILEVIA_LINE', 'L5'],
      ['ILEVIA_DIRECTION', 'Haubourdin'],
    ],
  );
});

test('stop states: the next passage and the two waits', () => {
  const passages = parsePassages(PASSAGES, {
    ids: FLANDRES_L5.stop.ids,
    stopName: 'Gare Lille Flandres',
    lineId: 'L5',
    direction: 'Haubourdin',
  });
  const states = buildStopStates(fakeGladys, FLANDRES_L5, passages, {
    language: 'fr',
    now: NOW,
    timeZone: TZ,
  });
  const byKey = Object.fromEntries(
    states.map((s) => [s.device_feature_external_id.split(':').pop(), s.state ?? s.text]),
  );
  assert.deepEqual(byKey, { next: 'L5 → Haubourdin le Parc · 6 min', wait: 6, following: 14 });
  // Nothing announced: the waits are left untouched.
  const empty = buildStopStates(fakeGladys, SIDE, [], { language: 'es', now: NOW });
  assert.deepEqual(
    empty.map((s) => s.text),
    ['Ningún paso anunciado'],
  );
  // A tram platform: Ilévia may publish nothing for it.
  const [tram] = buildStopStates(fakeGladys, TRAM_STOP, [], { language: 'en', now: NOW });
  assert.equal(tram.text, 'No real-time passage published for the tram');
});

test('line states: the state with the title of the latest message, the count', () => {
  const traffic = parseTraffic(DISRUPTIONS);
  const tram = buildLineStates(fakeGladys, TRAM, lineTraffic(traffic, '71', NOW), 'fr').map(
    (s) => s.text ?? s.state,
  );
  assert.match(tram[0], /^Info trafic : Du 2 au 30 novembre/);
  assert.equal(tram[1], 3);
  assert.deepEqual(
    buildLineStates(fakeGladys, M1, lineTraffic(traffic, 'ME1', NOW), 'en').map(
      (s) => s.text ?? s.state,
    ),
    ['Normal traffic', 0],
  );
  const incident = parseTraffic([disruption()]);
  const [status] = buildLineStates(fakeGladys, M1, lineTraffic(incident, 'ME1', NOW), 'de');
  assert.match(status.text, /^Gestörter Betrieb: En raison/);
  assert.ok(status.text.length <= 250);
  assert.equal(lineStatusText({ state: 'normal', messages: [] }, 'de'), 'Normaler Betrieb');
});

test('the discovery batch and the states pass the checks of the fake host API', async (t) => {
  const gladys = createFakeGladys({});
  t.after(() => gladys.fake.shutdown());
  await gladys.connect();
  for (const language of LANGUAGES) {
    await gladys.publishDiscoveredDevices([
      buildStopDevice(gladys, FLANDRES_L5, language),
      buildLineDevice(gladys, TRAM, language),
    ]);
  }
  const [stop, line] = gladys.fake.discoveredDevices;
  await gladys.fake.deviceCreated(stop);
  await gladys.fake.deviceCreated(line);
  const passages = parsePassages(PASSAGES, { ids: FLANDRES_L5.stop.ids, lineId: 'L5' });
  await gladys.publishStates(
    buildStopStates(gladys, FLANDRES_L5, passages, { language: 'en', now: NOW }),
  );
  const traffic = parseTraffic(DISRUPTIONS);
  await gladys.publishStates(buildLineStates(gladys, TRAM, lineTraffic(traffic, '71', NOW), 'en'));
  assert.equal(idsOf(gladys, DEVICE_TYPES.STOP, FLANDRES_L5.key).device, stop.external_id);
  assert.equal(gladys.fake.lastState(`${stop.external_id}:wait`), 6);
  assert.equal(gladys.fake.lastState(`${line.external_id}:messages`), 3);
});
