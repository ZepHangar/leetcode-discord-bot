# Terms of Service

**Service:** Zep Bot (the "Bot")
**Effective date:** 2026-08-13
**Contact:** [GitHub Issues](https://github.com/wbrous/leetcode-discord-bot/issues)

## 1. Acceptance

By inviting the Bot to a Discord server ("guild"), or by interacting with the
Bot in a guild or via direct message ("DM"), you ("you", the "user") agree to
these Terms of Service ("Terms"). If you do not agree, remove the Bot from
your guild and stop using it.

## 2. Description of Service

The Bot is a Discord application that:

- Registers slash commands, including `/setup`, which lets a user (in DMs) or
  a server administrator (in a guild, requires the **Manage Server**
  permission) configure a daily reminder for LeetCode's "Daily Challenge"
  problem.
- On a per-minute schedule, checks configured reminders and — when a user's
  or guild's configured local send time arrives — delivers a message
  containing that day's LeetCode problem title, difficulty, and link, either
  as a direct message (DM) or as a message in a configured guild channel.
- Optionally, for users who supply a personalization prompt, generates a
  short AI-written blurb accompanying the daily reminder (see Section 4 and
  the [Privacy Policy](./PRIVACY_POLICY.md)).

The Bot is provided by an independent developer, is not affiliated with,
endorsed by, or sponsored by Discord Inc. or LeetCode, and is not a
guaranteed, always-available service.

## 3. Eligibility

You must meet Discord's own age and account requirements to use Discord, and
by extension, the Bot. Server administrators are responsible for ensuring the
Bot's use complies with their guild's own rules and with Discord's
[Terms of Service](https://discord.com/terms) and
[Community Guidelines](https://discord.com/guidelines).

## 4. User Content

Where you enable AI personalization, any free-text prompt you submit (e.g.
"keep it upbeat and use a pirate voice") is stored to generate your daily
reminder and is sent to a third-party AI provider each time a reminder is
generated. Do not submit personal, sensitive, or unlawful content in this
field. See the [Privacy Policy](./PRIVACY_POLICY.md) for how this data is
stored, transmitted, and can be deleted.

## 5. Acceptable Use

You agree not to:

- Use the Bot to violate any applicable law, Discord's Terms of Service, or
  Discord's Community Guidelines.
- Attempt to disrupt, overload, reverse-engineer (beyond what applicable law
  permits for open-source software), or gain unauthorized access to the Bot,
  its underlying infrastructure, or its data store.
- Use the Bot to transmit content that is unlawful, harassing, hateful,
  sexually explicit involving minors, or infringing on the rights of others.
- Automate interactions with the Bot in a way that circumvents Discord's
  rate limits or degrades service for other users.

Violation of this section may result in the Bot refusing to respond to you,
your guild, or specific channels, at the developer's discretion.

## 6. Availability and Changes

The Bot is provided on an "as available" basis. The developer may modify,
suspend, or discontinue any part of the Bot's functionality, or the Bot
entirely, at any time and without prior notice. Reminder delivery depends on
third-party infrastructure (Discord's API, the LeetCode problem data source,
and, where enabled, a third-party AI provider) and may be delayed, skipped,
or fail for reasons outside the developer's control (e.g. closed DMs, a
channel the Bot can no longer post in, or an upstream outage).

## 7. No Warranty

THE BOT IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. THE
DEVELOPER DOES NOT WARRANT THAT THE BOT WILL BE UNINTERRUPTED, ERROR-FREE, OR
THAT ANY REMINDER WILL BE DELIVERED ON TIME OR AT ALL.

## 8. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE DEVELOPER SHALL NOT BE LIABLE FOR
ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
LOSS OF DATA, GOODWILL, OR OPPORTUNITY, ARISING OUT OF OR RELATED TO YOUR USE
OF, OR INABILITY TO USE, THE BOT, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
DAMAGES. THE BOT IS FREE TO USE; THE DEVELOPER'S TOTAL LIABILITY FOR ANY
CLAIM ARISING FROM THESE TERMS OR YOUR USE OF THE BOT SHALL NOT EXCEED
USD $0.

## 9. Termination

You may stop using the Bot at any time by removing it from your guild,
ceasing to interact with it in DMs, and/or clearing your stored
configuration (see the [Privacy Policy](./PRIVACY_POLICY.md) for how to
request deletion). The developer may block or remove the Bot's access to
your guild or account at their discretion, including for violations of
Section 5.

## 10. Changes to These Terms

These Terms may be updated from time to time. Material changes will be
reflected by updating the "Effective date" above and published in this
repository. Continued use of the Bot after changes take effect constitutes
acceptance of the revised Terms.

## 11. Governing Law

These Terms are governed by the laws of the jurisdiction in which the
developer resides, without regard to conflict-of-law principles, except
where mandatory local consumer-protection law provides otherwise.

## 12. Contact

Questions about these Terms can be raised via
[GitHub Issues](https://github.com/wbrous/leetcode-discord-bot/issues) on
this repository.
