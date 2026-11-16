# trip-planner

A standalone Next.js app for planning trips, deployed as its **own Vercel project**
(separate from the main `web` site) out of this monorepo.

- **Locale:** English and Chinese routes under `src/app/[locale]`: English has
  no prefix (`/gb`), Chinese is at `/zh` (`/zh/gb`). App text uses inline
  `t({ en, zh })` (see the `i18n-patterns` skill). The current screens are
  still written in Chinese in both locales; they move to `t()` as they are
  rebuilt on `@tuja/ui`.
- **UI:** moving from [shadcn/ui](https://ui.shadcn.com) on **Tailwind CSS v4**
  to the repo's StyleX design system, `@tuja/ui`. Both build side by side
  until the last screen moves; then shadcn, Tailwind and lucide go.
- **Access:** each trip has its own password. The proxy gates a trip path with
  or without a locale prefix, and the trip page checks the unlock cookie too.

## UI components

Components live in `src/shadcn` and are added via the shadcn CLI:

```bash
pnpm --filter trip-planner dlx shadcn@latest add <component>
```

Config is in `components.json` (style `new-york`, base color `neutral`, `@/*`
alias → `src/*`). The `cn()` helper is in `src/shadcn/utils.ts`.

## Develop

```bash
pnpm --filter trip-planner dev   # port: node scripts/get-worktree-port.mjs 100
```

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
- **Build Command:** `pnpm build` (or leave default — Vercel runs `next build`)
- **Font:** set `LICENSED_FONTS_READ_WRITE_TOKEN` so the build downloads the
  licensed Haffer font; without it the app uses the fallback font.

The **Ignored Build Step** is committed as `ignoreCommand` in `vercel.json`
(`npx turbo-ignore trip-planner`), so Vercel only redeploys when this app or
its workspace dependencies change. It takes effect from the second deploy
onward — the first deploy always builds.
