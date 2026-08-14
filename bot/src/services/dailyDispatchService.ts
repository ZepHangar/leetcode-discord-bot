/**
 * Per-minute background dispatch: sends today's LeetCode daily problem to every
 * due DM user and guild channel as the cv2 problem card.
 *
 * @module services/dailyDispatchService
 */
import type { GuildSetup, UserSetup } from '@prisma/client';
import type { ExtendedClient } from '../classes/ExtendedClient.js';
import { buildDailyCard } from '../features/daily/dailyCard.js';
import { logger } from '../lib/logger.js';
import { fetchDailyProblem, type DailyProblem } from '../lib/leetcodeApi.js';
import { localDateAndTime } from '../utils/setupValidation.js';
import { buildDefaultCardContent } from './aiPersonalizationService.js';
import { resolveDailyCardContent } from './dailyCardService.js';
import {
  listDueGuildSetups,
  listDueUserSetups,
  markGuildSent,
  markUserSent,
} from './setupService.js';

let isTickRunning = false;

async function dispatchToUser(
  row: UserSetup,
  client: ExtendedClient,
  getProblem: () => Promise<DailyProblem>
): Promise<void> {
  const { date, time } = localDateAndTime(row.timezone!);
  if (time !== row.sendTime || row.lastSentDate === date) return;

  const problem = await getProblem();
  const content = await resolveDailyCardContent(row.discordUserId, { personalized: true }, problem);
  const card = buildDailyCard(problem, content);

  const user = await client.users.fetch(row.discordUserId);
  await user.send(card);
  await markUserSent(row.discordUserId, date);
}

async function dispatchToGuild(
  row: GuildSetup,
  client: ExtendedClient,
  getProblem: () => Promise<DailyProblem>
): Promise<void> {
  const { date, time } = localDateAndTime(row.timezone!);
  if (time !== row.sendTime || row.lastSentDate === date) return;

  const problem = await getProblem();
  // Guild cards are shared between members, so they are never personalized.
  const card = buildDailyCard(problem, buildDefaultCardContent(problem));

  const channel = await client.channels.fetch(row.channelId!);
  if (!channel?.isSendable()) throw new Error('channel not sendable');
  await channel.send(card);
  await markGuildSent(row.guildId, date);
}

/**
 * Run one dispatch tick: send the daily problem to every user/guild whose local
 * time matches their configured `sendTime` and hasn't already been sent today.
 *
 * @postcondition Overlapping ticks are skipped (guarded by `isTickRunning`); a
 *   single user's/guild's failure never blocks the rest of the tick.
 */
export async function runDailyDispatchTick(client: ExtendedClient): Promise<void> {
  if (isTickRunning) {
    logger.warn('Daily dispatch tick already running — skipping');
    return;
  }
  isTickRunning = true;

  try {
    let problem: DailyProblem | null = null;
    const getProblem = async (): Promise<DailyProblem> => {
      problem ??= await fetchDailyProblem();
      return problem;
    };

    for (const row of await listDueUserSetups()) {
      try {
        await dispatchToUser(row, client, getProblem);
      } catch (error) {
        logger.warn({ error, discordUserId: row.discordUserId }, 'Daily dispatch failed for user');
      }
    }

    for (const row of await listDueGuildSetups()) {
      try {
        await dispatchToGuild(row, client, getProblem);
      } catch (error) {
        logger.warn({ error, guildId: row.guildId }, 'Daily dispatch failed for guild');
      }
    }
  } finally {
    isTickRunning = false;
  }
}
