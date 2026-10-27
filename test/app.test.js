// The whole integration against the fake Gladys of the SDK
// (`@gladysassistant/integration-sdk/testing`), which checks the discovered
// devices, the states and the scene events like the host API does, and a
// fake GeoServer of the MEL serving real (reduced) answers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import { createApp, SCENE_ACTIONS, ACTIONS, IDLE_INTERVAL_MS } from '../src/app.js';
import { WIDGETS } from '../src/widgets.js';
import { TRIGGERS } from '../src/events.js';
import {
  fakeIlevia,
  storePath,
  silent,
  passage,
  disruption,
  wall,
  NOW,
  TZ,
  STOPS,
} from './helpers/fixtures.js';

const CONFIG = {
  stop_1: 'Gare Lille Flandres',
  stop_1_line: 'L5',
  stop_1_direction: 'Haubourdin',
  stop_2: 'republique beaux arts',
  stop_3: 'Nulle part',
  lines: 'M1, tram, 50, Z9',
  interval: '60',
  language: 'fr',
};
const PREFIX = 'ext:test-integration';
const L5_STOP = `${PREFIX}:stop:n-gare-lille-flandres_l5_haubourdin`;
const REP_STOP = `${PREFIX}:stop:n-republique-beaux-arts`;
const M1 = `${PREFIX}:line:me1`;
const TRAM = `${PREFIX}:line:71`;
const L50 = `${PREFIX}:line:50`;
const MINUTE = 60 * 1000;
const PASSAGES = 'dsp_ilevia:prochains_passages';

/**
 * @description The integration, connected to a fake Gladys and a fake server.
 * @param {object} [options] - `{ config, path, logger }`.
 * @returns {Promise<object>} `{ gladys, app, api, clock, path }`.
 */
async function startApp({ config = CONFIG, path = storePath(), logger = silent } = {}) {
  const clock = { now: NOW };
  const api = fakeIlevia({ now: () => clock.now });
  const gladys = createFakeGladys({ config });
  const app = createApp(gladys, {
    fetch: api,
    storePath: path,
    now: () => clock.now,
    timeZone: TZ,
    timers: false,
    logger,
  });
  await gladys.connect();
  await app.whenReady();
  return { gladys, app, api, clock, path };
}

const created = async (gladys, externalId) => {
  const device = gladys.fake.discoveredDevices.find((d) => d.external_id === externalId);
  assert.ok(device, `${externalId} is offered`);
  await gladys.fake.deviceCreated(device);
  return device;
};
const eventsOf = (gladys, key) => gladys.fake.sceneEvents.filter((event) => event.key === key);
const layers = (api) => api.calls.map((call) => call.layer);

test('two stops and three lines become five devices; unknown names are reported', async (t) => {
  const { gladys, api, app } = await startApp();
  t.after(() => gladys.fake.shutdown());
  assert.deepEqual(
    gladys.fake.discoveredDevices.map((device) => [device.external_id, device.name]),
    [
      [L5_STOP, 'Ilévia Gare Lille Flandres (L5 → Haubourdin)'],
      [REP_STOP, 'Ilévia Republique Beaux-Arts'],
      [M1, 'Ilévia métro 1'],
      [TRAM, 'Ilévia tramway'],
      [L50, 'Ilévia ligne 50'],
    ],
  );
  const status = gladys.fake.connectionStatus;
  assert.equal(status.connected, true);
  assert.equal(
    status.message.fr,
    'Connecté à Ilévia : 2 arrêt(s), 3 ligne(s), arrêts lus toutes les 60 s. Inconnu d’Ilévia : Nulle part, Z9.',
  );
  // The network once (the lines, the stops and every passage for their other
  // names), both followed stops in one request, the traffic.
  assert.deepEqual(layers(api), [
    'dsp_ilevia:couleurs_lignes',
    'dsp_ilevia:physical_stop',
    PASSAGES,
    PASSAGES,
    'dsp_ilevia:perturbations',
  ]);
  assert.match(api.calls[3].filter, /^code_arret_physique IN \('LIG003',.*'REP072'\)$/);
  // The times are Paris wall-clock times written with a "Z".
  assert.equal(app.getFeedClock(), 'wall');
  // The first readings are a baseline: nothing fires.
  assert.deepEqual(gladys.fake.sceneEvents, []);
});

