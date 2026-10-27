// -----------------------------------------------------------------------------
// The records of the passages layer -> the passages of a followed stop.
//
// Each record is one vehicle at one stop: its line (`code_ligne`), its
// destination (`sens_ligne`) and its estimated departure time
// (`heure_estimee_depart`, a Paris wall-clock time, see time.js). The layer
// covers the next half hour and is refreshed every minute. It gives no
// timetable time: no delay can be worked out.
// Passages towards the stop itself (the vehicle ends its trip there) are left
// out: nobody boards them.
// -----------------------------------------------------------------------------

import { fold, displayName } from './network.js';
import { parseFeedTime, CLOCKS } from './time.js';

/**
 * @description Split a typed direction into the words to look for.
 * @param {string} direction - "Comines | Chemin de Messines".
 * @returns {string[]} The folded alternatives.
 * @example
 * directionTerms('Comines | Chemin de Messines'); // -> ['comines', 'chemin de messines']
 */
function directionTerms(direction) {
  return String(direction ?? '')
    .split('|')
    .map(fold)
    .filter(Boolean);
}

/**
 * @description One passage.
 * @param {object} raw - A record.
 * @param {object} [options] - `{ clock, lineName }`: how the times are
 * written, and `(code) => public name`.
 * @returns {object} The passage.
 */
function passageOf(raw, { clock = CLOCKS.WALL, lineName = (code) => code } = {}) {
  const lineId = String(raw.code_ligne ?? '');
  return {
    stopId: String(raw.code_arret_physique ?? ''),
    lineId,
    line: String(lineName(lineId) || lineId),
    destination: displayName(raw.sens_ligne),
    at: parseFeedTime(raw.heure_estimee_depart, clock),
  };
}

/**
 * @description The passages of a followed stop, soonest first.
 * @param {object[]} records - The records read (several stops may share them).
 * @param {object} filter - `{ ids, stopName, lineId, direction, clock, lineName }`:
 * the codes of the stop, its name, the optional line and direction.
 * @returns {object[]} The passages.
 */
function parsePassages(
  records,
  { ids = [], stopName = '', lineId = '', direction = '', clock, lineName } = {},
) {
  const terms = directionTerms(direction);
  const here = fold(stopName);
  const codes = new Set(ids);
  return (
    (Array.isArray(records) ? records : [])
      .filter((raw) => codes.size === 0 || codes.has(String(raw?.code_arret_physique ?? '')))
      // The stop as the record names it ("V. D'ASCQ PONT DE BOIS") ends trips too.
      .filter((raw) => !raw.nom_station || fold(raw.sens_ligne) !== fold(raw.nom_station))
      .map((raw) => passageOf(raw, { clock, lineName }))
      .filter((passage) => passage.at !== null)
      .filter((passage) => !lineId || passage.lineId === lineId)
      .filter((passage) => !here || fold(passage.destination) !== here)
      .filter((passage) => {
        if (terms.length === 0) {
          return true;
        }
        const target = fold(passage.destination);
        return terms.some((term) => target.includes(term));
      })
      .sort((a, b) => a.at - b.at)
  );
}

/**
 * @description The minutes left before a passage.
 * @param {object} passage - The passage.
 * @param {number} now - Now (ms).
 * @returns {number} Whole minutes (rounded down, like the screens).
 */
function minutesLeft(passage, now) {
  return Math.max(0, Math.floor((passage.at - now) / 60000));
}

/**
 * @description The passages not gone yet.
 * @param {object[]} passages - The passages.
 * @param {number} now - Now (ms).
 * @returns {object[]} The passages to come.
 */
const upcomingPassages = (passages, now) => passages.filter((passage) => passage.at > now - 30000);

/**
 * @description Who a passage is, across readings: line and destination.
 * @param {object} passage - The passage.
 * @returns {string} "L1|cht dron".
 */
const routeOf = (passage) => `${passage.lineId}|${fold(passage.destination)}`;

export { directionTerms, passageOf, parsePassages, minutesLeft, upcomingPassages, routeOf };
