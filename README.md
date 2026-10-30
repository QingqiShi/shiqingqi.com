# shiqingqi.com

A pnpm monorepo built with Turborepo.

## Apps

- `apps/web` — ships [qingqi.dev](https://qingqi.dev): a portfolio and Projects site, including an AI-assisted movie and TV database.
- `apps/finance` — ships the household Finance app at [finance.qingqi.dev](https://finance.qingqi.dev). The old `qingqi.dev/finance` paths redirect there.
- `apps/trip-planner` — a private, password-gated reader for pre-written road-trip itineraries.

## Packages

`packages/*` are the `@tuja/*` internals shared across the apps — the `@tuja/ui` StyleX design system, TMDB and i18n code generators, Babel and ESLint plugins, and other build tooling.

## Where to look next

- `AGENTS.md` — monorepo conventions, gotchas, and the commands to run before a change is done.
