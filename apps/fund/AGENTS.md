# Paper Fund

Paper Fund (模拟基金, fund.qingqi.dev) is a paper-trading AI portfolio manager. It has one owner and no per-user data: every signed-in user sees the same fund. The tabs are Desk 交易台 (`/`), Portfolio 持仓 (`/portfolio`), Thesis 投资逻辑 (`/thesis`), Risk 风险 (`/risk`) and Journal 日志 (`/journal`).

- Ports: the app is `node ../../scripts/get-worktree-port.mjs 500`, its PGlite database `… 2833`.
- `pnpm dev` starts a per-worktree PGlite database in `.fund-db/`, migrates it, adds the dev user `owner@fund.localhost` when it has no user, and sets a local `FUND_AUTH_SECRET`, unless `FUND_DATABASE_URL` is set. Delete `.fund-db/` to start over, and after a migration is generated again.
- The local database is one PGlite session that every client shares: a `SET` from one client changes the session of all of them (`SET default_transaction_read_only = on` from a query script once made every write of the app fail). Never set a session parameter on it.
- Sign in as an agent: `pnpm --filter fund fund:session` while `pnpm dev` runs, then set the cookie it prints on `http://localhost`. It signs in as the oldest user of the local database.
- Database (`src/db/`): `getFundDb()` is a `pg` Pool with drizzle. Open a transaction with `runTransaction` from `@tuja/server-db/run-transaction`. `schema.ts` joins `auth-schema.ts` and the fund's tables in `src/fund/fund-schema.ts`. Change the schema, then run `pnpm fund:generate`. Preview and production builds run `pnpm fund:migrate` (`FUND_DATABASE_URL_UNPOOLED`, advisory lock). Tests use `createTestDb()` from `src/db/testing/create-test-db.ts`: a migrated PGlite behind a `pg` Pool.
- Auth (`src/auth/`) runs on `@tuja/server-auth`, as Trips does: passkeys, sign-up and recovery by an emailed code. Only the owner may sign up (`may-sign-up.ts`): with `FUND_OWNER_EMAIL` set, only that address; unset, anyone on a local server and no one on a deployment. A page calls `requirePageSession(locale, path)`, which sends a visitor with no session to sign-in. An API route that needs a session is `signedInRoute(schema, run)` from `src/auth/signed-in-route.ts`.
- Proxy (`src/proxy.ts`): every `/api/*` request needs a Referer of this app, except `/api/cron/*`, whose handlers must check the `CRON_SECRET` bearer with `isCronAuthorised` from `@tuja/server-auth/is-cron-authorised`.
- Email (`@tuja/server-email`): `FUND_EMAIL_OUTBOX` writes each email as JSON to that folder; else `RESEND_API_KEY` and `FUND_EMAIL_FROM` send through Resend; else `next dev` writes to `apps/fund/.fund-outbox/`.
- Env for a deployment: `FUND_DATABASE_URL`, `FUND_DATABASE_URL_UNPOOLED`, `FUND_AUTH_SECRET` (a random 32-byte value, set once), `FUND_OWNER_EMAIL`, `KV_REST_API_URL` and `KV_REST_API_TOKEN` for the rate limits, `RESEND_API_KEY` and `FUND_EMAIL_FROM`, `CRON_SECRET`, and `LICENSED_FONTS_READ_WRITE_TOKEN` for the font.
- Scripts: `dev`, `build`, `build:tsc`, `lint`, `test`, `fund:generate`, `fund:migrate`, `fund:session`, `fund:refresh`, `fund:meeting`, `fund:replay`.

## The fund (`src/fund/`)

The owner's rules are in `guardrails.ts`; code enforces them and no agent or risk policy can loosen them. An agent gives judgement and never arithmetic: code works out share counts, cash, weights and exposure.

- **Dates.** A meeting has an `asOf`: the session it decides for. It sees only sessions that ended before `asOf`. Nothing under `src/fund` reads the clock to decide anything about markets; only a CLI or a route does, and passes the date down.
- **Units.** The database and all arithmetic use major units (pounds, dollars). People and agents see quote units (pence for a London stock). Convert at the boundary with `orders/to-major-units.ts` and show prices with `orders/format-price.ts`.
- **Market data** (`market/`): `yahoo-finance2` behind `MarketProvider`. `refreshMarketData` stores only sessions that have ended, and builds PE, PB and yields itself, because the provider mixes pence, pounds and the currency of the statements. The universe is `market/universe.json`; rebuild it with `tsx src/fund/market/dev/build-universe.ts`.
- **Ledger and orders** (`ledger/`, `orders/`): pure. Fills are the only source of positions; lots, the 30-day lock, cash and profit are derived from them. `planOrders` turns the PM's actions into whole-share orders and reports each breach. It owns the rule that an order whose symbol has a violation is never placed: such an order is in `blocked`, and only `planned` is placed.
- **Screen and risk** (`screener/`, `risk/`): pure. The fund thesis sets the weights of the five screen scores. `measureExposure` gives each number of `RISK_METRICS`, and `checkRiskPolicy` compares them with the risk policy.
- **Meetings** (`meeting/`): a run is a list of persisted steps (`run_steps`); a step that is done never runs again, and a run that died continues from its first step that is not done (`advanceRun`, claimed through `runs.heartbeat_at`; `isHeld` says whether a worker holds a run). A strategy session writes the fund thesis and the risk policy. A daily meeting is data → screen → strategist → one analyst for each stock → PM draft → code checks → risk review and analyst answers → PM final → code checks → risk sign-off (a veto drops the order) → commit. A meeting waits while `ordersNeedingCheck` is not empty. A failed analyst step does not stop the meeting. A request can advance a run for about 12 minutes; then the run pauses, and the next cron call or an open Desk continues it. A run that a later meeting of its kind replaced is never continued. The cron in `vercel.json` calls each 15 minutes from 05:00 to 06:45 UTC on a weekday, so the meeting ends before London opens in winter and in summer.
- **Agents** (`agents/`): `model-for.ts` is the one table of models (`FUND_MODEL_TIER`: `dev` is Haiku for every seat, `live` is Fable); `prompts.ts` has the instructions of each seat; `contracts/` has the zod schema of each answer. The live tier rejects a forced tool choice and sampling settings: get structure through `Output.object`.
- **Order outcomes** (`desk/`): `recordFill` is the only writer of fills. An order ends only through `recordFill`, `recordNoFill`, or the commit of a daily meeting, which cancels the orders that the PM cancelled.
- **Pages** (`src/fund/views/` load what a page shows; `src/fund/ui/` are the components).

A model call needs `ANTHROPIC_API_KEY`. With no `apps/fund/.env.local`, run from `apps/web`: `vercel env run -e development -- pnpm --filter fund dev` (or `fund:meeting`, `fund:replay`).

- `fund:meeting --kind strategy|daily [--as-of YYYY-MM-DD] [--tier dev|live] [--universe A,B] [--skip-refresh]` holds one meeting on the local database.
- `fund:replay --from … --to … [--tier dev] [--universe A,B] [--reset]` plays the owner (it fills an order when `fillHint` says the price was reached) and holds the meeting of each weekday. Use it to exercise fills, expiry and the lock. Web search still returns today's news, and fundamentals are today's snapshot.
- `--tier live` costs real money: a meeting on the whole universe runs about ten analysts with web search. One run with five stocks cost 4.16 USD at list prices up to the PM draft, with web search that worked for only one analyst, so expect 10 to 13 USD for a whole meeting. Each step keeps its token counts, its cost and the error code of each web search that failed in `run_steps.usage`; the minutes page shows them.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
