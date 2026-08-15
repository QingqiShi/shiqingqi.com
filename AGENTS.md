# CRITICAL INSTRUCTIONS

ALWAYS follow these rules

- Run `pnpm lint:changed`, `pnpm format:changed`, and `pnpm build` before any task is considered complete.
- Run the tests your change touches, scoped to one package — leave the full suite (`pnpm test`) to CI.
- Domain language is defined in `CONTEXT-MAP.md`, which points at a `CONTEXT.md` per context. Use those terms in code, comments, and copy.
- Design-system principles are defined in `DESIGN.md` — read it before designing or changing UI, component APIs, or user-facing copy.
- Prefer letting TypeScript infer types over explicit type annotations
- Type assertions are lint errors. For a genuinely unavoidable violation, the escape hatch is an inline `eslint-disable-next-line` naming the rule with a `-- reason` description (lint enforces both); never a blanket disable.
- AVOID mocking in tests. Ask for explicit permission from the user before adding any mocks.
- TMDB server functions in `src/_generated/tmdb-server-functions.ts` are auto-generated - DO NOT edit manually. Use `pnpm codegen:tmdb` to regenerate.
- Auto-generated TMDB files are git-ignored and must be regenerated after cloning: `pnpm codegen:tmdb`.
- NEVER assume environment variable names. ALWAYS verify environment variable names by reading source code FIRST.
- NEVER chain bash commands with `&&` - use separate Bash tool calls instead for better error handling and visibility.

# Command Notes

Scripts live in `package.json`. The non-obvious bits:

- `pnpm build` runs type checking and linting as well as the build.
- Tests are Vitest, one package at a time: `pnpm --filter @tuja/i18n-codegen test import-graph`. Drop the pattern to run the whole package; the pattern matches file paths, not test names.
- A bare `pnpm test` fans nine Vitest suites out at once, each forking a worker per core — this machine is shared by several agent sessions, so one full run leaves nothing for the others. CI runs it on its own runner for every push.
- `pnpm test:e2e` is Playwright and auto-starts the dev server.
- `pnpm codegen:tmdb` regenerates only the TMDB server functions — it is not a root script, it lives in the web workspace.
- **Evals are expensive** (they hit real LLM APIs). Use `pnpm eval <filter>` to run a single file (e.g. `pnpm eval tmdb-search`). Only run bare `pnpm eval` when a full suite run is needed.
- NEVER run `pnpm dev` from the repo root — it starts a dev server for every app. Run it from the one app you are working on (e.g. `apps/web`), and start nothing else.

# Visual Verification

- If you need to verify changes visually (e.g. with Playwright CLI) and the dev server is unresponsive or a preview deployment is inaccessible, do NOT fall back to code-review-only verification. Stop and ask the user to help resolve access.
- If the user started the dev server, ask before killing and restarting it.
