# shiqingqi.com

A pnpm monorepo built with Turborepo.

## Apps

- `apps/web` — ships [qingqi.dev](https://qingqi.dev): a portfolio and Projects site, including an AI-assisted movie and TV database.
- `apps/finance` — the household Finance app, moving out of `apps/web` into its own deployment. For now an empty shell; Finance still runs in `apps/web`.
- `apps/trip-planner` — a private, password-gated reader for pre-written road-trip itineraries.

## Packages

`packages/*` are the `@tuja/*` internals shared across the apps — the `@tuja/ui` StyleX design system, TMDB and i18n code generators, Babel and ESLint plugins, and other build tooling.

## Where to look next

- `AGENTS.md` — monorepo conventions, gotchas, and the commands to run before a change is done.
- `DESIGN.md` — design-system principles for UI, component APIs, and user-facing copy.
