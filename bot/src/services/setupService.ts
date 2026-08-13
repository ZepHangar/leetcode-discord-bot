/**
 * Persistence for `/setup` daily reminder configuration (per-user DM and per-guild).
 *
 * @module services/setupService
 */
import type { UserSetup, GuildSetup } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export async function getUserSetup(discordUserId: string): Promise<UserSetup | null> {
  return prisma.userSetup.findUnique({ where: { discordUserId } });
}

export async function setUserAiPrompt(
  discordUserId: string,
  aiPrompt: string | null
): Promise<UserSetup> {
  return prisma.userSetup.upsert({
    where: { discordUserId },
    create: { discordUserId, aiPrompt },
    update: { aiPrompt },
  });
}

export async function setUserSchedule(
  discordUserId: string,
  timezone: string,
  sendTime: string
): Promise<UserSetup> {
  return prisma.userSetup.upsert({
    where: { discordUserId },
    create: { discordUserId, timezone, sendTime },
    update: { timezone, sendTime },
  });
}

/**
 * Delete a user's DM configuration.
 *
 * @postcondition No `UserSetup` row exists for the user. No-op when the row is
 *   already gone (e.g. two clear confirmations race).
 */
export async function deleteUserSetup(discordUserId: string): Promise<void> {
  await prisma.userSetup.deleteMany({ where: { discordUserId } });
}

export async function markUserSent(discordUserId: string, dateStr: string): Promise<void> {
  await prisma.userSetup.update({
    where: { discordUserId },
    data: { lastSentDate: dateStr },
  });
}

export async function listDueUserSetups(): Promise<UserSetup[]> {
  return prisma.userSetup.findMany({
    where: { timezone: { not: null }, sendTime: { not: null } },
  });
}

export async function getGuildSetup(guildId: string): Promise<GuildSetup | null> {
  return prisma.guildSetup.findUnique({ where: { guildId } });
}

export async function setGuildChannel(guildId: string, channelId: string): Promise<GuildSetup> {
  return prisma.guildSetup.upsert({
    where: { guildId },
    create: { guildId, channelId },
    update: { channelId },
  });
}

export async function setGuildSchedule(
  guildId: string,
  timezone: string,
  sendTime: string
): Promise<GuildSetup> {
  return prisma.guildSetup.upsert({
    where: { guildId },
    create: { guildId, timezone, sendTime },
    update: { timezone, sendTime },
  });
}

export async function markGuildSent(guildId: string, dateStr: string): Promise<void> {
  await prisma.guildSetup.update({
    where: { guildId },
    data: { lastSentDate: dateStr },
  });
}

/**
 * Delete a guild's configuration.
 *
 * @postcondition No `GuildSetup` row exists for the guild. No-op when the row is
 *   already gone (e.g. two clear confirmations race).
 */
export async function deleteGuildSetup(guildId: string): Promise<void> {
  await prisma.guildSetup.deleteMany({ where: { guildId } });
}

export async function listDueGuildSetups(): Promise<GuildSetup[]> {
  return prisma.guildSetup.findMany({
    where: { channelId: { not: null }, timezone: { not: null }, sendTime: { not: null } },
  });
}
