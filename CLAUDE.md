# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

A Gladys Assistant **external integration** for Ilévia, the bus, metro and tram
network of the Métropole Européenne de Lille (MEL): a Node.js service (Node
22+, ESM, no build step) that runs in its own sandboxed Docker container and
talks to Gladys through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency. It reads the official open data of Ilévia that
the MEL publishes on its GeoServer (`https://data.lillemetropole.fr`, OGC API
Features, CQL filters, no key, Licence Ouverte Etalab 2.0): the passages of
the next half hour at the followed stops — three in the form, up to 20 more
added with the "Add a stop" button —, the traffic messages of the lines, and
the lines and stops of the network (kept in /data).
Transport: cloud only.
Catalogue of the layers: https://data.lillemetropole.fr/catalogue/ (each layer
is listed at the top of `src/ilevia-api.js`).

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/widgets.test.js          # one file
DEBUG=gladys-integration-sdk npm test     # with the SDK debug logs
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store . --skip-image-check   # store checks
scripts/build-cover.sh                    # cover.jpg from docs/assets/cover.svg
docs/illustrations/render.sh              # docs/assets/widgets.<lang>.png
node .github/scripts/release.mjs next     # the version the next release would get
```

## Architecture

```
index.js                SDK wiring only (new GladysIntegration + createApp)
src/app.js              every handler, registered before connect(); the timers, the clock of the data
src/ilevia-api.js       HTTP client of the GeoServer: layers, CQL filters, `next` pages
src/network.js          lines and stops in /data, other names learnt from the passages, typed names -> codes
src/departures.js       passage records -> passages (Paris time, line, destination)
src/traffic.js          messages (HTML -> text, type, publication, end), the state of a line
src/events.js           scene trigger transitions, payloads, scene action outputs
src/device.js           the stop and line devices and their states
src/widgets.js          departures and traffic dashboard widgets
src/store.js            /data/ilevia.json: network, `seen`
src/time.js             Paris wall-clock times written with a "Z", times of day (TZ), the service day
src/config.js           configuration (three stops + `added_stops`, lines, interval, language)
src/i18n.js             runtime texts, en / fr / de / es
gladys-assistant-integration.json   manifest
docs/{en,fr,de,es}.md   user documentation, re-hosted by the store
docs/illustrations/     generated widget images (render.sh, gen.mjs, render.js)
test/fixtures/          real answers of the GeoServer, reduced (Licence Ouverte)
.github/scripts/release.mjs         version, changelog, bump (tested in test/)
```

## Rules

- **External ids are forever**, and so is every key users store: device and
  feature external ids (`stop:n-<folded name>_<line code>_<direction>` or
  `stop:i-<stop code>…`, `line:<line code>`: the codes of Ilévia, "me1" for
  metro 1, "71" for the tram, "l5", never a public label that could change),
  feature `category` / `type` / `unit` / `min` / `max` / `step`, the keys of
  `config_schema`, `actions`, the widgets and their settings, scene triggers
  (fields, options, variables) and scene actions (fields, outputs), and the
  internal config keys `added_stops` (`[{ stop, line, direction }]`) and
  `last_language`. `test/structure.test.js` compares them to
  `test/fixtures/discovery.baseline.json`: never update the baseline to make a
  test pass without a documented migration.
- **Category / type pairs.** The next passage and the line traffic are `text`
  / `text`, the waits `duration` / `integer` in minutes (0-180), the count of
  messages `counter-sensor` / `integer` (0-20). Without a passage the waits are
  not published (a 0 would announce a bus now).
- **`should_poll` stays false**: the integration reads on its own timer —
  every followed stop in ONE request every `interval` (30 s to 5 min, 1 min by
  default; 10 min while no stop announces anything), the traffic every 5 min,
  the lines daily after 04:00, the stops weekly (with every passage, for their
  other names). A widget or a scene action reuses a reading of less than 90 s.
  Never add a request per stop and per tick: the server allows 10 requests at
  a time per address.
- **Filter on the server.** The passages are read with a CQL filter
  (`code_arret_physique IN (…)`), never the whole layer (2.5 MB), except the
  weekly reading of the stop names.
- **Times.** The layers write Paris wall-clock times with a "Z"
  (`heure_estimee_depart` "17:08:00Z" is 17:08 in Lille). `feedClockOf()`
  compares the freshest `date_modification` with the true UTC `timeStamp` of
  the answer and switches to UTC if the MEL fixes it. Never `Date.parse()` a
  time of the layers: `parseFeedTime(value, clock)`.
- **No metro passages, no delay.** The passages layer carries the buses (and
  the tram when Ilévia publishes it; none seen on 2026-10-27) with an
  estimated time only. Say it, never invent a timetable or a delay.
- **Traffic is a log.** A message stays a day after its publication unless it
  gives an earlier end, and each news of an incident is a new message. The
  state of a line is its latest message: a "Perturbation" less than
  `DISRUPTION_HOLD_MS` (90 min) old is `disrupted`, any other `info`.
- **Events once.** `seen` (in /data) remembers the reminders fired per stop,
  the state and messages of each followed line. The first reading of a stop or
  a line is a baseline: nothing fires. A scene action or a widget never fires
  an event.
- **Data licence.** Licence Ouverte 2.0: keep "Ilévia" and the time of the
  reading visible in the widgets, and the credit (MEL – Ilévia) in the README,
  the docs and NOTICE.
- **The container rootfs is read-only.** Write only under `/data`.
- **Four languages.** Every user-facing text (manifest, runtime messages in
  `src/i18n.js`, `docs/*.md`, README) exists in English, French, German and
  Spanish. `test/i18n.test.js` checks it. Names of stops, destinations and the
  messages of Ilévia stay in French.
- **Widget images.** After any change to the content of a widget, run
  `docs/illustrations/render.sh` again and look at the four PNG files.
- **Versions belong to the Release workflow**: never edit `version` in
  `package.json`, the lockfile or the manifest, nor the `docker_image` tag.
  The version stays below 1.0.0 until the maintainer runs the Release workflow
  with `release-as: 1.0.0`.
- **Changelog.** Never edit CHANGELOG.md by hand, it is generated at the
  release. Write the PR title as the line the user will read.
- **Commits and PR titles** follow Conventional Commits, in English: `feat` ->
  minor, `fix` / `perf` -> patch, `!` or `BREAKING CHANGE:` -> major (minor
  below 1.0.0); `docs`, `chore`, `ci`, `test`, `style`, `refactor`, `build`
  release nothing.
- **Manifest.** Texts are objects `{ "en", "fr", "de", "es" }`; the catalog
  `description` holds 10 to 100 characters per language; the file stays under
  100 KB. `gladys_version` is `>=5.3.0` (widgets, scene triggers, catalog
  `keywords` and `countries`). Transport: `["cloud"]`. No permission, no
  secret.
- **Forum drafts** (`.github/forum-*.md`) are never committed.
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English. Tests never touch the network (the fake GeoServer of
  `test/helpers/fixtures.js`).
