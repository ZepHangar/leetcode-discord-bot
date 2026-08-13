/**
 * Pure validators and date/time helpers for the `/setup` daily reminder command.
 *
 * @module utils/setupValidation
 */

/**
 * Check whether a string is a 24h `HH:MM` time (zero-padded, `00:00`–`23:59`).
 */
export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * Check whether a string is a canonical IANA timezone name recognized by the runtime
 * (e.g. `America/New_York`, `UTC`); rejects legacy abbreviations like `CST`/`EST`.
 */
export function isValidTimezone(value: string): boolean {
  return Intl.supportedValuesOf('timeZone').includes(value);
}

/** The wall-clock date and time in a given IANA timezone. */
export interface LocalDateAndTime {
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH:MM`, 24h */
  time: string;
}

/**
 * Compute the local date and time in `timezone` for a given instant.
 *
 * @precondition `timezone` is a valid IANA timezone name (see {@link isValidTimezone}).
 * @postcondition Returns `{ date, time }` derived from `now` as observed in `timezone`;
 *   midnight yields `time === "00:00"`, never ICU's `"24:00"`.
 */
export function localDateAndTime(timezone: string, now: Date = new Date()): LocalDateAndTime {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`localDateAndTime: missing "${type}" part for timezone ${timezone}`);
    return part.value;
  };

  const year = get('year');
  const month = get('month');
  const day = get('day');
  // Intl's 24h hour cycle can render midnight as "24"; normalize to "00" per HH:MM contract.
  const hour = get('hour') === '24' ? '00' : get('hour');
  const minute = get('minute');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}
