/**
 * Per-minute background dispatch: sends today's LeetCode daily problem to every
 * due DM user and guild channel.
 *
 * @module services/dailyDispatchService
 */
import { EmbedBuilder } from 'discord.js';
import type { GuildSetup, UserSetup } from '@prisma/client';
import type { ExtendedClient } from '../classes/ExtendedClient.js';
import { logger } from '../lib/logger.js';
import { fetchDailyProblem, type DailyProblem } from '../lib/leetcodeApi.js';
import { localDateAndTime } from '../utils/setupValidation.js';
import { generatePersonalizedBlurb } from './aiPersonalizationService.js';
import {
  listDueGuildSetups,
  listDueUserSetups,
  markGuildSent,
  markUserSent,
} from './setupService.js';

let isTickRunning = false;

const DIFFICULTY_COLOR: Record<string, number> = {
  Easy: 0x43a047,
  Medium: 0xf9a825,
  Hard: 0xe53935,
};

function buildDailyEmbed(problem: DailyProblem, blurb: string | null): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(problem.title)
    .setURL(problem.link)
    .setDescription(blurb ?? "Today's LeetCode daily is up — good luck!")
    .addFields({ name: 'Difficulty', value: problem.difficulty, inline: true })
    .setColor(DIFFICULTY_COLOR[problem.difficulty] ?? 0x5865f2)
    .setFooter({ text: problem.date });
}

async function dispatchToUser(
  row: UserSetup,
  client: ExtendedClient,
  getProblem: () => Promise<DailyProblem>
): Promise<void> {
  const { date, time } = localDateAndTime(row.timezone!);
  if (time !== row.sendTime || row.lastSentDate === date) return;

  const problem = await getProblem();
  const blurb = row.aiPrompt ? await generatePersonalizedBlurb(row.aiPrompt, problem) : null;
  const embed = buildDailyEmbed(problem, blurb);

  const user = await client.users.fetch(row.discordUserId);
  await user.send({ embeds: [embed] });
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
  // GuildSetup.aiPrompt isn't exposed in the UI yet — guild sends never get a blurb.
  const embed = buildDailyEmbed(problem, null);

  const channel = await client.channels.fetch(row.channelId!);
  if (!channel?.isSendable()) throw new Error('channel not sendable');
  await channel.send({ embeds: [embed] });
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
