# Zep Bot

A modular Discord bot built with discord.js, TypeScript, and Bun — auto-registers slash commands from the filesystem.

---

## Quick Start

```bash
bun install
cp .env.example .env   # fill in values
bun run dev
```

---

## How to Add a Command

Commands are discovered from the filesystem. Each **folder** in `src/commands/` becomes a slash command group; each **`.ts` file** inside becomes a subcommand.

**1. Create the file:**

```
src/commands/tools/echo.ts
```

**2. Implement the module:**

```ts
import { SlashCommandSubcommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';

const data = new SlashCommandSubcommandBuilder()
  .setName('echo')
  .setDescription('Repeats your message')
  .addStringOption(opt =>
    opt.setName('text').setDescription('Text to echo').setRequired(true)
  );

const execute: Command['execute'] = async interaction => {
  const text = interaction.options.getString('text', true);
  await interaction.reply(text);
};

export default { data, execute } satisfies Command;
```

**3. Restart the bot** — it auto-registers on startup.

The slash command will be available as `/tools echo`.

---

## How to Handle Interactions

Buttons, modals, and select menus are routed via `customId`. Add handlers directly to your command export.

**Build a customId:**

```ts
import { buildCustomId } from '../../utils/customId.js';

// Produces: "tools:echo:confirm:userId"
const id = buildCustomId('tools', 'echo', 'confirm', userId);
```

**Add handlers to the command export:**

```ts
import type { Command } from '../../types/command.js';

export default {
  data,
  execute,

  buttons: {
    confirm: async interaction => {
      // customId was "tools:echo:confirm:<args...>"
      // parsed args are available via parseCustomId(interaction.customId)
      await interaction.reply('Confirmed!');
    },
  },

  modals: {
    inputForm: async interaction => { /* ... */ },
  },

  selectMenus: {
    picker: async interaction => { /* ... */ },
  },
} satisfies Command;
```

The global interaction router parses the customId and calls the matching handler automatically.

---

## How to Add Pagination

**1. Add a `paginate` function to your command:**

```ts
import type { Command } from '../../types/command.js';

const paginate: Command['paginate'] = async (page, args) => {
  // Return the embed for the requested page
  const embed = buildEmbed(page, args);
  return { embed, totalPages: 5 };
};
```

**2. Use `Paginator.createReply` in `execute`:**

```ts
import { Paginator } from '../../classes/Paginator.js';

const execute: Command['execute'] = async interaction => {
  const embeds = await buildAllEmbeds();
  await Paginator.createReply(interaction, embeds, 'tools:echo');
};
```

The paginator renders Previous/Next buttons with customIds scoped to your command. Button presses call your `paginate` function to fetch the correct page.

---

## Environment Variables

| Variable        | Description                              |
|-----------------|------------------------------------------|
| `DISCORD_TOKEN` | Bot token from the Discord Developer Portal |
| `DATABASE_URL`  | Prisma-compatible database connection string |
| `GUILD_ID`      | Guild ID for command registration (dev)  |
| `LOG_LEVEL`     | Pino log level (`info`, `debug`, `warn`, `error`) |
| `LEETCODE_API_URL` | Internal leetcode-api service URL (default: `http://leetcode-api:3000`) |
| `OPENCODE_API_KEY` | OpenCode Go API key; leave empty to disable AI personalization |
| `OPENCODE_GO_MODEL` | OpenCode Go model (default: `deepseek-v4-flash`) |

---

## Scripts

| Script         | Description                              |
|----------------|------------------------------------------|
| `bun run dev`  | Start with hot reload                    |
| `bun run start`| Production start                         |
| `bun run build`| Compile TypeScript                       |
| `bun run db:generate` | Regenerate Prisma client          |
| `bun run db:push`     | Push schema changes to database   |
