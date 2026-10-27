// Builds the widget contents of the illustrations with the integration's own
// code: node gen.mjs <repo> <out.json> (run by render.sh)
//
// The two widgets on a real Tuesday afternoon in Lille: the answers of the
// GeoServer of the MEL read on 2026-10-27 at 17:02 and kept in test/fixtures
// (passages at Gare Lille Flandres, traffic messages of the day) go through
// the real parsers (src/departures.js, src/traffic.js) and the real widget
// builders (src/widgets.js). One message is added: the incident of metro
// line 2 published the day before, dated 16:55 to show a line disrupted.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [repo, out] = process.argv.slice(2);
const load = (path) => import(pathToFileURL(`${repo}/${path}`).href);
const { buildDeparturesWidget, buildTrafficWidget } = await load('src/widgets.js');
const { parsePassages } = await load('src/departures.js');
const { parseTraffic, lineTraffic } = await load('src/traffic.js');
const { lineOf } = await load('src/network.js');
const { LANGUAGES } = await load('src/i18n.js');
const records = (name) =>
  JSON.parse(readFileSync(`${repo}/test/fixtures/${name}`, 'utf8')).features.map(
    (feature) => feature.properties,
  );
const manifest = JSON.parse(readFileSync(`${repo}/gladys-assistant-integration.json`, 'utf8'));

// Tuesday 27 October 2026, 17:02 in Paris.
const NOW = Date.parse('2026-10-27T16:02:00Z');
const TZ = 'Europe/Paris';

const known = Object.fromEntries(records('lines.json').map((raw) => [raw.code_ligne, lineOf(raw)]));
const passages = parsePassages(records('passages.json'), {
  ids: ['LIG003', 'LIG006', 'LIG091', 'LIG112', 'LIG114', 'LIG115', 'LIG117'],
  stopName: 'Gare Lille Flandres',
  lineName: (code) => known[code]?.name ?? code,
});
const metro2 = records('disruptions.json').find((raw) => raw.cible.includes('ME2'));
const traffic = parseTraffic([
  ...records('disruptions.json'),
  {
    ...metro2,
    identifiant_perturbation: 'ILEVIA:Item::00000000-0000-0000-0000-000000000002:LOC',
    date_modification: '2026-10-27T16:55:00.000Z',
    heure_fin_prevue: '2026-10-28T16:55:00.000Z',
  },
]);
const lines = ['ME1', 'ME2', '71', 'L5'].map((id) => ({
  line: known[id],
  traffic: lineTraffic(traffic, id, NOW),
}));

const contents = {};
for (const language of LANGUAGES) {
  contents[language] = {
    departures: buildDeparturesWidget({
      title: 'Gare Lille Flandres',
      passages,
      readAt: NOW,
      count: 6,
      language,
      now: NOW,
      timeZone: TZ,
    }),
    traffic: buildTrafficWidget({
      lines,
      readAt: NOW - 2 * 60 * 1000,
      language,
      now: NOW,
      timeZone: TZ,
    }),
  };
}
const widgets = Object.fromEntries(
  manifest.widgets.map((w) => [w.key, { icon: w.icon, label: w.label }]),
);
writeFileSync(out, JSON.stringify({ now: NOW, widgets, contents }));
