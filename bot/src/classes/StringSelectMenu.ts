import { MessageFlags } from 'discord.js';
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  type StringSelectMenuOptionBuilder,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { buildSelectMenuId, parseSelectMenuId } from '../utils/customId.js';
import type { ExtendedClient } from './ExtendedClient.js';

export class StringSelectMenu {
  static create(
    options: StringSelectMenuOptionBuilder[],
    category: string,
    command: string,
    action: string,
    ...staticArgs: string[]
  ): ActionRowBuilder<StringSelectMenuBuilder> {
    if (!category || category.includes(':')) throw new Error(`Invalid category: "${category}"`);
    if (!command || command.includes(':')) throw new Error(`Invalid command: "${command}"`);
    if (!action || action.includes(':')) throw new Error(`Invalid action: "${action}"`);

    const menu = new StringSelectMenuBuilder()
      .setCustomId(buildSelectMenuId(`${category}:${command}`, action, ...staticArgs))
      .addOptions(...options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  }

  static async handleSelect(
    interaction: StringSelectMenuInteraction,
    client: ExtendedClient
  ): Promise<void> {
    const parsed = parseSelectMenuId(interaction.customId);

    if (!parsed) {
      await interaction.reply({
        content: 'This select menu is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { commandKey, action, staticArgs } = parsed;
    const [category, commandName] = commandKey.split(':');

    if (!category || !commandName) {
      await interaction.reply({
        content: 'This select menu is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const command = client.getCommand(category, commandName);

    if (!command?.select) {
      await interaction.reply({
        content: 'This select menu is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await command.select(action, interaction.values, staticArgs, interaction);
  }
}
