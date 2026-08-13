/** Validated environment configuration required at startup. */
export interface Env {
  DISCORD_TOKEN: string;
  DATABASE_URL: string;
  GUILD_ID: string | undefined;
  LOG_LEVEL: string | undefined;
}

/**
 * Load and validate required environment variables.
 *
 * @throws {Error} If DISCORD_TOKEN or DATABASE_URL is missing.
 */
export function loadEnv(): Env {
  const discordToken = process.env.DISCORD_TOKEN?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const guildId = process.env.GUILD_ID?.trim();
  const logLevel = process.env.LOG_LEVEL?.trim();

  if (!discordToken) {
    throw new Error("Missing required environment variable: DISCORD_TOKEN");
  }

  if (!databaseUrl) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return {
    DISCORD_TOKEN: discordToken,
    DATABASE_URL: databaseUrl,
    GUILD_ID: guildId || undefined,
    LOG_LEVEL: logLevel || undefined,
  };
}
