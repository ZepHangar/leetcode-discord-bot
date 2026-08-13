import {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandSubcommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import type { Command } from '../../types/command.js';
import type { CV2MessageOptions } from '../../cv2/index.js';
import { buildCustomId } from '../../utils/customId.js';
import { isValidTimeString, isValidTimezone } from '../../utils/setupValidation.js';
import {
  deleteGuildSetup,
  deleteUserSetup,
  getGuildSetup,
  getUserSetup,
  setGuildChannel,
  setGuildSchedule,
  setUserAiPrompt,
  setUserSchedule,
} from '../../services/setupService.js';

export const data = new SlashCommandSubcommandBuilder()
  .setName('setup')
  .setDescription('Configure daily LeetCode reminders');

const NO_MANAGE_GUILD_REPLY = {
  content: '❌ You need the Manage Server permission to use this here.',
  flags: MessageFlags.Ephemeral,
} as const;

type PanelInteraction = ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction;

async function buildPanel(interaction: PanelInteraction): Promise<CV2MessageOptions> {
  const guildCtx = interaction.inGuild();

  if (guildCtx) {
    const guild = await getGuildSetup(interaction.guildId!);
    const hasChannel = !!guild?.channelId;
    const hasTime = !!(guild?.timezone && guild?.sendTime);

    return (
      <message ephemeral>
        <container>
          <text-display>## LeetCode Daily Setup{'\n'}Configure this server's daily LeetCode reminder.</text-display>
          <text-display>
            **Channel:** {hasChannel ? `<#${guild!.channelId}>` : 'Not set'}
          </text-display>
          <row>
            <button
              style={hasChannel ? 'danger' : 'success'}
              customId={buildCustomId('setup', 'setup', 'channel')}
              label={hasChannel ? 'Overwrite' : 'Set'}
            />
          </row>
          <text-display>
            **Schedule:** {hasTime ? `${guild!.sendTime} ${guild!.timezone}` : 'Not set'}
          </text-display>
          <row>
            <button
              style={hasTime ? 'danger' : 'success'}
              customId={buildCustomId('setup', 'setup', 'time')}
              label={hasTime ? 'Overwrite' : 'Set'}
            />
          </row>
          <text-display>**AI Personalization:** Coming soon</text-display>
          <row>
            <button
              style="secondary"
              customId={buildCustomId('setup', 'setup', 'ai-disabled')}
              label="Coming soon"
              disabled
            />
          </row>
          <text-display>**Clear:** Permanently delete this server's reminder configuration</text-display>
          <row>
            <button
              style="danger"
              disabled={!guild}
              customId={buildCustomId('setup', 'setup', 'clear')}
              label="Clear"
            />
          </row>
        </container>
      </message>
    );
  }

  const user = await getUserSetup(interaction.user.id);
  const hasAi = !!user?.aiPrompt;
  const hasTime = !!(user?.timezone && user?.sendTime);

  return (
    <message ephemeral>
      <container>
        <text-display>## LeetCode Daily Setup{'\n'}Configure your personal daily LeetCode reminder.</text-display>
        <text-display>
          **Schedule:** {hasTime ? `${user!.sendTime} ${user!.timezone}` : 'Not set'}
        </text-display>
        <row>
          <button
            style={hasTime ? 'danger' : 'success'}
            customId={buildCustomId('setup', 'setup', 'time')}
            label={hasTime ? 'Overwrite' : 'Set'}
          />
        </row>
        <text-display>**AI Personalization:** {hasAi ? 'Set' : 'Not set'}</text-display>
        <row>
          <button
            style={hasAi ? 'danger' : 'success'}
            customId={buildCustomId('setup', 'setup', 'ai')}
            label={hasAi ? 'Overwrite' : 'Set'}
          />
        </row>
        <text-display>**Clear:** Permanently delete your personal reminder configuration</text-display>
        <row>
          <button
            style="danger"
            disabled={!user}
            customId={buildCustomId('setup', 'setup', 'clear')}
            label="Clear"
          />
        </row>
      </container>
    </message>
  );
}

/**
 * Confirmation step for the Clear button. Cancel returns to the normal setup
 * page; Confirm wipes the row the panel was opened for.
 *
 * @param guildCtx true when the panel is a guild (server) setup page.
 * @postcondition Message renders exactly Cancel (`clear-cancel`) and Confirm
 *   (`clear-confirm`) buttons; nothing is deleted by rendering it.
 */
export function buildClearConfirmView(guildCtx: boolean): CV2MessageOptions {
  const title = guildCtx ? 'Clear server setup' : 'Clear personal setup';
  const body = guildCtx
    ? "This permanently deletes this server's reminder configuration (channel and schedule). This cannot be undone."
    : 'This permanently deletes your personal reminder configuration (schedule and AI prompt). This cannot be undone.';

  return (
    <message ephemeral>
      <container>
        <text-display>## {title}{'\n'}{body}</text-display>
        <row>
          <button
            style="secondary"
            customId={buildCustomId('setup', 'setup', 'clear-cancel')}
            label="Cancel"
          />
          <button
            style="danger"
            customId={buildCustomId('setup', 'setup', 'clear-confirm')}
            label="Confirm"
          />
        </row>
      </container>
    </message>
  );
}

/**
 * Result state shown after Confirm wipes the row.
 *
 * @param guildCtx true when the panel was a guild (server) setup page.
 * @postcondition Guild clear tells the admin their personal DM configuration was
 *   not touched (a guild wipe only deletes the server's row).
 */
export function buildClearedView(guildCtx: boolean): CV2MessageOptions {
  const title = guildCtx ? 'Server setup cleared' : 'Personal setup cleared';
  const body = guildCtx
    ? "This server's reminder configuration has been deleted.\nNote: your personal DM setup was not touched and remains active."
    : 'Your personal reminder configuration has been deleted.';

  return (
    <message ephemeral>
      <container>
        <text-display>## {title}{'\n'}{body}</text-display>
        <row>
          <button
            style="secondary"
            customId={buildCustomId('setup', 'setup', 'clear-done')}
            label="Back to setup"
          />
        </row>
      </container>
    </message>
  );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.inGuild() && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply(NO_MANAGE_GUILD_REPLY);
    return;
  }
  await interaction.reply(await buildPanel(interaction));
}

