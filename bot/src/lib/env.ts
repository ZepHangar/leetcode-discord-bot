/** Validated environment configuration required at startup. */
export interface Env {
  DISCORD_TOKEN: string;
  DATABASE_URL: string;
  GUILD_ID: string | undefined;
  LOG_LEVEL: string | undefined;
  LEETCODE_API_URL: string;
  OPENCODE_API_KEY: string | undefined;
  OPENCODE_GO_MODEL: string;
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
  const leetcodeApiUrl = process.env.LEETCODE_API_URL?.trim();
  const opencodeApiKey = process.env.OPENCODE_API_KEY?.trim();
  const opencodeGoModel = process.env.OPENCODE_GO_MODEL?.trim();

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
    LEETCODE_API_URL: leetcodeApiUrl || 'http://leetcode-api:3000',
    OPENCODE_API_KEY: opencodeApiKey || undefined,
    OPENCODE_GO_MODEL: opencodeGoModel || 'deepseek-v4-flash',
  };
}
