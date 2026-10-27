// -----------------------------------------------------------------------------
// The reference data of the network: lines and stops, kept in /data.
//
//   - lines (bus, metro, tram): read again once a day, after 04:00. A line is
//     typed the way the user reads it: "L1", "50", "M1", "métro 2", "tram",
//     "ligne CO1"; it resolves to its code ("L1", "ME1", "71"), the one the
//     real-time layers use;
//   - stops (one per side of the street, or tram platform): read again every
//     seven days. A stop is typed by name ("Gare Lille Flandres") — every
//     stop of that name — or by code ("LIG115", one side only), given by the
//     "Find a stop" button. A name typed with other words resolves when one
//     name only holds them all ("flandres" -> "Gare Lille Flandres").
//
// The passages sometimes name a stop otherwise than the stops layer ("V.
// D'ASCQ PONT DE BOIS" for "PONT DE BOIS"), and use a few codes the stops
// layer lacks (the buses replacing the tram, "LQS098"): the weekly reading
// also reads every passage, to learn these names and codes.
//
// Names are compared folded: no case, no accent, no punctuation. The
// datasets write them in capitals: they are shown in title case.
// -----------------------------------------------------------------------------

const LINES_MAX_AGE_MS = 24 * 3600 * 1000;
const STOPS_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const MODES = { BUS: 'bus', METRO: 'metro', TRAM: 'tram' };
const LINE_MODES = { BUS: MODES.BUS, METRO: MODES.METRO, TRAMWAY: MODES.TRAM };
// Words kept in lower case inside a name.
const PARTICLES = new Set([
  'a',
  'au',
  'aux',
  'd',
  'de',
  'des',
  'du',
  'en',
  'et',
  'l',
  'la',
  'le',
  'les',
  'sous',
  'sur',
]);

/**
 * @description Fold a text for comparisons.
 * @param {unknown} value - The text.
 * @returns {string} Lower case, no accent, words separated by one space.
 * @example
 * fold("V. D'ASCQ Pont-de-Bois"); // -> 'v d ascq pont de bois'
 */
