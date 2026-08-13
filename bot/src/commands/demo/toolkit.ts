/**
 * Kitchen-sink template command — `/demo toolkit` demonstrates every router
 * feature in one file. Each section is commented with what it demonstrates
 * and where its handler lives. Copy the pieces you need into real commands.
 *
 * Demonstrated:
 * - `buttons`    — plain router buttons with customId args (counter +1/−1)
 * - `modals`     — opening a modal from a button, handling its submit
 * - `selectMenus`— (used implicitly by showcase; here the managed path instead)
 * - `select`     — managed StringSelectMenu via the StringSelectMenu helper class
 * - `paginate`   — restart-safe pagination via the Paginator helper class
 * - `autocomplete` — string option autocomplete on `color`
 */
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  SlashCommandSubcommandBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Paginator } from '../../classes/Paginator.js';
import { StringSelectMenu } from '../../classes/StringSelectMenu.js';
import { buildCustomId } from '../../utils/customId.js';
import type { Command, PaginatorPage } from '../../types/command.js';

const COMMAND_KEY = 'demo:toolkit';

/** Autocomplete source for the `color` option. */
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;

/** Counter demo state, keyed by message id. Demo-scoped; restart-unsafe by design. */
const counters = new Map<string, { count: number; color: string }>();

const PAGE_TITLES = ['First page', 'Second page', 'Third page'];

/**
 * Build the three demo pages. Demonstrates: static page content for the
 * paginator — real commands would re-query data here for restart-safety.
 */
function buildPages(): EmbedBuilder[] {
  return PAGE_TITLES.map((title, index) =>
    new EmbedBuilder().setTitle(title).setDescription(`This is page ${index + 1} of ${PAGE_TITLES.length}.`)
  );
}

/** The counter embed shown by the main reply. */
function counterEmbed(count: number, color: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Toolkit counter')
    .setDescription(`Count: **${count}**\nChosen color: \`${color}\``);
}

export const data = new SlashCommandSubcommandBuilder()
  .setName('toolkit')
  .setDescription('Kitchen-sink demo of every interaction-router feature')
  .addStringOption((option) =>
    option
      .setName('color')
      .setDescription('Favorite color (demonstrates autocomplete)')
      .setAutocomplete(true)
  );

/**
 * Demonstrates: replying with plain router buttons (customIds carry args) and
 * a managed StringSelectMenu row in one ephemeral message.
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const color = interaction.options.getString('color') ?? 'none';

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('demo', 'toolkit', 'count', '1'))
      .setLabel('Counter +1')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(buildCustomId('demo', 'toolkit', 'count', '-1'))
      .setLabel('Counter -1')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildCustomId('demo', 'toolkit', 'modal'))
      .setLabel('Open modal')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildCustomId('demo', 'toolkit', 'pages'))
      .setLabel('Pages')
      .setStyle(ButtonStyle.Secondary)
  );

  const selectRow = StringSelectMenu.create(
    [
      new StringSelectMenuOptionBuilder().setLabel('Alpha').setValue('alpha'),
      new StringSelectMenuOptionBuilder().setLabel('Beta').setValue('beta'),
    ],
    'demo',
    'toolkit',
    'pick'
  );

  const response = await interaction.reply({
    embeds: [counterEmbed(0, color)],
    components: [buttonRow, selectRow],
    flags: MessageFlags.Ephemeral,
    withResponse: true,
  });
  const messageId = response.resource?.message?.id;
  if (messageId) counters.set(messageId, { count: 0, color });
}

/** Demonstrates: plain router buttons. The delta travels as a customId arg. */
export const buttons: NonNullable<Command['buttons']> = {
  count: async (interaction, args) => {
    const delta = Number(args[0] ?? '0');
    const entry = counters.get(interaction.message.id) ?? { count: 0, color: 'none' };
    entry.count += delta;
    counters.set(interaction.message.id, entry);
    await interaction.update({ embeds: [counterEmbed(entry.count, entry.color)] });
  },
  // Demonstrates: opening a modal from a button. Handler for its submit lives in `modals.echo`.
  modal: async (interaction) => {
    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('demo', 'toolkit', 'echo'))
      .setTitle('Echo modal')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('echo-input')
            .setLabel('Say something')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    await interaction.showModal(modal);
  },
  // Demonstrates: switching a message into paginator view. Prev/next then route to `paginate`.
  pages: async (interaction) => {
    await interaction.update(Paginator.createReply(buildPages(), COMMAND_KEY));
  },
};

/** Demonstrates: modal submit handlers, keyed by the modal customId's action segment. */
export const modals: NonNullable<Command['modals']> = {
  echo: async (interaction) => {
    const text = interaction.fields.getTextInputValue('echo-input');
    await interaction.reply({ content: `You said: ${text}`, flags: MessageFlags.Ephemeral });
  },
};

/**
 * Demonstrates: the managed StringSelectMenu path. `staticArgs` round-trip
 * through the `__sel:` customId; `values` are the user's picks.
 */
export const select: NonNullable<Command['select']> = async (action, values, staticArgs, interaction) => {
  await interaction.reply({
    content: `Picked \`${values.join(', ')}\` via action \`${action}\`.`,
    flags: MessageFlags.Ephemeral,
  });
};

/**
 * Demonstrates: restart-safe pagination. Called by Paginator.handleButton on
 * every prev/next — re-build the page from durable inputs here.
 */
export const paginate: NonNullable<Command['paginate']> = async (page): Promise<PaginatorPage> => {
  const pages = buildPages();
  const clamped = ((page % pages.length) + pages.length) % pages.length;
  return { embed: pages[clamped]!, totalPages: pages.length };
};

/** Demonstrates: string-option autocomplete. Return ≤25 choices, filtered by the focused value. */
export const autocomplete: NonNullable<Command['autocomplete']> = async (
  interaction: AutocompleteInteraction
) => {
  const focused = interaction.options.getFocused().toLowerCase();
  const matches = COLORS.filter((color) => color.startsWith(focused)).slice(0, 25);
  await interaction.respond(matches.map((color) => ({ name: color, value: color })));
};

export default { data, execute, buttons, modals, select, paginate, autocomplete } satisfies Command;
