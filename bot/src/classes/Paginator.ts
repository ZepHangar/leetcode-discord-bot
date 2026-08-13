import { MessageFlags } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type EmbedBuilder,
  type ButtonInteraction,
} from 'discord.js';
import { buildPaginatorId, parsePaginatorId } from '../utils/customId.js';
import type { ExtendedClient } from './ExtendedClient.js';

export class Paginator {
  static createReply(
    embeds: EmbedBuilder[],
    commandKey: string,
    page: number = 0
  ): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
    const totalPages = embeds.length;
    const currentEmbed = embeds[page]!;

    currentEmbed.setFooter({ text: `Page ${page + 1}/${totalPages}` });

    if (totalPages <= 1) {
      return { embeds: [currentEmbed], components: [] };
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildPaginatorId(commandKey, page - 1))
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(buildPaginatorId(commandKey, page + 1))
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1)
    );

    return { embeds: [currentEmbed], components: [row] };
  }

  static async handleButton(
    interaction: ButtonInteraction,
    client: ExtendedClient
  ): Promise<void> {
    const parsed = parsePaginatorId(interaction.customId);

    if (!parsed) {
      await interaction.reply({
        content: 'This paginator is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { commandKey, page } = parsed;
    const [category, commandName] = commandKey.split(':');

    if (!category || !commandName) {
      await interaction.reply({
        content: 'This paginator is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const command = client.getCommand(category, commandName);

    if (!command?.paginate) {
      await interaction.reply({
        content: 'This paginator is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { embed, totalPages } = await command.paginate(page, interaction);

    embed.setFooter({ text: `Page ${page + 1}/${totalPages}` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildPaginatorId(commandKey, page - 1))
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(buildPaginatorId(commandKey, page + 1))
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1)
    );

    const components = totalPages <= 1 ? [] : [row];

    await interaction.update({ embeds: [embed], components });
  }
}
