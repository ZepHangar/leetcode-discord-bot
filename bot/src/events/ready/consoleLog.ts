import { logger } from '../../lib/logger.js';
import type { ExtendedClient } from '../../classes/ExtendedClient.js';

export default async function consoleLog(client: ExtendedClient): Promise<void> {
  logger.info(
    { tag: client.user?.tag, guilds: client.guilds.cache.size },
    'Bot is online'
  );
}
