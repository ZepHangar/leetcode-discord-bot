import {
  SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { Command } from '../../types/command.js';

export const data = new SlashCommandSubcommandBuilder()
  .setName('ping')
  .setDescription('Check bot latency');

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const start = Date.now();
  await interaction.deferReply();
  const latency = Date.now() - start;
  const wsLatency = interaction.client.ws.ping;
  await interaction.editReply(
    `🏓 Pong! Roundtrip: ${latency}ms | WebSocket: ${wsLatency}ms`
  );
}

export default { data, execute } satisfies Command;
