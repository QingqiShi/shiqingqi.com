# CRITICAL INSTRUCTIONS

ALWAYS follow these rules

- Run `pnpm lint:changed`, `pnpm format:changed`, `pnpm test`, and `pnpm build` before any task is considered complete.
- NEVER EVER use `any` type explicitly or implicitly
- AVOID type assertions (`as Type`)
- Prefer letting TypeScript infer types over explicit type annotations
- AVOID mocking in tests. Ask for explicit permission from the user before adding any mocks.
- TMDB server functions in `src/_generated/tmdb-server-functions.ts` are auto-generated - DO NOT edit manually. Use `pnpm codegen:tmdb` to regenerate.
- Auto-generated TMDB files are git-ignored and must be regenerated after cloning: `pnpm codegen:tmdb`.
- NEVER assume environment variable names. ALWAYS verify environment variable names by reading source code FIRST.
- NEVER chain bash commands with `&&` - use separate Bash tool calls instead for better error handling and visibility.
- NEVER violate the [Rules of React](https://react.dev/reference/rules). Components and hooks MUST be pure, side effects belong in event handlers or effects, and props/state must never be mutated directly.

# Available Commands

```bash
pnpm dev                # Start dev server
pnpm build              # Full Next.js build (including type checking and linting)
pnpm build:tsc          # TypeScript type checking
pnpm lint               # Lint all files
pnpm lint:changed       # Lint changed files
pnpm format:write       # Format all files
pnpm format:changed     # Format changed files
pnpm test               # Run unit tests (Vitest)
pnpm test:e2e           # Run E2E tests (Playwright) - auto-starts dev server
pnpm codegen            # Generate TMDB API types and server functions
pnpm codegen:tmdb       # Generate only TMDB server functions
pnpm eval               # Run ALL AI chat evals (expensive - hits real LLM APIs)
pnpm eval <filter>      # Run a subset of evals matching the filter, e.g. `pnpm eval tmdb-search`
```

- **Evals are expensive** (they hit real LLM APIs). When working on a specific eval, use `pnpm eval <name>` to run only that file (e.g. `pnpm eval tmdb-search`). Only run `pnpm eval` without a filter when a full eval suite run is needed.
