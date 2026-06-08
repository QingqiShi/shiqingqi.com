# trip-planner

A standalone Next.js app for planning trips, deployed as its **own Vercel project**
(separate from the main `web` site) out of this monorepo.

- **Locale:** Chinese only (`zh`). No i18n pipeline — copy is written inline.
- **UI:** [shadcn/ui](https://ui.shadcn.com) on **Tailwind CSS v4** (Radix primitives,
  CSS-variable theming). This deliberately diverges from the main `web` site's
  StyleX + `@tuja/ui` system — trip-planner is an isolated experiment and does not
  share the design system.

## UI components

Components live in `src/components/ui` and are added via the shadcn CLI:

```bash
pnpm --filter trip-planner dlx shadcn@latest add <component>
```

Config is in `components.json` (style `new-york`, base color `neutral`, `@/*`
alias → `src/*`). The `cn()` helper is in `src/lib/utils.ts`.

## Develop

```bash
pnpm dev          # runs every app; trip-planner uses web's port + 100
# or just this app:
pnpm --filter trip-planner dev
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

The **Ignored Build Step** is committed as `ignoreCommand` in `vercel.json`
(`npx turbo-ignore trip-planner`), so Vercel only redeploys when this app or
its workspace dependencies change. It takes effect from the second deploy
onward — the first deploy always builds.
