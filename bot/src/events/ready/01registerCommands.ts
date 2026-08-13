import { REST, Routes } from 'discord.js';
import { loadCommands } from '../../handlers/commandHandler.js';
import { loadEnv } from '../../lib/env.js';
import { logger } from '../../lib/logger.js';
import type { ExtendedClient } from '../../classes/ExtendedClient.js';

export default async function registerCommands(client: ExtendedClient): Promise<void> {
  try {
    client.commandsRegistered = false;
    const env = loadEnv();
    const builders = await loadCommands(client);

    if (builders.length === 0) {
      logger.warn('No commands to register');
      client.commandsRegistered = true;
      return;
    }

    const commandsJSON = builders.map((b) => b.toJSON());
    const rest = new REST().setToken(env.DISCORD_TOKEN);
    const clientId = client.user?.id;

    if (!clientId) {
      logger.error('Client user ID not available — cannot register commands');
      client.commandsRegistered = true;
      return;
    }

    if (env.GUILD_ID) {
      // Guild-scoped registration (instant, dev mode)
      await rest.put(Routes.applicationGuildCommands(clientId, env.GUILD_ID), {
        body: commandsJSON,
      });
      logger.info(
        { count: builders.length, scope: 'guild', guildId: env.GUILD_ID },
        'Registered commands'
      );
      client.commandsRegistered = true;
    } else {
      // Global registration (up to 1hr propagation, production)
      await rest.put(Routes.applicationCommands(clientId), {
        body: commandsJSON,
      });
      logger.info(
        { count: builders.length, scope: 'global' },
        'Registered commands'
      );
      client.commandsRegistered = true;
    }
  } catch (error) {
    logger.error({ error }, 'Failed to register commands');
    client.commandsRegistered = true;
    // Don't crash the bot — it can still function without command updates
  }
}
