# Context Map

`shiqingqi.com` is a pnpm monorepo behind two deployed sites: **qingqi.dev** (the personal site, `apps/web`) and a private trip reader (`apps/trip-planner`). Four bounded contexts, because the same word means different things in each.

## Contexts

- [**Design System**](./packages/ui/CONTEXT.md) — the `@tuja/ui` StyleX system and the site that documents it.
  Applies to: `packages/ui/`, `packages/system-palette-codegen/`, `packages/babel-plugin-stylex-*/`, `apps/web/src/app/[locale]/design-system/`, `apps/web/src/components/design-system/`.

- [**Movie Database**](./apps/web/src/components/movie-database/CONTEXT.md) — the AI-assisted movie and TV browser, its TMDB pipeline, and its semantic search.
  Applies to: `apps/web/src/components/movie-database/`, `apps/web/src/components/ai-chat/`, `apps/web/src/ai-chat/`, `apps/web/src/vector-db/`, `apps/web/src/app/[locale]/(with-header)/movie-database/`, `apps/web/src/app/api/{tmdb,ai-chat}/`, `apps/web/src/utils/{tmdb-*,build-tmdb-*,media-*,person-list-item.ts,sort.ts,genre-filter-type.ts}`, `packages/tmdb-codegen/`, `packages/tmdb-types/`, `packages/vector-ingest/`.

- [**Site**](./apps/web/CONTEXT.md) — the portfolio, the Projects, the site shell, and the i18n pipeline.
  Applies to: everything else in `apps/web/`, plus `packages/i18n-codegen/`, `packages/i18n-babel-plugin/`, `packages/eslint-plugin-i18n/`.

- [**Trip Planner**](./apps/trip-planner/CONTEXT.md) — a private, password-gated, Chinese-only reader for pre-written road-trip itineraries.
  Applies to: `apps/trip-planner/` only.

## Relationships

- **Design System → Site, Movie Database**: `@tuja/ui` supplies every token, primitive, and component. Its words travel downstream unchanged.
- **Site → Movie Database**: the i18n pipeline (`t()`, Locale, Bundle) and the site shell wrap the Movie Database. Its words travel downstream unchanged.
- **Trip Planner ↔ everything**: shares only `@tuja/tsconfig` and the root ESLint config. No shared types, no shared components, no i18n, its own Vercel project. Deliberately isolated — see `apps/trip-planner/README.md:9`.

## False friends

Words that are live in more than one context with unrelated meanings. Never converge these across a boundary; qualify them at the seam.

| Word           | Meaning per context                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Card**       | Design System: the `@tuja/ui` bordered-surface component. Trip Planner: a shadcn/ui primitive plus its own domain cards. Incompatible systems — the import is always wrong across the seam. |
| **Overview**   | Trip Planner: the whole-trip day list (总览). Movie Database: TMDB's plot synopsis field.                                                                                                   |
| **Palette**    | Design System: the generated 13-hue system palette. Site: an ordered colour list a sprite's pixel characters index into.                                                                    |
| **Tone**       | Design System: one lightness step of a hue. Movie Database: banned — use Mood.                                                                                                              |
| **Primitive**  | Design System: a composable multi-property StyleX style object. Trip Planner: a Radix/shadcn base component.                                                                                |
| **Preference** | Site: a user-chosen site setting (theme, locale). Movie Database: banned — the AI's remembered likes and dislikes are Taste.                                                                |
| **Plan**       | Trip Planner: a rung of the Plan-A/B/C fallback ladder — but the ladder itself is a Tier. Design System: subscription-tier demo copy. The two apps have these words swapped; leave both.    |
| **Session**    | Movie Database: the persisted conversation record. Absent elsewhere — do not introduce it into Trip Planner.                                                                                |
| **Type**       | Movie Database: `movie` or `tv`. Everywhere else: the TypeScript keyword. Banned as a domain noun in Site — see Element.                                                                    |
| **Tile**       | Design System: a card in the overview grid. Banned in Site — see Pixel map, Cell.                                                                                                           |

## Repo-wide names

**tuja**: The author's personal umbrella brand and GitHub org, used as the workspace scope `@tuja/*`. It replaced Turborepo's default `@repo` scope. The word itself has no recorded etymology.

**shiqingqi.com**: The repository name. The site it builds ships at **qingqi.dev** — both are correct, for the repo and the product respectively.

Worktree directories carry shark and fish codenames (`mako`, `catshark`, `sevengill`…) assigned by tooling. They carry no project meaning.