function fold(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * @description A slug for an external id.
 * @param {unknown} value - The text.
 * @param {number} [max] - Its longest length.
 * @returns {string} "gare-lille-flandres".
 */
function slug(value, max = 40) {
  return fold(value).replace(/ /g, '-').slice(0, max).replace(/-$/, '');
}

/**
 * @description A name of the datasets, in title case when written in capitals.
 * @param {unknown} value - "GARE LILLE FLANDRES", "V. D'ASCQ PONT DE BOIS".
 * @returns {string} "Gare Lille Flandres", "V. d'Ascq Pont de Bois".
 */
function displayName(value) {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (/\p{Ll}/u.test(text)) {
    return text;
  }
  let first = true;
  return text.toLowerCase().replace(/\p{L}+/gu, (word) => {
    const keep = !first && PARTICLES.has(fold(word));
    first = false;
    return keep ? word : word.charAt(0).toUpperCase() + word.slice(1);
  });
}

/**
 * @description What is kept of a line.
 * @param {object} raw - A record of the lines layer.
 * @returns {object} `{ id, name, mode, color }`.
 */
const lineOf = (raw) => ({
  id: String(raw.code_ligne ?? ''),
  name: String(raw.code_ligne_public || raw.code_ligne || ''),
  mode: LINE_MODES[String(raw.mode_transport ?? '').toUpperCase()] ?? MODES.BUS,
  color: /^[0-9a-f]{6}$/i.test(raw.couleur_fond_hexadecimal ?? '')
    ? `#${raw.couleur_fond_hexadecimal.toUpperCase()}`
    : '',
});

/**
 * @description The public names of the lines of a stop.
 * @param {unknown} value - "14,18,C1,L1".
 * @returns {string[]} ["14", "18", "C1", "L1"].
 */
const lineNamesOf = (value) =>
  String(value ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

/**
 * @description What is kept of a stop.
 * @param {object} raw - A record of the stops layer.
 * @returns {object} `{ id, name, commune, mode, lines, aliases }`.
 */
const stopOf = (raw) => ({
  id: String(raw.code_arret_physique ?? ''),
  name: displayName(raw.nom_commercial_arret ?? raw.code_arret_physique),
  commune: String(raw.commune ?? ''),
  mode: String(raw.code_mode_de_transport ?? '').toUpperCase() === 'T' ? MODES.TRAM : MODES.BUS,
  lines: lineNamesOf(raw.code_ligne_public),
  aliases: [],
});

/**
 * @description Add what the passages teach to the stops: the other names of
 * known stops, and the stops the stops layer lacks.
 * @param {object[]} stops - The stops (stopOf), changed in place.
 * @param {object[]} passages - Records of the passages layer.
 * @returns {object[]} The stops.
 */
function learnFromPassages(stops, passages) {
  const byId = new Map(stops.map((stop) => [stop.id, stop]));
  for (const raw of Array.isArray(passages) ? passages : []) {
    const id = String(raw?.code_arret_physique ?? '');
    const name = String(raw?.nom_station ?? '').trim();
    if (!id || !name) {
      continue;
    }
    let stop = byId.get(id);
    if (!stop) {
      stop = {
        id,
        name: displayName(name),
        commune: String(raw.commune ?? ''),
        mode: MODES.BUS,
        lines: [],
        aliases: [],
      };
      byId.set(id, stop);
      stops.push(stop);
    }
    const folded = fold(name);
    if (folded !== fold(stop.name) && !stop.aliases.includes(folded)) {
      stop.aliases.push(folded);
    }
    const line = String(raw.code_ligne ?? '');
    if (line && !stop.lines.includes(line) && stop.lines.length < 20) {
      stop.lines.push(line);
    }
  }
  return stops;
}

/**
 * @description Find a line among the known ones.
 * @param {object[]} lines - The known lines.
 * @param {string} typed - "L1", "l1", "M1", "métro 1", "tram", "ligne 50", "ME1".
 * @returns {object|null} The line.
 * @example
 * findLine(lines, 'metro 1'); // -> { id: 'ME1', name: 'M1', … }
 */
function findLine(lines, typed) {
  const compact = (value) => fold(value).replace(/ /g, '');
  const wanted = compact(String(typed ?? '').replace(/^\s*(ligne|line|linie|l[ií]nea)\s+/i, ''));
  if (!wanted) {
    return null;
  }
  const exact =
    lines.find((line) => compact(line.name) === wanted) ??
    lines.find((line) => line.id.toLowerCase() === wanted);
  if (exact) {
    return exact;
  }
  if (/^tram(way)?$/.test(wanted)) {
    return lines.find((line) => line.mode === MODES.TRAM) ?? null;
  }
  const metro = /^metro?(\d)$/.exec(wanted);
  if (metro) {
    return (
      lines.find(
        (line) => line.mode === MODES.METRO && compact(line.name).replace(/^m/, '') === metro[1],
      ) ?? null
    );
  }
  return null;
}

/**
 * @description A stop resolved: what the passages are read for.
 * @param {string} kind - `place` (every stop of the name) or `stop` (one code).
 * @param {object[]} members - The known stops it covers.
 * @returns {object} `{ kind, id, name, ids, tramOnly }`.
 */
function resolved(kind, members) {
  return {
    kind,
    id: kind === 'stop' ? members[0].id : null,
    name: members[0].name,
    ids: members.map((stop) => stop.id),
    // Ilévia publishes the passages of the buses; a tram platform may stay silent.
    tramOnly: members.every((stop) => stop.mode === MODES.TRAM),
  };
}

/**
 * @description The folded names a stop answers to.
 * @param {object} stop - A known stop.
 * @returns {string[]} Its name, then its other names.
 */
const namesOf = (stop) => [fold(stop.name), ...(stop.aliases ?? [])];

/**
 * @description Find a stop among the known ones.
 * @param {object[]} stops - The known stops.
 * @param {string} typed - A name or a code.
 * @returns {object|null} `{ kind, id, name, ids, tramOnly }`.
 * @example
 * findStop(stops, 'gare lille flandres'); // -> { kind: 'place', ids: ['LIG003', …] }
 */
function findStop(stops, typed) {
  const raw = String(typed ?? '').trim();
  if (!raw) {
    return null;
  }
  const byId = stops.find((stop) => stop.id.toLowerCase() === raw.toLowerCase());
  if (byId) {
    return resolved('stop', [byId]);
  }
  const wanted = fold(raw);
  const exact = stops.filter((stop) => namesOf(stop).includes(wanted));
  if (exact.length > 0) {
    // The stops of the name written by the stops layer, then those met
    // under another name: "Pont de Bois" first, not "V. d'Ascq Pont de Bois".
    const named = exact.filter((stop) => fold(stop.name) === wanted);
    const canonical = named.length > 0 ? named[0].name : exact[0].name;
    const members = stops.filter((stop) => fold(stop.name) === fold(canonical));
    return resolved('place', [...members, ...exact.filter((stop) => !members.includes(stop))]);
  }
  // A unique name holding every typed word ("flandres" -> "Gare Lille Flandres").
  const words = wanted.split(' ');
  const holds = (name) => words.every((word) => ` ${name} `.includes(` ${word}`));
  const matching = stops.filter((stop) => namesOf(stop).some(holds));
  const names = new Set(matching.map((stop) => fold(stop.name)));
  return names.size === 1 ? resolved('place', matching) : null;
}

/**
 * @description Search stops by name, for the "Find a stop" button.
 * @param {object[]} stops - The known stops.
 * @param {string} query - Words of the name.
 * @param {number} [max] - The most names returned.
 * @returns {Array<{ name: string, stops: object[] }>} The names, exact ones
 * first, with their stops (by code).
 */
function searchStops(stops, query, max = 6) {
  const words = fold(query).split(' ').filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  // A name found under another name ("V. D'ASCQ PONT DE BOIS") brings every
  // stop of its name.
  const found = new Set(
    stops
      .filter((stop) =>
        namesOf(stop).some((name) => words.every((word) => ` ${name} `.includes(word))),
      )
      .map((stop) => fold(stop.name)),
  );
  const byName = new Map();
  for (const stop of stops) {
    const key = fold(stop.name);
    if (found.has(key)) {
      const entry = byName.get(key) ?? { name: stop.name, stops: [] };
      entry.stops.push(stop);
      byName.set(key, entry);
    }
  }
  const wanted = words.join(' ');
  return [...byName.values()]
    .sort((a, b) => {
      const rank = (entry) =>
        fold(entry.name) === wanted ? 0 : fold(entry.name).startsWith(wanted) ? 1 : 2;
      return rank(a) - rank(b) || a.name.localeCompare(b.name, 'fr');
    })
    .slice(0, max)
    .map((entry) => ({
      ...entry,
      stops: entry.stops.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })),
    }));
}

