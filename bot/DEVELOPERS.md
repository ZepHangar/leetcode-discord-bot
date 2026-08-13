# Developer Reference

---

## Architecture Overview

```
bot/src/
├── index.ts                          # Entry point — creates client, loads handlers, logs in
├── types/
│   └── command.ts                    # Command interface, PaginatorPage type
├── classes/
│   ├── ExtendedClient.ts             # Extends Client with commands Map
│   └── Paginator.ts                  # Stateless pagination utility
├── handlers/
│   ├── eventHandler.ts               # Dynamic folder-based event loader
│   ├── commandHandler.ts             # Scans category folders, builds SlashCommandBuilders
│   └── interactionRouter.ts          # Parses customIds, routes to command interaction handlers
├── commands/
│   └── info/
│       ├── help.ts                   # Auto-generated paginated help
│       └── ping.ts                   # Latency check
├── events/
│   ├── ready/
│   │   ├── 01registerCommands.ts     # Bulk PUT command registration
│   │   └── consoleLog.ts             # Log bot online
│   └── interactionCreate/
│       ├── handleCommands.ts         # Route slash commands
│       └── handleInteractions.ts     # Route buttons/modals/selects via customId
├── lib/
│   ├── logger.ts                     # pino logger
│   ├── prisma.ts                     # Prisma client singleton
│   └── env.ts                        # Environment variable validation
└── utils/
    ├── getAllFiles.ts                 # Async recursive file/folder listing
    └── customId.ts                   # CustomId build/parse helpers
```

---

## Command Lifecycle

```
src/commands/<category>/<name>.ts
        │
        ▼
commandHandler.ts
  getAllFiles(commandsDir)           → collect all .ts files
  group by parent folder            → category = folder name
  new SlashCommandBuilder()
    .setName(category)
    .addSubcommand(file.data)       → attach each subcommand
  client.commands.set(key, module)  → key = "category:name"
        │
        ▼
01registerCommands.ts (ready event)
  REST.put(Routes.applicationGuildCommands)
  → bulk-registers all built SlashCommandBuilders
        │
        ▼
handleCommands.ts (interactionCreate event)
  interaction.commandName + interaction.options.getSubcommand()
  → look up client.commands.get("category:name")
  → call module.execute(interaction)
```

---

## Interaction Lifecycle

Buttons, modals, and select menus all share the same routing path.

**CustomId format:** `category:command:action[:arg1:arg2:...]`

```
User triggers button/modal/select
        │
        ▼
handleInteractions.ts (interactionCreate event)
  detect interaction type (isButton / isModalSubmit / isAnySelectMenu)
        │
        ▼
interactionRouter.ts
  parseCustomId(interaction.customId)
  → { category, command, action, args }
  client.commands.get("category:command")
  → module.buttons[action](interaction)
     module.modals[action](interaction)
     module.selectMenus[action](interaction)
```

**Building customIds:**

```ts
import { buildCustomId, parseCustomId } from '../utils/customId.js';

const id = buildCustomId('info', 'help', 'page', '2');
// → "info:help:page:2"

const { category, command, action, args } = parseCustomId(id);
// → { category: 'info', command: 'help', action: 'page', args: ['2'] }
```

---

## Paginator Lifecycle

`Paginator` is stateless — page state lives in the button's customId.

```
execute()
  Paginator.createReply(interaction, embeds, 'category:command')
  → renders embed[0] with Prev/Next buttons
  → button customIds: "category:command:page:0", "category:command:page:1", ...
        │
        ▼
User clicks Prev/Next
        │
        ▼
interactionRouter.ts routes to Paginator's internal button handler
  parsePaginatorId(customId)  → { commandKey, page }
  client.commands.get(commandKey).paginate(page, args)
  → returns { embed, totalPages }
  interaction.update({ embeds: [embed], components: [newRow] })
```

The `paginate` function on a command is only required if you need dynamic/lazy page loading. For static embeds, `Paginator.createReply` handles everything.

---

## Conventions

**Runtime & modules**
- Bun runtime, ESM only — all imports use `.js` extensions (even for `.ts` sources)
- `import.meta.dir` instead of `__dirname`
- Async file operations via `getAllFiles` (never sync `fs` calls in hot paths)

**TypeScript**
- No `any` — use `unknown` and narrow, or define proper types
- All command modules must use `satisfies Command` on the default export
- The `Command` interface is the single source of truth for what a command module can export

**Logging**
- Use the pino logger from `lib/logger.ts` — never `console.log` in production paths
- Log levels: `debug` for trace-level detail, `info` for lifecycle events, `warn`/`error` for problems

**Error handling**
- Interaction handlers should catch and reply with an ephemeral error message rather than letting the process crash
- Environment validation happens at startup via `lib/env.ts` — missing vars throw immediately

**Database**
- Import the Prisma singleton from `lib/prisma.ts` — never instantiate `PrismaClient` directly