test('created devices get their states, sent again after the creation', async (t) => {
  const { gladys, app, api, clock } = await startApp();
  t.after(() => gladys.fake.shutdown());
  await created(gladys, L5_STOP);
  await created(gladys, M1);
  await created(gladys, TRAM);
  // 17:02 in Paris: the L5 of 17:08:00, then the one of 17:16:08.
  assert.equal(gladys.fake.lastState(`${L5_STOP}:wait`), 6);
  assert.equal(gladys.fake.lastState(`${L5_STOP}:following`), 14);
  assert.equal(gladys.fake.lastState(`${L5_STOP}:next`), 'L5 → Haubourdin le Parc · 6 min');
  assert.equal(gladys.fake.lastState(`${M1}:status`), 'Trafic normal');
  assert.equal(gladys.fake.lastState(`${M1}:messages`), 0);
  assert.match(gladys.fake.lastState(`${TRAM}:status`), /^Info trafic : Du 2 au 30 novembre/);
  assert.equal(gladys.fake.lastState(`${TRAM}:messages`), 3);
  // Seven minutes later the first bus is gone; the stop not created gets nothing.
  clock.now += 7 * MINUTE;
  api.state.passages = api.state.passages.filter(
    (record) => record.heure_estimee_depart !== '2026-10-27T17:08:00Z',
  );
  await app.readStops();
  assert.equal(gladys.fake.lastState(`${L5_STOP}:wait`), 7);
  assert.equal(gladys.fake.lastState(`${REP_STOP}:next`), undefined);
});

test('departure soon: fired close to its mark, once, between two readings too', async (t) => {
  const { gladys, app, api, clock } = await startApp({
    config: { stop_1: 'Gare Lille Flandres', stop_1_line: '50', language: 'en' },
  });
  t.after(() => gladys.fake.shutdown());
  clock.now += MINUTE;
  api.state.passages = [
    passage({
      code_arret_physique: 'LIG114',
      code_ligne: '50',
      sens_ligne: 'MARCQ COLLEGE',
      heure_estimee_depart: wall(clock.now + 12 * MINUTE),
      date_modification: `${wall(clock.now).slice(0, -1)}.000Z`,
    }),
  ];
  await app.readStops({ force: true });
  assert.deepEqual(eventsOf(gladys, TRIGGERS.DEPARTURE_SOON), []);
  // Seven minutes later, without a reading: the 5-minute mark (between readings).
  clock.now += 7 * MINUTE + 10000;
  await app.checkReminders();
  const soon = eventsOf(gladys, TRIGGERS.DEPARTURE_SOON);
  assert.deepEqual(
    soon.map((event) => [event.data.minutes, event.data.line, event.data.destination]),
    [['5', '50', 'Marcq College']],
  );
  assert.equal(soon[0].data.stop, `${PREFIX}:stop:n-gare-lille-flandres_50`);
  assert.equal(
    soon[0].data.summary,
    '50 towards Marcq College leaves Gare Lille Flandres in 5 min (17:15).',
  );
  await app.checkReminders();
  await app.readStops({ force: true });
  assert.equal(eventsOf(gladys, TRIGGERS.DEPARTURE_SOON).length, 1);
});

