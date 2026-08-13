import path from 'path';
import { getAllFiles } from '../utils/getAllFiles.js';
import { logger } from '../lib/logger.js';
import type { ExtendedClient } from '../classes/ExtendedClient.js';

export async function loadEvents(client: ExtendedClient): Promise<void> {
  const eventsDir = path.join(import.meta.dir, '..', 'events');
  const eventFolders = await getAllFiles(eventsDir, { foldersOnly: true });

  for (const eventFolder of eventFolders) {
    const eventName = path.basename(eventFolder);
    const eventFiles = await getAllFiles(eventFolder, { filesOnly: true });

    if (eventFiles.length === 0) continue;

    const sortedFiles = eventFiles.sort();

    for (const filePath of sortedFiles) {
      const module = await import(filePath);
      const handler = module.default ?? module.execute;

      if (typeof handler !== 'function') {
        throw new Error(
          `Event file ${filePath} does not export a handler function`
        );
      }

      const runtimeEventName = eventName === 'ready' ? 'clientReady' : eventName;

      if (runtimeEventName === 'clientReady') {
        client.once(runtimeEventName, (...args: unknown[]) => handler(client, ...args));
      } else {
        client.on(runtimeEventName, (...args: unknown[]) => handler(client, ...args));
      }
    }

    logger.info({ event: eventName, handlers: sortedFiles.length }, 'Loaded event handlers');
  }
}
