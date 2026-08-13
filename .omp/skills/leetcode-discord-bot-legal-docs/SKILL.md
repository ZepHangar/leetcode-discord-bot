---
name: leetcode-discord-bot-legal-docs
description: "Use when creating or updating legal/TERMS_OF_SERVICE.md or legal/PRIVACY_POLICY.md for leetcode-discord-bot's Discord bot verification, or when the bot's data model/third-party integrations change and these docs need to stay in sync."
---

## Where

`legal/` at repo root: `TERMS_OF_SERVICE.md`, `PRIVACY_POLICY.md`, `README.md` (index). Created on branch `legal/tos-privacy-policy`, PR #2.

## Principle

Ground every clause in the actual data model and code — never generic boilerplate. Before writing/updating, re-read:
- `bot/prisma/schema.prisma` for exactly which fields are stored (currently `UserSetup`: discordUserId, timezone, sendTime, aiPrompt, lastSentDate; `GuildSetup`: guildId, channelId, timezone, sendTime, aiPrompt (unused), lastSentDate).
- Every outbound `fetch`/third-party call in `bot/src/lib/` and `bot/src/services/` to document exactly what's sent to whom (e.g. `leetcodeApi.ts` sends nothing identifying; `aiPersonalizationService.ts` sends the user's free-text prompt + problem title/difficulty to OpenCode Go, but never a Discord ID).

## Structure that worked

- ToS: acceptance, service description, eligibility, user content (flag any free-text field users submit, e.g. AI prompts), acceptable use, availability/no-warranty/liability disclaimers, termination, contact.
- Privacy Policy: a table of exactly what's stored per data model, a table of third-party sharing (who / what's sent / why / when), retention, and a concrete "your rights" section mapped to actual UI actions (e.g. "clear your AI prompt by resubmitting the modal empty" — not a vague "contact us to opt out").

## Known gaps to flag when updating

- Contact channel is GitHub Issues (no dedicated support email/domain yet) — call this out explicitly in the PR body so the user can swap it before submitting to Discord verification.
- Governing-law clause is intentionally generic ("jurisdiction in which the developer resides") — user needs to fill in their actual jurisdiction.
- If a new data field, new third-party call, or new opt-in feature (e.g. guild-level AI personalization) ships, the Privacy Policy tables and the ToS "User Content" section must be updated in the same PR — do not let the docs drift from the schema/services.

## Workflow

Same as any other change here: branch off `main` (e.g. `legal/<slug>`), commit with a long descriptive body, push, open a PR via `xd://github pr_create` — do not merge or push directly to `main`.
