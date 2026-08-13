import type { Interaction } from 'discord.js';
import { routeInteraction } from '../../handlers/interactionRouter.js';
import { logger } from '../../lib/logger.js';
import type { ExtendedClient } from '../../classes/ExtendedClient.js';
import { MessageFlags } from 'discord.js';

export default async function handleInteractions(
  client: ExtendedClient,
  interaction: Interaction
): Promise<void> {
  if (
    !interaction.isButton() &&
    !interaction.isModalSubmit() &&
    !interaction.isAnySelectMenu()
  ) {
    return;
  }

  try {
    await routeInteraction(client, interaction);
  } catch (error) {
    logger.error({ error }, 'Interaction routing failed');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Something went wrong.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
