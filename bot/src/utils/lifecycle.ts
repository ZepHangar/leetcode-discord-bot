import type { ExtendedClient } from '../classes/ExtendedClient.js';

/** Polls until command registration is complete. Used by cron jobs that depend on commands being loaded. */
export async function waitForCommandRegistration(client: ExtendedClient): Promise<void> {
  while (!client.commandsRegistered) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
