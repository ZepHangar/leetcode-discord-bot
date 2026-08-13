/**
 * Canonical example of router-driven components with the CV2 TSX DSL.
 *
 * Every interactive element carries a `demo:showcase:<action>` customId built
 * with `buildCustomId`; the interaction router parses it and dispatches into
 * the `buttons` / `selectMenus` maps on this command's default export.
 *
 * Session state lives in a module-level Map keyed by reply message id with a
 * 120s TTL — the pending-map TTL pattern: prune-on-access handlers, a timer
 * that disables the card, and no persistence across restarts (by design —
 * this is demo-scoped state, restart-unsafe).
 */
import {
  MessageFlags,
  SlashCommandSubcommandBuilder,
  type AnySelectMenuInteraction,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { buildCustomId } from '../../utils/customId.js';
import type { Command } from '../../types/command.js';
import type { CV2MessageOptions } from '../../cv2/index.js';

/** Mutable demo state shared by every re-render of the showcase card. */
interface DemoState {
  count: number;
  accentColor: number;
  lastAction: string;
  picks: {
    user?: string;
    role?: string;
    mentionable?: string;
    channel?: string;
  };
  /** When true the session expired and every interactive element renders disabled. */
  ended: boolean;
}

const ACCENT_COLORS = [
  { label: 'Green', value: '0x00ff88' },
  { label: 'Blurple', value: '0x5865f2' },
  { label: 'Red', value: '0xed4245' },
  { label: 'Yellow', value: '0xfee75c' },
] as const;

/** Router customIds — parsed by the interaction router into action names. */
const ID = {
  increment: buildCustomId('demo', 'showcase', 'increment'),
  decrement: buildCustomId('demo', 'showcase', 'decrement'),
  refresh: buildCustomId('demo', 'showcase', 'refresh'),
  reset: buildCustomId('demo', 'showcase', 'reset'),
  color: buildCustomId('demo', 'showcase', 'color'),
  user: buildCustomId('demo', 'showcase', 'user'),
  role: buildCustomId('demo', 'showcase', 'role'),
  mentionable: buildCustomId('demo', 'showcase', 'mentionable'),
  channel: buildCustomId('demo', 'showcase', 'channel'),
} as const;

const SESSION_MS = 120_000;

/** Active sessions keyed by reply message id. Restart-unsafe by design (demo scope). */
const sessions = new Map<string, DemoState>();

/** One-line summary of everything picked so far, shown in the card body. */
function pickSummary(state: DemoState): string {
  const entries = [
    state.picks.user !== undefined ? `user ${state.picks.user}` : undefined,
    state.picks.role !== undefined ? `role ${state.picks.role}` : undefined,
    state.picks.mentionable !== undefined ? `mentionable ${state.picks.mentionable}` : undefined,
    state.picks.channel !== undefined ? `channel ${state.picks.channel}` : undefined,
  ].filter((entry) => entry !== undefined);
  return entries.length === 0 ? '-# nothing picked yet — try a select menu' : `-# picked: ${entries.join(' | ')}`;
}

/**
 * Render the showcase card from the current state.
 *
 * @postcondition The result is a valid InteractionReplyOptions/InteractionUpdateOptions:
 *   `{ components, flags }` with the Components V2 flag set.
 */
function renderCard(state: DemoState): CV2MessageOptions {
  const disabled = state.ended;
  return (
    <message ephemeral>
      <container accentColor={state.accentColor}>
        <text-display>## CV2 DSL Showcase</text-display>
        <section
          accessory={<thumbnail url="https://picsum.photos/seed/zep-cv2/256" description="demo thumbnail" />}
        >
          <text-display>{`Counter: **${state.count}**`}</text-display>
          <text-display>{`-# ${state.lastAction}`}</text-display>
        </section>
        <separator spacing="large" />
        <media-gallery>
          <media-item url="https://picsum.photos/seed/zep-a/400" description="demo image A" />
          <media-item url="https://picsum.photos/seed/zep-b/400" description="demo image B" />
        </media-gallery>
        <file url="attachment://cv2-demo-log.txt" />
        <text-display>{pickSummary(state)}</text-display>
        <row>
          <button style="primary" customId={ID.increment} label="Increment" disabled={disabled} />
          <button style="secondary" customId={ID.decrement} label="Decrement" disabled={disabled} />
          <button style="success" customId={ID.refresh} label="Refresh" emoji="🔄" disabled={disabled} />
          <button style="danger" customId={ID.reset} label="Reset" disabled={disabled} />
          <button
            style="link"
            url="https://discord.com/developers/docs/components/reference"
            label="CV2 Docs"
          />
        </row>
        <row>
          <string-select
            customId={ID.color}
            placeholder="Change accent color"
            disabled={disabled}
          >
            {ACCENT_COLORS.map((color) => (
              <option
                label={color.label}
                value={color.value}
                default={state.accentColor === Number(color.value)}
              />
            ))}
          </string-select>
        </row>
        <row>
          <user-select customId={ID.user} placeholder="Pick a user" disabled={disabled} />
        </row>
        <row>
          <role-select customId={ID.role} placeholder="Pick a role" disabled={disabled} />
        </row>
        <row>
          <mentionable-select
            customId={ID.mentionable}
            placeholder="Pick a user or role"
            disabled={disabled}
          />
        </row>
        <row>
          <channel-select customId={ID.channel} placeholder="Pick a channel" disabled={disabled} />
        </row>
      </container>
    </message>
  );
}

/**
 * Look up the session for an interaction's message, or reply that it expired.
 *
 * @postcondition Returns the live state, or null after replying ephemerally.
 */
async function lookupSession(
  interaction: ButtonInteraction | AnySelectMenuInteraction,
): Promise<DemoState | null> {
  const state = sessions.get(interaction.message.id);
  if (!state) {
    await interaction.reply({
      content: 'This demo session expired — run /demo showcase again.',
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
  return state;
}

/**
 * Re-render the card in place after a state mutation.
 *
 * @precondition `state` belongs to `interaction.message`.
 * @postcondition The message shows the updated card; the interaction is acknowledged.
 */
async function rerender(
  interaction: ButtonInteraction | AnySelectMenuInteraction,
  state: DemoState,
): Promise<void> {
  // Updates/edits may only carry SuppressEmbeds | IsComponentsV2 — strip the ephemeral bit.
  const { components } = renderCard(state);
  await interaction.update({ components, flags: MessageFlags.IsComponentsV2 });
}

export const data = new SlashCommandSubcommandBuilder()
  .setName('showcase')
  .setDescription('Interactive Components V2 (TSX DSL) demo');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const state: DemoState = {
    count: 0,
    accentColor: Number(ACCENT_COLORS[0].value),
    lastAction: 'session started',
    picks: {},
    ended: false,
  };

  const response = await interaction.reply({
    ...renderCard(state),
    files: [
      {
        attachment: Buffer.from(`cv2 demo log\nstarted: ${new Date().toISOString()}\n`, 'utf8'),
        name: 'cv2-demo-log.txt',
      },
    ],
    withResponse: true,
  });
  const message = response.resource?.message;
  if (!message) throw new Error('cv2demo: reply did not return a message object');

  sessions.set(message.id, state);

  const timer = setTimeout(() => {
    sessions.delete(message.id);
    state.ended = true;
    const { components } = renderCard(state);
    interaction
      .editReply({ components, flags: MessageFlags.IsComponentsV2 })
      .catch(() => {
        // Session cleanup is best-effort — the message may already be gone.
      });
  }, SESSION_MS);
  // A lingering session must never hold the process open (Bun timers support unref).
  timer.unref?.();
}

/** Button handlers — the router dispatches `demo:showcase:<action>` here by action name. */
export const buttons: NonNullable<Command['buttons']> = {
  increment: async (interaction, _args) => {
    const state = await lookupSession(interaction);
    if (!state) return;
    state.count += 1;
    state.lastAction = `incremented by ${interaction.user.username}`;
    await rerender(interaction, state);
  },
  decrement: async (interaction, _args) => {
    const state = await lookupSession(interaction);
    if (!state) return;
    state.count -= 1;
    state.lastAction = `decremented by ${interaction.user.username}`;
    await rerender(interaction, state);
  },
  refresh: async (interaction, _args) => {
    const state = await lookupSession(interaction);
    if (!state) return;
    state.lastAction = `refreshed at ${new Date().toLocaleTimeString()}`;
    await rerender(interaction, state);
  },
  reset: async (interaction, _args) => {
    const state = await lookupSession(interaction);
    if (!state) return;
    state.count = 0;
    state.lastAction = `reset by ${interaction.user.username}`;
    await rerender(interaction, state);
  },
};

/** Select handlers — routed for every select type (string, user, role, mentionable, channel). */
export const selectMenus: NonNullable<Command['selectMenus']> = {
  color: async (interaction, _args) => {
    if (!interaction.isStringSelectMenu()) return;
    const state = await lookupSession(interaction);
    if (!state) return;
    const value = interaction.values[0];
    state.accentColor = Number(value);
    const label = ACCENT_COLORS.find((color) => color.value === value)?.label ?? value;
    state.lastAction = `accent set to ${label}`;
    await rerender(interaction, state);
  },
  user: async (interaction, _args) => {
    if (!interaction.isUserSelectMenu()) return;
    const state = await lookupSession(interaction);
    if (!state) return;
    state.picks.user = interaction.values.map((id) => `<@${id}>`).join(', ');
    state.lastAction = 'user picked';
    await rerender(interaction, state);
  },
  role: async (interaction, _args) => {
    if (!interaction.isRoleSelectMenu()) return;
    const state = await lookupSession(interaction);
    if (!state) return;
    state.picks.role = interaction.values.map((id) => `<@&${id}>`).join(', ');
    state.lastAction = 'role picked';
    await rerender(interaction, state);
  },
  mentionable: async (interaction, _args) => {
    if (!interaction.isMentionableSelectMenu()) return;
    const state = await lookupSession(interaction);
    if (!state) return;
    state.picks.mentionable = interaction.values
      .map((id) => (interaction.roles.has(id) ? `<@&${id}>` : `<@${id}>`))
      .join(', ');
    state.lastAction = 'mentionable picked';
    await rerender(interaction, state);
  },
  channel: async (interaction, _args) => {
    if (!interaction.isChannelSelectMenu()) return;
    const state = await lookupSession(interaction);
    if (!state) return;
    state.picks.channel = interaction.values.map((id) => `<#${id}>`).join(', ');
    state.lastAction = 'channel picked';
    await rerender(interaction, state);
  },
};

export default { data, execute, buttons, selectMenus } satisfies Command;
