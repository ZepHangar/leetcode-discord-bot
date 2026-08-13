import { describe, expect, test } from 'bun:test';
import { isValidTimeString, isValidTimezone, localDateAndTime } from './setupValidation.js';

describe('isValidTimeString', () => {
  // If this fails: valid zero-padded 24h times are rejected
  test('accepts zero-padded 24h times', () => {
    expect(isValidTimeString('00:00')).toBe(true);
    expect(isValidTimeString('23:59')).toBe(true);
    expect(isValidTimeString('09:05')).toBe(true);
  });

  // If this fails: out-of-range or malformed times are accepted
  test('rejects out-of-range or malformed times', () => {
    expect(isValidTimeString('24:00')).toBe(false);
    expect(isValidTimeString('9:05')).toBe(false);
    expect(isValidTimeString('12:60')).toBe(false);
    expect(isValidTimeString('')).toBe(false);
    expect(isValidTimeString('noon')).toBe(false);
  });
});

describe('isValidTimezone', () => {
  // If this fails: canonical IANA timezone names are rejected
  test('accepts canonical IANA timezone names', () => {
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('Asia/Tokyo')).toBe(true);
  });

  // If this fails: legacy abbreviations or nonexistent zones are accepted
  test('rejects legacy abbreviations and nonexistent zones', () => {
    expect(isValidTimezone('CST')).toBe(false);
    expect(isValidTimezone('PST')).toBe(false);
    expect(isValidTimezone('America/Nonexistent')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
  });
});

describe('localDateAndTime', () => {
  // If this fails: date/time components are computed incorrectly for a fixed instant
  test('computes exact date and time for a fixed instant in UTC', () => {
    const fixed = new Date('2026-03-15T14:37:00Z');
    expect(localDateAndTime('UTC', fixed)).toEqual({ date: '2026-03-15', time: '14:37' });
  });

  // If this fails: midnight renders as ICU's "24:00" instead of "00:00"
  test('renders midnight as 00:00, not 24:00', () => {
    const midnight = new Date('2026-03-15T00:00:00Z');
    expect(localDateAndTime('UTC', midnight).time).toBe('00:00');
  });

  // If this fails: timezone offset is not applied, producing the wrong local date
  test('applies timezone offset across a date boundary', () => {
    // 23:30 UTC on 2026-03-15 is 08:30 the next day in Asia/Tokyo (UTC+9)
    const late = new Date('2026-03-15T23:30:00Z');
    expect(localDateAndTime('Asia/Tokyo', late)).toEqual({ date: '2026-03-16', time: '08:30' });
  });
});
