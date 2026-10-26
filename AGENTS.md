`shiqingqi.com` is a pnpm monorepo: `apps/web` ships qingqi.dev, `apps/trip-planner` is a private trip reader, and `packages/*` are the `@tuja/*` internals. Domain language is defined in `CONTEXT-MAP.md`, which points at a `CONTEXT.md` per context — use those terms in code, comments, and copy. They define words only; never cite them as the source of how something behaves or who may do what. Design-system principles are in `DESIGN.md` — read it before designing or changing UI, component APIs, or user-facing copy.

# Gotchas

- Tests are Vitest, one package at a time: `pnpm --filter @tuja/i18n-codegen test trace-client-files`. The pattern matches file paths; drop it to run the whole package.
- `pnpm build` neither type-checks nor lints; `pnpm build:tsc` is the type check.
- `pnpm test:e2e` is Playwright. Locally it reuses a server already up on the worktree port; otherwise it starts the production build, and rebuilds only when a source other than e2e and test files changed since the last build. `pnpm test:e2e:serve` in `apps/web` keeps such a server up between runs, Finance included; restart it after you change app code.
- Evals hit real LLM APIs. `pnpm eval <filter>` runs one file (e.g. `pnpm eval tmdb-search`); run a bare `pnpm eval` only when the full suite is needed.
- Run `pnpm dev` from the one app you work on (e.g. `apps/web`), never from the root, which starts every app. The port is per worktree — `node scripts/get-worktree-port.mjs` prints it; never assume 3000. Other devices reach it at this machine's IP or `<hostname>.local`; `scripts/get-local-dev-origins.mjs` allow-lists those hosts for Next.
- Finance runs locally under `pnpm dev` in `apps/web`: unless `FINANCE_DATABASE_URL` is set, it starts a per-worktree PGlite database (`apps/web/.finance-db/`), seeds it once, and sets local Finance defaults. `FINANCE_DATABASE_URL= pnpm dev` runs without Finance.
- To sign in to Finance as an agent, run `pnpm --filter web finance:session` while `pnpm dev` runs, and set the cookie it prints. Use `http://localhost`: on a LAN host the cookie must be Secure. Playwright e2e cannot reuse this dev server for Finance specs; stop it first, or use `pnpm test:e2e:serve`.
- The deployed Finance databases are the Neon project `finance` in the Vercel-managed org, not the personal one: branch `main` is production and branch `preview` is a daily copy of it. Neon `list_projects` without `org_id` searches only the personal org and returns nothing, so call `list_organizations` first.
- `.env*` files are denied to the Read tool. `turbo.json` lists most environment variable names under `globalPassThroughEnv`; confirm a name there or in source before you use it.
- Tests run against real implementations. `vi.mock` is a last resort at the store boundary — see `apps/web/src/app/api/ai-chat/route.test.ts`. Never mock `server-only`: Vitest aliases it to a stub.

# Before a task is done

- Run `pnpm verify` — it lints and formats the changed files, then type-checks. Add `pnpm build` when the change touches config or bundling.
- If you need to verify visually (e.g. with Playwright CLI) and the dev server or preview deployment is unreachable, stop and ask the user to help; do not fall back to reading the code instead.
