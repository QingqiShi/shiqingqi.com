`shiqingqi.com` is a pnpm monorepo: `apps/web` ships qingqi.dev, `apps/trip-planner` is a private trip reader, and `packages/*` are the `@tuja/*` internals. Domain language is defined in `CONTEXT-MAP.md`, which points at a `CONTEXT.md` per context — use those terms in code, comments, and copy. Design-system principles are in `DESIGN.md` — read it before designing or changing UI, component APIs, or user-facing copy.

# Gotchas

- Tests are Vitest, one package at a time: `pnpm --filter @tuja/i18n-codegen test import-graph`. The pattern matches file paths; drop it to run the whole package.
- `pnpm build` neither type-checks nor lints; `pnpm build:tsc` is the type check.
- `pnpm test:e2e` is Playwright. Locally it runs a full production build first, unless a dev server is already up on the worktree port, which it reuses.
- Evals hit real LLM APIs. `pnpm eval <filter>` runs one file (e.g. `pnpm eval tmdb-search`); run a bare `pnpm eval` only when the full suite is needed.
- Run `pnpm dev` from the one app you work on (e.g. `apps/web`), never from the root, which starts every app. The port is per worktree — `node scripts/worktree-port.mjs` prints it; never assume 3000. Other devices reach it at this machine's IP or `<hostname>.local`; `scripts/dev-origins.mjs` allow-lists those hosts for Next.
- `.env*` files are denied to the Read tool. `turbo.json` lists most environment variable names under `globalPassThroughEnv`; confirm a name there or in source before you use it.
- Tests run against real implementations. `vi.mock` is a last resort at the `server-only`/store boundary — see `apps/web/src/app/api/ai-chat/route.test.ts`.

# Before a task is done

- Run `pnpm verify` — it lints and formats the changed files, then type-checks. Add `pnpm build` when the change touches config or bundling.
- If you need to verify visually (e.g. with Playwright CLI) and the dev server or preview deployment is unreachable, stop and ask the user to help; do not fall back to reading the code instead.
