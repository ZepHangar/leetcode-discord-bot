import type { Interaction } from 'discord.js';
import { logger } from '../../lib/logger.js';
import type { ExtendedClient } from '../../classes/ExtendedClient.js';

export default async function handleAutocomplete(
  client: ExtendedClient,
  interaction: Interaction
): Promise<void> {
  if (!interaction.isAutocomplete()) return;

  const category = interaction.commandName;
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(false);
  const commandKey = group && sub ? `${group}.${sub}` : (sub ?? category);
  const command = client.getCommand(category, commandKey);

  if (interaction.guildId && !interaction.guild) {
    await interaction.respond([]);
    return;
  }

  if (client.guildOnlyCategories.has(category) && !interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  if (!command?.autocomplete) {
    await interaction.respond([]);
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error({ error, category, group, sub, commandKey }, 'Autocomplete handler failed');
    await interaction.respond([]);
  }
}
