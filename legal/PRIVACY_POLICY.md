# Privacy Policy

**Service:** Zep Bot (the "Bot")
**Effective date:** 2026-08-13
**Contact:** [GitHub Issues](https://github.com/wbrous/leetcode-discord-bot/issues)

This Privacy Policy explains what data the Bot collects, why, how it's
stored, who it's shared with, and how you can have it removed. It applies
only to the Bot's own systems — it does not cover Discord's own data
practices, which are governed by
[Discord's Privacy Policy](https://discord.com/privacy).

## 1. Data We Collect

The Bot only collects data you or your server explicitly provide by running
the `/setup` command. We do not read message history, do not log message
content outside of what's described below, and do not collect analytics or
tracking data.

### 1.1 Direct-message (per-user) configuration

When you run `/setup` in a DM with the Bot, we store, keyed to your Discord
user ID:

| Field | Description |
|---|---|
| Discord user ID | Used as the row's primary key, to know who to DM. |
| Timezone | The IANA timezone you provide (e.g. `America/New_York`), used to compute your local send time. |
| Send time | The `HH:MM` time you provide for daily delivery. |
| AI personalization prompt | Free-text you optionally provide describing how you'd like your reminder to sound (e.g. tone/persona). Optional — omitted unless you set it. |
| Last-sent date | The date your reminder was last delivered, used only to prevent duplicate sends on the same day. |

### 1.2 Guild (server) configuration

When a server administrator (Manage Server permission) runs `/setup` in a
guild, we store, keyed to the guild's Discord ID:

| Field | Description |
|---|---|
| Guild ID | Used as the row's primary key. |
| Channel ID | The channel the daily reminder is posted to (set to the channel `/setup` was run in). |
| Timezone / Send time | Same as above, scoped to the guild's configured schedule. |
| Last-sent date | Same duplicate-prevention purpose as above. |

Guild-scoped AI personalization is not currently exposed in the `/setup`
panel and is not collected.

### 1.3 What we do not collect

We do not collect message content outside the `/setup` modals described
above, do not collect emails, IP addresses, device identifiers, or payment
information, and do not use the data collected for advertising or sell it to
any third party.

## 2. How We Use Your Data

Stored data is used solely to:

- Determine when your (or your guild's) daily reminder is due, based on your
  configured timezone and send time.
- Deliver that reminder — as a Discord DM (per-user) or a message in your
  configured channel (per-guild) — containing that day's LeetCode Daily
  Challenge title, difficulty, and link.
- If you've set an AI personalization prompt, generate a short accompanying
  blurb (see Section 3).
- Prevent sending you more than one reminder per local calendar day.

## 3. Third-Party Sharing

We share the minimum data necessary with the following third parties to
provide the service:

| Third party | What's sent | Why | When |
|---|---|---|---|
| **LeetCode daily-problem data source** (`leetcode-api`, an internal proxy for LeetCode's public daily challenge) | Nothing user-identifying — only a request for today's public daily problem. | To source the problem title/difficulty/link included in your reminder. | Once per dispatch tick that has at least one due reminder. |
| **OpenCode ("Go") AI service** | Your AI personalization prompt text, plus the day's problem title and difficulty. **No Discord user ID, username, or other identifying information is included in this request.** | To generate the personalized blurb accompanying your reminder, if you've opted in. | Only when you've set an AI personalization prompt and a reminder is due for you; never for guild reminders (not yet supported). |
| **Discord** | Standard Discord API calls to deliver your DM or post to your configured channel. | Required to deliver the reminder at all — this is how any Discord bot sends messages. | Every time a reminder is dispatched. |

If you do not set an AI personalization prompt, no data is ever sent to the
AI provider. Sending data to LeetCode's public daily-problem source cannot
be disabled, as it's required for the Bot's core function, but that request
carries no data about you.

## 4. Data Storage and Retention

Configuration data is stored in a PostgreSQL database operated by the Bot's
developer, accessible only to the developer for operating and debugging the
Bot. Data is retained for as long as your DM configuration or your guild's
configuration exists, and is deleted when:

- You explicitly clear a field (e.g. submitting an empty AI personalization
  prompt clears it immediately).
- You or an administrator request deletion (see Section 6).
- The developer performs routine data cleanup for accounts/guilds that have
  removed the Bot or gone inactive for an extended period.

## 5. Data Security

Reasonable technical measures are used to protect stored data, including
running the database on infrastructure not directly exposed to the public
internet and restricting access to the developer. No method of storage or
transmission is 100% secure, and the Bot cannot guarantee absolute security.

## 6. Your Rights and Choices

You can, at any time:

- **View your configuration** by running `/setup` — the current panel state
  reflects exactly what is stored.
- **Overwrite** any field (timezone, send time, or AI prompt) by using the
  corresponding "Overwrite" button.
- **Clear your AI prompt** by resubmitting the AI modal with an empty
  message.
- **Request full deletion** of your stored DM or guild configuration by
  contacting the developer via
  [GitHub Issues](https://github.com/wbrous/leetcode-discord-bot/issues).
  Deletion requests are honored as soon as reasonably possible.
- **Stop all data collection** by removing the Bot from your guild and/or no
  longer interacting with it in DMs; existing configuration remains until
  deleted per the above.

## 7. Children's Privacy

The Bot is not directed at children under the age required by Discord's own
Terms of Service to maintain a Discord account, and we do not knowingly
collect data from users who do not meet that requirement.

## 8. Changes to This Policy

This Privacy Policy may be updated from time to time. Material changes will
be reflected by updating the "Effective date" above and published in this
repository. Continued use of the Bot after changes take effect constitutes
acceptance of the revised policy.

## 9. Contact

Questions about this Privacy Policy, or requests to access or delete your
data, can be raised via
[GitHub Issues](https://github.com/wbrous/leetcode-discord-bot/issues) on
this repository.
