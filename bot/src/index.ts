import { GatewayIntentBits } from "discord.js";
import { ExtendedClient } from "./classes/ExtendedClient.js";
import { loadEvents } from "./handlers/eventHandler.js";
import { loadEnv } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { connectPrisma, disconnectPrisma } from "./lib/prisma.js";

const env = loadEnv();

const client = new ExtendedClient({
  intents: [GatewayIntentBits.Guilds],
});

const shutdown = async () => {
  logger.info("Shutting down...");
  client.statusRotationStop?.();
  client.destroy();
  await disconnectPrisma();
  process.exit(0);
};

const startupFailure = async (error: unknown) => {
  logger.error({ error }, "Startup failed");
  client.statusRotationStop?.();
  client.destroy();
  await disconnectPrisma();
  process.exit(1);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void (async () => {
  await connectPrisma();
  await loadEvents(client);
  await client.login(env.DISCORD_TOKEN);
})().catch(startupFailure);
