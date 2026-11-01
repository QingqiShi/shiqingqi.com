<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Assistant

- Ports: the app is `node ../../scripts/get-worktree-port.mjs 300`, its PGlite database `… 2533`. `ASSISTANT_PORT=3000 pnpm dev` puts the app on 3000, the one localhost port the Google and Microsoft OAuth clients accept; stop `apps/web` first.
- `pnpm dev` starts a per-worktree PGlite database in `.assistant-db/`, migrates it, seeds one dev user, and sets local secrets, unless `ASSISTANT_DATABASE_URL` is set. Delete `.assistant-db/` to start over.
- Sign in as an agent: `pnpm --filter assistant assistant:session` while `pnpm dev` runs, then set the cookie it prints on `http://localhost` (a LAN host needs a Secure cookie).
- Invite a person: `pnpm assistant:invite-link --name <name>`; `--user <id>` makes a recovery link. Against production: `vercel env run -e production -- pnpm assistant:invite-link --name <name> --allow-remote` from `apps/assistant`.
- Vercel env: run `vercel link --project assistant --scope tuja-labs --yes` in `apps/assistant` once, then `vercel env run -e development -- <cmd>` there. The repo root is linked to `qingqi-dev`.
- Every user row is isolated by row level security on `app.user_id`. Read and write user tables only inside `withUser(db, userId, …)` (`src/assistant/db/with-user.ts`); global tables (users, passkeys, sessions, invites) use `asAssistantApp`. A new user table needs `SELECT isolate_user_table('"<table>"');` in its migration and a seeded row in `user-isolation.test.ts`.
- Migrations: change `src/assistant/db/schema.ts`, run `pnpm assistant:generate`; write SQL drizzle cannot generate with `pnpm exec drizzle-kit generate --custom --name <name>`. Vercel runs them on preview and production builds.
- Crons: add the route under `src/app/api/cron/`, build it with `makeUserCronHandler`, and list it in `vercel.json`. The proxy lets `/api/cron/*` through without a Referer; the handler checks `CRON_SECRET`.
