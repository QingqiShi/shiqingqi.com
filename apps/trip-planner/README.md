# trip-planner

A standalone Next.js app for planning trips, deployed as its **own Vercel project**
(separate from the main `web` site) out of this monorepo.

- **Locale:** English and Chinese routes under `src/app/[locale]`: English has
  no prefix (`/<trip id>`), Chinese is at `/zh` (`/zh/<trip id>`). App text uses inline
  `t({ en, zh })` (see the `i18n-patterns` skill). Trip content stays in the
  trip's own language, with a `lang` where it differs from the page.
- **UI:** the repo's StyleX design system, `@tuja/ui` (see the `styling`
  skill). The app sits in a `TabView` (Trips, Settings), and the list of trips
  sits beside the open trip in a `NavigationSplitView`.
- **Data:** trips are documents in Postgres, one row in `trips` and one in
  `trip_revisions` for each save. The path of a trip is the id of its row in
  `trips`. Pages read them through
  `src/trips/get-trips.ts`, which reads only the trips that the viewer can open.
  The real trips are only in the deployed database, not in the repository.
- **Access:** a trip shows only to its members (`trip_members`). The reader
  runs as the database role `trips_app`, and row-level security gives that
  role only the trips of the user in `trips.user_id`. A visitor who is not
  signed in goes to `/sign-in`; a user who is not a member gets a 404.
- **Invites:** an owner makes an invite link in the Share panel of a trip.
  The link is `/invite/<token>`: the person signs in or signs up, then joins
  the trip as an editor. A link works for one person, for 7 days, and the
  database holds only the hash of its token, so a link shows once, when it is
  made. The Share panel also lists the members, and the owner can take an
  editor out there.

## Develop

```bash
pnpm --filter trip-planner dev   # port: node scripts/get-worktree-port.mjs 100
```

Unless `TRIPS_DATABASE_URL` is set, `pnpm dev` starts a database of its own
in `.trips-db/`, with the made-up sample trip. After a change to
`src/db/schema.ts`, run `pnpm trips:generate` for the migration.

In that database, each user who signs up at `/sign-in` becomes an owner of the
made-up sample trip at `/00000000-0000-4000-8000-000000000001`; the emailed code is in
`.trips-outbox/`. A user whose address starts with `guest` gets no trip, so
that you can try an invite with it. Use the sample trip for tests and screenshots, because the
real trips show bookings and phone numbers.

```bash
pnpm --filter trip-planner test:e2e   # builds, then serves the build with a database in memory
```

The Playwright specs in `e2e/` sign up, step through the days of the sample
trip, read it again with no network, and join it from an invite link.

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
  migrations.
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