const buttons: Command['buttons'] = {
  channel: async (interaction) => {
    if (interaction.inGuild() && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply(NO_MANAGE_GUILD_REPLY);
      return;
    }
    await setGuildChannel(interaction.guildId!, interaction.channelId);
    await interaction.update(await buildPanel(interaction));
  },

  time: async (interaction) => {
    const existing = interaction.inGuild()
      ? await getGuildSetup(interaction.guildId!)
      : await getUserSetup(interaction.user.id);

    const timeInput = new TextInputBuilder()
      .setCustomId('time')
      .setLabel('Time (24h, HH:MM)')
      .setStyle(TextInputStyle.Short)
      .setMinLength(5)
      .setMaxLength(5)
      .setPlaceholder('14:30');
    if (existing?.sendTime) timeInput.setValue(existing.sendTime);

    const timezoneInput = new TextInputBuilder()
      .setCustomId('timezone')
      .setLabel('Timezone (IANA, e.g. America/New_York)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(64)
      .setPlaceholder('America/New_York');
    if (existing?.timezone) timezoneInput.setValue(existing.timezone);

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('setup', 'setup', 'time'))
      .setTitle('Set Daily Schedule')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(timezoneInput)
      );

    await interaction.showModal(modal);
  },

  ai: async (interaction) => {
    if (interaction.inGuild()) {
      await interaction.reply({
        content: 'AI personalization for servers is coming soon.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existing = await getUserSetup(interaction.user.id);
    const promptInput = new TextInputBuilder()
      .setCustomId('prompt')
      .setLabel('How should reminders sound?')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(false)
      .setPlaceholder('e.g. Keep it upbeat and use a pirate voice');
    if (existing?.aiPrompt) promptInput.setValue(existing.aiPrompt);

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('setup', 'setup', 'ai'))
      .setTitle('Set AI Personalization')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(promptInput));

    await interaction.showModal(modal);
  },

  clear: async (interaction) => {
    if (interaction.inGuild() && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply(NO_MANAGE_GUILD_REPLY);
      return;
    }

    const hasData = interaction.inGuild()
      ? !!(await getGuildSetup(interaction.guildId!))
      : !!(await getUserSetup(interaction.user.id));
    if (!hasData) {
      // Row already gone (e.g. a prior clear) — show the current panel.
      await interaction.update(await buildPanel(interaction));
      return;
    }

    await interaction.update(buildClearConfirmView(interaction.inGuild()));
  },

  'clear-cancel': async (interaction) => {
    await interaction.update(await buildPanel(interaction));
  },

  'clear-confirm': async (interaction) => {
    if (interaction.inGuild()) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply(NO_MANAGE_GUILD_REPLY);
        return;
      }
      await deleteGuildSetup(interaction.guildId!);
    } else {
      await deleteUserSetup(interaction.user.id);
    }
    await interaction.update(buildClearedView(interaction.inGuild()));
  },

  'clear-done': async (interaction) => {
    await interaction.update(await buildPanel(interaction));
  },
};

const modals: Command['modals'] = {
  time: async (interaction) => {
    const time = interaction.fields.getTextInputValue('time').trim();
    const timezone = interaction.fields.getTextInputValue('timezone').trim();

    if (!isValidTimeString(time)) {
      await interaction.reply({
        content: '⏰ Time must be 24h HH:MM, e.g. 09:30 or 21:00.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!isValidTimezone(timezone)) {
      await interaction.reply({
        content:
          '🌍 Unrecognized IANA timezone. Use a canonical name like America/New_York or Europe/London (not CST/PST/etc).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.inGuild()) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply(NO_MANAGE_GUILD_REPLY);
        return;
      }
      await setGuildSchedule(interaction.guildId!, timezone, time);
    } else {
      await setUserSchedule(interaction.user.id, timezone, time);
    }

    if (interaction.isFromMessage()) {
      await interaction.update(await buildPanel(interaction));
    } else {
      await interaction.reply(await buildPanel(interaction));
    }
  },

  ai: async (interaction) => {
    if (interaction.inGuild()) return;

    const prompt = interaction.fields.getTextInputValue('prompt').trim();
    await setUserAiPrompt(interaction.user.id, prompt.length > 0 ? prompt : null);

    if (interaction.isFromMessage()) {
      await interaction.update(await buildPanel(interaction));
    } else {
      await interaction.reply(await buildPanel(interaction));
    }
  },
};

export default { data, execute, buttons, modals } satisfies Command;
