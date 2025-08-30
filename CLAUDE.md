## Essential Commands

```bash
pnpm dev                # Start dev server
pnpm build              # Full Next.js build (including type checking and linting)
pnpm build:tsc          # TypeScript type checking
pnpm lint               # Lint all files
pnpm lint:changed       # Lint changed files
pnpm format             # Format all files
pnpm format:changed     # Format changed files
pnpm test               # Run tests
pnpm codegen            # Generate TMDB API types
```

## Task Completion Requirements

**CRITICAL: Before considering ANY task complete, ALWAYS run:**
These checks are mandatory and must never be skipped.

```bash
pnpm test
pnpm build:tsc
pnpm lint:changed
pnpm format:changed # if lint modified any files
```

## Key Architecture Patterns

**Data Fetching:**

- **Server components:** Call `tmdb-api.ts` functions directly
- **Client components:** Use TanStack Query → API routes → Server functions (never direct)

**⚠️ CRITICAL: Never Call Server Functions Directly from React Query**

Server functions cause Router setState errors. API routes are required proxies:

```typescript
// ✅ CORRECT: Client → API Route → Server Function
queryFn: ({ pageParam }) =>
  apiRequestWrapper("/api/tmdb/movie-list", { ...params, page: pageParam });

// ❌ BREAKS: Client → Server Function
queryFn: ({ pageParam }) => fetchMovieList({ ...params, page: pageParam });
```

**Internationalization:**

- Routes use `[locale]` parameter (en/zh)
- Use `getLocalePath()` for localized URLs
- `useTranslations()` hook with colocated `translations.json` files

**Styling:**

- StyleX CSS-in-JS with design tokens in `src/tokens.stylex.ts`

**React Context (React 19):**

- Use shorthand syntax: `<Context value={...}>` instead of `<Context.Provider value={...}>`
- Use `use()` hook instead of `useContext()` for consuming context

**React Compiler:**

- No need for `useMemo`, `useCallback`, or `memo()` - React Compiler handles optimization automatically
- Use `@inferEffectDependencies` comment at top of client component files to enable automatic useEffect dependency inference
- Can omit useEffect dependency arrays when using `@inferEffectDependencies` - React Compiler infers them
- Avoid manual memoization patterns

## Testing Setup (Vitest)

### Unique Configuration Aspects

- **Shared Babel Config**: Single `.babelrc.js` handles both Next.js and Vitest
  - `modules: process.env.NODE_ENV === "test" ? false : "auto"` preserves ESM for Vitest
  - StyleX transformations enabled in tests via `test: process.env.NODE_ENV === "test"`
- **StyleX Support**: Full StyleX in tests through `vite-plugin-babel` with `enforce: "pre"`
- **Test Structure**: Tests colocated with components (`*.test.{ts,tsx}`), custom utils in `src/test-utils.tsx`
- **Path Aliases**: Consistent `@/` alias across TypeScript, Vitest, and Babel configs

IMPORTANT: NEVER EVER COMPACT INFORMATION ABOVE THIS LINE.
