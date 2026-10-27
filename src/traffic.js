// -----------------------------------------------------------------------------
// The traffic of the network, read every 5 minutes from the perturbations
// layer: one record per message and line, its type as Ilévia writes it —
// "Perturbation" (an incident: a metro line cut, a bus diverted) or
// "Information" (works, a stop moved, a message about the service) —, an
// HTML text, its publication time and an end.
//
// The layer is a log more than a state: each news about an incident is a new
// message ("line 1 cut until 15:00", then "line 1 slowed down"), and a
// message stays a day after its publication unless Ilévia gives an earlier
// end. Nothing says when an incident is over. Hence:
//   - a message counts while its end is not passed;
//   - the state of a line is the one of its latest message: a "Perturbation"
//     less than DISRUPTION_HOLD_MS old makes it `disrupted`, any other message
//     `info`; a newer message supersedes an older one;
//   - without a message, the line is `normal`.
// States of a line, from the mildest: `unknown` (nothing read yet), `normal`,
// `info`, `disrupted`. The texts are in French only: the network has no other
// language.
// -----------------------------------------------------------------------------

import { parseFeedTime, CLOCKS, MINUTE_MS } from './time.js';

const STATES = ['unknown', 'normal', 'info', 'disrupted'];
const SERIOUS = ['disrupted'];
// An incident message counts as under way this long after its publication,
// unless a newer message about the line supersedes it.
const DISRUPTION_HOLD_MS = 90 * MINUTE_MS;
// A message published a little ahead of the clock of the instance still counts.
const CLOCK_SLACK_MS = 5 * MINUTE_MS;
const TEXT_MAX = 2000;
const TITLE_MAX = 140;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/**
 * @description The text of an HTML message: line breaks kept, tags dropped,
 * entities decoded, blank lines dropped.
 * @param {unknown} value - The HTML.
 * @param {number} [max] - Its longest length.
 * @returns {string} The text.
 * @example
 * htmlToText('<b>Ce lundi</b> : <br/>► Jean Moulin'); // -> 'Ce lundi :\n► Jean Moulin'
 */
function htmlToText(value, max = TEXT_MAX) {
  return (
    String(value ?? '')
      .replace(/\r/g, '')
      // Ilévia separates paragraphs with zero-width spaces as often as with <br/>.
      .replace(/<br\s*\/?>|<\/(p|div|li)>|[\u200b\ufeff]/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
        if (code[0] === '#') {
          const number =
            code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
          return Number.isFinite(number) && number > 0 ? String.fromCodePoint(number) : whole;
        }
        return ENTITIES[code.toLowerCase()] ?? whole;
      })
      .split('\n')
      .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
      .slice(0, max)
  );
}

/**
 * @description A short title for a message: its first sentence.
 * @param {string} text - The text of the message.
 * @returns {string} The title, at most TITLE_MAX characters.
 */
function titleOf(text) {
  const [firstLine = ''] = text.split('\n');
  const sentence = /^(.+?[.!?])(\s|$)/.exec(firstLine)?.[1] ?? firstLine;
  return sentence.length > TITLE_MAX ? `${sentence.slice(0, TITLE_MAX - 1)}…` : sentence;
}

/**
 * @description The first link of a message, when on https.
 * @param {unknown} html - The HTML.
 * @returns {string} The URL, '' when none.
 */
function linkOf(html) {
  const url = /href\s*=\s*"(https:\/\/[^"\s]+)"/i.exec(String(html ?? ''))?.[1] ?? '';
  return url.length <= 2048 ? url : '';
}

/**
 * @description The uuid inside an id of Ilévia.
 * @param {unknown} value - "ILEVIA:Item::de7a353a-…:LOC".
 * @returns {string} "de7a353a-…", or the value.
 */
function shortId(value) {
  const text = String(value ?? '');
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(text)?.[0] ?? text;
}

/**
 * @description What is kept of a message.
 * @param {object} raw - A record of the perturbations layer.
 * @param {string} [clock] - How its times are written (time.js).
 * @returns {object} `{ id, event, lineId, type, title, text, url, published, end }`.
 */
function messageOf(raw, clock = CLOCKS.WALL) {
  const text = htmlToText(raw.message);
  return {
    id: shortId(raw.identifiant_perturbation ?? raw.objectid),
    // One message sent about several lines: one record per line.
    event: shortId(raw.identifiant_message ?? raw.identifiant_perturbation ?? raw.objectid),
    lineId: /LineRef::([^:]+)/.exec(String(raw.cible ?? ''))?.[1] ?? '',
    type:
      String(raw.type_perturbation ?? '').toLowerCase() === 'perturbation' ? 'disrupted' : 'info',
    title: titleOf(text),
    text,
    url: linkOf(raw.message),
    published: parseFeedTime(raw.date_modification, clock),
    end: parseFeedTime(raw.heure_fin_prevue, clock),
  };
}

/**
 * @description Read the messages.
 * @param {object[]} records - The records of the perturbations layer.
 * @param {string} [clock] - How their times are written.
 * @returns {{ messages: object[] }} The messages about a line.
 */
function parseTraffic(records, clock = CLOCKS.WALL) {
  return {
    messages: (Array.isArray(records) ? records : [])
      .map((raw) => messageOf(raw, clock))
      .filter((message) => message.id && message.lineId && message.text),
  };
}

/**
 * @description The rank of a state, for comparisons.
 * @param {string} state - A state.
 * @returns {number} Its position in STATES.
 */
const rank = (state) => STATES.indexOf(state);

/**
 * @description The traffic of one line.
 * @param {object|null} traffic - parseTraffic().
 * @param {string} lineId - The line code.
 * @param {number} now - Now (ms).
 * @returns {{ state: string, messages: object[] }} Its state, and its messages
 * not over (each with its `state`), the latest first.
 */
function lineTraffic(traffic, lineId, now) {
  if (!traffic) {
    return { state: 'unknown', messages: [] };
  }
  const messages = traffic.messages
    .filter(
      (message) =>
        message.lineId === lineId &&
        (message.end === null || message.end > now) &&
        (message.published === null || message.published <= now + CLOCK_SLACK_MS),
    )
    .map((message) => ({
      ...message,
      state:
        message.type === 'disrupted' &&
        message.published !== null &&
        now - message.published <= DISRUPTION_HOLD_MS
          ? 'disrupted'
          : 'info',
    }))
    .sort((a, b) => (b.published ?? 0) - (a.published ?? 0));
  if (messages.length === 0) {
    return { state: 'normal', messages };
  }
  return { state: messages[0].state, messages };
}

/**
 * @description The messages of a line about an incident under way.
 * @param {{ messages: object[] }} line - lineTraffic().
 * @returns {object[]} The messages.
 */
const seriousMessages = (line) => line.messages.filter((m) => SERIOUS.includes(m.state));

export {
  STATES,
  SERIOUS,
  DISRUPTION_HOLD_MS,
  htmlToText,
  titleOf,
  linkOf,
  shortId,
  messageOf,
  parseTraffic,
  rank,
  lineTraffic,
  seriousMessages,
};
