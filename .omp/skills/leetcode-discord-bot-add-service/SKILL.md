---
name: leetcode-discord-bot-add-service
description: "Use when adding a new backing service (e.g. alfa-leetcode-api) to leetcode-discord-bot's docker-compose.yml as an internal-network sidecar for the bot service."
---

## Context
Repo: leetcode-discord-bot. Root `docker-compose.yml` has services `bot` (build from `./bot`) and `postgres`. No explicit `networks:` block — compose's implicit default network (`<project>_default`) already connects all services; no need to add one for internal-only reachability.

## Pattern: adding a sidecar service (e.g. alfa-leetcode-api)
1. Check upstream repo (github.com/alfaarghya/alfa-leetcode-api) README first — it's a thin proxy over `leetcode.com/graphql`, fully anonymous, **no API key required**.
2. Add to `docker-compose.yml` as a plain service block, no `ports:` (keeps it internal-only, not published to host):
```yaml
leetcode-api:
  image: alfaarghya/alfa-leetcode-api:2.0.4
  restart: unless-stopped
```
3. Bot reaches it at `http://leetcode-api:3000` (service name = DNS name on compose default network).
4. Verify: `docker compose up -d leetcode-api` then `docker compose logs leetcode-api --tail 20` — look for `Server is running at => http://localhost:3000`. Also `docker compose ps` shows container `Up`.
5. Gotcha: `docker compose run --rm bot ...` fails separately if `bot/.env.prod` doesn't exist locally (pre-existing env setup issue, unrelated to sidecar changes — don't let it block verifying the new service).
6. Gotcha: pulling extra debug images (e.g. `curlimages/curl`) to test network reachability may hit registry TLS timeouts in this sandbox — prefer checking container logs/`docker compose ps` over spinning up a throwaway curl container.

## Next step left open
Bot code itself doesn't yet consume this URL — wiring in `LEETCODE_API_URL` env var (or hardcoding `http://leetcode-api:3000`) into bot source is a separate, not-yet-done step.
