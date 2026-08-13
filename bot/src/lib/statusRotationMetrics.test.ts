import { describe, expect, test } from 'bun:test';
import { formatBotUptime } from './statusRotationMetrics.js';

describe('formatBotUptime', () => {
  // If this fails: zero uptime doesn't display correctly
  test('formats 0 seconds as "0 seconds"', () => {
    expect(formatBotUptime(0)).toBe('0 seconds');
  });

  // If this fails: singular units use wrong pluralization
  test('uses singular for exactly 1 of a unit', () => {
    expect(formatBotUptime(1)).toBe('1 second');
    expect(formatBotUptime(60)).toBe('1 minute');
    expect(formatBotUptime(3600)).toBe('1 hour');
    expect(formatBotUptime(86400)).toBe('1 day');
  });

  // If this fails: plural units are wrong
  test('uses plural for more than 1 of a unit', () => {
    expect(formatBotUptime(5)).toBe('5 seconds');
    expect(formatBotUptime(120)).toBe('2 minutes');
    expect(formatBotUptime(7200)).toBe('2 hours');
    expect(formatBotUptime(172800)).toBe('2 days');
  });

  // If this fails: combined units don't show the two largest
  test('shows at most two largest units', () => {
    expect(formatBotUptime(90061)).toBe('1 day 1 hour');
    expect(formatBotUptime(3661)).toBe('1 hour 1 minute');
  });

  // If this fails: seconds are shown when larger units exist
  test('omits seconds when minutes or larger are present', () => {
    expect(formatBotUptime(61)).toBe('1 minute');
    expect(formatBotUptime(3601)).toBe('1 hour');
  });

  // If this fails: negative or non-finite input causes a crash
  test('treats negative, NaN, and Infinity as 0', () => {
    expect(formatBotUptime(-100)).toBe('0 seconds');
    expect(formatBotUptime(NaN)).toBe('0 seconds');
    expect(formatBotUptime(Infinity)).toBe('0 seconds');
  });
});
