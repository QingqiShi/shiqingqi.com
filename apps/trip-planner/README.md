# trip-planner

A standalone Next.js app for planning trips, deployed as its **own Vercel project**
(separate from the main `web` site) out of this monorepo.

- **Locale:** English and Chinese routes under `src/app/[locale]`: English has
  no prefix (`/gb`), Chinese is at `/zh` (`/zh/gb`). App text uses inline
  `t({ en, zh })` (see the `i18n-patterns` skill). Trip content stays in the
  trip's own language, with a `lang` where it differs from the page.
- **UI:** the repo's StyleX design system, `@tuja/ui` (see the `styling`
  skill). The app sits in a `TabView` (Trips, Settings), and the list of trips
  sits beside the open trip in a `NavigationSplitView`.
- **Data:** trips are documents in Postgres, one row in `trips` and one in
  `trip_revisions` for each save. Pages read them through
  `src/trips/get-trips.ts`, which reads only a trip that has a password gate.
  The two real trips are still files in `src/trips/data` for now: each
  deployment copies them into its database.
- **Access:** each trip has its own password. The proxy gates a trip path with
  or without a locale prefix, and the trip page checks the unlock cookie too.

## Develop

```bash
pnpm --filter trip-planner dev   # port: node scripts/get-worktree-port.mjs 100
```

Unless `TRIPS_DATABASE_URL` is set, `pnpm dev` starts a database of its own
in `.trips-db/`, with the made-up sample trip and the trip files. After a
change to `src/db/schema.ts`, run `pnpm trips:generate` for the migration.

Set `SITE_PASSWORD_SAMPLE` to any value to open the made-up sample trip at
`/sample-lisbon`. Use it for tests and screenshots, because the real trips
show bookings and phone numbers.

```bash
pnpm --filter trip-planner test:e2e   # builds, then serves the build with a database in memory
```

The Playwright specs in `e2e/` unlock the sample trip, step through its days,
and read it again with no network.

## Maps

Each day renders an at-a-glance route map plus an expandable inline map on every
nav leg, via the [Google Maps Embed API](https://developers.google.com/maps/documentation/embed).
The Embed API has **no usage charge**, so this stays free.

To enable it locally, set `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` in `.env.local`
(see `.env.example`):

1. Google Cloud console → enable **Maps Embed API**.
2. Create an API key, then restrict it to your domain(s) (HTTP referrers) **and**
   to the Maps Embed API — the key is public (it ships in the iframe `src`), so
   the referrer restriction is what protects it.
3. Add the same key as an env var in the Vercel project for production.

Without a key the maps are hidden and navigation falls back to Google Maps
deep-links — no embedded preview, everything else works.

## Deploy (Vercel)

This app is a second Vercel project pointing at the same Git repo:

- **Root Directory:** `apps/trip-planner`
- **Framework preset:** Next.js (auto-detected)
- **Install Command:** `pnpm install` (run at repo root; inherited)
- **Build Command:** `buildCommand` in `vercel.json`. On a preview or
  production deployment it first runs `pnpm trips:migrate`, which applies the
  migrations and copies the trip files into the database.
- **Database:** a Neon project with the branches `main` (production) and
  `preview`. Set `TRIPS_DATABASE_URL` (pooled) and
  `TRIPS_DATABASE_URL_UNPOOLED` for each of the two environments. With the
  repository variable `TRIPS_NEON_PROJECT_ID`, a daily workflow makes
  `preview` a copy of `main` again.
- **Font:** set `LICENSED_FONTS_READ_WRITE_TOKEN` so the build downloads the
  licensed Haffer font; without it the app uses the fallback font.

The **Ignored Build Step** is committed as `ignoreCommand` in `vercel.json`
(`npx turbo-ignore trip-planner`), so Vercel only redeploys when this app or
its workspace dependencies change. It takes effect from the second deploy
onward — the first deploy always builds.
