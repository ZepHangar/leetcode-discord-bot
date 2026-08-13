import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // If this fails: missing DISCORD_TOKEN doesn't throw at startup
  test('throws when DISCORD_TOKEN is missing', () => {
    delete process.env.DISCORD_TOKEN;
    expect(() => loadEnv()).toThrow('DISCORD_TOKEN');
  });


  // If this fails: the bot boots without a database and fails deep in a command instead of at startup
  test('throws when DATABASE_URL is missing', () => {
    process.env.DISCORD_TOKEN = 'test-token';
    delete process.env.DATABASE_URL;
    expect(() => loadEnv()).toThrow('DATABASE_URL');
  });

  // If this fails: valid env vars produce wrong output shape
  test('returns validated env when required vars are present', () => {
    process.env.DISCORD_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://test';
    delete process.env.GUILD_ID;
    delete process.env.LOG_LEVEL;

    const env = loadEnv();
    expect(env.DISCORD_TOKEN).toBe('test-token');
    expect(env.DATABASE_URL).toBe('postgresql://test');
    expect(env.GUILD_ID).toBeUndefined();
    expect(env.LOG_LEVEL).toBeUndefined();
  });

  // If this fails: optional vars are lost when present
  test('includes optional vars when set', () => {
    process.env.DISCORD_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.GUILD_ID = '123456';
    process.env.LOG_LEVEL = 'debug';

    const env = loadEnv();
    expect(env.GUILD_ID).toBe('123456');
    expect(env.LOG_LEVEL).toBe('debug');
  });

  // If this fails: whitespace-only values are treated as present
  test('treats whitespace-only values as missing', () => {
    process.env.DISCORD_TOKEN = '   ';
    process.env.DATABASE_URL = 'postgresql://test';
    expect(() => loadEnv()).toThrow('DISCORD_TOKEN');
  });
});
