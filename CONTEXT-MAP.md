# Context Map

## Contexts

- [Design System](./contexts/design-system/CONTEXT.md) — the `@tuja/ui` StyleX system and the site that documents it. Applies to `packages/ui/`, `packages/system-palette-codegen/`, `packages/babel-plugins/src/specimen-source/`, `packages/babel-plugins/src/stylex-breakpoints/`, `packages/eslint-plugin/src/design-system/`, `apps/web/src/app/[locale]/design-system/`, and `apps/web/src/components/design-system/`.
- [Movie Database](./contexts/movie-database/CONTEXT.md) — the AI-assisted movie and TV browser, its TMDB pipeline, and its semantic search. Applies to `apps/web/src/components/movie-database/`, `apps/web/src/components/ai-chat/`, `apps/web/src/ai-chat/`, `apps/web/src/vector-db/`, `apps/web/src/app/[locale]/(with-header)/movie-database/`, `apps/web/src/app/api/tmdb/`, `apps/web/src/app/api/ai-chat/`, `apps/web/src/utils/tmdb-*`, `apps/web/src/utils/build-tmdb-*`, `apps/web/src/utils/media-*`, `apps/web/src/utils/types.ts`, `packages/tmdb-codegen/`, `packages/tmdb-types/`, and `packages/vector-ingest/`.
- [Site](./contexts/site/CONTEXT.md) — the portfolio, the Projects, the site shell, and the i18n pipeline. Applies to everything else in `apps/web/`, plus `packages/i18n-codegen/`, `packages/babel-plugins/src/i18n/`, and `packages/eslint-plugin/src/i18n/`.
- [Trip Planner](./contexts/trip-planner/CONTEXT.md) — a private, password-gated, Chinese-only reader for pre-written road-trip itineraries. Applies to `apps/trip-planner/`.
- [Component Tinker](./contexts/component-tinker/CONTEXT.md) — the throwaway HTML tinker that lets a user retune one `@tuja/ui` component by eye and export the change back to the agent. Applies to `packages/component-tinker/` and `.claude/skills/component-tinker/`.
