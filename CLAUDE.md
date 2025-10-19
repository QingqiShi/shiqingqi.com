# CRITICAL INSTRUCTIONS

ALWAYS follow these rules

- Run `pnpm lint:changed` `pnpm test` and `pnpm build:tsc` before any task is considered complete.
- NEVER EVER use `any` type explicitly or implicitly
- AVOID type assertions (`as Type`)
- Prefer letting TypeScript infer types over explicit type annotations
- AVOID mocking in tests. Ask for explicit permission from the user before adding any mocks.
- TMDB server functions in `src/_generated/tmdb-server-functions.ts` are auto-generated - DO NOT edit manually. Use `pnpm codegen:tmdb` to regenerate.
- Auto-generated TMDB files are git-ignored and must be regenerated after cloning: `pnpm codegen:tmdb`.
- NEVER assume environment variable names. ALWAYS verify environment variable names by reading source code FIRST.
- NEVER chain bash commands with `&&` - use separate Bash tool calls instead for better error handling and visibility.

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
```

# Agent Skills

This project uses specialized Agent Skills. Activate the appropriate skill when working on these areas:

- **Managing Packages** - When working with dependencies, package installation, or pnpm configuration
- **Fetching Data** - When implementing API routes, server functions, TanStack Query, or data loading
- **Internationalizing Components** - When working with translations, locales, or multilingual content
- **Styling with StyleX** - When working with styles, CSS, design tokens, or responsive design
- **Using React 19 Patterns** - When working with Context, hooks, or optimization patterns (useMemo, useCallback, memo)
- **Testing with Playwright** - When writing E2E tests or Playwright tests (Note: Unit tests use Vitest)
- **Generating TMDB Code** - When working with TMDB endpoints or regenerating types (NEVER manually edit generated files)

---

IMPORTANT: NEVER EVER COMPACT INFORMATION ABOVE THIS LINE.
