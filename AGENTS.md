# CRITICAL INSTRUCTIONS

ALWAYS follow these rules

- Run `pnpm lint:changed`, `pnpm format:changed`, `pnpm test`, and `pnpm build` before any task is considered complete.
- Domain language is defined in `CONTEXT-MAP.md`, which points at a `CONTEXT.md` per context. Use those terms in code, comments, and copy.
- NEVER EVER use `any` type explicitly or implicitly
- AVOID type assertions (`as Type`)
- Prefer letting TypeScript infer types over explicit type annotations
- AVOID mocking in tests. Ask for explicit permission from the user before adding any mocks.
- TMDB server functions in `src/_generated/tmdb-server-functions.ts` are auto-generated - DO NOT edit manually. Use `pnpm codegen:tmdb` to regenerate.
- Auto-generated TMDB files are git-ignored and must be regenerated after cloning: `pnpm codegen:tmdb`.
- NEVER assume environment variable names. ALWAYS verify environment variable names by reading source code FIRST.
- NEVER chain bash commands with `&&` - use separate Bash tool calls instead for better error handling and visibility.
- NEVER violate the [Rules of React](https://react.dev/reference/rules). Components and hooks MUST be pure, side effects belong in event handlers or effects, and props/state must never be mutated directly.

# Command Notes

Scripts live in `package.json`. The non-obvious bits:

- `pnpm build` runs type checking and linting as well as the build.
- `pnpm test` is Vitest; `pnpm test:e2e` is Playwright and auto-starts the dev server.
- **`pnpm test` is expensive (~5 min): run it exactly once, as the final check.** While iterating, scope to the affected workspace (`pnpm --filter web test`, `pnpm --filter @tuja/ui test`) and narrow further with a path filter (`pnpm --filter web test src/components/home`).
- The full `pnpm test` runs every workspace's Vitest in parallel via turbo, and the jsdom environments contend for CPU — `@tuja/ui` tests can time out flakily under that load. If the full run fails only with timeouts, re-run just the failed workspace standalone (`pnpm --filter @tuja/ui test`); a standalone pass means contention, not a regression. `pnpm test --concurrency=1` avoids the contention at the cost of a longer wall clock.
- `pnpm codegen:tmdb` regenerates only the TMDB server functions — it is not a root script, it lives in the web workspace.
- **Evals are expensive** (they hit real LLM APIs). Use `pnpm eval <filter>` to run a single file (e.g. `pnpm eval tmdb-search`). Only run bare `pnpm eval` when a full suite run is needed.

# Visual Verification

- If you need to verify changes visually (e.g. with Playwright CLI) and the dev server is unresponsive or a preview deployment is inaccessible, do NOT fall back to code-review-only verification. Stop and ask the user to help resolve access.
- If the user started the dev server, ask before killing and restarting it.
