import { MessageFlags } from 'discord.js';
import type {
  AnySelectMenuInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import type { ParsedCustomId } from '../types/command.js';
import { parseCustomId, isPaginatorId, isSelectMenuId } from '../utils/customId.js';
import { Paginator } from '../classes/Paginator.js';
import { StringSelectMenu } from '../classes/StringSelectMenu.js';
import { logger } from '../lib/logger.js';
import type { ExtendedClient } from '../classes/ExtendedClient.js';

type RoutableInteraction =
  | ButtonInteraction
  | ModalSubmitInteraction
  | AnySelectMenuInteraction;

export async function routeInteraction(
  client: ExtendedClient,
  interaction: RoutableInteraction
): Promise<void> {
  const { customId } = interaction;

  if (interaction.isButton() && isPaginatorId(customId)) {
    await Paginator.handleButton(interaction, client);
    return;
  }

  if (interaction.isStringSelectMenu() && isSelectMenuId(customId)) {
    try {
      await StringSelectMenu.handleSelect(interaction, client);
    } catch (error) {
      logger.error({ error, customId }, 'StringSelectMenu handler failed');
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Something went wrong.', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.followUp({ content: 'Something went wrong.', flags: MessageFlags.Ephemeral });
      }
    }
    return;
  }

  let parsed: ParsedCustomId;
  try {
    parsed = parseCustomId(customId);
  } catch {
    logger.warn({ customId }, 'Received interaction with malformed customId');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'This interaction is not recognized.',
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  const { category, command: commandName, action, args } = parsed;

  const command = client.getCommand(category, commandName);
  if (!command) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'This interaction is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  try {
    if (interaction.isButton()) {
      const handler = command.buttons?.[action];
      if (!handler) {
        await interaction.reply({
          content: 'This interaction is not handled.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await handler(interaction, args);
    } else if (interaction.isModalSubmit()) {
      const handler = command.modals?.[action];
      if (!handler) {
        await interaction.reply({
          content: 'This interaction is not handled.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await handler(interaction, args);
    } else if (interaction.isAnySelectMenu()) {
      const handler = command.selectMenus?.[action];
      if (!handler) {
        await interaction.reply({
          content: 'This interaction is not handled.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await handler(interaction, args);
    }
  } catch (error) {
    logger.error(
      { error, category, command: commandName, action },
      'Interaction handler failed'
    );
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong.', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.followUp({ content: 'Something went wrong.', flags: MessageFlags.Ephemeral });
    }
  }
}
