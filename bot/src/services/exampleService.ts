/**
 * Service template — copy this file when adding a new service.
 *
 * Service pattern in this repo:
 * - Plain exported async functions. No classes, no DI container.
 * - Import `prisma` and `logger` directly; they are singletons.
 * - Take `client` as a typed parameter only when Discord is touched.
 * - Long-running sweeps guard against overlap with a module-level flag
 *   and isolate per-item failures with try/catch so one bad item never
 *   blocks the rest.
 */
import type { ExampleCounter } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import type { ExtendedClient } from '../classes/ExtendedClient.js';

/** Overlap guard — a sweep already in progress makes later ticks no-ops. */
let isSweepRunning = false;

/**
 * Increment and return a guild's counter. Single upsert — safe for concurrent calls.
 *
 * @precondition `guildId` is a valid Discord snowflake string.
 * @postcondition The guild's row exists and its count is one higher than before this call committed.
 * @throws Prisma errors propagate — the database is unreachable or the row violates a constraint.
 */
export async function incrementExampleCounter(guildId: string): Promise<ExampleCounter> {
  return prisma.exampleCounter.upsert({
    where: { guildId },
    create: { guildId, count: 1 },
    update: { count: { increment: 1 } },
  });
}

/**
 * Read a guild's counter, or null if none exists yet.
 *
 * @precondition `guildId` is a valid Discord snowflake string.
 * @postcondition Returns the persisted row unchanged; creates nothing.
 * @throws Prisma errors propagate — the database is unreachable.
 */
export async function getExampleCounter(guildId: string): Promise<ExampleCounter | null> {
  return prisma.exampleCounter.findUnique({ where: { guildId } });
}

/**
 * One cron tick: iterate guilds, per-guild try/catch so one failure doesn't block the rest.
 *
 * This is the canonical "worker body" example: client passed as a parameter,
 * overlap guarded, per-item errors logged and swallowed.
 *
 * @precondition `client` is logged in and its guild cache is populated.
 * @postcondition Every cached guild was visited; per-guild failures are logged, not thrown.
 */
export async function runExampleSweep(client: ExtendedClient): Promise<void> {
  if (isSweepRunning) {
    logger.warn('Example sweep already running — skipping tick');
    return;
  }

  isSweepRunning = true;
  try {
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        logger.debug({ guildId, guildName: guild.name }, 'Example sweep visited guild');
      } catch (error) {
        logger.error({ error, guildId }, 'Example sweep failed for guild');
      }
    }
  } finally {
    isSweepRunning = false;
  }
}