test('an incident, then a newer message: fired once each, never again after a restart', async (t) => {
  const path = storePath();
  const { gladys, app, api, clock } = await startApp({ path });
  t.after(() => gladys.fake.shutdown());
  // Metro line 1 cut at 17:00 (Paris).
  api.state.disruptions.push(disruption());
  await app.trafficTick();
  assert.deepEqual(
    gladys.fake.sceneEvents.map((event) => [event.key, event.data.line_name, event.data.kind]),
    [
      [TRIGGERS.LINE_DISRUPTED, 'M1', undefined],
      [TRIGGERS.TRAFFIC_MESSAGE, 'M1', 'disrupted'],
    ],
  );
  const [disrupted] = gladys.fake.sceneEvents;
  assert.equal(disrupted.data.line, M1);
  assert.equal(disrupted.data.published, '17:00');
  assert.equal(
    disrupted.data.title,
    'En raison d’un incident technique, la ligne 1 du métro est interrompue entre les stations Gare Lille Flandres et 4 Cantons.',
  );
  assert.match(disrupted.data.summary, /^Ilévia, Métro 1 : trafic perturbé \(En raison/);
  // The same reading again: nothing new.
  await app.trafficTick();
  assert.equal(gladys.fake.sceneEvents.length, 2);
  // A restart on the same /data: nothing replayed.
  const second = createFakeGladys({ config: CONFIG });
  t.after(() => second.fake.shutdown());
  const restarted = createApp(second, {
    fetch: api,
    storePath: path,
    now: () => clock.now,
    timeZone: TZ,
    timers: false,
    logger: silent,
  });
  await second.connect();
  await restarted.whenReady();
  assert.deepEqual(second.fake.sceneEvents, []);
  // At 17:20, "line 1 slowed down": no incident under way any more.
  clock.now += 18 * MINUTE;
  api.state.disruptions.push(
    disruption({
      identifiant_perturbation: 'ILEVIA:Item::aaaaaaaa-2222-3333-4444-555555555555:LOC',
      identifiant_message: 'ILEVIA:InfoMessage::bbbbbbbb-7777-8888-9999-000000000000:LOC',
      type_perturbation: 'Information',
      message: 'La ligne 1 du métro est ralentie en direction de 4 Cantons.',
      date_modification: '2026-10-27T17:20:00.000Z',
    }),
  );
  await restarted.trafficTick();
  assert.deepEqual(
    second.fake.sceneEvents.map((event) => [event.key, event.data.state ?? event.data.kind]),
    [
      [TRIGGERS.LINE_RESTORED, 'info'],
      [TRIGGERS.TRAFFIC_MESSAGE, 'info'],
    ],
  );
});

test('every followed stop in one request; quiet stops are read every 10 minutes', async (t) => {
  const added = STOPS.slice(0, 20).map((stop) => ({
    stop: stop.code_arret_physique,
    line: '',
    direction: '',
  }));
  const { gladys, app, api, clock } = await startApp({
    config: { stop_1: 'Gare Lille Flandres', interval: '30', added_stops: added },
  });
  t.after(() => gladys.fake.shutdown());
  assert.equal(app.getStops().length, 21);
  const reads = () => layers(api).filter((layer) => layer === PASSAGES).length;
  const before = reads();
  clock.now += 31 * 1000;
  await app.readStops();
  assert.equal(reads(), before + 1, 'one request for 21 stops');
  // Nothing announced at any stop (the night): every 10 minutes.
  api.state.passages = [];
  clock.now += 31 * 1000;
  await app.readStops();
  const quiet = reads();
  clock.now += 2 * MINUTE;
  await app.readStops();
  assert.equal(reads(), quiet);
  clock.now += IDLE_INTERVAL_MS;
  await app.readStops();
  assert.equal(reads(), quiet + 1);
});

test('the times follow the clock the open data use, should they write true UTC', async (t) => {
  const { gladys, app, api } = await startApp({
    config: { stop_1: 'Gare Lille Flandres', stop_1_line: 'L5' },
  });
  t.after(() => gladys.fake.shutdown());
  await created(gladys, `${PREFIX}:stop:n-gare-lille-flandres_l5`);
  api.state.passages = [
    passage({
      heure_estimee_depart: '2026-10-27T16:10:00Z',
      date_modification: '2026-10-27T16:01:30Z',
    }),
  ];
  await app.readStops({ force: true });
  assert.equal(app.getFeedClock(), 'utc');
  assert.equal(gladys.fake.lastState(`${PREFIX}:stop:n-gare-lille-flandres_l5:wait`), 8);
});

test('the server down: a clear status, the last passages kept', async (t) => {
  const { gladys, app, api, clock } = await startApp();
  t.after(() => gladys.fake.shutdown());
  await created(gladys, L5_STOP);
  api.state.fail = 503;
  await app.trafficTick();
  clock.now += 2 * MINUTE;
  await app.readStops();
  assert.equal(gladys.fake.connectionStatus.connected, false);
  assert.match(
    gladys.fake.connectionStatus.message.en,
    /do not answer \(HTTP 503: Service unavailable\)/,
  );
  // The device keeps its last state.
  assert.equal(gladys.fake.lastState(`${L5_STOP}:wait`), 6);
  api.state.fail = null;
  await app.trafficTick();
  await app.readStops();
  assert.equal(gladys.fake.connectionStatus.connected, true);
});

test('widgets: followed stops, a typed stop, lines; valid in every language', async (t) => {
  const { gladys } = await startApp();
  t.after(() => gladys.fake.shutdown());
  for (const language of ['en', 'fr', 'de', 'es']) {
    const answers = [
      await gladys.fake.widgetGet(WIDGETS.DEPARTURES, { settings: {}, language }),
      await gladys.fake.widgetGet(WIDGETS.DEPARTURES, {
        settings: { stops: [L5_STOP, REP_STOP] },
        language,
      }),
      await gladys.fake.widgetGet(WIDGETS.DEPARTURES, {
        settings: { stop_name: 'Pont de Bois', line: 'L6' },
        language,
      }),
      await gladys.fake.widgetGet(WIDGETS.DEPARTURES, {
        settings: { stop_name: 'LQS001' },
        language,
      }),
      await gladys.fake.widgetGet(WIDGETS.TRAFFIC, { settings: {}, language }),
      await gladys.fake.widgetGet(WIDGETS.TRAFFIC, { settings: { lines: 'L1' }, language }),
    ];
    for (const answer of answers) {
      assert.equal(answer.success, true);
      assert.deepEqual(validateWidgetContent(answer.data.content), [], language);
    }
  }
  const typed = await gladys.fake.widgetGet(WIDGETS.DEPARTURES, {
    settings: { stop_name: 'Pont de Bois', line: 'L6' },
    language: 'fr',
  });
  const [heading, , status] = typed.data.content.components;
  assert.equal(heading.text, 'Pont de Bois (L6)');
  // Read under its other names ("V. D'ASCQ PONT DE BOIS", "V.D'ASCQ PONT DE BOIS").
  assert.deepEqual(
    status.items.map((item) => item.label),
    ['L6 → Fort de Mons', "L6 → V. d'Ascq Contrescarpe"],
  );
  const tram = await gladys.fake.widgetGet(WIDGETS.DEPARTURES, {
    settings: { stop_name: 'LQS001' },
    language: 'en',
  });
  assert.match(
    tram.data.content.components[1].text,
    /^No real-time passage published for the tram/,
  );
  const unknown = await gladys.fake.widgetGet(WIDGETS.TRAFFIC, {
    settings: { lines: 'Z9' },
    language: 'en',
  });
  assert.equal(unknown.data.content.components[0].text, 'Unknown to Ilévia: Z9.');
});

test('the traffic widget shows the metro and the tram when no line is followed', async (t) => {
  const { gladys } = await startApp({ config: { stop_1: 'Gare Lille Flandres' } });
  t.after(() => gladys.fake.shutdown());
  const traffic = await gladys.fake.widgetGet(WIDGETS.TRAFFIC, { settings: {}, language: 'fr' });
  assert.deepEqual(
    traffic.data.content.components[1].items.map((item) => [item.label, item.value]),
    [
      ['Tramway', 'Info trafic'],
      ['Métro 1', 'Trafic normal'],
      ['Métro 2', 'Trafic normal'],
    ],
  );
});

test('scene actions: next passages of a stop, traffic of a line', async (t) => {
  const { gladys } = await startApp();
  t.after(() => gladys.fake.shutdown());
  const next = await gladys.fake.sceneAction(SCENE_ACTIONS.GET_NEXT_DEPARTURES, {
    stop: L5_STOP,
  });
  assert.equal(next.success, true);
  assert.deepEqual(
    [
      next.data.outputs.found,
      next.data.outputs.minutes,
      next.data.outputs.time,
      next.data.outputs.following_minutes,
    ],
    [true, 6, '17:08', 14],
  );
  assert.equal(
    next.data.outputs.summary,
    'Prochain passage à Gare Lille Flandres : L5 vers Haubourdin le Parc dans 6 min. Le suivant dans 14 min.',
  );
  const traffic = await gladys.fake.sceneAction(SCENE_ACTIONS.GET_LINE_TRAFFIC, { line: TRAM });
  assert.deepEqual(
    [
      traffic.data.outputs.state,
      traffic.data.outputs.disrupted,
      traffic.data.outputs.message_count,
    ],
    ['info', false, 3],
  );
  assert.match(traffic.data.outputs.title, /^Du 2 au 30 novembre/);
  // No field: the first stop and the first line.
  const first = await gladys.fake.sceneAction(SCENE_ACTIONS.GET_LINE_TRAFFIC, {});
  assert.deepEqual(
    [first.data.outputs.line_name, first.data.outputs.summary],
    ['M1', 'Ilévia, Métro 1 : Trafic normal.'],
  );
});

test('configuration actions: test, find a stop, diagnostic', async (t) => {
  const { gladys, api } = await startApp();
  t.after(() => gladys.fake.shutdown());
  const tested = await gladys.fake.action(ACTIONS.TEST_CONNECTION);
  assert.equal(tested.success, true);
  const fr = tested.data.message.fr;
  assert.match(fr, /^Open data Ilévia joint : 33 lignes, 59 arrêts/);
  assert.match(
    fr,
    /Gare Lille Flandres \(L5 → Haubourdin\) : 2 passage\(s\), prochain L5 dans 6 min/,
  );
  assert.match(fr, /Tramway : Info trafic/);
  assert.match(fr, /inconnu : Nulle part · inconnu : Z9/);
  // Found by one of the names the passages give it.
  const found = await gladys.fake.action(ACTIONS.SEARCH_STOP, { query: "v. d'ascq pont" });
  const text = found.data.message.fr;
  assert.match(text, /^Saisissez le nom/);
  assert.match(text, /Pont de Bois \(Villeneuve-d'Ascq\)\n• bus PDB001 → L6 Fort de Mons/);
  // A stop announcing nothing: its lines.
  assert.match(text, /• bus PDB004 → N1\n/);
  // One request for the destinations of every stop found.
  assert.equal(api.calls.at(-1).layer, PASSAGES);
  assert.match(api.calls.at(-1).filter, /^code_arret_physique IN \('PDB001',/);
  const tram = await gladys.fake.action(ACTIONS.SEARCH_STOP, { query: 'le quesne' });
  assert.match(tram.data.message.en, /• tram LQS001 → TRAM\n/);
  assert.match(tram.data.message.en, /• bus LQS098 → RTW Gare Lille Flandres/);
  const short = await gladys.fake.action(ACTIONS.SEARCH_STOP, { query: 'r' });
  assert.match(short.data.message.en, /at least two letters/);
  const none = await gladys.fake.action(ACTIONS.SEARCH_STOP, { query: 'zzz' });
  assert.equal(none.data.message.en, 'No Ilévia stop matches "zzz".');
  const diagnostic = await gladys.fake.action(ACTIONS.DIAGNOSTIC);
  assert.match(diagnostic.data.message.en, /Ilévia diagnostic/);
});

test('add, list and remove stops with the buttons, beyond the three of the form', async (t) => {
  const { gladys, app } = await startApp();
  t.after(() => gladys.fake.shutdown());
  const added = await gladys.fake.action(ACTIONS.ADD_STOP, { stop: 'lig117', line: '86' });
  assert.match(
    added.data.message.en,
    /^Stop added: Gare Lille Flandres \[LIG117\] \(86\)\. 3 stop\(s\)/,
  );
  assert.deepEqual(gladys.fake.config.added_stops, [{ stop: 'LIG117', line: '86', direction: '' }]);
  assert.ok(
    gladys.fake.discoveredDevices.some(
      (device) => device.external_id === `${PREFIX}:stop:i-lig117_86`,
    ),
  );
  const snapshot = app.getSnapshot('i-lig117_86');
  assert.ok(snapshot.passages.length > 0);
  assert.ok(snapshot.passages.every((p) => p.line === '86' && p.stopId === 'LIG117'));
  const again = await gladys.fake.action(ACTIONS.ADD_STOP, { stop: 'LIG117', line: '86' });
  assert.match(again.data.message.en, /already followed/);
  const unknown = await gladys.fake.action(ACTIONS.ADD_STOP, { stop: 'Nowhere' });
  assert.equal(unknown.data.message.en, 'Unknown to Ilévia: Nowhere.');
  const list = await gladys.fake.action(ACTIONS.LIST_STOPS);
  assert.equal(
    list.data.message.fr,
    '4 arrêt(s) suivi(s) :\n' +
      '1. Gare Lille Flandres (L5 → Haubourdin) (formulaire, arrêt 1)\n' +
      '2. Republique Beaux-Arts (formulaire, arrêt 2)\n' +
      '3. Nulle part (formulaire, arrêt 3, inconnu d’Ilévia)\n' +
      '4. Gare Lille Flandres [LIG117] (86)',
  );
  const inForm = await gladys.fake.action(ACTIONS.REMOVE_STOP, { stop: '2' });
  assert.match(inForm.data.message.en, /is stop 2 of the form/);
  const removed = await gladys.fake.action(ACTIONS.REMOVE_STOP, { stop: '4' });
  assert.match(removed.data.message.en, /^Stop removed: Gare Lille Flandres \[LIG117\] \(86\)/);
  assert.deepEqual(gladys.fake.config.added_stops, []);
  assert.equal(app.getStops().length, 2);
});
