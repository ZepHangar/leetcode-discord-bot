import { type Interaction, MessageFlags } from 'discord.js';
import { logger } from '../../lib/logger.js';
import type { ExtendedClient } from '../../classes/ExtendedClient.js';

export default async function handleCommands(
  client: ExtendedClient,
  interaction: Interaction
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const category = interaction.commandName;
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();
  const commandKey = group ? `${group}.${sub}` : sub;
  const command = client.getCommand(category, commandKey);

  if (client.guildOnlyCategories.has(category) && !interaction.guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const requiredBotPerms = client.categoryBotPermissions.get(category);
  if (requiredBotPerms?.length && interaction.guild) {
    const botMember = interaction.guild.members.me;
    if (botMember) {
      const missing = botMember.permissions.missing(requiredBotPerms);
      if (missing.length > 0) {
        const formatted = missing.map((p) => `**${p}**`).join(', ');
        await interaction.reply({
          content: `❌ I'm missing required permissions: ${formatted}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }
  }

  if (!command) {
    logger.warn({ category, group, sub, commandKey }, 'Unknown command');
    await interaction.reply({
      content: 'Unknown command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error({ error, category, group, sub, commandKey }, 'Command execution failed');
    const reply = {
      content: 'Something went wrong while executing this command.',
      flags: MessageFlags.Ephemeral,
    } as const;

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
