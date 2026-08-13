import { describe, expect, mock, test } from 'bun:test';
import type { ExtendedClient } from '../classes/ExtendedClient.js';

const upsert = mock<(...args: unknown[]) => Promise<unknown>>(async (args) => args);
const findUnique = mock<(...args: unknown[]) => Promise<unknown>>(async () => null);

mock.module('../lib/prisma.js', () => ({
  prisma: {
    exampleCounter: {
      upsert,
      findUnique,
    },
  },
}));

// Dynamic import is required: mock.module above must run before the module under test loads.
const { incrementExampleCounter, getExampleCounter, runExampleSweep } = await import(
  './exampleService.js'
);

describe('incrementExampleCounter', () => {
  // If this fails: concurrent increments can lose counts or create duplicate rows
  test('issues a single upsert with increment-on-update shape', async () => {
    upsert.mockClear();
    await incrementExampleCounter('123');
    expect(upsert).toHaveBeenCalledWith({
      where: { guildId: '123' },
      create: { guildId: '123', count: 1 },
      update: { count: { increment: 1 } },
    });
  });
});

describe('getExampleCounter', () => {
  // If this fails: callers can't distinguish "no counter yet" from "counter is 0"
  test('returns null pass-through when no row exists', async () => {
    const result = await getExampleCounter('missing');
    expect(result).toBeNull();
  });
});

describe('runExampleSweep', () => {
  // If this fails: the cron worker crashes on guilds it cannot process
  test('completes without throwing on an empty guild cache', async () => {
    const client = { guilds: { cache: new Map() } } as unknown as ExtendedClient;
    await expect(runExampleSweep(client)).resolves.toBeUndefined();
  });
});
