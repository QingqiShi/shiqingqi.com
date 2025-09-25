# Repository Guidelines

## Project Structure & Module Organization
The Next.js application source lives in `src/app`, with locale-aware routes in `src/app/[locale]` and shared layouts in `src/app/layout.tsx`. Reusable UI sits under `src/components`, domain helpers in `src/utils`, and cross-cutting hooks in `src/hooks`. Generated TMDB types and schemas are stored in `src/_generated`; avoid hand-editing anything in that directory. Static assets ship from `public/`, while `tooling/` holds the code-generation scripts and developer utilities. Unit and component tests are colocated with their subjects as `*.test.ts` or `*.test.tsx` files.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies (Node 22.x and pnpm ≥9 are expected).
- `pnpm codegen`: refresh TMDB client types and zod schemas; rerun whenever API models change.
- `pnpm dev`: run local development with automatic codegen and the Next.js dev server on port 3000.
- `pnpm build`: create a production build; pair with `pnpm start` to smoke-test the compiled bundle.
- `pnpm lint` / `pnpm format:check`: enforce ESLint and Prettier rules before opening PRs.
- `pnpm test` / `pnpm test:coverage`: execute the Vitest suite or review coverage metrics.

## Coding Style & Naming Conventions
TypeScript is mandatory for new code. Follow the existing two-space indentation and keep modules small and focused. Components, hooks, and providers use PascalCase file names; utility modules use camelCase. Styling relies on StyleX tokens (`src/tokens.stylex.ts`); prefer existing tokens before adding new ones. Run Prettier for formatting and honor the ESLint config in `eslint.config.mjs`, including the StyleX and Next.js rulesets. Import modules via the `@/` resolver alias rather than relative `../../../` paths.

## Testing Guidelines
Vitest with Testing Library (`src/test-setup.ts`) powers the test environment, so render components through Testing Library utilities and clean up with its helpers. Name tests after the module under test and keep them colocated. Aim for meaningful coverage on new behavior and run `pnpm test:coverage` for sizable changes. Mock external HTTP calls and generated clients rather than hitting live services.

## Commit & Pull Request Guidelines
Follow the conventional commit style used in history: `type(scope): concise summary (#1234)` when a PR number is available. Squash noisy intermediate commits before opening the PR. PRs should link issues, describe the change, and call out any UI updates with screenshots or videos. Confirm `pnpm lint`, `pnpm test`, and `pnpm build` before requesting review, and mention any remaining risks or follow-ups in the description.
