---
name: leetcode-discord-bot-flat-command-cv2-setup
description: "Use when adding a new bare top-level slash command (no subcommand nesting) to leetcode-discord-bot's commandHandler framework, or when building a cv2 (Components V2) panel command with buttons/modals that must work in both DMs and guilds."
---

## Adding a flat (subcommand-less) top-level command

The framework (`bot/src/handlers/commandHandler.ts`) normally nests every command file under `/category sub`. To get a bare `/foo` instead of `/foo foo`:

1. `bot/src/commands/<name>/_category.ts`:
   ```ts
   export default { flat: true, defaultMemberPermissions: ... } satisfies CategoryConfig;
   ```
   (No `guildOnly` if the command must work in DMs — `defaultMemberPermissions` only hides/restricts it inside guilds, it does not block DMs.)
2. The category folder must contain **exactly one** command file and **no** subfolders — `loadCommands` throws at startup otherwise (fail-fast, not warn-and-skip).
3. `commandHandler.ts` flat-mode branch: skips `builder.addSubcommand(...)`, still does `categoryMap.set(command.data.name, command)`, and overrides the builder's description with the single command's own `data.description`.
4. `handleCommands.ts` / `handleAutocomplete.ts` must use `interaction.options.getSubcommand(false)` (not the throwing unconditional form) and fall back to the category name: `const commandKey = group && sub ? \`${group}.${sub}\` : (sub ?? category);` — flat commands are stored in `categoryMap` under the category name itself.
5. Buttons/modals still route fine unmodified — `interactionRouter.ts` looks up by `category:command:action` customId segments directly (`client.getCommand(category, commandName)`), which already matches for flat commands since `command.data.name === categoryName`.

## Verifying command registration without a real Discord token

`loadCommands` only needs a mock client (no real gateway connection) — importing command files and building `SlashCommandBuilder`s doesn't touch Discord's API:
```ts
class MockClient {
  commands = new Map();
  guildOnlyCategories = new Set();
  categoryBotPermissions = new Map();
  getCommand(cat, sub) { return this.commands.get(cat)?.get(sub); }
}
const builders = await loadCommands(new MockClient());
// inspect builders.find(b => b.name === 'foo').toJSON() for dm_permission,
// default_member_permissions, options.length === 0 (flat has no subcommand options)
```
Write this as a throwaway `.ts` script in `bot/`, run with `bun run <script>.ts`, then delete it — this is the only way to confirm flat-command wiring end-to-end when no `DISCORD_TOKEN` is available.

## cv2 panel commands (buttons/modals, DM + guild dual-scope)

- `<message ephemeral><container>...</container></message>` is the root; `<container>` children must be row/section/text-display/media-gallery/file/separator (no nested container).
- `<button>` styles 1–4 (primary/secondary/success/danger) require `customId` even when `disabled`; `link` requires `url`; `premium` requires `skuId` and forbids label/emoji.
- Green `success` / red `danger` "Set"/"Overwrite" toggle pattern: `style={hasValue ? 'danger' : 'success'}`, `label={hasValue ? 'Overwrite' : 'Set'}`.
- For DM-vs-guild dual behavior in one command file: branch on `interaction.inGuild()` at the top of a shared `buildPanel()` helper, and re-check `ManageGuild` permission defensively inside every guild-scoped button/modal handler (not just `execute`) since `defaultMemberPermissions` only hides the command in Discord's UI, it doesn't enforce anything server-side.
- Modal submit handlers opened from an existing panel message must branch: `if (interaction.isFromMessage()) await interaction.update(panel); else await interaction.reply(panel);`.

## Local Postgres for `prisma migrate dev`

If `bot/.env`/`bot/.env.prod` don't exist yet (check with `ls bot/.env*` first — never overwrite if they already exist), create throwaway ones with placeholder `POSTGRES_*`/`DISCORD_TOKEN` values, `docker compose up -d postgres` from repo root, wait for `healthy` status, then run migration with `DATABASE_URL` pointing at `localhost:5433` (the compose-mapped host port, not the internal `postgres:5432` hostname used by the `bot` service).
