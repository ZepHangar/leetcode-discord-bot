---
name: leetcode-discord-bot-ci-workflow
description: "Use when adding or modifying GitHub Actions CI for leetcode-discord-bot (testing, TypeScript build, or container build jobs triggered on push/PR)."
---

## Context

leetcode-discord-bot is a Bun + TypeScript + Prisma Discord bot living under `bot/`, with no root-level `package.json`/`tsconfig.json` — CI must set working directory to `bot/` explicitly (via `defaults.run.working-directory: bot`), and any `docker build` steps must point `context`/`file` at `./bot` since it's a separate `Dockerfile`-based action, not a `run:` step.

## Triggers (`.github/workflows/ci.yml`)

The workflow triggers on `push` and `pull_request`, scoped to avoid duplicate runs:

```yaml
on:
  push:
    branches: [ main ]
  pull_request:
```

`push` fires only on `main`; `pull_request` covers feature branches. If `push` were unfiltered, a commit pushed to a branch with an open PR would fire both `push` and `pull_request` events and run every job twice (once tagged `(push)`, once `(pull_request)`). Consequences:

- Push to `main` → `push` event (no PR → no duplicate).
- Push to a feature branch with an open PR → `pull_request` event only.
- Push to a feature branch without a PR → no CI (acceptable; work goes through a PR).

## Required steps before tsc/test will pass

`@prisma/client` types are generated, not committed. Any job that runs `bunx tsc --noEmit`, `bun test`, or `bun run build` MUST run `bun run db:generate` (== `bunx prisma generate`) first — it only reads `schema.prisma`, no live DB connection needed, so no Postgres service container is required in CI for typecheck/build/test jobs (confirm no test file actually touches a live database before assuming this holds).

## Standard job shape

Three parallel jobs:

1. **test** — `bun install --frozen-lockfile` → `bun run db:generate` → `bunx tsc --noEmit` → `bun test`.
2. **build** — `bun install --frozen-lockfile` → `bun run db:generate` → `bun run build` (confirms compile to `dist/`).
3. **build-container** — `docker/setup-buildx-action` + `docker/build-push-action` with `context: ./bot`, `file: ./bot/Dockerfile`, `push: false`, `load: true`, `cache-from/to: type=gha` — validates the Dockerfile builds without publishing anywhere (no registry wiring needed unless explicitly requested).

Use `concurrency: { group: ci-${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` to cancel superseded runs on rapid pushes to the same ref.

## Local verification gotcha

If you run `bun run build` (tsc compile to `dist/`) and then `bun test` in the *same* local checkout, `dist/` ends up containing compiled `*.test.js` files too (tsconfig has no test-file exclude), and `bun test` picks those up as duplicate test files — inflated pass counts (e.g. 98 instead of 49). This is NOT a CI bug: each GitHub Actions job runs on a fresh checkout, so `build` and `test` never share a `dist/` directory. When verifying CI commands locally, either run jobs in the order CI would isolate them, or `rm -rf bot/dist` between simulating the build job and the test job to get an accurate count.