/**
 * @description The reference data, read through the API and kept in the store.
 * @param {object} options - Options.
 * @param {object} options.api - The Ilévia client.
 * @param {object} options.store - The store (`data.network`).
 * @param {Function} options.now - `() => number` in ms.
 * @param {Function} options.isNewDay - `(readAt) => boolean`: a 04:00 passed since.
 * @param {object} [options.logger] - Logger.
 * @returns {object} The network.
 */
function createNetwork({ api, store, now, isNewDay, logger }) {
  const data = () => {
    if (!store.data.network || typeof store.data.network !== 'object') {
      store.data.network = { lines: null, linesAt: 0, stops: null, stopsAt: 0 };
    }
    return store.data.network;
  };

  /**
   * @description Read a part of the network again when stale. A failed
   * reading keeps what is known.
   * @param {string} name - `lines` or `stops`.
   * @param {boolean} stale - Whether it must be read.
   * @param {Function} read - `() => Promise<object[]>`.
   * @returns {Promise<object[]>} The part.
   */
  async function refresh(name, stale, read) {
    const kept = data();
    if (!stale) {
      return kept[name];
    }
    try {
      kept[name] = await read();
      kept[`${name}At`] = now();
      await store.save();
    } catch (err) {
      if (!kept[name]) {
        throw err;
      }
      logger?.warn(`Ilévia ${name} not read again (${err.kind ?? 'error'}): ${err.message}`);
    }
    return kept[name];
  }

  /**
   * @description The lines, read again daily.
   * @param {boolean} [force] - Read even when fresh.
   * @returns {Promise<object[]>} The lines.
   */
  function lines(force = false) {
    const kept = data();
    const fresh = kept.lines && now() - kept.linesAt < LINES_MAX_AGE_MS && !isNewDay(kept.linesAt);
    return refresh('lines', force || !fresh, async () => {
      const { records } = await api.lines();
      const list = records.map(lineOf).filter((line) => line.id && line.name);
      if (list.length === 0) {
        throw new Error('no line');
      }
      return list;
    });
  }

  /**
   * @description The stops, read again weekly, with what the passages teach.
   * @param {boolean} [force] - Read even when fresh.
   * @returns {Promise<object[]>} The stops.
   */
  function stops(force = false) {
    const kept = data();
    const fresh = kept.stops && now() - kept.stopsAt < STOPS_MAX_AGE_MS;
    return refresh('stops', force || !fresh, async () => {
      const { records } = await api.stops();
      const list = records.map(stopOf).filter((stop) => stop.id);
      if (list.length === 0) {
        throw new Error('no stop');
      }
      try {
        learnFromPassages(list, (await api.allPassages()).records);
      } catch (err) {
        // The stops alone still resolve every stop of the stops layer.
        logger?.warn(`Ilévia passages not read for the stop names: ${err.message}`);
      }
      return list;
    });
  }

  return {
    lines,
    stops,
    /**
     * @description A line known without reading anything.
     * @param {string} id - The line code.
     * @returns {object|null} The line.
     */
    peekLine: (id) => data().lines?.find((line) => line.id === String(id)) ?? null,
    /**
     * @description Resolve a typed line.
     * @param {string} typed - The line as typed.
     * @returns {Promise<object|null>} The line, null when unknown.
     */
    resolveLine: async (typed) => findLine(await lines(), typed),
    /**
     * @description Resolve a typed stop.
     * @param {string} typed - A name or a code.
     * @returns {Promise<object|null>} `{ kind, id, name, ids, tramOnly }`.
     */
    resolveStop: async (typed) => findStop(await stops(), typed),
    /**
     * @description Search stops by name.
     * @param {string} query - Words of the name.
     * @returns {Promise<object[]>} `[{ name, stops }]`.
     */
    searchStops: async (query) => searchStops(await stops(), query),
  };
}

export {
  LINES_MAX_AGE_MS,
  STOPS_MAX_AGE_MS,
  MODES,
  fold,
  slug,
  displayName,
  lineOf,
  stopOf,
  lineNamesOf,
  learnFromPassages,
  findLine,
  findStop,
  searchStops,
  createNetwork,
};
