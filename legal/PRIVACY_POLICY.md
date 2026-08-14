# Privacy Policy

**Service:** Zep Bot (the "Bot")
**Effective date:** 2026-08-14
**Contact:** [GitHub Issues](https://github.com/wbrous/leetcode-discord-bot/issues)

This Privacy Policy explains what data the Bot collects, why, how it's
stored, who it's shared with, and how you can have it removed. It applies
only to the Bot's own systems — it does not cover Discord's own data
practices, which are governed by
[Discord's Privacy Policy](https://discord.com/privacy).

## 1. Data We Collect

The Bot only collects data you or your server explicitly provide by running
the `/setup` command or by using the buttons and modals on the daily problem
card (**Submit**, **Inc/Dec Difficulty**, **Give Up**). We do not read
message history, do not log message content outside of what's described
below, and do not collect analytics or tracking data.

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

### 1.3 Problem submissions and difficulty feedback

When you use the daily problem card's **Submit**, **Inc/Dec Difficulty**, or
**Give Up** buttons, we store one record per event, keyed to your Discord
user ID:

| Field | Description |
|---|---|
| Discord user ID | Used to attribute each record to you. |
| Problem identifier (slug, title, date) | Which daily problem the feedback is about. |
| Event type | Whether the record is a code submission, an Inc/Dec Difficulty request, or a Give Up. |
| Self-reported difficulty | Your rating from the Submission modal (`Piece of cake` … `How do people even do these!?!?`). |
| Requested direction | `Increase` or `Decrease`, from the Inc/Dec Difficulty modal. |
| Compressed summary | A one-sentence model-written summary of your feedback (e.g. "solved quickly with sliding window, wants more multi-step reasoning"). Raw free-text you type in the Inc/Dec Difficulty modal is **never stored verbatim** — only this condensed summary is kept. |
| Code attachment | The file you upload in the Submission modal, stored as a Discord-hosted attachment URL and filename. |

These records form your personalization history: they are fed back into the
AI that writes your future daily problem cards so the difficulty can track
you (see Sections 2 and 3).

### 1.4 What we do not collect

We do not collect message content outside the `/setup` and daily-card modals
described above, do not collect emails, IP addresses, device identifiers, or
payment information, and do not use the data collected for advertising or
sell it to any third party.

## 2. How We Use Your Data

Stored data is used solely to:

- Determine when your (or your guild's) daily reminder is due, based on your
  configured timezone and send time.
- Deliver that reminder — as a Discord DM (per-user) or a message in your
  configured channel (per-guild) — containing that day's LeetCode Daily
  Challenge as an interactive problem card.
- Personalize your daily problem card (description, difficulty tier,
  statement, and examples) from your AI personalization prompt and your
  accumulated submission/feedback history.
- Generate the one-line compressed summaries described in Section 1.3.
- Prevent sending you more than one reminder per local calendar day.

## 3. Third-Party Sharing

We share the minimum data necessary with the following third parties to
provide the service:

| Third party | What's sent | Why | When |
|---|---|---|---|
| **LeetCode daily-problem data source** (`leetcode-api`, an internal proxy for LeetCode's public daily challenge) | Nothing user-identifying — only a request for today's public daily problem (and, when personalizing, the problem's statement, test cases, hints, and official solution). | To source the problem content included in your card. | Once per dispatch tick that has at least one due reminder, and when a personalized card is generated. |
| **OpenCode ("Go") AI service** | For card generation: your AI personalization prompt text, the day's problem statement/test cases/hints/official solution, and your compressed feedback history (one-line summaries only — never raw free-text or your code). For feedback compression: your rating/requested direction, your free-text details, and the problem title. **No Discord user ID, username, or other identifying information is included in these requests.** | To generate your personalized problem card and the compressed summary stored per Section 1.3. | When a personalized card is generated for you (DM reminders or `/daily` in a DM), or when you submit feedback via the daily card's modals. Never for guild reminders (shared cards are not personalized). |
| **Discord** | Standard Discord API calls to deliver your DM or post to your configured channel, plus the code file you upload in the Submission modal (hosted on Discord's CDN; the Bot stores only the resulting attachment URL and filename). | Required to deliver the card and to store your submitted code. | Every time a reminder is dispatched and every time you submit code. |

If you do not set an AI personalization prompt and have no feedback history,
no data is ever sent to the AI provider. Sending data to LeetCode's public
daily-problem source cannot be disabled, as it's required for the Bot's core
function, but that request carries no data about you.

## 4. Data Storage and Retention

Configuration data is stored in a PostgreSQL database operated by the Bot's
developer, accessible only to the developer for operating and debugging the
Bot. Configuration data is retained for as long as your DM configuration or
your guild's configuration exists, and is deleted when:

- You press the **Clear** button in the `/setup` panel — in DMs this deletes
  your personal configuration; in a guild (requires the **Manage Server**
  permission) it deletes the server's configuration immediately (see
  Section 6).
- You explicitly clear a field (e.g. submitting an empty AI personalization
  prompt clears it immediately).
- You or an administrator request deletion (see Section 6).
- The developer performs routine data cleanup for accounts/guilds that have
  removed the Bot or gone inactive for an extended period.

Your submission/feedback history (Section 1.3) is retained to personalize
future problems and is not deleted by the `/setup` **Clear** button; it is
deleted on request (see Section 6) or as part of routine cleanup for
inactive accounts.

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
- **Delete your entire configuration** by pressing the **Clear** button in
  the `/setup` panel — in DMs this deletes your personal configuration; in a
  guild (requires the **Manage Server** permission) it deletes the server's
  configuration. A guild clear does not delete your personal DM
  configuration, and vice versa. Deletion is immediate and cannot be undone.
- **Delete your submission/feedback history** by contacting the developer via
  [GitHub Issues](https://github.com/wbrous/leetcode-discord-bot/issues); all
  records keyed to your Discord user ID (Section 1.3) are removed.
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
