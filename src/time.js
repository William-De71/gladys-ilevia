// -----------------------------------------------------------------------------
// Times of day.
//
// Times are written in the timezone of the Gladys instance, which the
// supervisor injects as TZ (Paris time for the users of Lille).
//
// The datasets of Ilévia write Paris wall-clock times with a "Z" suffix:
// "2026-10-27T17:00:00Z" is 17:00 in Lille, not in UTC (seen on 2026-10-27:
// the passages of the next half hour were stamped one hour ahead of UTC). The
// answers also carry a true UTC `timeStamp`: `feedClockOf()` compares the
// freshest `date_modification` with it, so a fix on the portal side would be
// followed without a new release.
// -----------------------------------------------------------------------------

const MINUTE_MS = 60 * 1000;
// The lines of the day are read again after this local hour, once the night
// buses are done.
const NEW_DAY_HOUR = 4;
// The timezone of the network: the wall-clock times of the datasets.
const NETWORK_TIME_ZONE = 'Europe/Paris';
const CLOCKS = { WALL: 'wall', UTC: 'utc' };
// A "UTC" modification time this far ahead of the answer is a wall-clock time.
const CLOCK_SKEW_MS = 20 * MINUTE_MS;

/**
 * @description The timezone of the instance.
 * @returns {string|undefined} An IANA name, undefined for the system one.
 */
function defaultTimeZone() {
  return process.env.TZ || undefined;
}

/**
 * @description The local date and time of an instant in a timezone.
 * @param {number} instant - The instant, in ms.
 * @param {string} [timeZone] - IANA timezone.
 * @returns {{ date: string, minutes: number }} `YYYY-MM-DD` and minutes since midnight.
 * @example
 * localClock(Date.parse('2026-10-16T12:00:00Z'), 'Europe/Paris'); // 2026-10-16, 840
 */
function localClock(instant, timeZone = defaultTimeZone()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/**
 * @description The offset of a timezone at an instant.
 * @param {number} instant - The instant, in ms.
 * @param {string} timeZone - IANA timezone.
 * @returns {number} Milliseconds to add to UTC ("+01:00" -> 3 600 000).
 */
function offsetAt(instant, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, Number(part.value)]),
  );
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * @description The instant of a wall-clock time in a timezone. In the hour
 * repeated in autumn, the first one.
 * @param {number} wall - The wall-clock time read as if it were UTC (ms).
 * @param {string} [timeZone] - IANA timezone.
 * @returns {number} The instant (ms).
 * @example
 * wallToInstant(Date.UTC(2026, 9, 27, 17, 0), 'Europe/Paris'); // 16:00 UTC
 */
function wallToInstant(wall, timeZone = NETWORK_TIME_ZONE) {
  // The offsets around the time: a candidate is right when the timezone has
  // that offset at the instant it gives. In the hour skipped in spring, none
  // is: the offset of before.
  const offsets = [
    ...new Set([12, -12].map((hours) => offsetAt(wall - hours * 3600000, timeZone))),
  ];
  const valid = offsets
    .map((offset) => wall - offset)
    .filter((instant) => wall - offsetAt(instant, timeZone) === instant);
  return valid.length > 0 ? Math.min(...valid) : wall - offsets[0];
}

/**
 * @description A time of the datasets.
 * @param {unknown} value - "2026-10-27T17:00:00Z", "2026-10-27T16:50:00.427Z".
 * @param {string} [clock] - CLOCKS.WALL (Paris time written as UTC, the default) or CLOCKS.UTC.
 * @returns {number|null} The instant (ms), null when absent or invalid.
 */
function parseFeedTime(value, clock = CLOCKS.WALL) {
  if (typeof value !== 'string') {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?/.exec(
    value,
  );
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second = '0', fraction = '0'] = match;
  const wall = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(fraction.padEnd(3, '0')),
  );
  if (!Number.isFinite(wall)) {
    return null;
  }
  if (clock === CLOCKS.UTC) {
    // A real offset, when the portal writes one, wins.
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : wall;
  }
  return wallToInstant(wall);
}

/**
 * @description How the times of an answer are written.
 * @param {object[]} records - Records with a `date_modification`.
 * @param {number} answeredAt - The true UTC time of the answer (`timeStamp`), ms.
 * @returns {string|null} CLOCKS.WALL or CLOCKS.UTC, null when it cannot tell
 * (no record, or the records are all old).
 */
function feedClockOf(records, answeredAt) {
  if (!Number.isFinite(answeredAt) || !Array.isArray(records)) {
    return null;
  }
  let freshest = null;
  for (const record of records) {
    const asUtc = parseFeedTime(record?.date_modification, CLOCKS.UTC);
    if (asUtc !== null && (freshest === null || asUtc > freshest)) {
      freshest = asUtc;
    }
  }
  if (freshest === null) {
    return null;
  }
  const ahead = freshest - answeredAt;
  if (ahead > CLOCK_SKEW_MS) {
    return CLOCKS.WALL;
  }
  // A modification of the last minutes, read as UTC: the portal writes UTC.
  return ahead > -CLOCK_SKEW_MS ? CLOCKS.UTC : null;
}

/**
 * @description "07:42", in the timezone of the instance.
 * @param {number|null} instant - The instant, in ms.
 * @param {string} [timeZone] - IANA timezone.
 * @returns {string} The time, '' when none.
 */
function formatTime(instant, timeZone = defaultTimeZone()) {
  if (!Number.isFinite(instant)) {
    return '';
  }
  const { minutes } = localClock(instant, timeZone);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * @description The "service day" of an instant: the local date, until 04:00
 * the day before (a night bus at 00:30 still belongs to the evening).
 * @param {number} instant - The instant, in ms.
 * @param {string} [timeZone] - IANA timezone.
 * @returns {string} `YYYY-MM-DD`.
 */
function serviceDay(instant, timeZone = defaultTimeZone()) {
  return localClock(instant - NEW_DAY_HOUR * 3600 * 1000, timeZone).date;
}

/**
 * @description Whether a new service day began since an instant.
 * @param {number} since - The instant (ms), 0 for never.
 * @param {number} now - Now (ms).
 * @param {string} [timeZone] - IANA timezone.
 * @returns {boolean} True when 04:00 local time passed in between.
 */
function newDaySince(since, now, timeZone = defaultTimeZone()) {
  if (!since) {
    return true;
  }
  return serviceDay(since, timeZone) !== serviceDay(now, timeZone);
}

export {
  MINUTE_MS,
  NEW_DAY_HOUR,
  NETWORK_TIME_ZONE,
  CLOCKS,
  defaultTimeZone,
  localClock,
  offsetAt,
  wallToInstant,
  parseFeedTime,
  feedClockOf,
  formatTime,
  serviceDay,
  newDaySince,
};
